import crypto from "node:crypto";

import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_GEMINI_VIDEO_MODEL = "veo-3.1-fast-generate-preview";
const DEFAULT_SORA_VIDEO_MODEL = "sora-2";
const ALLOWED_GEMINI_VIDEO_MODELS = new Set([
  "veo-3.1-generate-preview",
  "veo-3.1-fast-generate-preview",
]);
const ALLOWED_SORA_VIDEO_MODELS = new Set([
  "sora-2",
  "sora-2-pro",
  "sora-2-2025-10-06",
  "sora-2-pro-2025-10-06",
  "sora-2-2025-12-08",
]);
const MAX_GEMINI_IMAGE_BYTES = 20 * 1024 * 1024;
const DEFAULT_VIDEO_PROMPT =
  "Transforme esta imagem em um video curto, cinematografico e realista, com movimento suave de camera.";
const ALLOWED_ASPECT_RATIOS = new Set(["16:9", "9:16", "1:1"]);
const ALLOWED_GEMINI_VIDEO_DURATIONS = new Set([4, 6, 8]);
const ALLOWED_SORA_VIDEO_DURATIONS = new Set([4, 8, 12]);
const ALLOWED_GEMINI_VIDEO_RESOLUTIONS = new Set(["720p", "1080p"]);
const ALLOWED_SORA_VIDEO_RESOLUTIONS = new Set(["720p", "1024p"]);
const DEFAULT_VIDEO_RESOLUTION = "720p";
const RETRYABLE_START_STATUSES = new Set([429, 500, 502, 503, 504]);
const START_REQUEST_MAX_ATTEMPTS = 3;
const START_REQUEST_BASE_RETRY_MS = 1200;
const SORA_SIZE_BY_RESOLUTION_AND_ASPECT_RATIO: Record<
  "720p" | "1024p",
  Record<"16:9" | "9:16" | "1:1", string>
> = {
  "720p": {
    "16:9": "1280x720",
    "9:16": "720x1280",
    "1:1": "720x720",
  },
  "1024p": {
    "16:9": "1792x1024",
    "9:16": "1024x1792",
    "1:1": "1024x1024",
  },
};

type VideoProvider = "gemini" | "sora";

type StartVideoBody = {
  imageUrl?: string;
  prompt?: string;
  model?: string;
  aspectRatio?: string;
  durationSeconds?: number;
  resolution?: string;
  negativePrompt?: string;
  sourceImageId?: string;
};

type VideoStatusMetadata = {
  provider: VideoProvider;
  sourceImageId: string | null;
  model: string;
  aspectRatio: string;
  durationSeconds: number;
  resolution: string;
};

type StartOperationPayload = {
  name?: string;
  error?: unknown;
};

type StartEndpointVariant = "generateVideos" | "predictLongRunning";
type ImageFieldType = "bytesBase64Encoded" | "imageBytes";

type VideoGenerationConfig = {
  aspectRatio: string;
  resolution: string;
  durationSeconds: number;
  negativePrompt?: string;
};

type DoneVideoResponse = {
  done: true;
  operationName: string;
  videoUrl: string;
  videoId?: string;
  persisted: boolean;
  warning?: string;
};

type PendingVideoResponse = {
  done: false;
  operationName: string;
  warning?: string;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSourceImageId(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, 120);
}

function getVideoProviderFromModel(model: string): VideoProvider | null {
  if (ALLOWED_GEMINI_VIDEO_MODELS.has(model)) {
    return "gemini";
  }
  if (ALLOWED_SORA_VIDEO_MODELS.has(model)) {
    return "sora";
  }
  return null;
}

function getDefaultModelForProvider(provider: VideoProvider): string {
  return provider === "sora" ? DEFAULT_SORA_VIDEO_MODEL : DEFAULT_GEMINI_VIDEO_MODEL;
}

function getAllowedDurationsForProvider(provider: VideoProvider): Set<number> {
  return provider === "sora" ? ALLOWED_SORA_VIDEO_DURATIONS : ALLOWED_GEMINI_VIDEO_DURATIONS;
}

function getAllowedResolutionsForProvider(provider: VideoProvider): Set<string> {
  return provider === "sora" ? ALLOWED_SORA_VIDEO_RESOLUTIONS : ALLOWED_GEMINI_VIDEO_RESOLUTIONS;
}

function isAllowedVideoHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower.endsWith("googleapis.com") ||
    lower.endsWith("googleusercontent.com") ||
    lower.endsWith("gvt1.com")
  );
}

function parseInputImageUrl(imageUrl: string, request: NextRequest): URL | null {
  const isRelativePath = imageUrl.startsWith("/");

  try {
    return isRelativePath ? new URL(imageUrl, request.nextUrl.origin) : new URL(imageUrl);
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseOperationName(value: string): string {
  let normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      return "";
    }
  }

  normalized = normalized.replace(/^\/+/, "").replace(/^v1beta\//, "");
  if (!normalized) {
    return "";
  }

  if (normalized.includes("/operations/")) {
    return normalized;
  }

  return normalized.startsWith("operations/") ? normalized : `operations/${normalized}`;
}

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const directError = (payload as { error?: unknown }).error;
  if (typeof directError === "string" && directError.trim().length > 0) {
    return directError.trim();
  }

  if (directError && typeof directError === "object") {
    const message = (directError as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message.trim();
    }
  }

  const operationError = (payload as { response?: unknown }).response;
  if (operationError && typeof operationError === "object") {
    const nestedError = (operationError as { error?: unknown }).error;
    if (typeof nestedError === "string" && nestedError.trim().length > 0) {
      return nestedError.trim();
    }
    if (nestedError && typeof nestedError === "object") {
      const message = (nestedError as { message?: unknown }).message;
      if (typeof message === "string" && message.trim().length > 0) {
        return message.trim();
      }
    }
  }

  return "";
}

function extractVideoUri(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const response = (payload as { response?: unknown }).response;
  if (!response || typeof response !== "object") {
    return "";
  }

  const normalizeUri = (value: unknown): string => {
    if (typeof value !== "string") {
      return "";
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    return trimmed;
  };

  const generateVideoResponse = (response as { generateVideoResponse?: unknown }).generateVideoResponse;
  if (generateVideoResponse && typeof generateVideoResponse === "object") {
    const generatedSamples = (generateVideoResponse as { generatedSamples?: unknown }).generatedSamples;
    if (Array.isArray(generatedSamples) && generatedSamples.length > 0) {
      const firstSample = generatedSamples[0] as { video?: unknown };
      if (firstSample.video && typeof firstSample.video === "object") {
        const uri = normalizeUri((firstSample.video as { uri?: unknown }).uri);
        if (uri) {
          return uri;
        }
      }
    }
  }

  const generatedVideos = (response as { generatedVideos?: unknown }).generatedVideos;
  if (Array.isArray(generatedVideos) && generatedVideos.length > 0) {
    const firstVideo = generatedVideos[0] as { video?: unknown };
    if (firstVideo.video && typeof firstVideo.video === "object") {
      const uri = normalizeUri((firstVideo.video as { uri?: unknown }).uri);
      if (uri) {
        return uri;
      }
    }

    const directUri = normalizeUri((generatedVideos[0] as { uri?: unknown }).uri);
    if (directUri) {
      return directUri;
    }
  }

  const generatedSamples = (response as { generatedSamples?: unknown }).generatedSamples;
  if (Array.isArray(generatedSamples) && generatedSamples.length > 0) {
    const firstSample = generatedSamples[0] as { video?: unknown; uri?: unknown };
    if (firstSample.video && typeof firstSample.video === "object") {
      const uri = normalizeUri((firstSample.video as { uri?: unknown }).uri);
      if (uri) {
        return uri;
      }
    }

    const sampleUri = normalizeUri(firstSample.uri);
    if (sampleUri) {
      return sampleUri;
    }
  }

  const videos = (response as { videos?: unknown }).videos;
  if (Array.isArray(videos) && videos.length > 0) {
    const firstVideo = videos[0] as { uri?: unknown; video?: unknown };
    const directUri = normalizeUri(firstVideo.uri);
    if (directUri) {
      return directUri;
    }

    if (firstVideo.video && typeof firstVideo.video === "object") {
      const nestedUri = normalizeUri((firstVideo.video as { uri?: unknown }).uri);
      if (nestedUri) {
        return nestedUri;
      }
    }
  }

  // Fallback: alguns payloads do Veo mudam o shape e trazem `fileUri`/`videoUri`
  // em objetos aninhados. Faz uma busca limitada para evitar falso 502.
  const visited = new Set<unknown>();
  const queue: unknown[] = [response];
  let depth = 0;
  while (queue.length > 0 && depth < 80) {
    const current = queue.shift();
    depth += 1;

    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }
    visited.add(current);

    const candidate = current as {
      uri?: unknown;
      fileUri?: unknown;
      videoUri?: unknown;
      downloadUri?: unknown;
      video?: unknown;
    };

    const uri =
      normalizeUri(candidate.uri) ||
      normalizeUri(candidate.fileUri) ||
      normalizeUri(candidate.videoUri) ||
      normalizeUri(candidate.downloadUri);
    if (uri) {
      return uri;
    }

    if (candidate.video && typeof candidate.video === "object") {
      const nestedVideo = candidate.video as {
        uri?: unknown;
        fileUri?: unknown;
        videoUri?: unknown;
        downloadUri?: unknown;
      };
      const nestedUri =
        normalizeUri(nestedVideo.uri) ||
        normalizeUri(nestedVideo.fileUri) ||
        normalizeUri(nestedVideo.videoUri) ||
        normalizeUri(nestedVideo.downloadUri);
      if (nestedUri) {
        return nestedUri;
      }
      queue.push(candidate.video);
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        queue.push(item);
      }
      continue;
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return "";
}

function extractGeminiVideoBytes(payload: unknown): { bytes: Uint8Array; mimeType: string } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const response = (payload as { response?: unknown }).response;
  if (!response || typeof response !== "object") {
    return null;
  }

  const candidates: unknown[] = [];
  const generateVideoResponse = (response as { generateVideoResponse?: unknown }).generateVideoResponse;
  if (generateVideoResponse && typeof generateVideoResponse === "object") {
    const samples = (generateVideoResponse as { generatedSamples?: unknown }).generatedSamples;
    if (Array.isArray(samples)) {
      for (const sample of samples) {
        if (sample && typeof sample === "object") {
          candidates.push((sample as { video?: unknown }).video);
        }
      }
    }
  }

  const generatedVideos = (response as { generatedVideos?: unknown }).generatedVideos;
  if (Array.isArray(generatedVideos)) {
    for (const item of generatedVideos) {
      if (item && typeof item === "object") {
        candidates.push((item as { video?: unknown }).video);
      }
    }
  }

  const generatedSamples = (response as { generatedSamples?: unknown }).generatedSamples;
  if (Array.isArray(generatedSamples)) {
    for (const sample of generatedSamples) {
      if (sample && typeof sample === "object") {
        candidates.push((sample as { video?: unknown }).video);
      }
    }
  }

  const videos = (response as { videos?: unknown }).videos;
  if (Array.isArray(videos)) {
    for (const item of videos) {
      candidates.push(item);
      if (item && typeof item === "object") {
        candidates.push((item as { video?: unknown }).video);
      }
    }
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const videoObj = candidate as { videoBytes?: unknown; bytesBase64Encoded?: unknown; mimeType?: unknown };
    const rawBase64 =
      typeof videoObj.videoBytes === "string"
        ? videoObj.videoBytes
        : typeof videoObj.bytesBase64Encoded === "string"
          ? videoObj.bytesBase64Encoded
          : "";
    if (!rawBase64.trim()) {
      continue;
    }

    try {
      const bytes = new Uint8Array(Buffer.from(rawBase64.trim(), "base64"));
      if (bytes.byteLength <= 0) {
        continue;
      }

      const mimeType =
        typeof videoObj.mimeType === "string" && videoObj.mimeType.trim().startsWith("video/")
          ? videoObj.mimeType.trim()
          : "video/mp4";

      return { bytes, mimeType };
    } catch {
      continue;
    }
  }

  return null;
}

function summarizePayloadKeys(payload: unknown, maxKeys = 40): string {
  if (!payload || typeof payload !== "object") {
    return "sem payload JSON";
  }

  const visited = new Set<unknown>();
  const queue: Array<{ value: unknown; path: string }> = [{ value: payload, path: "$" }];
  const keys: string[] = [];

  while (queue.length > 0 && keys.length < maxKeys) {
    const item = queue.shift();
    if (!item) {
      continue;
    }

    const { value, path } = item;
    if (!value || typeof value !== "object" || visited.has(value)) {
      continue;
    }

    visited.add(value);
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length && i < 3; i += 1) {
        queue.push({ value: value[i], path: `${path}[${i}]` });
      }
      continue;
    }

    for (const [key, child] of Object.entries(value)) {
      keys.push(`${path}.${key}`);
      if (keys.length >= maxKeys) {
        break;
      }
      if (child && typeof child === "object") {
        queue.push({ value: child, path: `${path}.${key}` });
      }
    }
  }

  return keys.join(", ");
}

function extractGeminiRaiFilterInfo(payload: unknown): { count: number; reasons: string[] } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const response = (payload as { response?: unknown }).response;
  if (!response || typeof response !== "object") {
    return null;
  }

  const generateVideoResponse = (response as { generateVideoResponse?: unknown }).generateVideoResponse;
  if (!generateVideoResponse || typeof generateVideoResponse !== "object") {
    return null;
  }

  const rawCount = Number(
    (generateVideoResponse as { raiMediaFilteredCount?: unknown }).raiMediaFilteredCount
  );
  const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 0;

  const rawReasons =
    (generateVideoResponse as { raiMediaFilteredReasons?: unknown }).raiMediaFilteredReasons;
  const reasons = Array.isArray(rawReasons)
    ? rawReasons
        .map((item) => normalizeString(item))
        .filter(Boolean)
    : [];

  if (count <= 0 && reasons.length === 0) {
    return null;
  }

  return { count, reasons };
}

function uniqueByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const unique: T[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function buildModelCandidates(model: string): string[] {
  return uniqueByKey([model, ...Array.from(ALLOWED_GEMINI_VIDEO_MODELS)], (item) => item);
}

function buildConfigCandidates(config: VideoGenerationConfig): VideoGenerationConfig[] {
  const baseConfigs: VideoGenerationConfig[] = [
    {
      aspectRatio: config.aspectRatio,
      resolution: config.resolution,
      durationSeconds: config.durationSeconds,
      negativePrompt: config.negativePrompt,
    },
    {
      aspectRatio: config.aspectRatio,
      resolution: "720p",
      durationSeconds: 8,
      negativePrompt: config.negativePrompt,
    },
    {
      aspectRatio: "16:9",
      resolution: "720p",
      durationSeconds: 8,
      negativePrompt: config.negativePrompt,
    },
  ];

  if (config.negativePrompt) {
    baseConfigs.push(
      {
        aspectRatio: config.aspectRatio,
        resolution: config.resolution,
        durationSeconds: config.durationSeconds,
      },
      {
        aspectRatio: config.aspectRatio,
        resolution: "720p",
        durationSeconds: 8,
      },
      {
        aspectRatio: "16:9",
        resolution: "720p",
        durationSeconds: 8,
      }
    );
  }

  return uniqueByKey(
    baseConfigs,
    (item) =>
      `${item.aspectRatio}|${item.resolution}|${item.durationSeconds}|${item.negativePrompt ? "1" : "0"}`
  );
}

function parseStatusMetadata(searchParams: URLSearchParams): VideoStatusMetadata {
  const modelInput = normalizeString(searchParams.get("model"));
  const aspectRatio = normalizeString(searchParams.get("aspectRatio"));
  const provider = getVideoProviderFromModel(modelInput) || "gemini";
  const model = getVideoProviderFromModel(modelInput)
    ? modelInput
    : getDefaultModelForProvider(provider);
  const resolution = normalizeString(searchParams.get("resolution"));
  const parsedDuration = Number(searchParams.get("durationSeconds"));
  const allowedDurations = getAllowedDurationsForProvider(provider);
  const allowedResolutions = getAllowedResolutionsForProvider(provider);

  return {
    provider,
    sourceImageId: normalizeSourceImageId(searchParams.get("sourceImageId")),
    model,
    aspectRatio: ALLOWED_ASPECT_RATIOS.has(aspectRatio) ? aspectRatio : "16:9",
    durationSeconds: allowedDurations.has(parsedDuration) ? parsedDuration : provider === "sora" ? 8 : 6,
    resolution: allowedResolutions.has(resolution) ? resolution : DEFAULT_VIDEO_RESOLUTION,
  };
}

function buildGeminiProxyVideoUrl(videoUri: string): string {
  return `/api/chatgpt/generate-video?videoUri=${encodeURIComponent(videoUri)}`;
}

function buildSoraProxyVideoUrl(videoId: string): string {
  const params = new URLSearchParams();
  params.set("provider", "sora");
  params.set("videoId", videoId);
  return `/api/chatgpt/generate-video?${params.toString()}`;
}

function extensionFromVideoContentType(contentType: string): string {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("webm")) {
    return "webm";
  }
  if (normalized.includes("quicktime")) {
    return "mov";
  }
  if (normalized.includes("mpeg")) {
    return "mpeg";
  }
  return "mp4";
}

function buildGeneratedVideoBlobPath(extension: string): string {
  const datePath = new Date().toISOString().slice(0, 10);
  return `chatgpt/generated/${datePath}/${crypto.randomUUID()}.${extension}`;
}

async function fetchImageBytes(
  imageUrl: string,
  request: NextRequest
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const parsedUrl = parseInputImageUrl(imageUrl, request);
  if (!parsedUrl) {
    throw new Error("URL da imagem invalida para gerar video.");
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("Protocolo da URL da imagem nao suportado.");
  }

  const isSameOrigin = parsedUrl.origin === request.nextUrl.origin;
  if (!isSameOrigin && !isAllowedVideoHost(parsedUrl.hostname)) {
    throw new Error("Hostname da imagem nao permitido para gerar video.");
  }

  if (!isSameOrigin && (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1")) {
    throw new Error("Hostname local nao permitido para gerar video.");
  }

  const upstream = await fetch(parsedUrl.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!upstream.ok) {
    throw new Error("Nao foi possivel carregar a imagem para gerar video.");
  }

  const mimeType = upstream.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  if (!mimeType.startsWith("image/")) {
    throw new Error("O arquivo selecionado nao e uma imagem valida para gerar video.");
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("A imagem enviada para gerar video esta vazia.");
  }

  if (bytes.byteLength > MAX_GEMINI_IMAGE_BYTES) {
    throw new Error("A imagem excede o limite de 20MB para gerar video.");
  }

  return { bytes, mimeType };
}

function resolveSoraSize(aspectRatio: string, resolution: string): string | null {
  const parsedAspectRatio =
    aspectRatio === "9:16" ? "9:16" : aspectRatio === "16:9" ? "16:9" : aspectRatio === "1:1" ? "1:1" : null;
  const parsedResolution =
    resolution === "720p" ? "720p" : resolution === "1024p" ? "1024p" : null;

  if (!parsedAspectRatio || !parsedResolution) {
    return null;
  }

  return SORA_SIZE_BY_RESOLUTION_AND_ASPECT_RATIO[parsedResolution][parsedAspectRatio];
}

function parseSoraSize(size: string): { width: number; height: number } | null {
  const normalized = normalizeString(size);
  const match = normalized.match(/^(\d+)x(\d+)$/);
  if (!match) {
    return null;
  }

  const width = Number.parseInt(match[1] || "", 10);
  const height = Number.parseInt(match[2] || "", 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

async function buildSoraInputReferenceDataUrl(params: {
  imageBytes: Uint8Array;
  targetSize: string;
}): Promise<string> {
  const parsedSize = parseSoraSize(params.targetSize);
  if (!parsedSize) {
    throw new Error("Tamanho invalido para referencia do Sora.");
  }

  const resized = await sharp(Buffer.from(params.imageBytes))
    .rotate()
    .resize({
      width: parsedSize.width,
      height: parsedSize.height,
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .png()
    .toBuffer();

  if (resized.byteLength <= 0) {
    throw new Error("Nao foi possivel preparar a imagem de referencia para o Sora.");
  }

  const base64 = resized.toString("base64");
  return `data:image/png;base64,${base64}`;
}

function buildOpenAIAuthHeaders(apiKey: string, openAiOrgId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  if (openAiOrgId) {
    headers["OpenAI-Organization"] = openAiOrgId;
  }

  return headers;
}

async function startGeminiVideoOperation(params: {
  model: string;
  geminiApiKey: string;
  prompt: string;
  imageBase64: string;
  mimeType: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds: number;
  negativePrompt?: string;
  imageFieldType: ImageFieldType;
  endpointVariant: StartEndpointVariant;
}): Promise<{ response: Response; payload: StartOperationPayload | null }> {
  const imagePayload =
    params.imageFieldType === "bytesBase64Encoded"
      ? {
          mimeType: params.mimeType,
          bytesBase64Encoded: params.imageBase64,
        }
      : {
          mimeType: params.mimeType,
          imageBytes: params.imageBase64,
        };

  const requestBody =
    params.endpointVariant === "generateVideos"
      ? {
          prompt: params.prompt,
          image: imagePayload,
          config: {
            aspectRatio: params.aspectRatio,
            resolution: params.resolution,
            durationSeconds: params.durationSeconds,
            ...(params.negativePrompt ? { negativePrompt: params.negativePrompt } : {}),
            numberOfVideos: 1,
          },
        }
      : {
          instances: [
            {
              prompt: params.prompt,
              image: imagePayload,
            },
          ],
          parameters: {
            aspectRatio: params.aspectRatio,
            resolution: params.resolution,
            durationSeconds: params.durationSeconds,
            ...(params.negativePrompt ? { negativePrompt: params.negativePrompt } : {}),
          },
        };

  const endpointSuffix =
    params.endpointVariant === "generateVideos" ? "generateVideos" : "predictLongRunning";

  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(params.model)}:${endpointSuffix}`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": params.geminiApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  const payload = (await response.json().catch(() => null)) as StartOperationPayload | null;
  return { response, payload };
}

async function startSoraVideoOperation(params: {
  model: string;
  openAiApiKey: string;
  openAiOrgId?: string;
  prompt: string;
  durationSeconds: number;
  size: string;
  inputReferenceDataUrl?: string;
}): Promise<{ response: Response; payload: StartOperationPayload | null }> {
  const body: Record<string, unknown> = {
    model: params.model,
    prompt: params.prompt,
    seconds: String(params.durationSeconds),
    size: params.size,
  };

  if (params.inputReferenceDataUrl) {
    body.input_reference = {
      image_url: params.inputReferenceDataUrl,
    };
  }

  const response = await fetch(`${OPENAI_BASE_URL}/videos`, {
    method: "POST",
    headers: {
      ...buildOpenAIAuthHeaders(params.openAiApiKey, params.openAiOrgId),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as StartOperationPayload | null;
  return { response, payload };
}

async function fetchGeminiVideo(videoUri: string, geminiApiKey: string): Promise<{
  bytes: Uint8Array;
  mimeType: string;
}> {
  let parsedVideoUri: URL;
  try {
    parsedVideoUri = new URL(videoUri);
  } catch {
    throw new Error("videoUri invalida.");
  }

  if (parsedVideoUri.protocol !== "https:" && parsedVideoUri.protocol !== "http:") {
    throw new Error("Protocolo da videoUri nao suportado.");
  }

  if (!isAllowedVideoHost(parsedVideoUri.hostname)) {
    throw new Error("Hostname da videoUri nao permitido.");
  }

  const upstream = await fetch(parsedVideoUri.toString(), {
    method: "GET",
    headers: {
      "x-goog-api-key": geminiApiKey,
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!upstream.ok) {
    throw new Error("Nao foi possivel baixar o video gerado.");
  }

  const contentType = upstream.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4";
  if (!contentType.startsWith("video/")) {
    throw new Error("Gemini retornou um arquivo invalido para video.");
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("O video retornado pelo Gemini esta vazio.");
  }

  return {
    bytes,
    mimeType: contentType,
  };
}

async function fetchSoraVideo(videoIdRaw: string, openAiApiKey: string, openAiOrgId?: string): Promise<{
  bytes: Uint8Array;
  mimeType: string;
}> {
  const videoId = normalizeString(videoIdRaw);
  if (!videoId) {
    throw new Error("videoId nao informado para baixar o video do Sora.");
  }

  const upstream = await fetch(`${OPENAI_BASE_URL}/videos/${encodeURIComponent(videoId)}/content`, {
    method: "GET",
    headers: buildOpenAIAuthHeaders(openAiApiKey, openAiOrgId),
    redirect: "follow",
    cache: "no-store",
  });

  if (!upstream.ok) {
    throw new Error("Nao foi possivel baixar o video gerado no Sora.");
  }

  const contentType = upstream.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4";
  if (!contentType.startsWith("video/")) {
    throw new Error("Sora retornou um arquivo invalido para video.");
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("O video retornado pelo Sora esta vazio.");
  }

  return {
    bytes,
    mimeType: contentType,
  };
}

async function fetchSoraVideoMetadata(params: {
  videoId: string;
  openAiApiKey: string;
  openAiOrgId?: string;
}): Promise<{ response: Response; payload: unknown }> {
  const response = await fetch(`${OPENAI_BASE_URL}/videos/${encodeURIComponent(params.videoId)}`, {
    method: "GET",
    headers: buildOpenAIAuthHeaders(params.openAiApiKey, params.openAiOrgId),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function persistVideoToBlob(params: {
  operationName: string;
  fallbackProxyUrl?: string;
  fetchVideo: () => Promise<{ bytes: Uint8Array; mimeType: string }>;
  metadata: VideoStatusMetadata;
}): Promise<{ id: string; videoUrl: string; warning?: string }> {
  const existing = await prisma.generatedVideo.findUnique({
    where: { operationName: params.operationName },
    select: { id: true },
  });

  if (existing) {
    return {
      id: existing.id,
      videoUrl: `/api/chatgpt/generated-video/${existing.id}`,
    };
  }

  const fetchedVideo = await params.fetchVideo();
  const extension = extensionFromVideoContentType(fetchedVideo.mimeType);
  let blobPath = buildGeneratedVideoBlobPath(extension);
  let blobUrl = params.fallbackProxyUrl || "";
  let persistenceWarning = "";

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (blobToken) {
    const blobBody = new Blob([Buffer.from(fetchedVideo.bytes)], {
      type: fetchedVideo.mimeType,
    });

    try {
      const blob = await put(blobPath, blobBody, {
        access: "public",
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000,
        contentType: fetchedVideo.mimeType,
        token: blobToken,
      });

      blobPath = blob.pathname;
      blobUrl = blob.url;
    } catch (error) {
      persistenceWarning =
        error instanceof Error
          ? `Falha ao salvar no Blob, mantendo persistencia por proxy: ${error.message}`
          : "Falha ao salvar no Blob, mantendo persistencia por proxy.";
    }
  } else {
    if (!blobUrl) {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN nao configurado e o provedor nao retornou URL de download."
      );
    }
    persistenceWarning = "BLOB_READ_WRITE_TOKEN nao configurado. Video persistido por proxy.";
  }

  try {
    const record = await prisma.generatedVideo.create({
      data: {
        sourceImageId: params.metadata.sourceImageId,
        operationName: params.operationName,
        model: params.metadata.model,
        aspectRatio: params.metadata.aspectRatio,
        durationSeconds: params.metadata.durationSeconds,
        resolution: params.metadata.resolution,
        blobUrl,
        blobPath,
        mimeType: fetchedVideo.mimeType,
        bytes: fetchedVideo.bytes.byteLength,
      },
      select: { id: true },
    });

    return {
      id: record.id,
      videoUrl: `/api/chatgpt/generated-video/${record.id}`,
      warning: persistenceWarning || undefined,
    };
  } catch {
    const duplicated = await prisma.generatedVideo.findUnique({
      where: { operationName: params.operationName },
      select: { id: true },
    });

    if (duplicated) {
      return {
        id: duplicated.id,
        videoUrl: `/api/chatgpt/generated-video/${duplicated.id}`,
        warning: persistenceWarning || undefined,
      };
    }

    throw new Error("Nao foi possivel registrar o video gerado.");
  }
}

async function startVideoOperationForCandidate(params: {
  model: string;
  geminiApiKey: string;
  prompt: string;
  imageBase64: string;
  mimeType: string;
  config: VideoGenerationConfig;
}): Promise<
  | {
      ok: true;
      operationName: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
    }
> {
  const imageFieldAttempts: ImageFieldType[] = ["bytesBase64Encoded"];
  const endpointAttempts: StartEndpointVariant[] = ["generateVideos", "predictLongRunning"];
  let fallbackStatus = 502;
  let fallbackMessage = "Falha ao iniciar geracao de video no Gemini.";

  for (const endpointVariant of endpointAttempts) {
    let shouldTryNextEndpoint = false;

    for (const imageFieldType of imageFieldAttempts) {
      for (let requestAttempt = 1; requestAttempt <= START_REQUEST_MAX_ATTEMPTS; requestAttempt += 1) {
        const { response, payload } = await startGeminiVideoOperation({
          model: params.model,
          geminiApiKey: params.geminiApiKey,
          prompt: params.prompt,
          imageBase64: params.imageBase64,
          mimeType: params.mimeType,
          aspectRatio: params.config.aspectRatio,
          resolution: params.config.resolution,
          durationSeconds: params.config.durationSeconds,
          negativePrompt: params.config.negativePrompt,
          imageFieldType,
          endpointVariant,
        });

        if (response.ok) {
          const operationName = parseOperationName(payload?.name || "");
          if (operationName) {
            return {
              ok: true,
              operationName,
            };
          }

          fallbackStatus = 502;
          fallbackMessage = "Gemini nao retornou a operacao da geracao de video.";
          break;
        }

        fallbackStatus = response.status;
        fallbackMessage = extractErrorMessage(payload) || fallbackMessage;

        const errorLower = fallbackMessage.toLowerCase();
        const normalizedFieldName = imageFieldType.toLowerCase();
        const isRetryableSchemaError =
          errorLower.includes(normalizedFieldName) ||
          errorLower.includes("negativeprompt") ||
          errorLower.includes("unknown name") ||
          errorLower.includes("invalid json payload") ||
          errorLower.includes("isn't supported by this model");

        const isRetryableProviderStatus = RETRYABLE_START_STATUSES.has(response.status);
        const isEndpointMissing = response.status === 404;

        if (isEndpointMissing) {
          shouldTryNextEndpoint = true;
          break;
        }

        if (isRetryableProviderStatus && requestAttempt < START_REQUEST_MAX_ATTEMPTS) {
          await sleep(START_REQUEST_BASE_RETRY_MS * requestAttempt);
          continue;
        }

        if (isRetryableSchemaError) {
          break;
        }

        break;
      }

      if (shouldTryNextEndpoint) {
        break;
      }
    }

    if (shouldTryNextEndpoint) {
      continue;
    }
  }

  return {
    ok: false,
    status: fallbackStatus,
    message: fallbackMessage,
  };
}

function parseSoraVideoId(value: unknown): string {
  let normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      const pathname = new URL(normalized).pathname.replace(/^\/+/, "");
      normalized = pathname.split("/").filter(Boolean).at(-1) || "";
    } catch {
      return "";
    }
  }

  return normalized.replace(/^\/+/, "");
}

function parseOperationNameByProvider(provider: VideoProvider, value: string): string {
  if (provider === "sora") {
    return parseSoraVideoId(value);
  }
  return parseOperationName(value);
}

type VideoRuntimeCredentials = {
  geminiApiKey?: string;
  openAiApiKey?: string;
  openAiOrgId?: string;
};

async function handleStartVideo(
  request: NextRequest,
  credentials: VideoRuntimeCredentials
): Promise<NextResponse> {
  const body = (await request.json()) as StartVideoBody;
  const imageUrl = normalizeString(body.imageUrl);
  if (!imageUrl) {
    return NextResponse.json({ error: "URL da imagem nao informada." }, { status: 400 });
  }

  const prompt = normalizeString(body.prompt) || DEFAULT_VIDEO_PROMPT;
  const modelInput = normalizeString(body.model);
  const selectedProvider = getVideoProviderFromModel(modelInput);

  if (modelInput && !selectedProvider) {
    return NextResponse.json({ error: "Modelo de video invalido." }, { status: 400 });
  }

  const provider: VideoProvider = selectedProvider || "gemini";
  const model = selectedProvider ? modelInput : getDefaultModelForProvider(provider);

  const aspectRatio = normalizeString(body.aspectRatio) || "16:9";
  if (!ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
    return NextResponse.json({ error: "Aspect ratio invalido." }, { status: 400 });
  }

  const resolution = normalizeString(body.resolution) || DEFAULT_VIDEO_RESOLUTION;
  const allowedResolutions = getAllowedResolutionsForProvider(provider);
  if (!allowedResolutions.has(resolution)) {
    return NextResponse.json({ error: "Resolucao invalida." }, { status: 400 });
  }

  const hasDurationInput =
    body.durationSeconds !== undefined && body.durationSeconds !== null;
  const parsedDuration = Number(body.durationSeconds);
  const allowedDurations = getAllowedDurationsForProvider(provider);
  if (hasDurationInput && !allowedDurations.has(parsedDuration)) {
    return NextResponse.json(
      {
        error:
          provider === "sora"
            ? "Duracao invalida. Use 4s, 8s ou 12s."
            : "Duracao invalida. Use 4s, 6s ou 8s.",
      },
      { status: 400 }
    );
  }
  const durationSeconds = hasDurationInput ? parsedDuration : provider === "sora" ? 8 : 6;
  if (provider === "gemini" && resolution === "1080p" && durationSeconds !== 8) {
    return NextResponse.json(
      { error: "Para 1080p, selecione duracao de 8s." },
      { status: 400 }
    );
  }

  const negativePrompt = provider === "gemini" ? normalizeString(body.negativePrompt) : "";
  const sourceImageId = normalizeSourceImageId(body.sourceImageId);

  const { bytes, mimeType } = await fetchImageBytes(imageUrl, request);

  if (provider === "sora") {
    const openAiApiKey = credentials.openAiApiKey?.trim();
    if (!openAiApiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY nao configurada no ambiente." },
        { status: 500 }
      );
    }

    const size = resolveSoraSize(aspectRatio, resolution);
    if (!size) {
      return NextResponse.json(
        { error: "Combinacao de formato e resolucao invalida para Sora." },
        { status: 400 }
      );
    }

    const inputReferenceDataUrl = await buildSoraInputReferenceDataUrl({
      imageBytes: bytes,
      targetSize: size,
    });

    const { response, payload } = await startSoraVideoOperation({
      model,
      openAiApiKey,
      openAiOrgId: credentials.openAiOrgId,
      prompt,
      durationSeconds,
      size,
      inputReferenceDataUrl,
    });

    if (!response.ok) {
      const message = extractErrorMessage(payload) || "Falha ao iniciar geracao de video no Sora.";
      const shouldSoftenStatus = RETRYABLE_START_STATUSES.has(response.status);
      if (response.status === 404) {
        return NextResponse.json(
          {
            error:
              "Modelo/endpoint de video nao encontrado para esta chave OpenAI. Verifique acesso ao Sora.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: message },
        { status: shouldSoftenStatus ? 503 : response.status }
      );
    }

    const operationName = parseSoraVideoId((payload as { id?: unknown } | null)?.id);
    if (!operationName) {
      return NextResponse.json(
        { error: "Sora nao retornou identificador da geracao de video." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      done: false,
      operationName,
      sourceImageId,
      model,
      aspectRatio,
      durationSeconds,
      resolution,
    });
  }

  const geminiApiKey = credentials.geminiApiKey?.trim();
  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY nao configurada no ambiente." },
      { status: 500 }
    );
  }

  const imageBase64 = Buffer.from(bytes).toString("base64");
  const modelCandidates = buildModelCandidates(model);
  const configCandidates = buildConfigCandidates({
    aspectRatio,
    resolution,
    durationSeconds,
    negativePrompt: negativePrompt || undefined,
  });

  let fallbackStatus = 502;
  let fallbackMessage = "Falha ao iniciar geracao de video no Gemini.";

  for (const candidateModel of modelCandidates) {
    for (const candidateConfig of configCandidates) {
      const startResult = await startVideoOperationForCandidate({
        model: candidateModel,
        geminiApiKey,
        prompt,
        imageBase64,
        mimeType,
        config: candidateConfig,
      });

      if (startResult.ok) {
        return NextResponse.json({
          done: false,
          operationName: startResult.operationName,
          sourceImageId,
          model: candidateModel,
          aspectRatio: candidateConfig.aspectRatio,
          durationSeconds: candidateConfig.durationSeconds,
          resolution: candidateConfig.resolution,
        });
      }

      fallbackStatus = startResult.status;
      fallbackMessage = startResult.message || fallbackMessage;
    }
  }

  const shouldSoftenStatus = RETRYABLE_START_STATUSES.has(fallbackStatus);
  if (fallbackStatus === 404) {
    return NextResponse.json(
      {
        error:
          "Modelo/endpoint de video nao encontrado para esta chave Gemini. Verifique acesso ao Veo e o projeto da API key.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: fallbackMessage },
    { status: shouldSoftenStatus ? 503 : fallbackStatus }
  );
}

async function handleVideoStatus(
  operationNameRaw: string,
  metadata: VideoStatusMetadata,
  credentials: VideoRuntimeCredentials
): Promise<NextResponse> {
  const operationName = parseOperationNameByProvider(metadata.provider, operationNameRaw);
  if (!operationName) {
    return NextResponse.json({ error: "operationName nao informado." }, { status: 400 });
  }

  let canPersistToDatabase = true;
  let persistenceWarning = "";
  let existing: { id: string } | null = null;

  try {
    existing = await prisma.generatedVideo.findUnique({
      where: { operationName },
      select: { id: true },
    });
  } catch (error) {
    canPersistToDatabase = false;
    persistenceWarning =
      error instanceof Error
        ? error.message
        : "Persistencia de videos indisponivel no momento.";
  }

  if (existing) {
    const response: DoneVideoResponse = {
      done: true,
      operationName,
      videoId: existing.id,
      videoUrl: `/api/chatgpt/generated-video/${existing.id}`,
      persisted: true,
    };
    return NextResponse.json(response);
  }

  if (metadata.provider === "sora") {
    const openAiApiKey = credentials.openAiApiKey?.trim();
    if (!openAiApiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY nao configurada no ambiente." },
        { status: 500 }
      );
    }

    const { response: statusResponse, payload: statusPayload } = await fetchSoraVideoMetadata({
      videoId: operationName,
      openAiApiKey,
      openAiOrgId: credentials.openAiOrgId,
    });

    if (!statusResponse.ok) {
      const message = extractErrorMessage(statusPayload) || "Falha ao consultar status da geracao de video no Sora.";

      if ([429, 500, 502, 503, 504].includes(statusResponse.status)) {
        const pendingResponse: PendingVideoResponse = {
          done: false,
          operationName,
          warning: message,
        };
        return NextResponse.json(pendingResponse);
      }

      return NextResponse.json({ error: message }, { status: statusResponse.status });
    }

    const status = normalizeString(
      (statusPayload as { status?: unknown } | null)?.status
    ).toLowerCase();
    const terminalSuccessStatuses = new Set(["completed", "succeeded", "success"]);
    const terminalFailureStatuses = new Set(["failed", "error", "cancelled", "canceled", "rejected"]);

    if (terminalFailureStatuses.has(status)) {
      const message = extractErrorMessage(statusPayload) || "Sora retornou falha na geracao do video.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    if (!terminalSuccessStatuses.has(status)) {
      return NextResponse.json({
        done: false,
        operationName,
      });
    }

    const fallbackProxyUrl = buildSoraProxyVideoUrl(operationName);
    if (!canPersistToDatabase) {
      const fallback: DoneVideoResponse = {
        done: true,
        operationName,
        videoUrl: fallbackProxyUrl,
        persisted: false,
        warning:
          persistenceWarning ||
          "Persistencia de videos desativada: execute `npx prisma db push` para criar a tabela GeneratedVideo.",
      };
      return NextResponse.json(fallback);
    }

    try {
      const persistedVideo = await persistVideoToBlob({
        operationName,
        fallbackProxyUrl,
        fetchVideo: () => fetchSoraVideo(operationName, openAiApiKey, credentials.openAiOrgId),
        metadata,
      });

      const response: DoneVideoResponse = {
        done: true,
        operationName,
        videoId: persistedVideo.id,
        videoUrl: persistedVideo.videoUrl,
        persisted: true,
        warning: persistedVideo.warning,
      };
      return NextResponse.json(response);
    } catch (persistError) {
      const fallback: DoneVideoResponse = {
        done: true,
        operationName,
        videoUrl: fallbackProxyUrl,
        persisted: false,
        warning:
          persistError instanceof Error
            ? persistError.message
            : "Nao foi possivel persistir o video no Blob.",
      };
      return NextResponse.json(fallback);
    }
  }

  const geminiApiKey = credentials.geminiApiKey?.trim();
  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY nao configurada no ambiente." },
      { status: 500 }
    );
  }

  const operationResponse = await fetch(`${GEMINI_BASE_URL}/${operationName}`, {
    method: "GET",
    headers: {
      "x-goog-api-key": geminiApiKey,
    },
    cache: "no-store",
  });

  const operationPayload = (await operationResponse.json().catch(() => null)) as
    | { done?: boolean }
    | null;

  if (!operationResponse.ok) {
    const message = extractErrorMessage(operationPayload) || "Falha ao consultar status da geracao de video.";

    // Falhas temporarias do provedor nao devem quebrar a UX; mantem polling.
    if ([429, 500, 502, 503, 504].includes(operationResponse.status)) {
      const pendingResponse: PendingVideoResponse = {
        done: false,
        operationName,
        warning: message,
      };
      return NextResponse.json(pendingResponse);
    }

    return NextResponse.json({ error: message }, { status: operationResponse.status });
  }

  const operationError = extractErrorMessage(operationPayload);
  if (operationError) {
    return NextResponse.json({ error: operationError }, { status: 502 });
  }

  const done = Boolean((operationPayload as { done?: unknown })?.done);
  if (!done) {
    return NextResponse.json({
      done: false,
      operationName,
    });
  }

  const videoUri = extractVideoUri(operationPayload);
  const geminiVideoBytes = extractGeminiVideoBytes(operationPayload);
  if (!videoUri && !geminiVideoBytes) {
    const raiFilterInfo = extractGeminiRaiFilterInfo(operationPayload);
    if (raiFilterInfo) {
      const reasonText = raiFilterInfo.reasons.length > 0 ? raiFilterInfo.reasons.join(", ") : "nao informado";
      return NextResponse.json(
        {
          error: `Gemini bloqueou a geracao por politica de seguranca (RAI). Itens filtrados: ${
            raiFilterInfo.count
          }. Motivos: ${reasonText}.`,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error: `Gemini concluiu a operacao, mas nao retornou URI/videoBytes no payload. Chaves detectadas: ${summarizePayloadKeys(
          operationPayload
        )}`,
      },
      { status: 502 }
    );
  }

  const fallbackProxyUrl = videoUri ? buildGeminiProxyVideoUrl(videoUri) : "";
  if (!canPersistToDatabase) {
    if (!fallbackProxyUrl) {
      return NextResponse.json(
        {
          error:
            "Gemini retornou videoBytes sem URI e a persistencia no banco está indisponivel. Nao foi possivel concluir.",
        },
        { status: 500 }
      );
    }
    const fallback: DoneVideoResponse = {
      done: true,
      operationName,
      videoUrl: fallbackProxyUrl,
      persisted: false,
      warning:
        persistenceWarning ||
        "Persistencia de videos desativada: execute `npx prisma db push` para criar a tabela GeneratedVideo.",
    };
    return NextResponse.json(fallback);
  }

  try {
    const persistedVideo = await persistVideoToBlob({
      operationName,
      ...(fallbackProxyUrl ? { fallbackProxyUrl } : {}),
      fetchVideo: () =>
        geminiVideoBytes
          ? Promise.resolve(geminiVideoBytes)
          : fetchGeminiVideo(videoUri, geminiApiKey),
      metadata,
    });

    const response: DoneVideoResponse = {
      done: true,
      operationName,
      videoId: persistedVideo.id,
      videoUrl: persistedVideo.videoUrl,
      persisted: true,
      warning: persistedVideo.warning,
    };
    return NextResponse.json(response);
  } catch (persistError) {
    const fallback: DoneVideoResponse = {
      done: true,
      operationName,
      videoUrl: fallbackProxyUrl,
      persisted: false,
      warning:
        persistError instanceof Error
          ? persistError.message
          : "Nao foi possivel persistir o video no Blob.",
    };
    return NextResponse.json(fallback);
  }
}

async function handleGeminiVideoProxy(videoUriRaw: string, geminiApiKey: string): Promise<NextResponse> {
  const videoUri = normalizeString(videoUriRaw);
  if (!videoUri) {
    return NextResponse.json({ error: "videoUri nao informada." }, { status: 400 });
  }

  try {
    const fetchedVideo = await fetchGeminiVideo(videoUri, geminiApiKey);

    return new NextResponse(Buffer.from(fetchedVideo.bytes), {
      status: 200,
      headers: {
        "Content-Type": fetchedVideo.mimeType,
        "Content-Disposition": `inline; filename="video-gemini-${Date.now()}.${extensionFromVideoContentType(
          fetchedVideo.mimeType
        )}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel baixar o video gerado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function handleSoraVideoProxy(
  videoIdRaw: string,
  openAiApiKey: string,
  openAiOrgId?: string
): Promise<NextResponse> {
  const videoId = parseSoraVideoId(videoIdRaw);
  if (!videoId) {
    return NextResponse.json({ error: "videoId nao informado." }, { status: 400 });
  }

  try {
    const fetchedVideo = await fetchSoraVideo(videoId, openAiApiKey, openAiOrgId);

    return new NextResponse(Buffer.from(fetchedVideo.bytes), {
      status: 200,
      headers: {
        "Content-Type": fetchedVideo.mimeType,
        "Content-Disposition": `inline; filename="video-sora-${Date.now()}.${extensionFromVideoContentType(
          fetchedVideo.mimeType
        )}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel baixar o video gerado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleStartVideo(request, {
      geminiApiKey: process.env.GEMINI_API_KEY?.trim(),
      openAiApiKey: process.env.OPENAI_API_KEY?.trim(),
      openAiOrgId: process.env.OPENAI_ORG_ID?.trim(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao gerar video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
    const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
    const openAiOrgId = process.env.OPENAI_ORG_ID?.trim();

    const videoUri = normalizeString(request.nextUrl.searchParams.get("videoUri"));
    if (videoUri) {
      if (!geminiApiKey) {
        return NextResponse.json(
          { error: "GEMINI_API_KEY nao configurada no ambiente." },
          { status: 500 }
        );
      }
      return await handleGeminiVideoProxy(videoUri, geminiApiKey);
    }

    const proxyProvider = normalizeString(request.nextUrl.searchParams.get("provider"));
    const videoId = normalizeString(request.nextUrl.searchParams.get("videoId"));
    if (videoId || proxyProvider === "sora") {
      if (!openAiApiKey) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY nao configurada no ambiente." },
          { status: 500 }
        );
      }
      return await handleSoraVideoProxy(videoId, openAiApiKey, openAiOrgId);
    }

    const operationName = normalizeString(request.nextUrl.searchParams.get("operationName"));
    const metadata = parseStatusMetadata(request.nextUrl.searchParams);
    return await handleVideoStatus(operationName, metadata, {
      geminiApiKey,
      openAiApiKey,
      openAiOrgId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao consultar video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

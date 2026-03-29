import crypto from "node:crypto";

import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_VIDEO_MODEL = "veo-3.1-fast-generate-preview";
const ALLOWED_VIDEO_MODELS = new Set([
  "veo-3.1-generate-preview",
  "veo-3.1-fast-generate-preview",
]);
const MAX_GEMINI_IMAGE_BYTES = 20 * 1024 * 1024;
const DEFAULT_VIDEO_PROMPT =
  "Transforme esta imagem em um video curto, cinematografico e realista, com movimento suave de camera.";
const ALLOWED_ASPECT_RATIOS = new Set(["16:9", "9:16"]);
const ALLOWED_VIDEO_DURATIONS = new Set([4, 6, 8]);
const ALLOWED_VIDEO_RESOLUTIONS = new Set(["720p", "1080p"]);
const DEFAULT_VIDEO_RESOLUTION = "720p";
const RETRYABLE_START_STATUSES = new Set([429, 500, 502, 503, 504]);
const START_REQUEST_MAX_ATTEMPTS = 3;
const START_REQUEST_BASE_RETRY_MS = 1200;

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

  const generateVideoResponse = (response as { generateVideoResponse?: unknown }).generateVideoResponse;
  if (generateVideoResponse && typeof generateVideoResponse === "object") {
    const generatedSamples = (generateVideoResponse as { generatedSamples?: unknown }).generatedSamples;
    if (Array.isArray(generatedSamples) && generatedSamples.length > 0) {
      const firstSample = generatedSamples[0] as { video?: unknown };
      if (firstSample.video && typeof firstSample.video === "object") {
        const uri = (firstSample.video as { uri?: unknown }).uri;
        if (typeof uri === "string" && uri.trim().length > 0) {
          return uri.trim();
        }
      }
    }
  }

  const generatedVideos = (response as { generatedVideos?: unknown }).generatedVideos;
  if (Array.isArray(generatedVideos) && generatedVideos.length > 0) {
    const firstVideo = generatedVideos[0] as { video?: unknown };
    if (firstVideo.video && typeof firstVideo.video === "object") {
      const uri = (firstVideo.video as { uri?: unknown }).uri;
      if (typeof uri === "string" && uri.trim().length > 0) {
        return uri.trim();
      }
    }
  }

  return "";
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
  return uniqueByKey([model, ...Array.from(ALLOWED_VIDEO_MODELS)], (item) => item);
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
  const model = normalizeString(searchParams.get("model"));
  const aspectRatio = normalizeString(searchParams.get("aspectRatio"));
  const resolution = normalizeString(searchParams.get("resolution"));
  const parsedDuration = Number(searchParams.get("durationSeconds"));

  return {
    sourceImageId: normalizeSourceImageId(searchParams.get("sourceImageId")),
    model: ALLOWED_VIDEO_MODELS.has(model) ? model : DEFAULT_GEMINI_VIDEO_MODEL,
    aspectRatio: ALLOWED_ASPECT_RATIOS.has(aspectRatio) ? aspectRatio : "16:9",
    durationSeconds: ALLOWED_VIDEO_DURATIONS.has(parsedDuration) ? parsedDuration : 6,
    resolution: ALLOWED_VIDEO_RESOLUTIONS.has(resolution) ? resolution : DEFAULT_VIDEO_RESOLUTION,
  };
}

function buildProxyVideoUrl(videoUri: string): string {
  return `/api/chatgpt/generate-video?videoUri=${encodeURIComponent(videoUri)}`;
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
    throw new Error("O arquivo selecionado nao e uma imagem valida para o Gemini.");
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("A imagem enviada para o Gemini esta vazia.");
  }

  if (bytes.byteLength > MAX_GEMINI_IMAGE_BYTES) {
    throw new Error("A imagem excede o limite de 20MB para gerar video.");
  }

  return { bytes, mimeType };
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

async function persistVideoToBlob(params: {
  operationName: string;
  videoUri: string;
  geminiApiKey: string;
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

  const fetchedVideo = await fetchGeminiVideo(params.videoUri, params.geminiApiKey);
  const extension = extensionFromVideoContentType(fetchedVideo.mimeType);
  let blobPath = buildGeneratedVideoBlobPath(extension);
  let blobUrl = buildProxyVideoUrl(params.videoUri);
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
  const imageFieldAttempts: ImageFieldType[] = ["bytesBase64Encoded", "imageBytes"];
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

async function handleStartVideo(
  request: NextRequest,
  geminiApiKey: string
): Promise<NextResponse> {
  const body = (await request.json()) as StartVideoBody;
  const imageUrl = normalizeString(body.imageUrl);
  if (!imageUrl) {
    return NextResponse.json({ error: "URL da imagem nao informada." }, { status: 400 });
  }

  const prompt = normalizeString(body.prompt) || DEFAULT_VIDEO_PROMPT;
  const model = normalizeString(body.model) || DEFAULT_GEMINI_VIDEO_MODEL;
  if (!ALLOWED_VIDEO_MODELS.has(model)) {
    return NextResponse.json({ error: "Modelo Veo invalido." }, { status: 400 });
  }

  const aspectRatio = normalizeString(body.aspectRatio) || "16:9";
  if (!ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
    return NextResponse.json({ error: "Aspect ratio invalido." }, { status: 400 });
  }

  const resolution = normalizeString(body.resolution) || DEFAULT_VIDEO_RESOLUTION;
  if (!ALLOWED_VIDEO_RESOLUTIONS.has(resolution)) {
    return NextResponse.json({ error: "Resolucao invalida." }, { status: 400 });
  }

  const hasDurationInput =
    body.durationSeconds !== undefined && body.durationSeconds !== null;
  const parsedDuration = Number(body.durationSeconds);
  if (hasDurationInput && !ALLOWED_VIDEO_DURATIONS.has(parsedDuration)) {
    return NextResponse.json(
      { error: "Duracao invalida. Use 4s, 6s ou 8s." },
      { status: 400 }
    );
  }
  const durationSeconds = hasDurationInput ? parsedDuration : 6;
  if (resolution === "1080p" && durationSeconds !== 8) {
    return NextResponse.json(
      { error: "Para 1080p, selecione duracao de 8s." },
      { status: 400 }
    );
  }

  const negativePrompt = normalizeString(body.negativePrompt);
  const sourceImageId = normalizeSourceImageId(body.sourceImageId);

  const { bytes, mimeType } = await fetchImageBytes(imageUrl, request);
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
  geminiApiKey: string,
  metadata: VideoStatusMetadata
): Promise<NextResponse> {
  const operationName = parseOperationName(operationNameRaw);
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
  if (!videoUri) {
    return NextResponse.json(
      { error: "Gemini concluiu a operacao, mas nao retornou URI do video." },
      { status: 502 }
    );
  }

  if (!canPersistToDatabase) {
    const fallback: DoneVideoResponse = {
      done: true,
      operationName,
      videoUrl: buildProxyVideoUrl(videoUri),
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
      videoUri,
      geminiApiKey,
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
      videoUrl: buildProxyVideoUrl(videoUri),
      persisted: false,
      warning:
        persistError instanceof Error
          ? persistError.message
          : "Nao foi possivel persistir o video no Blob.",
    };
    return NextResponse.json(fallback);
  }
}

async function handleVideoProxy(videoUriRaw: string, geminiApiKey: string): Promise<NextResponse> {
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

export async function POST(request: NextRequest) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY nao configurada no ambiente." },
        { status: 500 }
      );
    }

    return await handleStartVideo(request, geminiApiKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao gerar video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY nao configurada no ambiente." },
        { status: 500 }
      );
    }

    const videoUri = normalizeString(request.nextUrl.searchParams.get("videoUri"));
    if (videoUri) {
      return await handleVideoProxy(videoUri, geminiApiKey);
    }

    const operationName = normalizeString(request.nextUrl.searchParams.get("operationName"));
    const metadata = parseStatusMetadata(request.nextUrl.searchParams);
    return await handleVideoStatus(operationName, geminiApiKey, metadata);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao consultar video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

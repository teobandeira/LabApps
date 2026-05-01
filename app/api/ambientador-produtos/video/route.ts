import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const MAX_INV = 9_999_999_999_999;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const TERMINAL_SUCCESS_STATUSES = new Set(["completed", "succeeded", "success"]);
const TERMINAL_FAILURE_STATUSES = new Set([
  "failed",
  "error",
  "cancelled",
  "canceled",
  "rejected",
]);
const VIDEO_PROMPT_PTBR_GUARDRAIL =
  "Idioma obrigatório: português do Brasil (pt-BR). Se houver texto, título, legenda ou narração, usar somente português do Brasil.";
const VIDEO_PROMPT_SORA_QUALITY_GUARDRAIL =
  "Qualidade obrigatória: vídeo limpo e estável, sem chiado/ruído visual, sem granulação excessiva, sem flicker e sem artefatos de compressão. Gerar sem áudio (sem música, sem voz e sem efeitos sonoros).";

const ALLOWED_MODELS = new Set(["sora-2", "sora-2-pro"]);
const ALLOWED_ASPECT_RATIOS = new Set(["16:9", "9:16"]);
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const SORA_CAPABILITIES_BY_MODEL: Record<
  string,
  {
    resolutions: readonly string[];
    durations: readonly number[];
  }
> = {
  "sora-2": {
    resolutions: ["720p"],
    durations: [8],
  },
  "sora-2-pro": {
    resolutions: ["720p", "1080p"],
    durations: [8, 12],
  },
};

const SORA_SIZE_BY_RESOLUTION_AND_ASPECT_RATIO: Record<
  string,
  Record<"16:9" | "9:16", string>
> = {
  "720p": {
    "16:9": "1280x720",
    "9:16": "720x1280",
  },
  "1080p": {
    "16:9": "1920x1080",
    "9:16": "1080x1920",
  },
};

type RequestPayload = {
  imageUrl?: string;
  prompt?: string;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  durationSeconds?: number;
};

type TokenPayload = {
  id: number;
  email: string;
  permissao: string;
  nome: string;
  iat?: number;
  exp?: number;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function sanitizeFilename(name: string) {
  return (name || "arquivo")
    .replace(/\s+/g, "_")
    .replace(/[^\w.\-]/g, "")
    .slice(0, 120);
}

function buildNewestFirstPath(originalName: string, folder = "ambientador") {
  const inv = String(MAX_INV - Date.now()).padStart(13, "0");
  const rand = Math.random().toString(36).slice(2, 8);
  const safe = sanitizeFilename(originalName);
  return `/${folder}/${inv}_${rand}_${safe}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectImageMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 4) {
    const png =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    if (png) return "image/png";
  }

  if (buffer.length >= 3) {
    const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (jpeg) return "image/jpeg";
  }

  if (buffer.length >= 12) {
    const riff =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46;
    const webp =
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;
    if (riff && webp) return "image/webp";
  }

  return null;
}

function getAuthFromCookie(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as TokenPayload;

    if (!decoded?.id) return null;
    return decoded;
  } catch {
    return null;
  }
}

function buildOpenAIAuthHeaders(apiKey: string, openAiOrgId?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  if (openAiOrgId) {
    headers["OpenAI-Organization"] = openAiOrgId;
  }
  return headers;
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

  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message.trim();
  }

  return "";
}

function parseSoraVideoId(value: unknown): string {
  let normalized = normalizeText(value);
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

function resolveSoraSize(aspectRatio: string, resolution: string): string | null {
  const parsedAspectRatio = aspectRatio === "9:16" ? "9:16" : aspectRatio === "16:9" ? "16:9" : null;
  const parsedResolution =
    resolution === "720p" ? "720p" : resolution === "1080p" ? "1080p" : null;

  if (!parsedAspectRatio || !parsedResolution) {
    return null;
  }

  return (
    SORA_SIZE_BY_RESOLUTION_AND_ASPECT_RATIO[parsedResolution]?.[parsedAspectRatio] ||
    null
  );
}

function parseSoraSize(size: string): { width: number; height: number } | null {
  const normalized = normalizeText(size);
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
    throw new Error("Tamanho inválido para referência do Sora.");
  }

  const resized = await sharp(Buffer.from(params.imageBytes))
    .rotate()
    .resize({
      width: parsedSize.width,
      height: parsedSize.height,
      fit: "cover",
      position: "centre",
    })
    .png()
    .toBuffer();

  if (resized.byteLength <= 0) {
    throw new Error("Não foi possível preparar a imagem de referência para o Sora.");
  }

  const base64 = resized.toString("base64");
  return `data:image/png;base64,${base64}`;
}

function getVideoExtensionByMime(mimeType: string) {
  const normalized = normalizeText(mimeType).toLowerCase();
  if (normalized.includes("webm")) return "webm";
  if (normalized.includes("quicktime")) return "mov";
  if (normalized.includes("mpeg")) return "mpeg";
  return "mp4";
}

function getImageExtensionByMime(mimeType: string) {
  const normalized = normalizeText(mimeType).toLowerCase();
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  return "jpg";
}

function buildPromptWithSoraGuardrails(prompt: string) {
  const normalized = normalizeText(prompt);
  if (!normalized) return "";
  return [
    normalized,
    VIDEO_PROMPT_PTBR_GUARDRAIL,
    VIDEO_PROMPT_SORA_QUALITY_GUARDRAIL,
  ].join("\n\n");
}

async function fetchSoraVideoMetadata(params: {
  videoId: string;
  openAiApiKey: string;
  openAiOrgId?: string;
}): Promise<{ response: Response; payload: unknown }> {
  const response = await fetch(
    `${OPENAI_BASE_URL}/videos/${encodeURIComponent(params.videoId)}`,
    {
      method: "GET",
      headers: buildOpenAIAuthHeaders(params.openAiApiKey, params.openAiOrgId),
      cache: "no-store",
    },
  );

  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function fetchSoraVideoContent(params: {
  videoId: string;
  openAiApiKey: string;
  openAiOrgId?: string;
}): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const upstream = await fetch(
    `${OPENAI_BASE_URL}/videos/${encodeURIComponent(params.videoId)}/content`,
    {
      method: "GET",
      headers: buildOpenAIAuthHeaders(params.openAiApiKey, params.openAiOrgId),
      redirect: "follow",
      cache: "no-store",
    },
  );

  if (!upstream.ok) {
    const contentError = new Error(
      "Não foi possível baixar o vídeo gerado no Sora.",
    ) as Error & { status?: number };
    contentError.status = upstream.status;
    throw contentError;
  }

  const contentType =
    upstream.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4";
  if (!contentType.startsWith("video/")) {
    throw new Error("Sora retornou um arquivo inválido para vídeo.");
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("O vídeo retornado pelo Sora está vazio.");
  }

  return {
    bytes,
    mimeType: contentType,
  };
}

export async function POST(req: NextRequest) {
  try {
    const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
    if (!openAiApiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada." },
        { status: 500 },
      );
    }
    const openAiOrgId = process.env.OPENAI_ORG_ID?.trim();

    const body = (await req.json()) as RequestPayload;
    const auth = getAuthFromCookie(req);

    const imageUrl = normalizeText(body.imageUrl);
    const prompt = buildPromptWithSoraGuardrails(normalizeText(body.prompt));
    const model = normalizeText(body.model) || "sora-2";
    const aspectRatio = normalizeText(body.aspectRatio) || "16:9";
    const resolution = normalizeText(body.resolution) || "720p";
    const durationSeconds = Number(body.durationSeconds);
    const modelCapabilities = SORA_CAPABILITIES_BY_MODEL[model];

    if (!imageUrl) {
      return NextResponse.json(
        { error: "A imagem base é obrigatória para gerar o vídeo." },
        { status: 400 },
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "O prompt de vídeo é obrigatório." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MODELS.has(model)) {
      return NextResponse.json(
        { error: "Modelo Sora inválido." },
        { status: 400 },
      );
    }

    if (!ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
      return NextResponse.json(
        { error: "Aspect ratio inválido." },
        { status: 400 },
      );
    }

    if (!modelCapabilities?.resolutions.includes(resolution)) {
      return NextResponse.json(
        { error: `Resolução inválida para ${model}.` },
        { status: 400 },
      );
    }

    if (!modelCapabilities?.durations.includes(durationSeconds)) {
      return NextResponse.json(
        { error: `Duração inválida para ${model}.` },
        { status: 400 },
      );
    }

    const imageRes = await fetch(imageUrl, { cache: "no-store" });
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: "Não foi possível carregar a imagem base para o Sora." },
        { status: 400 },
      );
    }

    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const headerMimeType =
      imageRes.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ||
      "";
    const detectedMimeType = detectImageMimeType(imageBuffer);
    const contentType = ALLOWED_IMAGE_MIME_TYPES.has(headerMimeType)
      ? headerMimeType
      : detectedMimeType || "image/jpeg";

    const size = resolveSoraSize(aspectRatio, resolution);
    if (!size) {
      return NextResponse.json(
        { error: "Combinação de formato e resolução inválida para Sora." },
        { status: 400 },
      );
    }

    const inputReferenceDataUrl = await buildSoraInputReferenceDataUrl({
      imageBytes: new Uint8Array(imageBuffer),
      targetSize: size,
    });

    const startResponse = await fetch(`${OPENAI_BASE_URL}/videos`, {
      method: "POST",
      headers: {
        ...buildOpenAIAuthHeaders(openAiApiKey, openAiOrgId),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        seconds: String(durationSeconds),
        size,
        input_reference: {
          image_url: inputReferenceDataUrl,
        },
      }),
      cache: "no-store",
    });
    const startPayload = await startResponse.json().catch(() => null);

    if (!startResponse.ok) {
      const message =
        extractErrorMessage(startPayload) ||
        "Falha ao iniciar geração de vídeo no Sora.";
      if (startResponse.status === 404) {
        return NextResponse.json(
          {
            error:
              "Modelo/endpoint de vídeo não encontrado para esta chave OpenAI. Verifique acesso ao Sora.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: message },
        {
          status: RETRYABLE_STATUSES.has(startResponse.status)
            ? 503
            : startResponse.status,
        },
      );
    }

    const videoId = parseSoraVideoId(
      (startPayload as { id?: unknown } | null)?.id,
    );
    if (!videoId) {
      return NextResponse.json(
        { error: "Sora não retornou identificador da geração de vídeo." },
        { status: 502 },
      );
    }

    const pollTimeoutMs = 12 * 60 * 1000;
    const pollIntervalMs = 10000;
    const startedAt = Date.now();
    let statusPayload: unknown = null;
    let completed = false;

    while (Date.now() - startedAt < pollTimeoutMs) {
      await sleep(pollIntervalMs);

      const metadataResult = await fetchSoraVideoMetadata({
        videoId,
        openAiApiKey,
        openAiOrgId,
      });

      statusPayload = metadataResult.payload;

      if (!metadataResult.response.ok) {
        const message =
          extractErrorMessage(statusPayload) ||
          "Falha ao consultar status da geração de vídeo no Sora.";
        if (RETRYABLE_STATUSES.has(metadataResult.response.status)) {
          continue;
        }

        return NextResponse.json(
          { error: message },
          { status: metadataResult.response.status },
        );
      }

      const status = normalizeText(
        (statusPayload as { status?: unknown } | null)?.status,
      ).toLowerCase();

      if (TERMINAL_FAILURE_STATUSES.has(status)) {
        const message =
          extractErrorMessage(statusPayload) ||
          "Sora retornou falha na geração do vídeo.";
        return NextResponse.json({ error: message }, { status: 502 });
      }

      if (TERMINAL_SUCCESS_STATUSES.has(status)) {
        completed = true;
        break;
      }
    }

    if (!completed) {
      return NextResponse.json(
        { error: "Tempo limite excedido ao gerar o vídeo com Sora." },
        { status: 504 },
      );
    }

    const fetchedVideo = await fetchSoraVideoContent({
      videoId,
      openAiApiKey,
      openAiOrgId,
    });

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN não configurado." },
        { status: 500 },
      );
    }

    const videoExt = getVideoExtensionByMime(fetchedVideo.mimeType);
    const videoPath = buildNewestFirstPath(
      `ambientacao-video-${Date.now()}.${videoExt}`,
      "ambientador/videos",
    );
    const uploadedVideo = await put(videoPath, Buffer.from(fetchedVideo.bytes), {
      access: "public",
      contentType: fetchedVideo.mimeType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const thumbExt = getImageExtensionByMime(contentType);
    const thumbPath = buildNewestFirstPath(
      `ambientacao-thumb-${Date.now()}.${thumbExt}`,
      "ambientador/thumbs",
    );
    const uploadedThumb = await put(thumbPath, imageBuffer, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const imagem = await prisma.ambientadorImagem.create({
      data: {
        pathname: uploadedVideo.pathname,
        url: uploadedVideo.url,
        model,
        thumbPathname: uploadedThumb.pathname,
        thumbUrl: uploadedThumb.url,
        createdById: auth?.id || null,
      },
      select: { id: true },
    });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "desconhecido";

    await prisma.ambientadorImagemLog.create({
      data: {
        imagemId: imagem.id,
        userId: auth?.id || null,
        ip,
      },
    });

    return NextResponse.json(
      {
        video_url: uploadedVideo.url,
        video_pathname: uploadedVideo.pathname,
        thumb_url: uploadedThumb.url,
        thumb_pathname: uploadedThumb.pathname,
        image_id: imagem.id,
        mime_type: fetchedVideo.mimeType,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Erro ao gerar vídeo do ambientador com Sora:", error);

    const status =
      Number(error?.status) ||
      Number(error?.response?.status) ||
      Number(error?.code) ||
      500;
    const message =
      error?.message ||
      error?.error?.message ||
      "Não foi possível gerar o vídeo com Sora.";

    return NextResponse.json(
      { error: message },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

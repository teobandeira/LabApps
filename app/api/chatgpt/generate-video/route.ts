import { NextRequest, NextResponse } from "next/server";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_VIDEO_MODEL = "veo-3.1-fast-generate-preview";
const MAX_GEMINI_IMAGE_BYTES = 20 * 1024 * 1024;
const DEFAULT_VIDEO_PROMPT =
  "Transforme esta imagem em um video curto, cinematografico e realista, com movimento suave de camera.";
const ALLOWED_ASPECT_RATIOS = new Set(["16:9", "9:16"]);
const ALLOWED_VIDEO_DURATIONS = new Set([4, 6, 8]);
const LOW_VIDEO_RESOLUTION = "720p";

type StartVideoBody = {
  imageUrl?: string;
  prompt?: string;
  model?: string;
  aspectRatio?: string;
  durationSeconds?: number;
  resolution?: string;
};

type StartOperationPayload = {
  name?: string;
  error?: unknown;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
  body: unknown;
}): Promise<{ response: Response; payload: StartOperationPayload | null }> {
  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(params.model)}:predictLongRunning`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": params.geminiApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params.body),
    }
  );

  const payload = (await response.json().catch(() => null)) as StartOperationPayload | null;
  return { response, payload };
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

  const model = DEFAULT_GEMINI_VIDEO_MODEL;
  const prompt = normalizeString(body.prompt) || DEFAULT_VIDEO_PROMPT;
  const aspectRatio = ALLOWED_ASPECT_RATIOS.has(normalizeString(body.aspectRatio))
    ? normalizeString(body.aspectRatio)
    : "16:9";
  const parsedDuration = Number(body.durationSeconds);
  const durationSeconds = ALLOWED_VIDEO_DURATIONS.has(parsedDuration) ? parsedDuration : 6;
  const resolution = LOW_VIDEO_RESOLUTION;

  const { bytes, mimeType } = await fetchImageBytes(imageUrl, request);
  const imageBase64 = Buffer.from(bytes).toString("base64");

  const attemptBodies: Array<{ label: string; body: unknown }> = [
    {
      label: "bytesBase64Encoded",
      body: {
        instances: [
          {
            prompt,
            image: {
              mimeType,
              bytesBase64Encoded: imageBase64,
            },
          },
        ],
        parameters: {
          aspectRatio,
          resolution,
          durationSeconds,
        },
      },
    },
    {
      label: "imageBytes",
      body: {
        instances: [
          {
            prompt,
            image: {
              mimeType,
              imageBytes: imageBase64,
            },
          },
        ],
        parameters: {
          aspectRatio,
          resolution,
          durationSeconds,
        },
      },
    },
    {
      label: "bytesBase64Encoded-noDuration",
      body: {
        instances: [
          {
            prompt,
            image: {
              mimeType,
              bytesBase64Encoded: imageBase64,
            },
          },
        ],
        parameters: {
          aspectRatio,
          resolution,
        },
      },
    },
    {
      label: "imageBytes-noDuration",
      body: {
        instances: [
          {
            prompt,
            image: {
              mimeType,
              imageBytes: imageBase64,
            },
          },
        ],
        parameters: {
          aspectRatio,
          resolution,
        },
      },
    },
  ];

  let fallbackStatus = 502;
  let fallbackMessage = "Falha ao iniciar geracao de video no Gemini.";

  for (const attempt of attemptBodies) {
    const { response, payload } = await startGeminiVideoOperation({
      model,
      geminiApiKey,
      body: attempt.body,
    });

    if (response.ok) {
      const operationName = parseOperationName(payload?.name || "");
      if (operationName) {
        return NextResponse.json({
          done: false,
          operationName,
        });
      }

      fallbackStatus = 502;
      fallbackMessage = "Gemini nao retornou a operacao da geracao de video.";
      continue;
    }

    fallbackStatus = response.status;
    fallbackMessage = extractErrorMessage(payload) || fallbackMessage;

    const errorLower = fallbackMessage.toLowerCase();
    const isRetryableSchemaError =
      (attempt.label === "bytesBase64Encoded" &&
        (errorLower.includes("bytesbase64encoded") ||
          errorLower.includes("unknown name") ||
          errorLower.includes("invalid json payload"))) ||
      (attempt.label === "imageBytes" &&
        (errorLower.includes("imagebytes") ||
          errorLower.includes("unknown name") ||
          errorLower.includes("invalid json payload"))) ||
      (attempt.label === "bytesBase64Encoded-noDuration" &&
        (errorLower.includes("bytesbase64encoded") ||
          errorLower.includes("unknown name") ||
          errorLower.includes("invalid json payload"))) ||
      (attempt.label === "imageBytes-noDuration" &&
        (errorLower.includes("imagebytes") ||
          errorLower.includes("unknown name") ||
          errorLower.includes("invalid json payload")));

    if (!isRetryableSchemaError) {
      break;
    }
  }

  return NextResponse.json({ error: fallbackMessage }, { status: fallbackStatus });
}

async function handleVideoStatus(
  operationNameRaw: string,
  geminiApiKey: string
): Promise<NextResponse> {
  const operationName = parseOperationName(operationNameRaw);
  if (!operationName) {
    return NextResponse.json({ error: "operationName nao informado." }, { status: 400 });
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

  const proxyUrl = `/api/chatgpt/generate-video?videoUri=${encodeURIComponent(videoUri)}`;

  return NextResponse.json({
    done: true,
    operationName,
    videoUrl: proxyUrl,
  });
}

async function handleVideoProxy(videoUriRaw: string, geminiApiKey: string): Promise<NextResponse> {
  const videoUri = normalizeString(videoUriRaw);
  if (!videoUri) {
    return NextResponse.json({ error: "videoUri nao informada." }, { status: 400 });
  }

  let parsedVideoUri: URL;
  try {
    parsedVideoUri = new URL(videoUri);
  } catch {
    return NextResponse.json({ error: "videoUri invalida." }, { status: 400 });
  }

  if (parsedVideoUri.protocol !== "https:" && parsedVideoUri.protocol !== "http:") {
    return NextResponse.json({ error: "Protocolo da videoUri nao suportado." }, { status: 400 });
  }

  if (!isAllowedVideoHost(parsedVideoUri.hostname)) {
    return NextResponse.json({ error: "Hostname da videoUri nao permitido." }, { status: 400 });
  }

  const upstream = await fetch(parsedVideoUri.toString(), {
    method: "GET",
    headers: {
      "x-goog-api-key": geminiApiKey,
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Nao foi possivel baixar o video gerado." }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4";

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="video-gemini-${Date.now()}.mp4"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
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
    return await handleVideoStatus(operationName, geminiApiKey);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao consultar video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_IMAGES_API_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_EDITS_API_URL = "https://api.openai.com/v1/images/edits";
const DEFAULT_TEXT_MODEL = "gpt-5.2";
const DEFAULT_IMAGE_MODEL = "chatgpt-image-latest";
const DEFAULT_IMAGE_SIZE = "1024x1024";
const IMAGE_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);
const MAX_SOURCE_IMAGE_SIZE_BYTES = 50 * 1024 * 1024;
const SUPPORTED_SOURCE_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_FILE_TEXT_CHARS = 30_000;
const MAX_TOTAL_FILE_TEXT_CHARS = 90_000;

const SUPPORTED_FILE_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xml",
  ".yml",
  ".yaml",
  ".log",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".go",
  ".rs",
  ".sql",
  ".html",
  ".css",
  ".scss",
]);

type GenerationMode = "chat" | "image";
type ImageAction = "generate" | "edit";

type ChatRequestBody = {
  prompt?: string;
  model?: string;
  mode?: string;
  imageSize?: string;
  imageAction?: string;
};

type ParsedRequest = {
  prompt: string;
  model: string;
  mode: GenerationMode;
  imageSize: string;
  imageAction: ImageAction;
  sourceImage: File | null;
  files: File[];
};

type PreparedFiles = {
  names: string[];
  sections: string[];
  warnings: string[];
};

type OpenAIOutputContent = {
  type?: string;
  text?: string;
};

type OpenAIOutputItem = {
  content?: OpenAIOutputContent[];
};

function getFileExtension(filename: string): string {
  const lower = filename.toLowerCase();
  const lastDot = lower.lastIndexOf(".");
  return lastDot === -1 ? "" : lower.slice(lastDot);
}

function isSupportedTextFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  if (SUPPORTED_FILE_EXTENSIONS.has(extension)) {
    return true;
  }

  const mimeType = file.type.toLowerCase();
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript"
  );
}

function normalizePrompt(value: FormDataEntryValue | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeModel(): string {
  return DEFAULT_TEXT_MODEL;
}

function normalizeMode(value: FormDataEntryValue | null | undefined): GenerationMode {
  return value === "image" ? "image" : "chat";
}

function normalizeImageSize(value: FormDataEntryValue | null | undefined): string {
  if (typeof value !== "string") {
    return DEFAULT_IMAGE_SIZE;
  }

  const normalized = value.trim();
  return IMAGE_SIZES.has(normalized) ? normalized : DEFAULT_IMAGE_SIZE;
}

function normalizeImageAction(value: FormDataEntryValue | null | undefined): ImageAction {
  return value === "edit" ? "edit" : "generate";
}

function isSupportedSourceImage(file: File): boolean {
  const extension = getFileExtension(file.name);
  if (SUPPORTED_SOURCE_IMAGE_EXTENSIONS.has(extension)) {
    return true;
  }

  const mimeType = file.type.toLowerCase();
  return mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp";
}

async function parseIncomingRequest(request: NextRequest): Promise<ParsedRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File);
    const sourceImageEntry = formData.get("sourceImage");
    const sourceImage = sourceImageEntry instanceof File ? sourceImageEntry : null;

    return {
      prompt: normalizePrompt(formData.get("prompt")),
      model: normalizeModel(),
      mode: normalizeMode(formData.get("mode")),
      imageSize: normalizeImageSize(formData.get("imageSize")),
      imageAction: normalizeImageAction(formData.get("imageAction")),
      sourceImage,
      files,
    };
  }

  const payload = (await request.json()) as ChatRequestBody;
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const model = normalizeModel();
  const mode = payload.mode === "image" ? "image" : "chat";
  const imageSize =
    typeof payload.imageSize === "string" && IMAGE_SIZES.has(payload.imageSize.trim())
      ? payload.imageSize.trim()
      : DEFAULT_IMAGE_SIZE;
  const imageAction = payload.imageAction === "edit" ? "edit" : "generate";

  return { prompt, model, mode, imageSize, imageAction, sourceImage: null, files: [] };
}

async function prepareFileContext(files: File[]): Promise<PreparedFiles> {
  if (files.length > MAX_FILES) {
    throw new Error(`Limite de ${MAX_FILES} arquivos por envio.`);
  }

  const names: string[] = [];
  const sections: string[] = [];
  const warnings: string[] = [];
  let totalChars = 0;

  for (const file of files) {
    if (!isSupportedTextFile(file)) {
      warnings.push(`Arquivo ignorado por tipo nao suportado: ${file.name}`);
      continue;
    }

    if (file.size === 0) {
      warnings.push(`Arquivo vazio ignorado: ${file.name}`);
      continue;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      warnings.push(`Arquivo ignorado por exceder 2MB: ${file.name}`);
      continue;
    }

    let text = (await file.text()).replace(/\u0000/g, "").trim();
    if (!text) {
      warnings.push(`Arquivo sem texto legivel: ${file.name}`);
      continue;
    }

    if (text.length > MAX_FILE_TEXT_CHARS) {
      text = text.slice(0, MAX_FILE_TEXT_CHARS);
      warnings.push(`Arquivo truncado em 30000 caracteres: ${file.name}`);
    }

    if (totalChars >= MAX_TOTAL_FILE_TEXT_CHARS) {
      warnings.push(
        "Limite total de contexto dos arquivos atingido. Arquivos restantes foram ignorados."
      );
      break;
    }

    if (totalChars + text.length > MAX_TOTAL_FILE_TEXT_CHARS) {
      const remaining = MAX_TOTAL_FILE_TEXT_CHARS - totalChars;
      text = text.slice(0, remaining);
      warnings.push(`Contexto total truncado ao incluir: ${file.name}`);
    }

    totalChars += text.length;
    names.push(file.name);
    sections.push(`[Arquivo: ${file.name}]\n${text}`);
  }

  return { names, sections, warnings };
}

function buildInput(prompt: string, fileSections: string[]): string {
  if (fileSections.length === 0) {
    return prompt;
  }

  const intro =
    prompt.length > 0
      ? prompt
      : "Analise os arquivos anexados e responda em portugues de forma objetiva.";

  return [
    intro,
    "",
    "Arquivos anexados pelo usuario:",
    ...fileSections.map((section, index) => `\n### Anexo ${index + 1}\n${section}`),
  ].join("\n");
}

function extractOutputText(output: unknown): string {
  if (!Array.isArray(output)) {
    return "";
  }

  const parts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const castItem = item as OpenAIOutputItem;
    if (!Array.isArray(castItem.content)) {
      continue;
    }

    for (const content of castItem.content) {
      if (content.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY nao configurada no ambiente." },
        { status: 500 }
      );
    }

    let parsedRequest: ParsedRequest;
    try {
      parsedRequest = await parseIncomingRequest(request);
    } catch {
      return NextResponse.json(
        {
          error:
            "Body invalido. Envie JSON ou multipart/form-data com prompt, modo e arquivos.",
        },
        { status: 400 }
      );
    }

    const authHeaders: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };

    if (process.env.OPENAI_ORG_ID) {
      authHeaders["OpenAI-Organization"] = process.env.OPENAI_ORG_ID;
    }

    const jsonHeaders: Record<string, string> = {
      ...authHeaders,
      "Content-Type": "application/json",
    };

    const { prompt, model, mode, imageSize, imageAction, sourceImage, files } = parsedRequest;

    if (mode === "image") {
      if (!prompt) {
        return NextResponse.json(
          { error: "Prompt obrigatorio para gerar imagem." },
          { status: 400 }
        );
      }

      let imageResponse: Response;
      if (imageAction === "edit") {
        if (!sourceImage) {
          return NextResponse.json(
            { error: "Envie uma imagem base para editar." },
            { status: 400 }
          );
        }

        if (sourceImage.size <= 0) {
          return NextResponse.json(
            { error: "A imagem enviada esta vazia." },
            { status: 400 }
          );
        }

        if (sourceImage.size > MAX_SOURCE_IMAGE_SIZE_BYTES) {
          return NextResponse.json(
            { error: "A imagem enviada excede o limite de 50MB." },
            { status: 400 }
          );
        }

        if (!isSupportedSourceImage(sourceImage)) {
          return NextResponse.json(
            { error: "Formato da imagem nao suportado. Use PNG, JPG/JPEG ou WEBP." },
            { status: 400 }
          );
        }

        const editPayload = new FormData();
        editPayload.append("model", DEFAULT_IMAGE_MODEL);
        editPayload.append("prompt", prompt);
        editPayload.append("size", imageSize);
        editPayload.append("image", sourceImage, sourceImage.name || "image.png");

        imageResponse = await fetch(OPENAI_IMAGE_EDITS_API_URL, {
          method: "POST",
          headers: authHeaders,
          body: editPayload,
        });
      } else {
        imageResponse = await fetch(OPENAI_IMAGES_API_URL, {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({
            model: DEFAULT_IMAGE_MODEL,
            prompt,
            size: imageSize,
          }),
        });
      }

      const imageResult = (await imageResponse.json()) as {
        error?: { message?: string };
        data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
      };

      if (!imageResponse.ok) {
        return NextResponse.json(
          {
            error: imageResult.error?.message ?? "Falha ao gerar imagem na API da OpenAI.",
          },
          { status: imageResponse.status }
        );
      }

      const firstImage = imageResult.data?.[0];
      const imageUrl =
        typeof firstImage?.url === "string"
          ? firstImage.url
          : typeof firstImage?.b64_json === "string"
            ? `data:image/png;base64,${firstImage.b64_json}`
            : "";

      if (!imageUrl) {
        return NextResponse.json(
          { error: "A API nao retornou imagem." },
          { status: 502 }
        );
      }

      const warnings: string[] = [];
      if (files.length > 0) {
        warnings.push("Arquivos foram ignorados no modo imagem.");
      }

      return NextResponse.json({
        mode: "image",
        answer: imageAction === "edit" ? "Imagem modificada com sucesso." : "Imagem gerada com sucesso.",
        imageUrl,
        revisedPrompt: firstImage?.revised_prompt ?? null,
        warnings,
      });
    }

    let preparedFiles: PreparedFiles;
    try {
      preparedFiles = await prepareFileContext(files);
    } catch (prepareError) {
      const message =
        prepareError instanceof Error
          ? prepareError.message
          : "Erro ao processar arquivos enviados.";

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const hasPrompt = prompt.length > 0;
    const hasFileContext = preparedFiles.sections.length > 0;

    if (!hasPrompt && !hasFileContext) {
      return NextResponse.json(
        { error: "Envie um prompt ou pelo menos um arquivo de texto valido." },
        { status: 400 }
      );
    }

    const input = buildInput(prompt, preparedFiles.sections);

    const textResponse = await fetch(OPENAI_RESPONSES_API_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        model,
        input,
      }),
    });

    const textResult = (await textResponse.json()) as {
      error?: { message?: string };
      output_text?: string;
      output?: unknown;
    };

    if (!textResponse.ok) {
      return NextResponse.json(
        {
          error: textResult.error?.message ?? "Falha ao chamar a API da OpenAI.",
        },
        { status: textResponse.status }
      );
    }

    const answer =
      typeof textResult.output_text === "string" && textResult.output_text.trim().length > 0
        ? textResult.output_text.trim()
        : extractOutputText(textResult.output);

    if (!answer) {
      return NextResponse.json(
        { error: "A API retornou resposta vazia." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      mode: "chat",
      answer,
      filesUsed: preparedFiles.names,
      warnings: preparedFiles.warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado no servidor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

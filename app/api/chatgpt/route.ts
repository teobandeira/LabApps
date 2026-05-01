import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { read, utils } from "xlsx";

import {
  IMAGE_GENERATION_CREDIT_COST,
  consumeCredits,
  hasEnoughCredits,
  normalizeDeviceId,
} from "@/lib/chatgpt-credits";
import { prisma } from "@/lib/prisma";

const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_IMAGES_API_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_EDITS_API_URL = "https://api.openai.com/v1/images/edits";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_TEXT_MODEL = "gpt-5.2";
const DEFAULT_IMAGE_MODEL = "gpt-image-1.5";
const ALLOWED_IMAGE_MODELS = new Set([
  "gpt-image-1.5",
  "chatgpt-image-latest",
  "gpt-image-1",
  "gpt-image-1-mini",
  "nano_banana",
  "gpt_image",
]);
const DEFAULT_IMAGE_SIZE = "1024x1024";
const IMAGE_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536", "1024x1792", "1792x1024"]);
const SAVED_IMAGE_MAX_DIMENSION = 1280;
const SAVED_IMAGE_WEBP_QUALITY = 82;
const MAX_SOURCE_IMAGE_SIZE_BYTES = 50 * 1024 * 1024;
const SUPPORTED_SOURCE_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const MAX_FILES = 5;
const MAX_DEFAULT_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_PDF_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_FILE_TEXT_CHARS = 30_000;
const MAX_TOTAL_FILE_TEXT_CHARS = 90_000;
const MAX_CHAT_HISTORY_MESSAGES = 20;
const MAX_CHAT_HISTORY_MESSAGE_CHARS = 4_000;
const MAX_CHAT_HISTORY_TOTAL_CHARS = 24_000;
const MAX_TABLE_PREVIEW_SHEETS = 3;
const MAX_TABLE_PREVIEW_ROWS = 12;
const MAX_TABLE_PREVIEW_COLUMNS = 12;
const EXCEL_FILE_EXTENSIONS = new Set([".xls", ".xlsx", ".xlsm", ".xlsb", ".ods"]);
const PDF_FILE_EXTENSIONS = new Set([".pdf"]);

type GenerationMode = "chat" | "image";
type ImageAction = "generate" | "edit";
type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  prompt?: string;
  model?: string;
  mode?: string;
  imageSize?: string;
  imageAction?: string;
  chatHistory?: unknown;
  deviceId?: unknown;
  requestId?: unknown;
};

type ParsedRequest = {
  prompt: string;
  model: string;
  mode: GenerationMode;
  imageSize: string;
  imageAction: ImageAction;
  sourceImage: File | null;
  files: File[];
  chatHistory: ChatHistoryMessage[];
  deviceId: string;
  requestId: string;
};

type PreparedTable = {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: string[][];
  rowCount: number;
  rowsTruncated: boolean;
  columnsTruncated: boolean;
};

type PreparedFiles = {
  names: string[];
  sections: string[];
  warnings: string[];
  tables: PreparedTable[];
};

type OpenAIOutputContent = {
  type?: string;
  text?: string;
};

type OpenAIOutputItem = {
  content?: OpenAIOutputContent[];
};

type ChatStreamChunk =
  | {
      type: "meta";
      warnings: string[];
      filesUsed: string[];
      tables?: PreparedTable[];
    }
  | {
      type: "delta";
      delta: string;
    }
  | {
      type: "done";
    }
  | {
      type: "error";
      error: string;
    };

type ResolvedGeneratedImage = {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
  openaiImageUrl: string | null;
};

type PersistedGeneratedImage = {
  recordId: string;
  blobUrl: string;
};

type BlobAccessMode = "public" | "private";

function extensionFromImageContentType(contentType: string): string {
  const normalized = contentType.toLowerCase();

  if (normalized.includes("image/jpeg") || normalized.includes("image/jpg")) {
    return "jpg";
  }
  if (normalized.includes("image/webp")) {
    return "webp";
  }
  if (normalized.includes("image/gif")) {
    return "gif";
  }
  if (normalized.includes("image/avif")) {
    return "avif";
  }
  if (normalized.includes("image/svg+xml")) {
    return "svg";
  }
  return "png";
}

function parseImageDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,([\s\S]+)$/);
  if (!match) {
    return null;
  }

  const contentType = (match[1] || "image/png").toLowerCase();
  const payload = match[2] || "";

  try {
    return {
      bytes: Uint8Array.from(Buffer.from(payload, "base64")),
      contentType,
    };
  } catch {
    return null;
  }
}

async function resolveGeneratedImage(imageUrl: string): Promise<ResolvedGeneratedImage> {
  if (imageUrl.startsWith("data:")) {
    const parsedDataUrl = parseImageDataUrl(imageUrl);
    if (!parsedDataUrl) {
      throw new Error("Data URL da imagem gerada e invalida.");
    }

    if (!parsedDataUrl.contentType.startsWith("image/")) {
      throw new Error("Data URL retornado nao contem imagem valida.");
    }

    if (parsedDataUrl.bytes.byteLength === 0) {
      throw new Error("A imagem gerada veio vazia.");
    }

    return {
      bytes: parsedDataUrl.bytes,
      contentType: parsedDataUrl.contentType,
      extension: extensionFromImageContentType(parsedDataUrl.contentType),
      openaiImageUrl: null,
    };
  }

  const upstreamResponse = await fetch(imageUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!upstreamResponse.ok) {
    throw new Error("Nao foi possivel baixar a imagem gerada para salvar no Blob.");
  }

  const contentTypeHeader = upstreamResponse.headers.get("content-type");
  const contentType = (contentTypeHeader?.split(";")[0]?.trim() || "image/png").toLowerCase();

  if (!contentType.startsWith("image/")) {
    throw new Error("A URL retornada pela OpenAI nao aponta para uma imagem valida.");
  }

  const bytes = new Uint8Array(await upstreamResponse.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("A imagem gerada veio vazia.");
  }

  return {
    bytes,
    contentType,
    extension: extensionFromImageContentType(contentType),
    openaiImageUrl: imageUrl,
  };
}

async function optimizeGeneratedImage(
  image: ResolvedGeneratedImage
): Promise<ResolvedGeneratedImage> {
  try {
    const inputBuffer = Buffer.from(image.bytes);
    const optimizedBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: SAVED_IMAGE_MAX_DIMENSION,
        height: SAVED_IMAGE_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: SAVED_IMAGE_WEBP_QUALITY, effort: 6 })
      .toBuffer();

    if (optimizedBuffer.byteLength <= 0 || optimizedBuffer.byteLength >= inputBuffer.byteLength) {
      return image;
    }

    return {
      ...image,
      bytes: new Uint8Array(optimizedBuffer),
      contentType: "image/webp",
      extension: "webp",
    };
  } catch {
    // Fallback seguro para nao interromper o fluxo de geracao.
    return image;
  }
}

function buildGeneratedImageBlobPath(extension: string): string {
  const datePath = new Date().toISOString().slice(0, 10);
  return `chatgpt/generated/${datePath}/${crypto.randomUUID()}.${extension}`;
}

function getBlobAccessCandidates(): BlobAccessMode[] {
  const accessFromEnv = process.env.BLOB_ACCESS?.trim().toLowerCase();
  if (accessFromEnv === "private") {
    return ["private", "public"];
  }
  if (accessFromEnv === "public") {
    return ["public", "private"];
  }
  return ["public", "private"];
}

function isBlobAccessCompatibilityError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("cannot use public access on a private store") ||
    message.includes("cannot use private access on a public store")
  );
}

async function persistGeneratedImage(params: {
  deviceId: string;
  imageUrl: string;
  prompt: string;
  revisedPrompt: string | null;
  imageSize: string;
  imageModel: string;
  imageAction: ImageAction;
  sourceImageName: string | null;
}): Promise<PersistedGeneratedImage> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    throw new Error("BLOB_READ_WRITE_TOKEN nao configurado no ambiente.");
  }

  const resolvedImage = await resolveGeneratedImage(params.imageUrl);
  const optimizedImage = await optimizeGeneratedImage(resolvedImage);
  const blobPath = buildGeneratedImageBlobPath(optimizedImage.extension);
  const blobBody = new Blob([Uint8Array.from(optimizedImage.bytes)], {
    type: optimizedImage.contentType,
  });

  const accessCandidates = getBlobAccessCandidates();
  let blob: Awaited<ReturnType<typeof put>> | null = null;
  let lastError: unknown = null;

  for (const accessMode of accessCandidates) {
    try {
      blob = await put(blobPath, blobBody, {
        access: accessMode,
        contentType: optimizedImage.contentType,
        token: blobToken,
        addRandomSuffix: false,
      });
      break;
    } catch (uploadError) {
      lastError = uploadError;
      if (!isBlobAccessCompatibilityError(uploadError)) {
        throw uploadError;
      }
    }
  }

  if (!blob) {
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error("Falha ao salvar imagem no Blob.");
  }

  const savedImage = await prisma.generatedImage.create({
    data: {
      deviceId: params.deviceId,
      prompt: params.prompt,
      revisedPrompt: params.revisedPrompt,
      model: params.imageModel,
      size: params.imageSize,
      action: params.imageAction,
      sourceImageName: params.sourceImageName,
      openaiImageUrl: optimizedImage.openaiImageUrl,
      blobUrl: blob.url,
      blobPath: blob.pathname,
      mimeType: optimizedImage.contentType,
      bytes: optimizedImage.bytes.byteLength,
    },
  });

  return {
    recordId: savedImage.id,
    blobUrl: blob.url,
  };
}

function getFileExtension(filename: string): string {
  const lower = filename.toLowerCase();
  const lastDot = lower.lastIndexOf(".");
  return lastDot === -1 ? "" : lower.slice(lastDot);
}

function getMaxFileSizeBytes(file: File): number {
  const extension = getFileExtension(file.name);
  if (PDF_FILE_EXTENSIONS.has(extension)) {
    return MAX_PDF_FILE_SIZE_BYTES;
  }
  return MAX_DEFAULT_FILE_SIZE_BYTES;
}

function formatMegabyteLimit(sizeInBytes: number): string {
  return `${Math.floor(sizeInBytes / (1024 * 1024))}MB`;
}

type ExtractedFile = {
  text: string;
  warnings: string[];
  tables: PreparedTable[];
};

function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

async function extractFileText(file: File): Promise<ExtractedFile> {
  const extension = getFileExtension(file.name);
  if (PDF_FILE_EXTENSIONS.has(extension)) {
    return extractPdfText(file);
  }
  if (EXCEL_FILE_EXTENSIONS.has(extension)) {
    return extractSpreadsheetText(file);
  }

  const raw = (await file.text()).replace(/\u0000/g, "");
  return { text: raw.trim(), warnings: [], tables: [] };
}

async function extractPdfText(file: File): Promise<ExtractedFile> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdfParse(buffer);
    const text = typeof result?.text === "string" ? result.text.replace(/\u0000/g, "").trim() : "";

    if (!text) {
      return {
        text: "",
        warnings: [`PDF ${file.name} nao retornou texto legivel.`],
        tables: [],
      };
    }

    return {
      text,
      warnings: [],
      tables: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao ler PDF.";
    return {
      text: "",
      warnings: [`Nao foi possivel ler o PDF ${file.name}: ${message}`],
      tables: [],
    };
  }
}

async function extractSpreadsheetText(file: File): Promise<ExtractedFile> {
  try {
    const workbook = read(Buffer.from(await file.arrayBuffer()), {
      type: "buffer",
      cellDates: true,
    });

    const sections: string[] = [];
    const tables: PreparedTable[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        continue;
      }

      const csv = utils.sheet_to_csv(sheet, { blankrows: false });
      if (!csv.trim()) {
        continue;
      }

      sections.push(`Planilha ${sheetName}:\n${csv}`);

      if (tables.length >= MAX_TABLE_PREVIEW_SHEETS) {
        continue;
      }

      const rawRows = utils.sheet_to_json(sheet, {
        header: 1,
        blankrows: false,
        defval: "",
      }) as unknown[][];

      if (rawRows.length === 0) {
        continue;
      }

      const maxColumnsRaw = Math.max(
        0,
        ...rawRows.map((row) => (Array.isArray(row) ? row.length : 0))
      );
      if (maxColumnsRaw === 0) {
        continue;
      }

      const columnCount = Math.min(maxColumnsRaw, MAX_TABLE_PREVIEW_COLUMNS);
      const columnsTruncated = maxColumnsRaw > columnCount;

      const normalizedRows = rawRows.map((row) => {
        const cells = Array.isArray(row) ? row : [];
        return Array.from({ length: columnCount }, (_, columnIndex) =>
          normalizeCellValue(cells[columnIndex])
        );
      });

      const headerRow = normalizedRows[0] ?? Array.from({ length: columnCount }, () => "");
      const hasHeaderLabels = headerRow.some((cell) => cell.trim().length > 0);

      const headers = hasHeaderLabels
        ? headerRow.map((cell, index) => (cell.trim() ? cell : `Col ${index + 1}`))
        : Array.from({ length: columnCount }, (_, index) => `Col ${index + 1}`);

      const dataRows = hasHeaderLabels ? normalizedRows.slice(1) : normalizedRows;
      const totalRowCount = dataRows.length;

      const rowsTruncated = totalRowCount > MAX_TABLE_PREVIEW_ROWS;
      const limitedRows = dataRows.slice(0, Math.min(dataRows.length, MAX_TABLE_PREVIEW_ROWS));

      tables.push({
        fileName: file.name,
        sheetName,
        headers,
        rows: limitedRows,
        rowCount: totalRowCount,
        rowsTruncated,
        columnsTruncated,
      });
    }

    const text = sections.join("\n\n").trim();
    if (!text) {
      return {
        text: "",
        warnings: [`Planilha ${file.name} nao tem dados legiveis.`],
        tables,
      };
    }

    return { text, warnings: [], tables };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao ler planilha.";
    return {
      text: "",
      warnings: [`Nao foi possivel ler o arquivo ${file.name}: ${message}`],
      tables: [],
    };
  }
}

function normalizePrompt(value: FormDataEntryValue | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTextModel(): string {
  return DEFAULT_TEXT_MODEL;
}

function normalizeImageModel(value: FormDataEntryValue | string | null | undefined): string {
  if (typeof value !== "string") {
    return DEFAULT_IMAGE_MODEL;
  }

  const normalized = value.trim();
  if (normalized === "gpt_image") {
    return "gpt-image-1.5";
  }
  return ALLOWED_IMAGE_MODELS.has(normalized) ? normalized : DEFAULT_IMAGE_MODEL;
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

function parseImageSize(size: string): { width: number; height: number } | null {
  const match = /^(\d+)x(\d+)$/.exec(size.trim());
  if (!match) {
    return null;
  }

  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

async function normalizeSourceImageForEdit(
  sourceImage: File,
  imageSize: string
): Promise<File> {
  const targetSize = parseImageSize(imageSize);
  if (!targetSize) {
    return sourceImage;
  }

  const inputBuffer = Buffer.from(await sourceImage.arrayBuffer());
  const outputBuffer = await sharp(inputBuffer, { failOn: "none" })
    .rotate()
    .resize(targetSize.width, targetSize.height, {
      fit: "cover",
      position: "centre",
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  if (outputBuffer.byteLength <= 0) {
    return sourceImage;
  }

  const originalName = sourceImage.name || "image";
  const baseName = originalName.replace(/\.[^.]+$/, "");
  const normalizedName = `${baseName || "image"}.png`;
  return new File([Uint8Array.from(outputBuffer)], normalizedName, { type: "image/png" });
}

function normalizeImageAction(value: FormDataEntryValue | null | undefined): ImageAction {
  return value === "edit" ? "edit" : "generate";
}

function normalizeRequestId(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  return normalized.slice(0, 191);
}

function normalizeChatHistory(value: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: ChatHistoryMessage[] = [];
  let totalChars = 0;

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      continue;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      continue;
    }

    if (totalChars >= MAX_CHAT_HISTORY_TOTAL_CHARS) {
      break;
    }

    const clippedByMessage = trimmedContent.slice(0, MAX_CHAT_HISTORY_MESSAGE_CHARS);
    const remaining = MAX_CHAT_HISTORY_TOTAL_CHARS - totalChars;
    const clippedContent = clippedByMessage.slice(0, remaining);
    if (!clippedContent) {
      break;
    }

    normalized.push({ role, content: clippedContent });
    totalChars += clippedContent.length;
  }

  return normalized.slice(-MAX_CHAT_HISTORY_MESSAGES);
}

function parseChatHistoryFromFormData(
  value: FormDataEntryValue | null | undefined
): ChatHistoryMessage[] {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    return normalizeChatHistory(JSON.parse(value));
  } catch {
    return [];
  }
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

    const mode = normalizeMode(formData.get("mode"));
    const model =
      mode === "image"
        ? normalizeImageModel(formData.get("model"))
        : normalizeTextModel();

    return {
      prompt: normalizePrompt(formData.get("prompt")),
      model,
      mode,
      imageSize: normalizeImageSize(formData.get("imageSize")),
      imageAction: normalizeImageAction(formData.get("imageAction")),
      sourceImage,
      files,
      chatHistory: parseChatHistoryFromFormData(formData.get("chatHistory")),
      deviceId: normalizeDeviceId(formData.get("deviceId")),
      requestId: normalizeRequestId(formData.get("requestId")),
    };
  }

  const payload = (await request.json()) as ChatRequestBody;
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const mode = payload.mode === "image" ? "image" : "chat";
  const model =
    mode === "image" ? normalizeImageModel(payload.model) : normalizeTextModel();
  const imageSize =
    typeof payload.imageSize === "string" && IMAGE_SIZES.has(payload.imageSize.trim())
      ? payload.imageSize.trim()
      : DEFAULT_IMAGE_SIZE;
  const imageAction = payload.imageAction === "edit" ? "edit" : "generate";

  return {
    prompt,
    model,
    mode,
    imageSize,
    imageAction,
    sourceImage: null,
    files: [],
    chatHistory: normalizeChatHistory(payload.chatHistory),
    deviceId: normalizeDeviceId(payload.deviceId),
    requestId: normalizeRequestId(payload.requestId),
  };
}

async function prepareFileContext(files: File[]): Promise<PreparedFiles> {
  if (files.length > MAX_FILES) {
    throw new Error(`Limite de ${MAX_FILES} arquivos por envio.`);
  }

  const names: string[] = [];
  const sections: string[] = [];
  const warnings: string[] = [];
  const tables: PreparedTable[] = [];
  let totalChars = 0;

  for (const file of files) {
    if (file.size === 0) {
      warnings.push(`Arquivo vazio ignorado: ${file.name}`);
      continue;
    }

    const maxFileSizeBytes = getMaxFileSizeBytes(file);
    if (file.size > maxFileSizeBytes) {
      warnings.push(
        `Arquivo ignorado por exceder ${formatMegabyteLimit(maxFileSizeBytes)}: ${file.name}`
      );
      continue;
    }

    const extraction = await extractFileText(file);
    if (extraction.warnings.length > 0) {
      warnings.push(...extraction.warnings);
    }

    if (extraction.tables.length > 0) {
      tables.push(...extraction.tables);
    }

    if (!extraction.text) {
      if (extraction.warnings.length === 0) {
        warnings.push(`Arquivo sem texto legivel: ${file.name}`);
      }
      continue;
    }

    let text = extraction.text;

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

  return { names, sections, warnings, tables };
}

function buildInput(prompt: string, fileSections: string[], chatHistory: ChatHistoryMessage[]): string {
  const sections: string[] = [];

  if (chatHistory.length > 0) {
    sections.push(
      "Contexto da conversa anterior (ordem cronologica):",
      ...chatHistory.map(
        (message, index) =>
          `${index + 1}. ${message.role === "user" ? "Usuario" : "Assistente"}: ${message.content}`
      ),
      ""
    );
  }

  if (fileSections.length > 0) {
    sections.push(
      "Arquivos anexados pelo usuario:",
      ...fileSections.map((section, index) => `\n### Anexo ${index + 1}\n${section}`),
      ""
    );
  }

  sections.push(
    "Mensagem atual do usuario:",
    prompt.length > 0
      ? prompt
      : "Analise os arquivos anexados e responda em portugues de forma objetiva."
  );

  sections.push(
    "",
    "Formato obrigatorio da resposta:",
    "- Quando houver codigo, use bloco Markdown com crases triplas e linguagem (ex: ```bash).",
    "- Para comandos curtos no meio do texto, use `inline code`."
  );

  return sections.join("\n");
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

function extractOutputTextDeltaFromStreamEvent(eventPayload: unknown): string {
  if (!eventPayload || typeof eventPayload !== "object") {
    return "";
  }

  const event = eventPayload as {
    type?: unknown;
    delta?: unknown;
    text?: unknown;
  };
  const eventType = typeof event.type === "string" ? event.type : "";

  if (
    eventType.includes("output_text") &&
    eventType.endsWith(".delta") &&
    typeof event.delta === "string"
  ) {
    return event.delta;
  }

  if (eventType === "response.output_text.delta" && typeof event.text === "string") {
    return event.text;
  }

  return "";
}

function extractOutputTextFromStreamEvent(eventPayload: unknown): string {
  if (!eventPayload || typeof eventPayload !== "object") {
    return "";
  }

  const event = eventPayload as {
    type?: unknown;
    text?: unknown;
    output_text?: unknown;
    response?: unknown;
  };
  const eventType = typeof event.type === "string" ? event.type : "";

  if (
    eventType.includes("output_text") &&
    eventType.endsWith(".done") &&
    typeof event.text === "string"
  ) {
    return event.text.trim();
  }

  if (typeof event.output_text === "string" && event.output_text.trim().length > 0) {
    return event.output_text.trim();
  }

  if (event.response && typeof event.response === "object") {
    const response = event.response as {
      output_text?: unknown;
      output?: unknown;
    };

    if (typeof response.output_text === "string" && response.output_text.trim().length > 0) {
      return response.output_text.trim();
    }

    const extracted = extractOutputText(response.output);
    if (extracted) {
      return extracted;
    }
  }

  return "";
}

function extractStreamErrorFromEvent(eventPayload: unknown): string {
  if (!eventPayload || typeof eventPayload !== "object") {
    return "";
  }

  const event = eventPayload as {
    type?: unknown;
    error?: unknown;
    response?: unknown;
  };
  const eventType = typeof event.type === "string" ? event.type : "";
  const isErrorEvent =
    eventType === "error" ||
    eventType.endsWith(".error") ||
    eventType === "response.failed";

  if (!isErrorEvent) {
    return "";
  }

  if (typeof event.error === "string" && event.error.trim().length > 0) {
    return event.error.trim();
  }

  if (event.error && typeof event.error === "object") {
    const errorMessage = (event.error as { message?: unknown }).message;
    if (typeof errorMessage === "string" && errorMessage.trim().length > 0) {
      return errorMessage.trim();
    }
  }

  if (event.response && typeof event.response === "object") {
    const responseError = (event.response as { error?: unknown }).error;
    if (typeof responseError === "string" && responseError.trim().length > 0) {
      return responseError.trim();
    }

    if (responseError && typeof responseError === "object") {
      const message = (responseError as { message?: unknown }).message;
      if (typeof message === "string" && message.trim().length > 0) {
        return message.trim();
      }
    }
  }

  return "Falha no streaming da API da OpenAI.";
}

export async function POST(request: NextRequest) {
  try {
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
    const streamRequested = request.nextUrl.searchParams.get("stream") === "1";

    const { prompt, model, mode, imageSize, imageAction, sourceImage, files, chatHistory, deviceId, requestId } =
      parsedRequest;

    if (mode === "image") {
      if (!deviceId) {
        return NextResponse.json(
          { error: "deviceId obrigatorio para gerar imagem." },
          { status: 400 }
        );
      }
      if (!prompt) {
        return NextResponse.json(
          { error: "Prompt obrigatorio para gerar imagem." },
          { status: 400 }
        );
      }
      const hasCredits = await hasEnoughCredits(deviceId, IMAGE_GENERATION_CREDIT_COST);
      if (!hasCredits) {
        return NextResponse.json(
          { error: "Saldo insuficiente. Sao necessarios 1 credito para gerar imagem." },
          { status: 402 }
        );
      }
      let imageUrl = "";
      let revisedPrompt: string | null = null;

      if (model === "nano_banana") {
        const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
        if (!geminiApiKey) {
          return NextResponse.json(
            { error: "GEMINI_API_KEY nao configurada no ambiente." },
            { status: 500 }
          );
        }

        const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

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

          let normalizedSourceImage = sourceImage;
          try {
            normalizedSourceImage = await normalizeSourceImageForEdit(sourceImage, imageSize);
          } catch {
            return NextResponse.json(
              { error: "Nao foi possivel preparar a imagem enviada para edicao." },
              { status: 400 }
            );
          }

          if (normalizedSourceImage.size > MAX_SOURCE_IMAGE_SIZE_BYTES) {
            return NextResponse.json(
              { error: "A imagem enviada excede o limite de 50MB apos o ajuste." },
              { status: 400 }
            );
          }

          const imageBytes = Buffer.from(await normalizedSourceImage.arrayBuffer()).toString("base64");
          parts.push({
            inlineData: {
              data: imageBytes,
              mimeType: normalizedSourceImage.type || "image/png",
            },
          });
        }

        parts.push({ text: prompt });

        const geminiResponse = await fetch(
          `${GEMINI_BASE_URL}/models/nano-banana-pro-preview:generateContent?key=${encodeURIComponent(
            geminiApiKey
          )}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: {
                responseModalities: ["IMAGE"],
              },
            }),
          }
        );

        const geminiJson = (await geminiResponse.json().catch(() => null)) as
          | {
              error?: { message?: string };
              candidates?: Array<{
                content?: { parts?: Array<{ inlineData?: { data?: string } }> };
              }>;
            }
          | null;

        if (!geminiResponse.ok) {
          return NextResponse.json(
            {
              error:
                geminiJson?.error?.message || "Falha ao gerar imagem na API do Gemini.",
            },
            { status: geminiResponse.status || 500 }
          );
        }

        const base64 =
          geminiJson?.candidates?.[0]?.content?.parts?.find((part) => !!part.inlineData?.data)
            ?.inlineData?.data || "";
        imageUrl = base64 ? `data:image/png;base64,${base64}` : "";
      } else {
        const apiKey = process.env.OPENAI_API_KEY?.trim();
        if (!apiKey) {
          return NextResponse.json(
            { error: "OPENAI_API_KEY nao configurada no ambiente." },
            { status: 500 }
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

          let normalizedSourceImage = sourceImage;
          try {
            normalizedSourceImage = await normalizeSourceImageForEdit(sourceImage, imageSize);
          } catch {
            return NextResponse.json(
              { error: "Nao foi possivel preparar a imagem enviada para edicao." },
              { status: 400 }
            );
          }

          if (normalizedSourceImage.size > MAX_SOURCE_IMAGE_SIZE_BYTES) {
            return NextResponse.json(
              { error: "A imagem enviada excede o limite de 50MB apos o ajuste." },
              { status: 400 }
            );
          }

          const editPayload = new FormData();
          editPayload.append("model", model);
          editPayload.append("prompt", prompt);
          editPayload.append("size", imageSize);
          editPayload.append(
            "image",
            normalizedSourceImage,
            normalizedSourceImage.name || "image.png"
          );

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
              model,
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
        imageUrl =
          typeof firstImage?.url === "string"
            ? firstImage.url
            : typeof firstImage?.b64_json === "string"
              ? `data:image/png;base64,${firstImage.b64_json}`
              : "";
        revisedPrompt =
          typeof firstImage?.revised_prompt === "string" ? firstImage.revised_prompt : null;
      }

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

      let persistedImageUrl = imageUrl;
      let storedImageId: string | null = null;

      try {
        const persistedImage = await persistGeneratedImage({
          deviceId,
          imageUrl,
          prompt,
          revisedPrompt,
          imageSize,
          imageModel: model,
          imageAction,
          sourceImageName: sourceImage?.name ?? null,
        });

        persistedImageUrl = `/api/chatgpt/generated-image/${persistedImage.recordId}?deviceId=${encodeURIComponent(
          deviceId
        )}`;
        storedImageId = persistedImage.recordId;
      } catch (persistError) {
        const persistErrorMessage =
          persistError instanceof Error
            ? persistError.message
            : "Erro ao salvar imagem no Blob/DB.";

        warnings.push(`Imagem gerada, mas nao foi salva no Blob/DB: ${persistErrorMessage}`);
      }

      const consumeResult = await consumeCredits({
        deviceId,
        amount: IMAGE_GENERATION_CREDIT_COST,
        reason: imageAction === "edit" ? "Geracao de imagem (edicao)." : "Geracao de imagem.",
        referenceType: "image_generation",
        referenceId: storedImageId ?? undefined,
        requestId: requestId || undefined,
      });
      if (!consumeResult.ok) {
        return NextResponse.json(
          { error: "Saldo insuficiente. Sao necessarios 1 credito para gerar imagem." },
          { status: 402 }
        );
      }

      return NextResponse.json({
        mode: "image",
        answer: imageAction === "edit" ? "Imagem modificada com sucesso." : "Imagem gerada com sucesso.",
        imageUrl: persistedImageUrl,
        revisedPrompt,
        storedImageId,
        warnings,
        creditsBalance: consumeResult.balance,
      });
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY nao configurada no ambiente." },
        { status: 500 }
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

    const input = buildInput(prompt, preparedFiles.sections, chatHistory);

    if (streamRequested) {
      const streamResponse = await fetch(OPENAI_RESPONSES_API_URL, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          model,
          input,
          stream: true,
        }),
        signal: request.signal,
      });

      if (!streamResponse.ok) {
        const streamErrorPayload = (await streamResponse.json()) as {
          error?: { message?: string };
        };

        return NextResponse.json(
          {
            error: streamErrorPayload.error?.message ?? "Falha ao chamar a API da OpenAI.",
          },
          { status: streamResponse.status }
        );
      }

      if (!streamResponse.body) {
        return NextResponse.json(
          { error: "A API de streaming retornou corpo vazio." },
          { status: 502 }
        );
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const upstreamReader = streamResponse.body.getReader();

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const emit = (chunk: ChatStreamChunk) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
          };
          let hasEmittedText = false;

          try {
            emit({
              type: "meta",
              warnings: preparedFiles.warnings,
              filesUsed: preparedFiles.names,
              tables: preparedFiles.tables,
            });

            let buffer = "";
            while (true) {
              const { done, value } = await upstreamReader.read();
              if (done) {
                break;
              }

              buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

              while (true) {
                const eventBoundary = buffer.indexOf("\n\n");
                if (eventBoundary < 0) {
                  break;
                }

                const rawEvent = buffer.slice(0, eventBoundary);
                buffer = buffer.slice(eventBoundary + 2);

                const dataPayload = rawEvent
                  .split("\n")
                  .filter((line) => line.startsWith("data:"))
                  .map((line) => line.slice(5).trimStart())
                  .join("\n");

                if (!dataPayload) {
                  continue;
                }

                if (dataPayload === "[DONE]") {
                  if (!hasEmittedText) {
                    throw new Error(
                      "A API da OpenAI encerrou o streaming sem texto de resposta."
                    );
                  }
                  emit({ type: "done" });
                  controller.close();
                  return;
                }

                let parsedEvent: unknown;
                try {
                  parsedEvent = JSON.parse(dataPayload) as unknown;
                } catch {
                  // Ignora eventos nao-JSON.
                  continue;
                }

                const streamErrorMessage = extractStreamErrorFromEvent(parsedEvent);
                if (streamErrorMessage) {
                  throw new Error(streamErrorMessage);
                }

                const delta = extractOutputTextDeltaFromStreamEvent(parsedEvent);
                if (delta) {
                  hasEmittedText = true;
                  emit({ type: "delta", delta });
                  continue;
                }

                if (!hasEmittedText) {
                  const finalText = extractOutputTextFromStreamEvent(parsedEvent);
                  if (finalText) {
                    hasEmittedText = true;
                    emit({ type: "delta", delta: finalText });
                  }
                }
              }
            }

            const remainingPayload = buffer.trim();
            if (remainingPayload) {
              const remainingDataPayload = remainingPayload
                .split("\n")
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trimStart())
                .join("\n");

              if (remainingDataPayload && remainingDataPayload !== "[DONE]") {
                let parsedEvent: unknown;
                try {
                  parsedEvent = JSON.parse(remainingDataPayload) as unknown;
                } catch {
                  // Ignora payload final invalido.
                  parsedEvent = null;
                }

                if (parsedEvent) {
                  const streamErrorMessage = extractStreamErrorFromEvent(parsedEvent);
                  if (streamErrorMessage) {
                    throw new Error(streamErrorMessage);
                  }

                  const delta = extractOutputTextDeltaFromStreamEvent(parsedEvent);
                  if (delta) {
                    hasEmittedText = true;
                    emit({ type: "delta", delta });
                  } else if (!hasEmittedText) {
                    const finalText = extractOutputTextFromStreamEvent(parsedEvent);
                    if (finalText) {
                      hasEmittedText = true;
                      emit({ type: "delta", delta: finalText });
                    }
                  }
                }
              }
            }

            if (!hasEmittedText) {
              throw new Error(
                "A API da OpenAI encerrou o streaming sem texto de resposta."
              );
            }

            emit({ type: "done" });
            controller.close();
          } catch (streamError) {
            emit({
              type: "error",
              error:
                streamError instanceof Error
                  ? streamError.message
                  : "Erro ao transmitir resposta em streaming.",
            });
            controller.close();
          } finally {
            upstreamReader.releaseLock();
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const textResponse = await fetch(OPENAI_RESPONSES_API_URL, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        model,
        input,
      }),
      signal: request.signal,
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
      tables: preparedFiles.tables,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado no servidor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

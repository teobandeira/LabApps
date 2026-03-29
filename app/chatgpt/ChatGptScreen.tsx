"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  MdAutoFixHigh,
  MdArrowUpward,
  MdArrowDownward,
  MdArrowBack,
  MdAttachFile,
  MdChevronLeft,
  MdChevronRight,
  MdContentCopy,
  MdDeleteOutline,
  MdClose,
  MdDone,
  MdDownload,
  MdFullscreen,
  MdImage,
  MdMenu,
  MdMovie,
  MdMoreVert,
  MdStop,
} from "react-icons/md";
import { SiOpenai } from "react-icons/si";

type GenerationMode = "chat" | "image";
type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";
type ThemeMode = "dark" | "light";

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  imageId?: string;
  tables?: TablePreview[];
};

type GeneratedImageHistoryItem = {
  id: string;
  imageUrl: string;
  createdAt: string;
  prompt: string;
  revisedPrompt: string | null;
  model: string;
  size: string;
  action: "generate" | "edit";
};

type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};

type ChatGptScreenProps = {
  mode: GenerationMode;
};

type MessageContentSegment = {
  type: "text" | "code";
  content: string;
  language?: string;
};

type TablePreview = {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: string[][];
  rowCount: number;
  rowsTruncated: boolean;
  columnsTruncated: boolean;
};

type CodeTokenType =
  | "plain"
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "builtin"
  | "function"
  | "operator";

type CodeToken = {
  text: string;
  type: CodeTokenType;
};

type VideoAspectRatio = "16:9" | "9:16";
type VideoDurationSeconds = 4 | 6 | 8;

type VideoGenerationModalSource = {
  targetKey: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: VideoAspectRatio;
  durationSeconds: VideoDurationSeconds;
  title: string;
  subtitle: string;
};

type ChatStreamChunk =
  | {
      type: "delta";
      delta: string;
    }
  | {
      type: "meta";
      warnings?: string[];
      filesUsed?: string[];
      tables?: TablePreview[];
    }
  | {
      type: "done";
    }
  | {
      type: "error";
      error: string;
    };

const MAX_FILES = 5;

const IMAGE_SIZE_OPTIONS: Array<{ label: string; value: ImageSize }> = [
  { label: "Quadrada 1024x1024", value: "1024x1024" },
  { label: "Paisagem 1536x1024", value: "1536x1024" },
  { label: "Retrato 1024x1536", value: "1024x1536" },
];
const VIDEO_ASPECT_RATIO_OPTIONS: Array<{ label: string; value: VideoAspectRatio }> = [
  { label: "Paisagem 16:9", value: "16:9" },
  { label: "Vertical 9:16", value: "9:16" },
];
const VIDEO_DURATION_OPTIONS: VideoDurationSeconds[] = [4, 6, 8];
const CHAT_TEXT_MODEL_LABEL = "gpt-5.2";
const IMAGE_MODEL_LABEL = "chatgpt-image-latest";
const THEME_STORAGE_KEY = "chatgpt-theme-mode";
const CHAT_FONT_SIZE_STORAGE_KEY = "chatgpt-chat-font-large";
const CHAT_DEVICE_ID_STORAGE_KEY = "chatgpt-device-id-v1";
const CHAT_PROMPT_MAX_HEIGHT = 176;
const IMAGE_PROMPT_MAX_HEIGHT = 220;
const CHAT_AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 88;
const CHAT_SESSION_TITLE_MAX_LENGTH = 56;
const CHAT_SESSION_PREVIEW_MAX_LENGTH = 82;
const CHAT_TITLE_NOISE_PREFIXES = [
  "arquivos enviados:",
  "arquivos usados no contexto:",
  "acao:",
  "resolucao:",
  "imagem base:",
  "prompt revisado:",
  "nao consegui processar agora",
];
const CODE_KEYWORDS_BY_LANGUAGE: Record<string, string[]> = {
  javascript: [
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "for",
    "while",
    "switch",
    "case",
    "break",
    "continue",
    "try",
    "catch",
    "finally",
    "class",
    "extends",
    "new",
    "import",
    "from",
    "export",
    "default",
    "async",
    "await",
    "throw",
    "typeof",
    "instanceof",
    "in",
    "of",
    "true",
    "false",
    "null",
    "undefined",
  ],
  python: [
    "def",
    "return",
    "if",
    "elif",
    "else",
    "for",
    "while",
    "in",
    "try",
    "except",
    "finally",
    "class",
    "import",
    "from",
    "as",
    "with",
    "lambda",
    "yield",
    "raise",
    "and",
    "or",
    "not",
    "is",
    "None",
    "True",
    "False",
  ],
  bash: [
    "if",
    "then",
    "else",
    "fi",
    "for",
    "in",
    "do",
    "done",
    "case",
    "esac",
    "while",
    "until",
    "function",
    "export",
    "local",
    "readonly",
    "echo",
    "source",
    "set",
    "cd",
    "mkdir",
    "rm",
    "cp",
    "mv",
    "cat",
  ],
  sql: [
    "select",
    "from",
    "where",
    "join",
    "left",
    "right",
    "inner",
    "outer",
    "on",
    "and",
    "or",
    "not",
    "insert",
    "into",
    "values",
    "update",
    "set",
    "delete",
    "create",
    "table",
    "alter",
    "drop",
    "group",
    "by",
    "order",
    "limit",
    "having",
    "as",
    "distinct",
    "count",
    "sum",
    "avg",
    "min",
    "max",
    "true",
    "false",
    "null",
  ],
  json: ["true", "false", "null"],
};
const CODE_BUILTINS_BY_LANGUAGE: Record<string, string[]> = {
  javascript: ["console", "Promise", "Array", "Object", "JSON", "Math", "Date"],
  python: ["print", "len", "range", "str", "int", "float", "dict", "list"],
  bash: ["sudo", "npm", "node", "npx", "git", "curl", "wget", "docker"],
  sql: [],
  json: [],
};
const CODE_FUNCTION_NAME_REGEX = /^[A-Za-z_$][\w$]*$/;
const CODE_OPERATOR_TOKEN_REGEX =
  /^(?:===|!==|==|!=|<=|>=|=>|\+\+|--|&&|\|\||\?\?|[-+*/%=<>!&|^~?:]+|[{}()[\].,;])$/;
const BIBLE_LOADING_VERSES = [
  "Tudo posso naquele que me fortalece. (Filipenses 4:13)",
  "O Senhor e o meu pastor; nada me faltara. (Salmos 23:1)",
  "Entrega o teu caminho ao Senhor; confia nele. (Salmos 37:5)",
  "Buscai primeiro o Reino de Deus. (Mateus 6:33)",
  "A minha graca te basta. (2 Corintios 12:9)",
  "Alegrai-vos na esperanca. (Romanos 12:12)",
  "Sede fortes e corajosos. (Josue 1:9)",
  "Em paz me deito e logo adormeco. (Salmos 4:8)",
  "O choro pode durar uma noite, mas a alegria vem pela manha. (Salmos 30:5)",
  "Lancando sobre ele toda a vossa ansiedade. (1 Pedro 5:7)",
  "Nao temas, porque eu sou contigo. (Isaias 41:10)",
  "Bem-aventurados os pacificadores. (Mateus 5:9)",
  "O Senhor e a minha luz e a minha salvacao. (Salmos 27:1)",
  "Clama a mim, e responder-te-ei. (Jeremias 33:3)",
  "O Senhor pelejara por vos. (Exodo 14:14)",
  "O amor jamais acaba. (1 Corintios 13:8)",
  "Em tudo dai gracas. (1 Tessalonicenses 5:18)",
  "A fe vem pelo ouvir. (Romanos 10:17)",
  "O justo vivera pela fe. (Romanos 1:17)",
  "Perto esta o Senhor dos que tem o coracao quebrantado. (Salmos 34:18)",
  "Guarda o teu coracao. (Proverbios 4:23)",
  "O temor do Senhor e o principio da sabedoria. (Proverbios 9:10)",
  "Melhor e confiar no Senhor do que confiar no homem. (Salmos 118:8)",
  "A resposta branda desvia o furor. (Proverbios 15:1)",
  "O Senhor firma os passos de um homem bom. (Salmos 37:23)",
  "Se Deus e por nos, quem sera contra nos? (Romanos 8:31)",
  "Nao andeis ansiosos por coisa alguma. (Filipenses 4:6)",
  "A palavra de Deus e viva e eficaz. (Hebreus 4:12)",
  "O Senhor e bom, fortaleza no dia da angustia. (Naum 1:7)",
  "Tudo tem o seu tempo determinado. (Eclesiastes 3:1)",
  "A alegria do Senhor e a vossa forca. (Neemias 8:10)",
  "O Senhor sustenta todos os que caem. (Salmos 145:14)",
  "O meu socorro vem do Senhor. (Salmos 121:2)",
  "Bem-aventurado o homem que confia no Senhor. (Jeremias 17:7)",
  "Orai sem cessar. (1 Tessalonicenses 5:17)",
  "Vigiai e orai. (Mateus 26:41)",
  "Sede imitadores de Deus. (Efesios 5:1)",
  "O Senhor e fiel para cumprir. (1 Tessalonicenses 5:24)",
  "Deus e amor. (1 Joao 4:8)",
  "O Senhor e minha rocha e minha fortaleza. (Salmos 18:2)",
  "Bem-aventurados os limpos de coracao. (Mateus 5:8)",
  "Pedi, e dar-se-vos-a. (Mateus 7:7)",
  "A tua palavra e lampada para os meus pes. (Salmos 119:105)",
  "O Senhor esta perto de todos os que o invocam. (Salmos 145:18)",
  "Regozijai-vos sempre no Senhor. (Filipenses 4:4)",
  "Nao te deixarei nem te desampararei. (Hebreus 13:5)",
  "O fruto do Espirito e amor, alegria e paz. (Galatas 5:22)",
  "O Senhor e misericordioso e compassivo. (Salmos 103:8)",
  "Feliz e o povo cujo Deus e o Senhor. (Salmos 144:15)",
  "Eu sou o caminho, a verdade e a vida. (Joao 14:6)",
];

function getRandomBibleVerse(previous?: string): string {
  if (BIBLE_LOADING_VERSES.length === 1) {
    return BIBLE_LOADING_VERSES[0];
  }

  let verse = BIBLE_LOADING_VERSES[Math.floor(Math.random() * BIBLE_LOADING_VERSES.length)];
  while (verse === previous) {
    verse = BIBLE_LOADING_VERSES[Math.floor(Math.random() * BIBLE_LOADING_VERSES.length)];
  }
  return verse;
}

function getFilenameFromContentDisposition(headerValue: string | null): string {
  if (!headerValue) {
    return `imagem-${Date.now()}.png`;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const simpleMatch = headerValue.match(/filename="?([^";]+)"?/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1];
  }

  return `imagem-${Date.now()}.png`;
}

function formatCreatedAt(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Data indisponivel";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

function getVideoAspectRatioFromImageSize(sizeValue?: string | null): VideoAspectRatio {
  const cleanedSize = typeof sizeValue === "string" ? sizeValue.trim().toLowerCase() : "";
  if (!cleanedSize.includes("x")) {
    return "16:9";
  }

  const [widthRaw, heightRaw] = cleanedSize.split("x");
  const width = Number.parseInt(widthRaw || "", 10);
  const height = Number.parseInt(heightRaw || "", 10);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "16:9";
  }

  return height > width ? "9:16" : "16:9";
}

function getHistoryVideoTargetKey(historyId: string): string {
  return `history:${historyId}`;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function getChatSessionTitle(messages: ChatMessage[]): string {
  const userMessages = messages
    .filter((message) => message.role === "user" && message.content.trim().length > 0)
    .slice()
    .reverse();

  const assistantMessages = messages
    .filter((message) => message.role === "assistant" && message.content.trim().length > 0)
    .slice()
    .reverse();

  const candidates = [...userMessages, ...assistantMessages];

  for (const candidate of candidates) {
    const withoutCodeBlocks = candidate.content
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1");

    const textParts = withoutCodeBlocks.split(/\n|[.!?]\s+/g);

    for (const part of textParts) {
      const normalized = part
        .replace(/[#>*_~[\]()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (normalized.length < 8) {
        continue;
      }

      const lowerNormalized = normalized.toLowerCase();
      const isNoise = CHAT_TITLE_NOISE_PREFIXES.some((prefix) =>
        lowerNormalized.startsWith(prefix)
      );

      if (isNoise) {
        continue;
      }

      return truncateText(normalized, CHAT_SESSION_TITLE_MAX_LENGTH);
    }
  }

  return "Novo chat";
}

function getChatSessionPreview(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return "Sem mensagens ainda";
  }

  const lastMessage = messages[messages.length - 1];
  const content = lastMessage.content
    .replace(/\s+/g, " ")
    .trim();

  if (!content) {
    return lastMessage.role === "user" ? "Mensagem do usuario" : "Resposta do assistente";
  }

  return truncateText(content, CHAT_SESSION_PREVIEW_MAX_LENGTH);
}

function createChatSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `chat-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function createMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `message-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function isNearChatBottom(container: HTMLDivElement): boolean {
  const distanceToBottom =
    container.scrollHeight - container.scrollTop - container.clientHeight;
  return distanceToBottom <= CHAT_AUTO_SCROLL_BOTTOM_THRESHOLD_PX;
}

function getOrCreateChatDeviceId(): string {
  if (typeof window === "undefined") {
    return createChatSessionId();
  }

  try {
    const stored = window.localStorage.getItem(CHAT_DEVICE_ID_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
  } catch {
    // ignore storage issues
  }

  const nextId = createChatSessionId();
  try {
    window.localStorage.setItem(CHAT_DEVICE_ID_STORAGE_KEY, nextId);
  } catch {
    // ignore storage issues
  }

  return nextId;
}

async function fetchChatSessionsFromDb(deviceId: string): Promise<ChatSession[]> {
  const response = await fetch(`/api/chatgpt/chats?deviceId=${encodeURIComponent(deviceId)}`, {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    sessions?: unknown;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Falha ao carregar chats salvos.");
  }

  return normalizeStoredChatSessions(payload.sessions);
}

async function createChatSessionOnDb(deviceId: string): Promise<ChatSession> {
  const response = await fetch("/api/chatgpt/chats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ deviceId }),
  });

  const payload = (await response.json()) as {
    session?: unknown;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Falha ao criar chat.");
  }

  const normalized = normalizeStoredChatSessions(payload.session ? [payload.session] : []);
  if (normalized.length === 0) {
    throw new Error("Falha ao criar chat.");
  }

  return normalized[0];
}

async function saveChatSessionOnDb(deviceId: string, session: ChatSession): Promise<void> {
  const response = await fetch(`/api/chatgpt/chats/${encodeURIComponent(session.id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceId,
      title: session.title,
      messages: session.messages.map((message) => ({
        role: message.role,
        content: message.content,
        imageUrl: message.imageUrl,
        imageId: message.imageId,
      })),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Falha ao salvar chat.");
  }
}

async function deleteChatSessionOnDb(deviceId: string, sessionId: string): Promise<void> {
  const response = await fetch(
    `/api/chatgpt/chats/${encodeURIComponent(sessionId)}?deviceId=${encodeURIComponent(deviceId)}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Falha ao excluir chat.");
  }
}

function normalizeStoredChatSessions(input: unknown): ChatSession[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const sessions: ChatSession[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const castItem = item as {
      id?: unknown;
      title?: unknown;
      updatedAt?: unknown;
      messages?: unknown;
    };

    if (typeof castItem.id !== "string" || castItem.id.trim().length === 0) {
      continue;
    }

    const normalizedMessages: ChatMessage[] = [];
    if (Array.isArray(castItem.messages)) {
      for (const rawMessage of castItem.messages) {
        if (!rawMessage || typeof rawMessage !== "object") {
          continue;
        }

        const castMessage = rawMessage as {
          id?: unknown;
          role?: unknown;
          content?: unknown;
          imageUrl?: unknown;
          imageId?: unknown;
        };

        if (
          (castMessage.role !== "user" && castMessage.role !== "assistant") ||
          typeof castMessage.content !== "string"
        ) {
          continue;
        }

        normalizedMessages.push({
          id: typeof castMessage.id === "string" && castMessage.id.trim().length > 0
            ? castMessage.id
            : createMessageId(),
          role: castMessage.role,
          content: castMessage.content,
          imageUrl: typeof castMessage.imageUrl === "string" ? castMessage.imageUrl : undefined,
          imageId: typeof castMessage.imageId === "string" ? castMessage.imageId : undefined,
        });
      }
    }

    const normalizedTitle =
      typeof castItem.title === "string" && castItem.title.trim().length > 0
        ? truncateText(castItem.title.trim(), CHAT_SESSION_TITLE_MAX_LENGTH)
        : getChatSessionTitle(normalizedMessages);

    const normalizedUpdatedAt =
      typeof castItem.updatedAt === "string" && castItem.updatedAt.trim().length > 0
        ? castItem.updatedAt
        : new Date().toISOString();

    sessions.push({
      id: castItem.id,
      title: normalizedTitle,
      updatedAt: normalizedUpdatedAt,
      messages: normalizedMessages,
    });
  }

  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function parseMessageContentSegments(content: string): MessageContentSegment[] {
  const normalized = content.replace(/\r\n/g, "\n");
  const segments: MessageContentSegment[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g;
  let currentIndex = 0;
  let match: RegExpExecArray | null = codeBlockRegex.exec(normalized);

  while (match) {
    const [fullMatch, languageMatch, codeMatch] = match;
    const blockStart = match.index;
    const blockEnd = blockStart + fullMatch.length;

    if (blockStart > currentIndex) {
      const textChunk = normalized.slice(currentIndex, blockStart);
      if (textChunk) {
        segments.push({
          type: "text",
          content: textChunk,
        });
      }
    }

    segments.push({
      type: "code",
      content: (codeMatch ?? "").replace(/\n$/, ""),
      language: languageMatch?.trim() || undefined,
    });

    currentIndex = blockEnd;
    match = codeBlockRegex.exec(normalized);
  }

  if (currentIndex < normalized.length) {
    segments.push({
      type: "text",
      content: normalized.slice(currentIndex),
    });
  }

  if (segments.length === 0) {
    return [{ type: "text", content: normalized }];
  }

  return segments;
}

function normalizeCodeLanguage(language?: string): string {
  const normalized = (language || "").toLowerCase().trim();

  if (["js", "jsx", "ts", "tsx", "typescript", "javascript"].includes(normalized)) {
    return "javascript";
  }
  if (["py", "python"].includes(normalized)) {
    return "python";
  }
  if (["bash", "sh", "shell", "zsh"].includes(normalized)) {
    return "bash";
  }
  if (["sql", "mysql", "postgresql", "postgres"].includes(normalized)) {
    return "sql";
  }
  if (["json", "jsonc"].includes(normalized)) {
    return "json";
  }

  return normalized || "text";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCodeTokenRegex(language: string): RegExp {
  const keywords = CODE_KEYWORDS_BY_LANGUAGE[language] ?? [];
  const keywordsPattern =
    keywords.length > 0 ? `\\b(?:${keywords.map(escapeRegex).join("|")})\\b` : "";
  const builtins = CODE_BUILTINS_BY_LANGUAGE[language] ?? [];
  const builtinsPattern =
    builtins.length > 0 ? `\\b(?:${builtins.map(escapeRegex).join("|")})\\b` : "";
  const functionPattern = "\\b[A-Za-z_$][\\w$]*(?=\\s*\\()";
  const operatorPattern =
    "===|!==|==|!=|<=|>=|=>|\\+\\+|--|&&|\\|\\||\\?\\?|[-+*/%=<>!&|^~?:]+|[{}()\\[\\].,;]";
  const commentPattern =
    language === "python" || language === "bash"
      ? "#.*$"
      : language === "sql"
        ? "--.*$"
        : language === "json"
          ? ""
          : "//.*$";

  const pieces = [commentPattern, "\"(?:[^\"\\\\]|\\\\.)*\"", "'(?:[^'\\\\]|\\\\.)*'", "`(?:[^`\\\\]|\\\\.)*`"];
  if (keywordsPattern) {
    pieces.push(keywordsPattern);
  }
  if (builtinsPattern) {
    pieces.push(builtinsPattern);
  }
  pieces.push(functionPattern);
  pieces.push("\\b\\d+(?:\\.\\d+)?\\b");
  pieces.push(operatorPattern);

  const pattern = pieces.filter(Boolean).join("|");
  if (language === "sql") {
    return new RegExp(pattern, "gi");
  }
  return new RegExp(pattern, "g");
}

function getTokenType(token: string, language: string): CodeTokenType {
  const lowerToken = token.toLowerCase();
  const keywordSet = new Set((CODE_KEYWORDS_BY_LANGUAGE[language] ?? []).map((item) => item.toLowerCase()));
  const builtinSet = new Set((CODE_BUILTINS_BY_LANGUAGE[language] ?? []).map((item) => item.toLowerCase()));

  if (
    token.startsWith("//") ||
    token.startsWith("#") ||
    token.startsWith("--")
  ) {
    return "comment";
  }

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'")) ||
    (token.startsWith("`") && token.endsWith("`"))
  ) {
    return "string";
  }

  if (/^\d+(?:\.\d+)?$/.test(token)) {
    return "number";
  }

  if (keywordSet.has(lowerToken)) {
    return "keyword";
  }

  if (builtinSet.has(lowerToken)) {
    return "builtin";
  }

  if (CODE_FUNCTION_NAME_REGEX.test(token)) {
    return "function";
  }

  if (CODE_OPERATOR_TOKEN_REGEX.test(token)) {
    return "operator";
  }

  return "plain";
}

function tokenizeCodeLine(line: string, language: string): CodeToken[] {
  const regex = getCodeTokenRegex(language);
  const tokens: CodeToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(line);

  while (match) {
    const tokenText = match[0];
    const index = match.index;

    if (index > lastIndex) {
      tokens.push({
        text: line.slice(lastIndex, index),
        type: "plain",
      });
    }

    tokens.push({
      text: tokenText,
      type: getTokenType(tokenText, language),
    });

    lastIndex = index + tokenText.length;

    if (regex.lastIndex <= index) {
      regex.lastIndex = index + 1;
    }

    match = regex.exec(line);
  }

  if (lastIndex < line.length) {
    tokens.push({
      text: line.slice(lastIndex),
      type: "plain",
    });
  }

  if (tokens.length === 0) {
    return [{ text: line, type: "plain" }];
  }

  return tokens;
}

const MODE_COPY: Record<
  GenerationMode,
  {
    title: string;
    subtitle: string;
    placeholder: string;
    cta: string;
    hint: string;
    topTag: string;
  }
> = {
  chat: {
    title: "ChatGPT",
    subtitle: "Converse com a IA usando texto e anexos",
    placeholder: "Pergunte alguma coisa",
    cta: "Enviar",
    hint: "",
    topTag: "Modo Chat",
  },
  image: {
    title: "Gerador de Imagens",
    subtitle: "Descreva a cena e gere imagens com IA",
    placeholder: "Descreva a imagem que voce quer gerar...",
    cta: "Gerar imagem",
    hint: "",
    topTag: "Modo Imagem",
  },
};

export default function ChatGptScreen({ mode }: ChatGptScreenProps) {
  const copy = MODE_COPY[mode];
  const [messages, setMessages] = useState<ChatMessage[]>(
    mode === "chat"
      ? []
      : [{ role: "assistant", content: "Pronto para criar imagens. Descreva o resultado que voce quer." }]
  );
  const [prompt, setPrompt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imageSize, setImageSize] = useState<ImageSize>("1024x1024");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [videoGenerationTarget, setVideoGenerationTarget] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("");
  const [generatedVideoByHistoryId, setGeneratedVideoByHistoryId] = useState<
    Record<string, string>
  >({});
  const [latestImagePrompt, setLatestImagePrompt] = useState("");
  const [loadingVerse, setLoadingVerse] = useState<string>(() => getRandomBibleVerse());
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [isLargeChatFont, setIsLargeChatFont] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generatedHistory, setGeneratedHistory] = useState<GeneratedImageHistoryItem[]>([]);
  const [loadingGeneratedHistory, setLoadingGeneratedHistory] = useState(false);
  const [generatedHistoryWarning, setGeneratedHistoryWarning] = useState("");
  const [videoGenerationModalSource, setVideoGenerationModalSource] =
    useState<VideoGenerationModalSource | null>(null);
  const [videoGenerationPromptInput, setVideoGenerationPromptInput] = useState("");
  const [videoGenerationAspectRatioInput, setVideoGenerationAspectRatioInput] =
    useState<VideoAspectRatio>("16:9");
  const [videoGenerationDurationInput, setVideoGenerationDurationInput] =
    useState<VideoDurationSeconds>(6);
  const [historyLightboxIndex, setHistoryLightboxIndex] = useState<number | null>(null);
  const [previewLightboxImageUrl, setPreviewLightboxImageUrl] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatDeviceId, setChatDeviceId] = useState<string>("");
  const [chatSessionsLoaded, setChatSessionsLoaded] = useState(false);
  const [isMobileChatSidebarOpen, setIsMobileChatSidebarOpen] = useState(false);
  const [chatIdPendingDelete, setChatIdPendingDelete] = useState<string | null>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [isChatStreamActive, setIsChatStreamActive] = useState(false);
  const [isChatNearBottom, setIsChatNearBottom] = useState(true);
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceImageInputRef = useRef<HTMLInputElement>(null);
  const chatPromptRef = useRef<HTMLTextAreaElement>(null);
  const imagePromptRef = useRef<HTMLTextAreaElement>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const codeCopyResetTimeoutRef = useRef<number | null>(null);
  const chatStreamAbortRef = useRef<AbortController | null>(null);
  const chatSyncTimeoutRef = useRef<number | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const historyVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const canSend =
    (mode === "image"
      ? prompt.trim().length > 0
      : Boolean(activeChatId) && (prompt.trim().length > 0 || selectedFiles.length > 0)) && !loading;
  const canStopChatStream = mode === "chat" && loading && isChatStreamActive;

  function setChatAutoScrollState(shouldAutoScroll: boolean) {
    shouldAutoScrollRef.current = shouldAutoScroll;
    setIsChatNearBottom((current) => (current === shouldAutoScroll ? current : shouldAutoScroll));
  }

  useEffect(() => {
    if (mode !== "chat" || !shouldAutoScrollRef.current) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [mode, messages, loading]);

  useEffect(() => {
    if (mode !== "chat" || !chatPromptRef.current) {
      return;
    }
    autoResizeChatPrompt(chatPromptRef.current);
  }, [mode, prompt]);

  useEffect(() => {
    if (mode !== "image" || !imagePromptRef.current) {
      return;
    }
    autoResizeImagePrompt(imagePromptRef.current);
  }, [mode, prompt]);

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme);
      }
    } catch {
      // ignore storage issues
    }
  }, []);

  useEffect(() => {
    try {
      const storedFontMode = window.localStorage.getItem(CHAT_FONT_SIZE_STORAGE_KEY);
      if (storedFontMode === "1") {
        setIsLargeChatFont(true);
      }
      if (storedFontMode === "0") {
        setIsLargeChatFont(false);
      }
    } catch {
      // ignore storage issues
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage issues
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_FONT_SIZE_STORAGE_KEY, isLargeChatFont ? "1" : "0");
    } catch {
      // ignore storage issues
    }
  }, [isLargeChatFont]);

  useEffect(() => {
    return () => {
      if (codeCopyResetTimeoutRef.current !== null) {
        window.clearTimeout(codeCopyResetTimeoutRef.current);
      }

      if (chatStreamAbortRef.current) {
        chatStreamAbortRef.current.abort();
        chatStreamAbortRef.current = null;
      }

      if (chatSyncTimeoutRef.current !== null) {
        window.clearTimeout(chatSyncTimeoutRef.current);
        chatSyncTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== "chat") {
      return;
    }

    let active = true;
    setChatSessionsLoaded(false);

    async function bootstrapChatSessions() {
      const deviceId = getOrCreateChatDeviceId();
      if (!active) {
        return;
      }

      setChatDeviceId(deviceId);

      try {
        let sessions = await fetchChatSessionsFromDb(deviceId);
        if (sessions.length === 0) {
          const createdSession = await createChatSessionOnDb(deviceId);
          sessions = [createdSession];
        }

        if (!active) {
          return;
        }

        setChatAutoScrollState(true);
        setChatSessions(sessions);
        setActiveChatId(sessions[0]?.id ?? null);
        setMessages(sessions[0]?.messages ?? []);
      } catch {
        if (!active) {
          return;
        }

        setChatAutoScrollState(true);
        setChatSessions([]);
        setActiveChatId(null);
        setMessages([]);
        setError("Nao foi possivel carregar chats do banco agora.");
      } finally {
        if (active) {
          setChatSessionsLoaded(true);
        }
      }
    }

    void bootstrapChatSessions();

    return () => {
      active = false;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "chat" || !chatSessionsLoaded || !chatDeviceId || !activeChatId) {
      return;
    }

    const activeSession = chatSessions.find((session) => session.id === activeChatId);
    if (!activeSession) {
      return;
    }

    if (chatSyncTimeoutRef.current !== null) {
      window.clearTimeout(chatSyncTimeoutRef.current);
      chatSyncTimeoutRef.current = null;
    }

    chatSyncTimeoutRef.current = window.setTimeout(() => {
      void saveChatSessionOnDb(chatDeviceId, activeSession).catch(() => {
        setError("Nao foi possivel salvar o chat no banco.");
      });
    }, 550);

    return () => {
      if (chatSyncTimeoutRef.current !== null) {
        window.clearTimeout(chatSyncTimeoutRef.current);
        chatSyncTimeoutRef.current = null;
      }
    };
  }, [mode, chatSessions, chatSessionsLoaded, chatDeviceId, activeChatId]);

  useEffect(() => {
    if (!isTopMenuOpen) {
      return;
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsTopMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isTopMenuOpen]);

  useEffect(() => {
    if (!isMobileChatSidebarOpen && !chatIdPendingDelete) {
      return;
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (!isDeletingChat) {
        setChatIdPendingDelete(null);
      }
      setIsMobileChatSidebarOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileChatSidebarOpen, chatIdPendingDelete, isDeletingChat]);

  useEffect(() => {
    if (mode !== "image") {
      return;
    }

    let active = true;
    setLoadingGeneratedHistory(true);
    setGeneratedHistoryWarning("");

    async function loadGeneratedHistory() {
      try {
        const response = await fetch("/api/chatgpt/generated-images", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as {
          images?: GeneratedImageHistoryItem[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Falha ao carregar historico de imagens.");
        }

        const images = Array.isArray(data.images) ? data.images : [];
        if (!active) {
          return;
        }

        setGeneratedHistory(images);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Nao foi possivel carregar historico de imagens.";
        setGeneratedHistoryWarning(message);
      } finally {
        if (active) {
          setLoadingGeneratedHistory(false);
        }
      }
    }

    void loadGeneratedHistory();

    return () => {
      active = false;
    };
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPrompt = prompt.trim();

    if (loading) {
      return;
    }

    if (mode === "image" && !cleanPrompt) {
      return;
    }

    if (mode === "chat" && !cleanPrompt && selectedFiles.length === 0) {
      return;
    }

    if (mode === "chat" && !activeChatId) {
      return;
    }

    const filesToSend = mode === "chat" ? [...selectedFiles] : [];
    const sourceImageToSend = mode === "image" ? sourceImage : null;
    const imageAction = mode === "image" && sourceImageToSend ? "edit" : "generate";
    const chatHistoryToSend =
      mode === "chat"
        ? messages
            .filter(
              (message) =>
                (message.role === "user" || message.role === "assistant") &&
                message.content.trim().length > 0
            )
            .map((message) => ({
              role: message.role,
              content: message.content.trim(),
            }))
            .slice(-20)
        : [];
    const userMessageParts: string[] = [];

    if (mode === "image") {
      setLatestImagePrompt(cleanPrompt);
      setGeneratedVideoUrl("");
    }

    if (cleanPrompt) {
      userMessageParts.push(cleanPrompt);
    }

    if (mode === "image") {
      userMessageParts.push(
        `Acao: ${imageAction === "edit" ? "modificar imagem enviada" : "gerar imagem nova"}`
      );
      userMessageParts.push(`Resolucao: ${imageSize}`);
      if (sourceImageToSend) {
        userMessageParts.push(`Imagem base: ${sourceImageToSend.name}`);
      }
    }

    if (mode === "chat" && filesToSend.length > 0) {
      userMessageParts.push(
        `Arquivos enviados: ${filesToSend.map((file) => file.name).join(", ")}`
      );
    }

    if (mode === "chat") {
      setChatAutoScrollState(true);
      setPrompt("");
    }
    setSelectedFiles([]);
    setLoading(true);
    setError("");
    setWarnings([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const userMessageId = createMessageId();
    appendMessageToChat({
      id: userMessageId,
      role: "user",
      content: userMessageParts.join("\n\n"),
    });

    const pendingAssistantMessageId = mode === "chat" ? createMessageId() : null;
    let chatStreamHasDelta = false;
    let chatStreamStoppedByUser = false;

    if (mode === "chat" && pendingAssistantMessageId) {
      appendMessageToChat({
        id: pendingAssistantMessageId,
        role: "assistant",
        content: "",
      });
    }

    try {
      const formData = new FormData();
      formData.append("prompt", cleanPrompt);
      formData.append("mode", mode);
      formData.append("imageSize", imageSize);
      formData.append("imageAction", imageAction);
      if (mode === "chat" && chatHistoryToSend.length > 0) {
        formData.append("chatHistory", JSON.stringify(chatHistoryToSend));
      }

      for (const file of filesToSend) {
        formData.append("files", file);
      }
      if (sourceImageToSend) {
        formData.append("sourceImage", sourceImageToSend);
      }

      if (mode === "chat" && pendingAssistantMessageId) {
        const streamController = new AbortController();
        chatStreamAbortRef.current = streamController;
        setIsChatStreamActive(true);

        let streamWarnings: string[] = [];
        let streamFilesUsed: string[] = [];
        let streamTables: TablePreview[] = [];

        try {
          const response = await fetch("/api/chatgpt?stream=1", {
            method: "POST",
            body: formData,
            signal: streamController.signal,
          });

          if (!response.ok) {
            const errorPayload = (await response.json().catch(() => null)) as {
              error?: string;
            } | null;
            throw new Error(errorPayload?.error ?? "Falha ao gerar resposta.");
          }

          if (!response.body) {
            throw new Error("A resposta de streaming veio vazia.");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          const processChunkLine = (line: string) => {
            const trimmed = line.trim();
            if (!trimmed) {
              return;
            }

            const chunk = JSON.parse(trimmed) as ChatStreamChunk;
            if (chunk.type === "delta" && typeof chunk.delta === "string" && chunk.delta.length > 0) {
              chatStreamHasDelta = true;
              updateMessageContentById(pendingAssistantMessageId, (currentContent) => `${currentContent}${chunk.delta}`);
              return;
            }

            if (chunk.type === "meta") {
              streamWarnings = Array.isArray(chunk.warnings) ? chunk.warnings : [];
              streamFilesUsed = Array.isArray(chunk.filesUsed) ? chunk.filesUsed : [];
              streamTables = Array.isArray(chunk.tables) ? chunk.tables : [];
              if (pendingAssistantMessageId && streamTables.length > 0) {
                updateMessageTablesById(pendingAssistantMessageId, streamTables);
              }
              return;
            }

            if (chunk.type === "error") {
              throw new Error(chunk.error || "Erro no streaming da resposta.");
            }
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              processChunkLine(line);
            }
          }

          buffer += decoder.decode();
          if (buffer.trim().length > 0) {
            const lines = buffer.split("\n");
            for (const line of lines) {
              processChunkLine(line);
            }
          }

          setWarnings(streamWarnings);
          if (streamFilesUsed.length > 0) {
            appendMessageToChat({
              id: createMessageId(),
              role: "assistant",
              content: `Arquivos usados no contexto: ${streamFilesUsed.join(", ")}`,
            });
          }

          if (!chatStreamHasDelta) {
            throw new Error("A API retornou resposta vazia.");
          }
        } catch (streamError) {
          if (
            streamError instanceof DOMException &&
            streamError.name === "AbortError"
          ) {
            chatStreamStoppedByUser = true;
            if (!chatStreamHasDelta) {
              removeMessageById(pendingAssistantMessageId);
            }
          } else {
            throw streamError;
          }
        } finally {
          setIsChatStreamActive(false);
          if (chatStreamAbortRef.current === streamController) {
            chatStreamAbortRef.current = null;
          }
        }

        if (chatStreamStoppedByUser) {
          return;
        }

        return;
      }

      const response = await fetch("/api/chatgpt", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        answer?: string;
        error?: string;
        filesUsed?: string[];
        warnings?: string[];
        imageUrl?: string;
        revisedPrompt?: string | null;
        storedImageId?: string | null;
        tables?: TablePreview[];
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Falha ao gerar resposta.");
      }

      if (!data.answer) {
        throw new Error("A API retornou resposta vazia.");
      }

      const usedFiles = Array.isArray(data.filesUsed) ? data.filesUsed : [];
      const responseTables = Array.isArray(data.tables) ? data.tables : [];
      const responseWarnings = Array.isArray(data.warnings) ? data.warnings : [];
      setWarnings(responseWarnings);

      const revisedPrompt =
        typeof data.revisedPrompt === "string" && data.revisedPrompt.trim().length > 0
          ? data.revisedPrompt.trim()
          : "";
      const hasImage = typeof data.imageUrl === "string" && data.imageUrl.length > 0;
      const storedImageId =
        typeof data.storedImageId === "string" && data.storedImageId.length > 0
          ? data.storedImageId
          : undefined;

      const answerParts = [data.answer];
      if (revisedPrompt && revisedPrompt !== cleanPrompt) {
        answerParts.push(`Prompt revisado: ${revisedPrompt}`);
      }

      appendMessageToChat({
        id: createMessageId(),
        role: "assistant",
        content: answerParts.join("\n\n"),
        imageUrl: hasImage ? data.imageUrl : undefined,
        imageId: hasImage ? storedImageId : undefined,
        tables: responseTables,
      });

      if (mode === "image" && hasImage && storedImageId) {
        setGeneratedHistory((current) => {
          const alreadyExists = current.some((item) => item.id === storedImageId);
          if (alreadyExists) {
            return current;
          }

          return [
            {
              id: storedImageId,
              imageUrl: `/api/chatgpt/generated-image/${storedImageId}`,
              createdAt: new Date().toISOString(),
              prompt: cleanPrompt,
              revisedPrompt: revisedPrompt || null,
              model: IMAGE_MODEL_LABEL,
              size: imageSize,
              action: imageAction,
            },
            ...current,
          ];
        });
      }

      if (mode === "chat" && usedFiles.length > 0) {
        appendMessageToChat({
          id: createMessageId(),
          role: "assistant",
          content: `Arquivos usados no contexto: ${usedFiles.join(", ")}`,
        });
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Erro inesperado na requisicao.";

      setError(message);
      if (mode === "chat" && pendingAssistantMessageId) {
        if (chatStreamHasDelta) {
          updateMessageContentById(
            pendingAssistantMessageId,
            (currentContent) =>
              `${currentContent}\n\n[Falha ao continuar a resposta. Tente novamente.]`
          );
        } else {
          updateMessageContentById(
            pendingAssistantMessageId,
            () => "Nao consegui processar agora. Confira OPENAI_API_KEY e tente novamente."
          );
        }
      } else {
        appendMessageToChat({
          id: createMessageId(),
          role: "assistant",
          content: "Nao consegui processar agora. Confira OPENAI_API_KEY e tente novamente.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const incomingFiles = Array.from(event.target.files ?? []);
    if (incomingFiles.length === 0) {
      return;
    }

    setError("");
    setWarnings([]);

    setSelectedFiles((current) => {
      const combined = [...current];

      for (const file of incomingFiles) {
        const alreadyExists = combined.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified
        );

        if (!alreadyExists) {
          combined.push(file);
        }

        if (combined.length >= MAX_FILES) {
          break;
        }
      }

      if (current.length + incomingFiles.length > MAX_FILES) {
        setError(`Limite de ${MAX_FILES} arquivos por envio.`);
      }

      return combined.slice(0, MAX_FILES);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeSelectedFile(fileToRemove: File) {
    setSelectedFiles((current) =>
      current.filter(
        (file) =>
          !(
            file.name === fileToRemove.name &&
            file.size === fileToRemove.size &&
            file.lastModified === fileToRemove.lastModified
          )
      )
    );
  }

  function handleSourceImageChange(event: ChangeEvent<HTMLInputElement>) {
    const imageFile = event.target.files?.[0] ?? null;
    setSourceImage(imageFile);
    setError("");
    setWarnings([]);
  }

  function removeSourceImage() {
    setSourceImage(null);
    if (sourceImageInputRef.current) {
      sourceImageInputRef.current.value = "";
    }
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function autoResizeChatPrompt(textarea: HTMLTextAreaElement) {
    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, CHAT_PROMPT_MAX_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > CHAT_PROMPT_MAX_HEIGHT ? "auto" : "hidden";
  }

  function autoResizeImagePrompt(textarea: HTMLTextAreaElement) {
    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, IMAGE_PROMPT_MAX_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > IMAGE_PROMPT_MAX_HEIGHT ? "auto" : "hidden";
  }

  function focusChatPromptInput() {
    if (mode !== "chat") {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      const input = chatPromptRef.current;
      if (!input) {
        return;
      }
      input.focus();
      const length = input.value.length;
      input.setSelectionRange(length, length);
    });
  }

  const chatFocusClass = "focus:border-purple-400/60 focus:ring-4 focus:ring-purple-500/15";
  const imageFocusClass = "focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30";
  const imageMessages = messages.filter((message) => Boolean(message.imageUrl));
  const latestSessionGenerated =
    imageMessages.length > 0
      ? {
          imageUrl: imageMessages[imageMessages.length - 1].imageUrl ?? "",
          imageId: imageMessages[imageMessages.length - 1].imageId,
        }
      : null;
  const latestGenerated = latestSessionGenerated;
  const isLight = theme === "light";
  const isGeneratingAnyVideo = videoGenerationTarget !== null;
  const isGeneratingLatestVideo = videoGenerationTarget === "latest";
  const hasReturnedAssistantMessages = messages.some(
    (message) =>
      message.role === "assistant" &&
      (message.content.trim().length > 0 || Boolean(message.imageUrl))
  );

  useEffect(() => {
    if (mode !== "image" || !loading) {
      return;
    }

    setLoadingVerse((current) => getRandomBibleVerse(current));
    const intervalId = window.setInterval(() => {
      setLoadingVerse((current) => getRandomBibleVerse(current));
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [mode, loading]);

  useEffect(() => {
    if (mode !== "image") {
      return;
    }
    setGeneratedVideoUrl("");
  }, [mode, latestGenerated?.imageId, latestGenerated?.imageUrl]);

  useEffect(() => {
    if (historyLightboxIndex === null && !previewLightboxImageUrl) {
      return;
    }

    function handleLightboxKeyboard(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setHistoryLightboxIndex(null);
        setPreviewLightboxImageUrl(null);
        return;
      }

      if (historyLightboxIndex === null) {
        return;
      }

      if (generatedHistory.length <= 1) {
        return;
      }

      if (event.key === "ArrowLeft") {
        setHistoryLightboxIndex((current) => {
          if (current === null) {
            return current;
          }
          return (current - 1 + generatedHistory.length) % generatedHistory.length;
        });
      }

      if (event.key === "ArrowRight") {
        setHistoryLightboxIndex((current) => {
          if (current === null) {
            return current;
          }
          return (current + 1) % generatedHistory.length;
        });
      }
    }

    window.addEventListener("keydown", handleLightboxKeyboard);
    return () => window.removeEventListener("keydown", handleLightboxKeyboard);
  }, [historyLightboxIndex, previewLightboxImageUrl, generatedHistory.length]);

  useEffect(() => {
    if (!videoGenerationModalSource) {
      return;
    }

    const activeTargetKey = videoGenerationModalSource.targetKey;

    function handleVideoModalKeyboard(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        if (videoGenerationTarget === activeTargetKey) {
          return;
        }
        setVideoGenerationModalSource(null);
      }
    }

    window.addEventListener("keydown", handleVideoModalKeyboard);
    return () => window.removeEventListener("keydown", handleVideoModalKeyboard);
  }, [videoGenerationModalSource, videoGenerationTarget]);

  const mainClass = `font-(family-name:--font-montserrat) min-h-screen [&_button:enabled]:cursor-pointer [&_a]:cursor-pointer ${
    isLight ? "bg-slate-100 text-slate-900" : "bg-gray-900 text-white"
  }`;
  const headerClass = isLight
    ? "relative overflow-hidden rounded-none border border-slate-200 bg-white px-4 py-3 shadow-sm sm:rounded-3xl sm:px-6 sm:py-5 lg:px-8 lg:py-6"
    : "relative overflow-hidden rounded-none border border-cyan-500/20 bg-linear-to-br from-gray-900 via-slate-900 to-gray-900 px-4 py-3 sm:rounded-3xl sm:px-6 sm:py-5 lg:px-8 lg:py-6";
  const chatHeaderClass = isLight
    ? "relative overflow-hidden rounded-none border border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:px-5 sm:py-3.5 lg:px-6 lg:py-4"
    : "relative overflow-hidden rounded-none border border-cyan-500/20 bg-linear-to-br from-gray-900 via-slate-900 to-gray-900 px-4 py-2.5 sm:px-5 sm:py-3.5 lg:px-6 lg:py-4";
  const subtitleClass = isLight ? "mt-1 text-slate-600" : "mt-1 text-gray-300";
  const modelClass = isLight ? "mt-1 text-slate-500" : "mt-1 text-cyan-200/90";
  const sectionTitleClass = isLight
    ? "text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-600"
    : "text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-300";
  const panelClass = isLight
    ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    : "rounded-2xl border border-gray-700/80 bg-linear-to-br from-gray-900/80 via-slate-900/70 to-gray-950/70 p-5 sm:p-6";
  const cardClass = isLight
    ? "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    : "rounded-2xl border border-gray-700/80 bg-linear-to-br from-gray-900/80 via-slate-900/70 to-gray-950/70 p-4";
  const historyCardClass = isLight
    ? "mt-0 w-full rounded-none border-0 bg-white p-4 shadow-none lg:mt-4 lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm"
    : "mt-0 w-full rounded-none border-0 bg-linear-to-br from-gray-900/80 via-slate-900/70 to-gray-950/70 p-4 lg:mt-4 lg:rounded-2xl lg:border lg:border-gray-700/80";
  const mutedTextClass = isLight ? "text-[11px] text-slate-500" : "text-[11px] text-gray-400";
  const topMenuTriggerClass = isLight
    ? "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white shadow transition hover:bg-black/70 sm:h-10 sm:w-10 sm:rounded-xl sm:border-slate-300 sm:bg-white sm:text-slate-700 sm:hover:border-slate-400 sm:hover:bg-slate-50"
    : "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-white shadow transition hover:bg-black/70 sm:h-10 sm:w-10 sm:rounded-xl sm:border-gray-600 sm:bg-gray-900/85 sm:text-gray-100 sm:hover:border-purple-300/60 sm:hover:bg-gray-800";
  const topMenuOverlayClass = "fixed inset-0 z-80 bg-black/45 backdrop-blur-[1px]";
  const topMenuDrawerClass = isLight
    ? "fixed top-0 right-0 z-[90] flex h-dvh w-[88vw] max-w-[360px] flex-col border-l border-slate-200 bg-white shadow-2xl"
    : "fixed top-0 right-0 z-[90] flex h-dvh w-[88vw] max-w-[360px] flex-col border-l border-gray-700 bg-gray-950 shadow-2xl";
  const topMenuModeButtonClass = isLight
    ? "group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50"
    : "group flex w-full items-center gap-3 rounded-2xl border border-gray-700 bg-gray-900/70 px-3 py-3 text-left transition hover:border-purple-300/60 hover:bg-purple-500/10";
  const topMenuModeButtonActiveClass = isLight
    ? "border-violet-300 bg-violet-50"
    : "border-purple-300/60 bg-purple-500/15";
  const topMenuCloseButtonClass = isLight
    ? "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
    : "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-900/70 text-gray-200 transition hover:border-gray-600 hover:bg-gray-800";
  const topMenuActionButtonClass = isLight
    ? "inline-flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    : "inline-flex w-full items-center gap-2 rounded-xl border border-gray-700 bg-gray-900/70 px-3 py-2 text-left text-sm text-gray-100 transition hover:border-gray-600 hover:bg-gray-800";
  const mobileChatOverlayClass = "fixed inset-0 z-[70] bg-black/45 backdrop-blur-[1px] lg:hidden";
  const mobileChatDrawerClass = isLight
    ? "fixed top-0 left-0 z-[75] flex h-dvh w-[86vw] max-w-[330px] flex-col border-r border-slate-200 bg-white shadow-2xl lg:hidden"
    : "fixed top-0 left-0 z-[75] flex h-dvh w-[86vw] max-w-[330px] flex-col border-r border-gray-700 bg-gray-950 shadow-2xl lg:hidden";

  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  const historyLightboxItem =
    historyLightboxIndex !== null ? generatedHistory[historyLightboxIndex] ?? null : null;
  const pendingDeleteSession =
    chatIdPendingDelete !== null
      ? chatSessions.find((session) => session.id === chatIdPendingDelete) ?? null
      : null;
  const historyLightboxCaption =
    historyLightboxItem?.revisedPrompt?.trim() || historyLightboxItem?.prompt?.trim() || "";
  const videoGenerationModalTargetKey = videoGenerationModalSource
    ? videoGenerationModalSource.targetKey
    : "";
  const videoGenerationModalResultUrl = videoGenerationModalTargetKey
    ? videoGenerationModalTargetKey === "latest"
      ? generatedVideoUrl
      : generatedVideoByHistoryId[videoGenerationModalTargetKey] || ""
    : "";
  const isGeneratingVideoGenerationModal =
    videoGenerationModalTargetKey.length > 0 &&
    videoGenerationTarget === videoGenerationModalTargetKey;

  function openHistoryLightbox(index: number) {
    setPreviewLightboxImageUrl(null);
    setHistoryLightboxIndex(index);
  }

  function closeHistoryLightbox() {
    setHistoryLightboxIndex(null);
  }

  function openLatestPreviewLightbox() {
    const imageUrl = latestGenerated?.imageUrl;
    if (!imageUrl) {
      return;
    }

    if (latestGenerated?.imageId) {
      const indexInHistory = generatedHistory.findIndex((item) => item.id === latestGenerated.imageId);
      if (indexInHistory >= 0) {
        setPreviewLightboxImageUrl(null);
        setHistoryLightboxIndex(indexInHistory);
        return;
      }
    }

    setHistoryLightboxIndex(null);
    setPreviewLightboxImageUrl(imageUrl);
  }

  function closePreviewLightbox() {
    setPreviewLightboxImageUrl(null);
  }

  function openVideoGenerationModal(source: VideoGenerationModalSource) {
    setVideoGenerationModalSource(source);
    setVideoGenerationPromptInput(source.prompt);
    setVideoGenerationAspectRatioInput(source.aspectRatio);
    setVideoGenerationDurationInput(source.durationSeconds);
    setError("");
  }

  function openHistoryVideoModal(item: GeneratedImageHistoryItem) {
    openVideoGenerationModal({
      targetKey: getHistoryVideoTargetKey(item.id),
      imageUrl: item.imageUrl,
      prompt: item.revisedPrompt?.trim() || item.prompt.trim() || "",
      aspectRatio: getVideoAspectRatioFromImageSize(item.size),
      durationSeconds: 6,
      title: "Gerar video do historico",
      subtitle: `Imagem criada em ${formatCreatedAt(item.createdAt)}`,
    });
  }

  function openLatestVideoModal() {
    if (!latestGenerated?.imageUrl) {
      return;
    }

    openVideoGenerationModal({
      targetKey: "latest",
      imageUrl: latestGenerated.imageUrl,
      prompt:
        latestImagePrompt.trim() ||
        prompt.trim() ||
        "Transforme esta imagem em um video cinematografico curto com movimento suave.",
      aspectRatio: getVideoAspectRatioFromImageSize(imageSize),
      durationSeconds: 6,
      title: "Gerar video da imagem atual",
      subtitle: "Configure prompt, formato e duracao antes de gerar.",
    });
  }

  function closeVideoGenerationModal() {
    if (isGeneratingVideoGenerationModal) {
      return;
    }
    setVideoGenerationModalSource(null);
  }

  function syncActiveChatSession(nextMessages: ChatMessage[]) {
    if (mode !== "chat" || !activeChatId) {
      return;
    }

    const updatedAt = new Date().toISOString();
    const nextTitle = getChatSessionTitle(nextMessages);

    setChatSessions((current) => {
      const activeSession = current.find((session) => session.id === activeChatId);
      const updatedSession: ChatSession = {
        id: activeChatId,
        title: nextTitle || activeSession?.title || "Novo chat",
        updatedAt,
        messages: nextMessages,
      };

      return [updatedSession, ...current.filter((session) => session.id !== activeChatId)];
    });
  }

  function setMessagesAndSync(updater: (current: ChatMessage[]) => ChatMessage[]) {
    setMessages((current) => {
      const next = updater(current);
      syncActiveChatSession(next);
      return next;
    });
  }

  function appendMessageToChat(message: ChatMessage) {
    setMessagesAndSync((current) => [...current, message]);
  }

  function updateMessageContentById(messageId: string, updater: (currentContent: string) => string) {
    setMessagesAndSync((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, content: updater(message.content) } : message
      )
    );
  }

  function updateMessageTablesById(messageId: string, tables: TablePreview[]) {
    setMessagesAndSync((current) =>
      current.map((message) => (message.id === messageId ? { ...message, tables } : message))
    );
  }

  function removeMessageById(messageId: string) {
    setMessagesAndSync((current) => current.filter((message) => message.id !== messageId));
  }

  function handleStopChatStream() {
    if (chatStreamAbortRef.current) {
      chatStreamAbortRef.current.abort();
      chatStreamAbortRef.current = null;
    }
  }

  function handleChatMessagesScroll() {
    const container = chatMessagesContainerRef.current;
    if (!container) {
      return;
    }

    setChatAutoScrollState(isNearChatBottom(container));
  }

  function handleScrollToChatBottom() {
    setChatAutoScrollState(true);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function handleSelectChat(sessionId: string) {
    if (loading) {
      return;
    }

    const selectedSession = chatSessions.find((session) => session.id === sessionId);
    if (!selectedSession) {
      return;
    }

    setChatAutoScrollState(true);
    setActiveChatId(selectedSession.id);
    setMessages(selectedSession.messages);
    setPrompt("");
    setSelectedFiles([]);
    setError("");
    setWarnings([]);
    setIsMobileChatSidebarOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleCreateNewChat() {
    if (loading) {
      return;
    }

    if (!chatDeviceId) {
      return;
    }

    try {
      const session = await createChatSessionOnDb(chatDeviceId);
      setChatAutoScrollState(true);
      setChatSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]);
      setActiveChatId(session.id);
      setMessages(session.messages);
      setPrompt("");
      setSelectedFiles([]);
      setError("");
      setWarnings([]);
      setIsMobileChatSidebarOpen(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      focusChatPromptInput();
    } catch {
      setError("Nao foi possivel criar um novo chat agora.");
    }
  }

  async function handleDeleteChat(sessionId: string) {
    if (loading) {
      return;
    }

    if (!chatDeviceId) {
      return;
    }

    try {
      setIsDeletingChat(true);
      await deleteChatSessionOnDb(chatDeviceId, sessionId);

      const remaining = chatSessions.filter((session) => session.id !== sessionId);
      setChatSessions(remaining);

      if (remaining.length === 0) {
        await handleCreateNewChat();
      } else if (sessionId === activeChatId) {
        setChatAutoScrollState(true);
        setActiveChatId(remaining[0].id);
        setMessages(remaining[0].messages);
      }

      setPrompt("");
      setSelectedFiles([]);
      setError("");
      setWarnings([]);
      setIsMobileChatSidebarOpen(false);
      setChatIdPendingDelete(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setError("Nao foi possivel excluir o chat agora.");
    } finally {
      setIsDeletingChat(false);
    }
  }

  function requestDeleteChat(sessionId: string) {
    setChatIdPendingDelete(sessionId);
  }

  function closeDeleteChatModal() {
    if (isDeletingChat) {
      return;
    }
    setChatIdPendingDelete(null);
  }

  async function confirmDeleteChat() {
    if (!chatIdPendingDelete) {
      return;
    }
    await handleDeleteChat(chatIdPendingDelete);
  }

  async function handleCopyCode(code: string, codeKey: string) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();

        if (!copied) {
          throw new Error("copy_failed");
        }
      }

      setCopiedCodeKey(codeKey);

      if (codeCopyResetTimeoutRef.current !== null) {
        window.clearTimeout(codeCopyResetTimeoutRef.current);
      }

      codeCopyResetTimeoutRef.current = window.setTimeout(() => {
        setCopiedCodeKey((current) => (current === codeKey ? null : current));
      }, 1600);
    } catch {
      setError("Nao foi possivel copiar o codigo.");
    }
  }

  function renderInlineRichText(text: string, keyPrefix: string) {
    const inlineCodeParts = text.split(/`([^`]+)`/g);

    return inlineCodeParts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <code
            key={`${keyPrefix}-inline-${index}`}
            className={`rounded px-1.5 py-0.5 font-mono text-[0.92em] ${
              isLight ? "bg-slate-200 text-slate-800" : "bg-black/35 text-purple-100"
            }`}
          >
            {part}
          </code>
        );
      }

      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((chunk, boldIndex) => {
        const isBold = chunk.startsWith("**") && chunk.endsWith("**") && chunk.length > 4;
        if (isBold) {
          return (
            <strong key={`${keyPrefix}-bold-${index}-${boldIndex}`} className="font-semibold">
              {chunk.slice(2, -2)}
            </strong>
          );
        }

        return <span key={`${keyPrefix}-text-${index}-${boldIndex}`}>{chunk}</span>;
      });
    });
  }

  function renderMarkdownTextSegment(text: string, keyPrefix: string) {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const nodes: ReactNode[] = [];
    let lineIndex = 0;

    while (lineIndex < lines.length) {
      const currentLine = lines[lineIndex] ?? "";
      const trimmedLine = currentLine.trim();

      if (!trimmedLine) {
        nodes.push(<div key={`${keyPrefix}-spacer-${lineIndex}`} className="h-2" />);
        lineIndex += 1;
        continue;
      }

      if (/^-{3,}$/.test(trimmedLine)) {
        nodes.push(
          <hr
            key={`${keyPrefix}-divider-${lineIndex}`}
            className={`my-2 border-0 border-t ${isLight ? "border-slate-300" : "border-gray-600"}`}
          />
        );
        lineIndex += 1;
        continue;
      }

      const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const headingLevel = headingMatch[1].length;
        const headingText = headingMatch[2] ?? "";
        const headingClass =
          headingLevel <= 2
            ? "text-base font-semibold"
            : headingLevel === 3
              ? "text-[0.95rem] font-semibold"
              : "text-sm font-semibold";

        nodes.push(
          <p key={`${keyPrefix}-heading-${lineIndex}`} className={headingClass}>
            {renderInlineRichText(headingText, `${keyPrefix}-heading-inline-${lineIndex}`)}
          </p>
        );
        lineIndex += 1;
        continue;
      }

      const listLines: string[] = [];
      let listCursor = lineIndex;
      while (listCursor < lines.length) {
        const candidate = (lines[listCursor] ?? "").trim();
        const listMatch = candidate.match(/^[-*]\s+(.+)$/);
        if (!listMatch) {
          break;
        }
        listLines.push(listMatch[1]);
        listCursor += 1;
      }

      if (listLines.length > 0) {
        nodes.push(
          <ul key={`${keyPrefix}-list-${lineIndex}`} className="list-disc space-y-1 pl-5">
            {listLines.map((item, itemIndex) => (
              <li key={`${keyPrefix}-list-item-${lineIndex}-${itemIndex}`}>
                {renderInlineRichText(item, `${keyPrefix}-list-inline-${lineIndex}-${itemIndex}`)}
              </li>
            ))}
          </ul>
        );
        lineIndex = listCursor;
        continue;
      }

      nodes.push(
        <p key={`${keyPrefix}-paragraph-${lineIndex}`} className="whitespace-pre-wrap">
          {renderInlineRichText(currentLine, `${keyPrefix}-paragraph-inline-${lineIndex}`)}
        </p>
      );
      lineIndex += 1;
    }

    return nodes;
  }

  function getCodeTokenClass(type: CodeTokenType): string {
    if (isLight) {
      if (type === "keyword") {
        return "text-fuchsia-300";
      }
      if (type === "string") {
        return "text-lime-300";
      }
      if (type === "comment") {
        return "text-slate-500 italic";
      }
      if (type === "number") {
        return "text-orange-300";
      }
      if (type === "builtin") {
        return "text-cyan-300";
      }
      if (type === "function") {
        return "text-blue-300";
      }
      if (type === "operator") {
        return "text-pink-300";
      }
      return "text-slate-200";
    }

    if (type === "keyword") {
      return "text-violet-300";
    }
    if (type === "string") {
      return "text-lime-300";
    }
    if (type === "comment") {
      return "text-slate-500 italic";
    }
    if (type === "number") {
      return "text-orange-300";
    }
    if (type === "builtin") {
      return "text-cyan-300";
    }
    if (type === "function") {
      return "text-blue-300";
    }
    if (type === "operator") {
      return "text-pink-300";
    }
    return "text-slate-200";
  }

  function renderHighlightedCode(content: string, language?: string, keyPrefix?: string) {
    const normalizedLanguage = normalizeCodeLanguage(language);
    const lines = content.split("\n");
    const nodes: ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
      const tokens = tokenizeCodeLine(line, normalizedLanguage);
      tokens.forEach((token, tokenIndex) => {
        nodes.push(
          <span
            key={`${keyPrefix || "code"}-line-${lineIndex}-token-${tokenIndex}`}
            className={getCodeTokenClass(token.type)}
          >
            {token.text}
          </span>
        );
      });

      if (lineIndex < lines.length - 1) {
        nodes.push("\n");
      }
    });

    return nodes;
  }

  function renderMessageContent(content: string, keyPrefix: string) {
    const segments = parseMessageContentSegments(content);

    return segments.map((segment, index) => {
      if (segment.type === "code") {
        const blockKey = `${keyPrefix}-code-${index}`;
        const isCodeCopied = copiedCodeKey === blockKey;

        return (
          <div
            key={blockKey}
            className={`overflow-hidden rounded-xl border ${
              isLight ? "border-slate-300 bg-slate-950 text-slate-100" : "border-gray-600 bg-black/55 text-gray-100"
            }`}
          >
            <div
              className={`flex items-center justify-between gap-2 border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                isLight ? "border-slate-700/60 text-slate-300" : "border-gray-700 text-gray-300"
              }`}
            >
              <span>{segment.language || "code"}</span>
              <button
                type="button"
                onClick={() => {
                  void handleCopyCode(segment.content, blockKey);
                }}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold normal-case tracking-normal transition ${
                  isLight
                    ? "border-slate-600/70 bg-slate-800/80 text-slate-100 hover:bg-slate-700"
                    : "border-gray-600 bg-gray-900/80 text-gray-100 hover:bg-gray-800"
                }`}
                aria-label={isCodeCopied ? "Codigo copiado" : "Copiar codigo"}
                title={isCodeCopied ? "Codigo copiado" : "Copiar codigo"}
              >
                {isCodeCopied ? <MdDone className="h-3.5 w-3.5" /> : <MdContentCopy className="h-3.5 w-3.5" />}
                {isCodeCopied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <pre className="overflow-x-auto px-3 py-3 text-[13px] leading-relaxed">
              <code className="font-mono">
                {renderHighlightedCode(segment.content, segment.language, blockKey)}
              </code>
            </pre>
          </div>
        );
      }

      return (
        <div key={`${keyPrefix}-text-${index}`} className="space-y-1">
          {renderMarkdownTextSegment(segment.content, `${keyPrefix}-segment-${index}`)}
        </div>
      );
    });
  }

  function renderTablePreview(table: TablePreview, keyPrefix: string) {
    const rowNoteSegments: string[] = [];
    if (table.rowsTruncated) {
      rowNoteSegments.push(`Exibindo ${table.rows.length}/${table.rowCount} linhas.`);
    } else if (table.rowCount === 0) {
      rowNoteSegments.push("Nenhuma linha de dados.");
    } else {
      rowNoteSegments.push(`${table.rowCount} linha${table.rowCount === 1 ? "" : "s"}.`);
    }

    if (table.columnsTruncated) {
      rowNoteSegments.push("Colunas adicionais omitidas.");
    }

    const tableContainerClass = isLight
      ? "rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm"
      : "rounded-2xl border border-gray-700 bg-gray-950 text-gray-100 shadow-sm";
    const headerRowClass = isLight ? "bg-slate-100 text-slate-600" : "bg-gray-900 text-gray-300";
    const noteClass = isLight ? "text-slate-500" : "text-gray-400";

    return (
      <div key={`${keyPrefix}-table`} className="mt-4 space-y-2">
        <div className={tableContainerClass}>
          <div className="flex flex-wrap items-center justify-between border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
            <span className="truncate">
              {table.fileName} · {table.sheetName || "Planilha sem nome"}
            </span>
            <span className="text-[11px] text-current">
              {table.rowCount} linha{table.rowCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px]">
              <thead className={`text-left text-[11px] font-semibold uppercase tracking-[0.2em] ${headerRowClass}`}>
                <tr>
                  {table.headers.length > 0 &&
                    table.headers.map((header, headerIndex) => (
                      <th key={`${keyPrefix}-header-${headerIndex}`} className="px-2 py-2">
                        {header || `Col ${headerIndex + 1}`}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(1, table.headers.length)}
                      className="px-2 py-2 text-xs italic text-slate-500"
                    >
                      Sem dados visiveis.
                    </td>
                  </tr>
                ) : (
                  table.rows.map((row, rowIndex) => (
                    <tr
                      key={`${keyPrefix}-row-${rowIndex}`}
                      className={rowIndex % 2 === 0 ? "bg-white/5" : ""}
                    >
                      {table.headers.map((_, columnIndex) => (
                        <td key={`${keyPrefix}-cell-${rowIndex}-${columnIndex}`} className="px-2 py-1 align-top">
                          {row[columnIndex] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {rowNoteSegments.length > 0 ? (
          <p className={`px-2 text-[11px] leading-tight ${noteClass}`}>
            {rowNoteSegments.join(" ")}
          </p>
        ) : null}
      </div>
    );
  }

  function goToPreviousHistoryImage() {
    if (generatedHistory.length <= 1) {
      return;
    }

    setHistoryLightboxIndex((current) => {
      if (current === null) {
        return current;
      }
      return (current - 1 + generatedHistory.length) % generatedHistory.length;
    });
  }

  function goToNextHistoryImage() {
    if (generatedHistory.length <= 1) {
      return;
    }

    setHistoryLightboxIndex((current) => {
      if (current === null) {
        return current;
      }
      return (current + 1) % generatedHistory.length;
    });
  }

  const topActionMenu = (
    <>
      <div className="fixed top-1 right-2 z-80 sm:top-4 sm:right-4">
        <button
          type="button"
          onClick={() => setIsTopMenuOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={isTopMenuOpen}
          aria-label="Abrir menu"
          className={topMenuTriggerClass}
        >
          <MdMoreVert className="h-5 w-5" />
        </button>
      </div>

      {isTopMenuOpen ? (
        <>
          <button
            type="button"
            onClick={() => setIsTopMenuOpen(false)}
            className={topMenuOverlayClass}
            aria-label="Fechar menu lateral"
          />

          <aside className={topMenuDrawerClass} role="dialog" aria-modal="true" aria-label="Menu GPT">
            <div
              className={`flex items-center justify-between border-b px-4 py-4 ${
                isLight ? "border-slate-200" : "border-gray-700"
              }`}
            >
              <p className={`text-sm font-semibold ${isLight ? "text-slate-800" : "text-gray-100"}`}>
                Acesso rapido
              </p>
              <button
                type="button"
                onClick={() => setIsTopMenuOpen(false)}
                className={topMenuCloseButtonClass}
                aria-label="Fechar menu"
              >
                <MdClose className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <Link
                href="/chatgpt/chat"
                onClick={() => setIsTopMenuOpen(false)}
                className={`${topMenuModeButtonClass} ${mode === "chat" ? topMenuModeButtonActiveClass : ""}`}
              >
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    mode === "chat"
                      ? isLight
                        ? "bg-violet-500 text-white"
                        : "bg-purple-500/35 text-purple-100"
                      : isLight
                        ? "border border-violet-200 bg-white text-violet-600"
                        : "border border-gray-700 bg-gray-800 text-purple-200"
                  }`}
                >
                  <SiOpenai className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${isLight ? "text-slate-900" : "text-gray-100"}`}>
                    ChatGPT
                  </span>
                  <span className={`block truncate text-[11px] ${isLight ? "text-slate-500" : "text-gray-400"}`}>
                    Modelo: {CHAT_TEXT_MODEL_LABEL}
                  </span>
                </span>
              </Link>

              <Link
                href="/chatgpt/imagem"
                onClick={() => setIsTopMenuOpen(false)}
                className={`${topMenuModeButtonClass} ${mode === "image" ? topMenuModeButtonActiveClass : ""}`}
              >
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    mode === "image"
                      ? isLight
                        ? "bg-violet-500 text-white"
                        : "bg-purple-500/35 text-purple-100"
                      : isLight
                        ? "border border-violet-200 bg-white text-violet-600"
                        : "border border-gray-700 bg-gray-800 text-purple-200"
                  }`}
                >
                  <MdImage className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${isLight ? "text-slate-900" : "text-gray-100"}`}>
                    Image Designer Pro
                  </span>
                  <span className={`block truncate text-[11px] ${isLight ? "text-slate-500" : "text-gray-400"}`}>
                    Modelo: {IMAGE_MODEL_LABEL}
                  </span>
                </span>
              </Link>

              <Link
                href="/chatgpt"
                onClick={() => setIsTopMenuOpen(false)}
                className={topMenuActionButtonClass}
              >
                <MdArrowBack className="h-4 w-4" />
                Escolher modo
              </Link>

              <button
                type="button"
                onClick={() => setIsLargeChatFont((current) => !current)}
                className={topMenuActionButtonClass}
              >
                <span>Fonte grande</span>
                <span
                  className={`relative inline-flex h-5 w-10 rounded-full transition ${
                    isLargeChatFont ? "bg-violet-500" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                      isLargeChatFont ? "left-5.5" : "left-0.5"
                    }`}
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setIsTopMenuOpen(false);
                }}
                className={topMenuActionButtonClass}
                >
                  <span
                    className={`relative inline-flex h-5 w-10 rounded-full transition ${
                      isLight ? "bg-violet-500" : "bg-gray-600"
                    }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                      isLight ? "left-5.5" : "left-0.5"
                    }`}
                  />
                </span>
                {isLight ? "Tema Claro" : "Tema Escuro"}
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );

  async function handleDownloadImage() {
    const imageUrl = latestGenerated?.imageUrl;
    const imageId = latestGenerated?.imageId;
    if ((!imageUrl && !imageId) || downloadingImage) {
      return;
    }

    try {
      setDownloadingImage(true);
      setError("");

      if (imageId) {
        const link = document.createElement("a");
        link.href = `/api/chatgpt/generated-image/${imageId}?download=1`;
        link.download = `imagem-${imageId}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      const response = await fetch("/api/chatgpt/download-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        throw new Error("Falha ao baixar imagem.");
      }

      const blob = await response.blob();
      const filename = getFilenameFromContentDisposition(
        response.headers.get("content-disposition")
      );
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError("Nao foi possivel forcar o download da imagem agora.");
    } finally {
      setDownloadingImage(false);
    }
  }

  async function handleDownloadVideo(videoUrl: string, filenamePrefix = "video-gerado") {
    if (!videoUrl || downloadingVideo) {
      return;
    }

    try {
      setDownloadingVideo(true);
      setError("");

      const response = await fetch(videoUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Falha ao baixar video.");
      }

      const blob = await response.blob();
      const mimeType = blob.type.toLowerCase();
      const extension = mimeType.includes("webm")
        ? "webm"
        : mimeType.includes("quicktime")
          ? "mov"
          : "mp4";

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${filenamePrefix}-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError("Nao foi possivel baixar o video agora.");
    } finally {
      setDownloadingVideo(false);
    }
  }

  async function handleHistoryVideoFullscreen(targetKey: string, videoUrl: string) {
    const videoElement = historyVideoRefs.current[targetKey];

    if (!videoElement) {
      window.open(videoUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      if (typeof videoElement.requestFullscreen === "function") {
        await videoElement.requestFullscreen();
        return;
      }

      const webkitVideoElement = videoElement as HTMLVideoElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
        webkitEnterFullscreen?: () => void;
      };

      if (typeof webkitVideoElement.webkitRequestFullscreen === "function") {
        await Promise.resolve(webkitVideoElement.webkitRequestFullscreen());
        return;
      }

      if (typeof webkitVideoElement.webkitEnterFullscreen === "function") {
        webkitVideoElement.webkitEnterFullscreen();
        return;
      }

      window.open(videoUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError("Nao foi possivel abrir o video em tela cheia.");
    }
  }

  async function handleGenerateVideo(options?: {
    imageUrl?: string;
    prompt?: string;
    aspectRatio?: VideoAspectRatio;
    durationSeconds?: VideoDurationSeconds;
    targetKey?: string;
  }) {
    const targetKey = options?.targetKey?.trim() || "latest";
    const imageUrl = options?.imageUrl || latestGenerated?.imageUrl;
    if (!imageUrl || videoGenerationTarget) {
      return;
    }

    try {
      setVideoGenerationTarget(targetKey);
      if (targetKey === "latest") {
        setGeneratedVideoUrl("");
      } else {
        setGeneratedVideoByHistoryId((current) => ({
          ...current,
          [targetKey]: "",
        }));
      }
      setError("");

      const startResponse = await fetch("/api/chatgpt/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          prompt:
            options?.prompt?.trim() ||
            latestImagePrompt.trim() ||
            prompt.trim() ||
            "Transforme esta imagem em um video cinematografico curto com movimento suave.",
          aspectRatio: options?.aspectRatio === "9:16" ? "9:16" : "16:9",
          durationSeconds: options?.durationSeconds || 6,
          resolution: "720p",
          model: "veo-3.1-fast-generate-preview",
        }),
      });

      const startPayload = (await startResponse.json()) as {
        operationName?: string;
        error?: string;
      };

      if (!startResponse.ok) {
        throw new Error(startPayload.error || "Falha ao iniciar geracao de video.");
      }

      const operationName =
        typeof startPayload.operationName === "string" ? startPayload.operationName : "";
      if (!operationName) {
        throw new Error("Gemini nao retornou a operacao de video.");
      }

      const startedAt = Date.now();
      const timeoutMs = 5 * 60 * 1000;

      while (Date.now() - startedAt < timeoutMs) {
        await new Promise((resolve) => window.setTimeout(resolve, 8000));

        const statusResponse = await fetch(
          `/api/chatgpt/generate-video?operationName=${encodeURIComponent(operationName)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const statusPayload = (await statusResponse.json().catch(() => null)) as
          | {
              done?: boolean;
              videoUrl?: string;
              error?: string;
            }
          | null;

        if (!statusResponse.ok) {
          throw new Error(
            statusPayload?.error ||
              `Falha ao consultar status do video (HTTP ${statusResponse.status}).`
          );
        }

        if (statusPayload?.done) {
          const nextVideoUrl =
            typeof statusPayload.videoUrl === "string" ? statusPayload.videoUrl : "";
          if (!nextVideoUrl) {
            throw new Error("Gemini concluiu, mas nao retornou video.");
          }
          if (targetKey === "latest") {
            setGeneratedVideoUrl(nextVideoUrl);
            if (latestGenerated?.imageId) {
              const latestHistoryVideoKey = getHistoryVideoTargetKey(latestGenerated.imageId);
              setGeneratedVideoByHistoryId((current) => ({
                ...current,
                [latestHistoryVideoKey]: nextVideoUrl,
              }));
            }
          } else {
            setGeneratedVideoByHistoryId((current) => ({
              ...current,
              [targetKey]: nextVideoUrl,
            }));
          }
          return;
        }
      }

      throw new Error("A geracao de video excedeu o tempo limite. Tente novamente.");
    } catch (videoError) {
      const message =
        videoError instanceof Error
          ? videoError.message
          : "Nao foi possivel gerar video agora.";
      setError(message);
    } finally {
      setVideoGenerationTarget(null);
    }
  }

  if (mode === "image") {
    return (
      <main className={mainClass}>
        {topActionMenu}
        <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-0 py-0 lg:px-8 lg:py-8">
          <header className={headerClass}>
            <div
              className={`absolute -top-16 -right-10 h-44 w-44 rounded-full blur-3xl ${
                isLight ? "bg-cyan-200/50" : "bg-cyan-500/20"
              }`}
            />
            <div
              className={`absolute -bottom-20 left-1/3 h-56 w-56 rounded-full blur-3xl ${
                isLight ? "bg-violet-200/40" : "bg-blue-500/10"
              }`}
            />

            <div className="flex items-center gap-2 text-lg font-semibold sm:text-3xl">
              <SiOpenai className="h-6 w-6 text-purple-300 sm:h-8 sm:w-8" />
              <h1>{copy.title}</h1>
            </div>
            <p className={`text-xs sm:text-sm ${subtitleClass}`}>{copy.subtitle}</p>
            <p className={`text-[11px] sm:text-xs ${modelClass}`}>Modelo: {IMAGE_MODEL_LABEL}</p>
          </header>

          <div
            className={`mt-0 grid min-h-0 flex-1 gap-4 rounded-none p-4 sm:rounded-2xl lg:mt-4 lg:p-5 lg:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)] ${
              isLight ? "border border-slate-200 bg-slate-50 shadow-sm" : "bg-gray-800 shadow"
            }`}
          >
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className={panelClass}
            >
              {error ? (
                <p className="mb-3 rounded-xl border border-red-500/40 bg-red-900/35 px-3 py-2 text-sm text-red-100">
                  {error}
                </p>
              ) : null}
              {warnings.length > 0 ? (
                <div className="mb-3 rounded-xl border border-purple-400/35 bg-purple-500/15 px-3 py-2 text-sm text-purple-100">
                  {warnings.map((warning, index) => (
                    <p key={`${warning}-${index}`}>{warning}</p>
                  ))}
                </div>
              ) : null}

              <div className="mb-4">
                <label
                  htmlFor="image-size"
                  className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
                    isLight ? "text-slate-500" : "text-gray-300"
                  }`}
                >
                  Tamanho da imagem
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <MdImage className={`h-5 w-5 ${isLight ? "text-violet-500" : "text-purple-300"}`} />
                  <select
                    id="image-size"
                    value={imageSize}
                    onChange={(event) => setImageSize(event.target.value as ImageSize)}
                    disabled={loading}
                    className={`w-full rounded-xl px-3 py-2 text-sm outline-none transition sm:w-70 ${
                      isLight
                        ? "border border-slate-300 bg-white text-slate-900 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/15"
                        : "border border-gray-700/90 bg-gray-900/85 text-gray-100 focus:border-purple-400/60 focus:ring-4 focus:ring-purple-500/15"
                    }`}
                  >
                    {IMAGE_SIZE_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        className={isLight ? "bg-white text-slate-900" : "bg-gray-900"}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <article className={`mb-4 lg:hidden ${cardClass}`}>
                <p className={sectionTitleClass}>Preview Atual</p>
                {loading ? (
                  <div
                    className={`mt-3 flex h-44 flex-col items-center justify-center gap-3 rounded-2xl ${
                      isLight
                        ? "border border-violet-300/35 bg-violet-100/60 text-slate-800"
                        : "border border-purple-400/35 bg-purple-500/10 text-purple-100"
                    }`}
                  >
                    <span
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${
                        isLight ? "bg-white/70 text-violet-600" : "bg-black/30 text-purple-200"
                      }`}
                    >
                      <MdAutoFixHigh className="h-6 w-6 animate-pulse" />
                    </span>
                    <p className="text-sm font-medium">
                      {sourceImage ? "Modificando imagem..." : "Criando nova imagem..."}
                    </p>
                    <p
                      className={`max-w-sm px-4 text-center text-sm leading-relaxed ${
                        isLight ? "text-slate-700" : "text-purple-100"
                      }`}
                    >
                      {loadingVerse}
                    </p>
                  </div>
                ) : latestGenerated?.imageUrl ? (
                  <button
                    type="button"
                    onClick={openLatestPreviewLightbox}
                    className={`mt-3 block w-full overflow-hidden rounded-2xl ${
                      isLight ? "border border-slate-200" : "border border-gray-700"
                    }`}
                    aria-label="Abrir preview da imagem em lightbox"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={latestGenerated.imageUrl}
                      alt="Imagem gerada mais recente"
                      className="h-auto w-full object-cover transition hover:opacity-95"
                    />
                  </button>
                ) : (
                  <div
                    className={`mt-3 flex h-44 items-center justify-center rounded-2xl border border-dashed text-sm ${
                      isLight
                        ? "border-slate-300 bg-slate-100 text-slate-500"
                        : "border-purple-400/45 bg-purple-500/12 text-purple-100"
                    }`}
                  >
                    <MdImage
                      className={`h-10 w-10 ${isLight ? "text-slate-400" : "text-purple-200/80"}`}
                    />
                    <span className="sr-only">Sua primeira imagem vai aparecer aqui.</span>
                  </div>
                )}

                {latestGenerated?.imageUrl ? (
                  <div className="mt-3 space-y-2">
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      disabled={downloadingImage}
                      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${
                        isLight
                          ? "border border-violet-300 bg-violet-500 text-white hover:bg-violet-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                          : "border border-purple-400/45 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                      }`}
                    >
                      <MdDownload className="h-5 w-5" />
                      {downloadingImage ? "Baixando..." : "Download da imagem"}
                    </button>
                    <button
                      type="button"
                      onClick={openLatestVideoModal}
                      disabled={isGeneratingAnyVideo}
                      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${
                        isLight
                          ? "border border-cyan-300 bg-cyan-500 text-white hover:bg-cyan-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                          : "border border-cyan-400/45 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                      }`}
                    >
                      <MdMovie className="h-5 w-5" />
                      {isGeneratingLatestVideo ? "Gerando video..." : "Gerar video"}
                    </button>
                    {generatedVideoUrl ? (
                      <div className="space-y-2">
                        <video
                          src={generatedVideoUrl}
                          controls
                          preload="metadata"
                          className={`w-full rounded-2xl border ${
                            isLight ? "border-slate-200 bg-white" : "border-gray-700 bg-black/30"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => void handleDownloadVideo(generatedVideoUrl, "video-imagem")}
                          disabled={downloadingVideo}
                          className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
                            isLight
                              ? "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                              : "border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700 disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
                          }`}
                        >
                          <MdDownload className="h-4 w-4" />
                          {downloadingVideo ? "Baixando video..." : "Baixar video"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>

              <div className="space-y-3">
                <label htmlFor="prompt" className="sr-only">
                  Prompt
                </label>
                <textarea
                  ref={imagePromptRef}
                  id="prompt"
                  name="prompt"
                  rows={1}
                  value={prompt}
                  onChange={(event) => {
                    setPrompt(event.target.value);
                    autoResizeImagePrompt(event.currentTarget);
                  }}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder={copy.placeholder}
                  disabled={loading}
                  className={`h-11 min-h-11 max-h-56 w-full resize-none rounded-2xl px-4 py-2.5 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isLight
                      ? "border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                      : "border border-gray-700/90 bg-gray-900/85 text-gray-100 placeholder:text-gray-500"
                  } ${imageFocusClass}`}
                />

                <input
                  ref={sourceImageInputRef}
                  id="source-image"
                  name="source-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSourceImageChange}
                  disabled={loading}
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!canSend}
                    className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold transition disabled:cursor-not-allowed ${
                      isLight
                        ? "border border-violet-400/45 bg-violet-500 text-white hover:bg-violet-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                        : "border border-purple-400/45 bg-purple-500/25 text-purple-100 hover:bg-purple-500/35 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                    }`}
                  >
                    <MdAutoFixHigh className="h-5 w-5" />
                    {loading ? "Aguarde..." : sourceImage ? "Modificar com IA" : "Criar com IA"}
                  </button>

                  <label
                    htmlFor="source-image"
                    className={`inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition ${
                      loading ? "pointer-events-none opacity-60" : ""
                    } ${
                      isLight
                        ? "border border-violet-300/50 bg-violet-50 text-violet-700 hover:bg-violet-100"
                        : "border border-purple-400/45 bg-gray-500/25 text-purple-100 hover:bg-purple-500/35"
                    }`}
                  >
                    <MdAttachFile className="h-4 w-4" />
                    Upload
                  </label>
                </div>
              </div>
              <div className="mt-3">
                <p className={`mt-2 ${mutedTextClass}`}>Formatos: PNG, JPG/JPEG ou WEBP.</p>

                {sourceImage ? (
                  <div
                    className={`mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs ${
                      isLight
                        ? "border border-violet-200 bg-violet-50 text-violet-700"
                        : "border border-purple-400/35 bg-purple-500/15 text-purple-100"
                    }`}
                  >
                    <span className="flex-1 truncate">{sourceImage.name}</span>
                    <button
                      type="button"
                      onClick={removeSourceImage}
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full transition ${
                        isLight
                          ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
                          : "bg-black/25 text-zinc-200 hover:bg-black/45"
                      }`}
                      aria-label="Remover imagem base"
                    >
                      <MdClose className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
              </div>

              {copy.hint ? <p className={`mt-3 ${mutedTextClass}`}>{copy.hint}</p> : null}
            </form>

            <div className="flex min-h-0 flex-col gap-4">
              <article className={`hidden lg:block ${cardClass}`}>
                <p className={sectionTitleClass}>Preview Atual</p>
                {loading ? (
                  <div
                    className={`mt-3 flex h-52 flex-col items-center justify-center gap-3 rounded-2xl ${
                      isLight
                        ? "border border-violet-300/35 bg-violet-100/60 text-slate-800"
                        : "border border-purple-400/35 bg-purple-500/10 text-purple-100"
                    }`}
                  >
                    <span
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${
                        isLight ? "bg-white/70 text-violet-600" : "bg-black/30 text-purple-200"
                      }`}
                    >
                      <MdAutoFixHigh className="h-7 w-7 animate-pulse" />
                    </span>
                    <p className="text-sm font-medium">
                      {sourceImage ? "Modificando imagem..." : "Criando nova imagem..."}
                    </p>
                    <p
                      className={`max-w-md px-4 text-center text-sm leading-relaxed ${
                        isLight ? "text-slate-700" : "text-purple-100"
                      }`}
                    >
                      {loadingVerse}
                    </p>
                  </div>
                ) : latestGenerated?.imageUrl ? (
                  <button
                    type="button"
                    onClick={openLatestPreviewLightbox}
                    className={`mt-3 block w-full overflow-hidden rounded-2xl ${
                      isLight ? "border border-slate-200" : "border border-gray-700"
                    }`}
                    aria-label="Abrir preview da imagem em lightbox"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={latestGenerated.imageUrl}
                      alt="Imagem gerada mais recente"
                      className="h-auto w-full object-cover transition hover:opacity-95"
                    />
                  </button>
                ) : (
                  <div
                    className={`mt-3 flex h-52 items-center justify-center rounded-2xl border border-dashed text-sm ${
                      isLight
                        ? "border-slate-300 bg-slate-100 text-slate-500"
                        : "border-purple-400/45 bg-purple-500/12 text-purple-100"
                    }`}
                  >
                    <MdImage
                      className={`h-11 w-11 ${isLight ? "text-slate-400" : "text-purple-200/80"}`}
                    />
                    <span className="sr-only">Sua primeira imagem vai aparecer aqui.</span>
                  </div>
                )}
                {latestGenerated?.imageUrl ? (
                  <div className="mt-3 space-y-2">
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      disabled={downloadingImage}
                      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${
                        isLight
                          ? "border border-violet-300 bg-violet-500 text-white hover:bg-violet-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                          : "border border-purple-400/45 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                      }`}
                    >
                      <MdDownload className="h-5 w-5" />
                      {downloadingImage ? "Baixando..." : "Download da imagem"}
                    </button>
                    <button
                      type="button"
                      onClick={openLatestVideoModal}
                      disabled={isGeneratingAnyVideo}
                      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${
                        isLight
                          ? "border border-cyan-300 bg-cyan-500 text-white hover:bg-cyan-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                          : "border border-cyan-400/45 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                      }`}
                    >
                      <MdMovie className="h-5 w-5" />
                      {isGeneratingLatestVideo ? "Gerando video..." : "Gerar video"}
                    </button>
                    {generatedVideoUrl ? (
                      <div className="space-y-2">
                        <video
                          src={generatedVideoUrl}
                          controls
                          preload="metadata"
                          className={`w-full rounded-2xl border ${
                            isLight ? "border-slate-200 bg-white" : "border-gray-700 bg-black/30"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => void handleDownloadVideo(generatedVideoUrl, "video-imagem")}
                          disabled={downloadingVideo}
                          className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
                            isLight
                              ? "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                              : "border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700 disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
                          }`}
                        >
                          <MdDownload className="h-4 w-4" />
                          {downloadingVideo ? "Baixando video..." : "Baixar video"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>

            </div>
          </div>

          <article className={historyCardClass}>
            <p className={`mb-3 ${sectionTitleClass}`}>Historico de Geracoes</p>
            {loadingGeneratedHistory && generatedHistory.length === 0 ? (
              <div
                className={`flex h-24 items-center justify-center rounded-xl border border-dashed text-xs ${
                  isLight
                    ? "border-slate-300 bg-slate-100 text-slate-500"
                    : "border-purple-400/45 bg-purple-500/12 text-purple-100"
                }`}
              >
                Carregando historico salvo...
              </div>
            ) : generatedHistory.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {generatedHistory.map((item, index) => (
                  (() => {
                    const historyVideoKey = getHistoryVideoTargetKey(item.id);
                    const historyVideoUrl = generatedVideoByHistoryId[historyVideoKey] || "";

                    return (
                      <article
                        key={`thumb-${item.id}-${index}`}
                        className={`overflow-hidden rounded-xl border ${
                          isLight
                            ? "border-slate-200 bg-white"
                            : "border-gray-700/80 bg-gray-900/70"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => openHistoryLightbox(index)}
                          className="block w-full text-left"
                          aria-label={`Abrir imagem ${index + 1} no lightbox`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={`Geracao ${index + 1}`}
                            className="aspect-square h-auto w-full object-cover transition hover:opacity-90"
                            loading="lazy"
                          />
                        </button>
                        <div className="space-y-1 px-2 py-1.5">
                          <p
                            className={`text-[10px] ${isLight ? "text-slate-600" : "text-gray-300"}`}
                          >
                            {formatCreatedAt(item.createdAt)}
                          </p>
                          <button
                            type="button"
                            onClick={() => openHistoryVideoModal(item)}
                            className={`inline-flex h-7 w-full items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition ${
                              isLight
                                ? "border-cyan-300 bg-cyan-500 text-white hover:bg-cyan-600"
                                : "border-cyan-400/45 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                            }`}
                          >
                            <MdMovie className="h-3.5 w-3.5" />
                            Gerar video
                          </button>
                          {historyVideoUrl ? (
                            <div className="space-y-1">
                              <video
                                ref={(element) => {
                                  historyVideoRefs.current[historyVideoKey] = element;
                                }}
                                src={historyVideoUrl}
                                controls
                                preload="metadata"
                                className={`w-full rounded-lg border ${
                                  isLight
                                    ? "border-slate-300 bg-slate-100"
                                    : "border-gray-600 bg-black/40"
                                }`}
                              />
                              <div className="grid grid-cols-2 gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleDownloadVideo(historyVideoUrl, `video-historico-${item.id}`)
                                  }
                                  disabled={downloadingVideo}
                                  className={`inline-flex h-7 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition disabled:cursor-not-allowed ${
                                    isLight
                                      ? "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                      : "border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700 disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
                                  }`}
                                >
                                  <MdDownload className="h-3.5 w-3.5" />
                                  Baixar
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleHistoryVideoFullscreen(historyVideoKey, historyVideoUrl)
                                  }
                                  className={`inline-flex h-7 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition ${
                                    isLight
                                      ? "border-cyan-300 bg-cyan-500 text-white hover:bg-cyan-600"
                                      : "border-cyan-400/45 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                                  }`}
                                >
                                  <MdFullscreen className="h-3.5 w-3.5" />
                                  Fullscreen
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })()
                ))}
              </div>
            ) : (
              <div
                className={`flex h-24 items-center justify-center rounded-xl border border-dashed text-xs ${
                  isLight
                    ? "border-slate-300 bg-slate-100 text-slate-500"
                    : "border-purple-400/45 bg-purple-500/12 text-purple-100"
                }`}
              >
                Nenhuma imagem gerada ainda.
              </div>
            )}
            {generatedHistoryWarning ? (
              <p className={`mt-2 ${mutedTextClass}`}>{generatedHistoryWarning}</p>
            ) : null}
          </article>

          {historyLightboxItem ? (
            <div
              className="fixed inset-0 z-90 flex items-center justify-center bg-black/85 p-3 sm:p-6"
              onClick={closeHistoryLightbox}
            >
              <div
                className={`relative w-full max-w-6xl rounded-2xl border p-3 shadow-2xl sm:p-4 ${
                  isLight ? "border-slate-200 bg-white" : "border-gray-700 bg-gray-900"
                }`}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={closeHistoryLightbox}
                  className={`absolute top-3 right-3 z-20 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition ${
                    isLight
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-gray-800 text-gray-200 hover:bg-gray-700"
                  }`}
                  aria-label="Fechar lightbox"
                >
                  <MdClose className="h-4 w-4" />
                </button>

                <div className="relative flex items-center justify-center">
                  {generatedHistory.length > 1 ? (
                    <button
                      type="button"
                      onClick={goToPreviousHistoryImage}
                      className={`absolute left-1 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full transition sm:left-2 ${
                        isLight
                          ? "bg-white/90 text-slate-700 shadow hover:bg-white"
                          : "bg-gray-900/80 text-white hover:bg-gray-800"
                      }`}
                      aria-label="Imagem anterior"
                    >
                      <MdChevronLeft className="h-6 w-6" />
                    </button>
                  ) : null}

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={historyLightboxItem.imageUrl}
                    alt="Imagem do historico em destaque"
                    className={`max-h-[80vh] w-full rounded-xl object-contain ${
                      isLight ? "border border-slate-200" : "border border-gray-700"
                    }`}
                  />

                  {generatedHistory.length > 1 ? (
                    <button
                      type="button"
                      onClick={goToNextHistoryImage}
                      className={`absolute right-1 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full transition sm:right-2 ${
                        isLight
                          ? "bg-white/90 text-slate-700 shadow hover:bg-white"
                          : "bg-gray-900/80 text-white hover:bg-gray-800"
                      }`}
                      aria-label="Proxima imagem"
                    >
                      <MdChevronRight className="h-6 w-6" />
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 pr-10">
                  <p className={`text-xs ${isLight ? "text-slate-600" : "text-gray-300"}`}>
                    Criada em {formatCreatedAt(historyLightboxItem.createdAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openHistoryVideoModal(historyLightboxItem)}
                      className={`inline-flex h-8 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition ${
                        isLight
                          ? "border-cyan-300 bg-cyan-500 text-white hover:bg-cyan-600"
                          : "border-cyan-400/45 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                      }`}
                    >
                      <MdMovie className="h-4 w-4" />
                      Gerar video
                    </button>
                    <p className={`text-xs ${isLight ? "text-slate-500" : "text-gray-400"}`}>
                      {historyLightboxIndex !== null ? historyLightboxIndex + 1 : 1}/
                      {generatedHistory.length}
                    </p>
                  </div>
                </div>
                {historyLightboxCaption ? (
                  <p
                    className={`mt-2 text-xs leading-relaxed ${isLight ? "text-slate-700" : "text-gray-200"}`}
                  >
                    {historyLightboxCaption}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {videoGenerationModalSource ? (
            <div
              className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/85 p-3 sm:p-6"
              onClick={closeVideoGenerationModal}
            >
              <div
                className={`relative my-2 max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-y-auto rounded-2xl border p-4 shadow-2xl sm:my-4 sm:max-h-[calc(100dvh-2rem)] sm:p-5 ${
                  isLight ? "border-slate-200 bg-white" : "border-gray-700 bg-gray-900"
                }`}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={closeVideoGenerationModal}
                  disabled={isGeneratingVideoGenerationModal}
                  className={`absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full transition disabled:cursor-not-allowed ${
                    isLight
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:bg-slate-200/70 disabled:text-slate-400"
                      : "bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:bg-gray-800/70 disabled:text-gray-500"
                  }`}
                  aria-label="Fechar modal de geracao de video"
                >
                  <MdClose className="h-4 w-4" />
                </button>

                <div className="mb-3 pr-10">
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.12em] ${
                      isLight ? "text-cyan-600" : "text-cyan-300"
                    }`}
                  >
                    {videoGenerationModalSource.title}
                  </p>
                  <p className={`text-xs ${isLight ? "text-slate-500" : "text-gray-400"}`}>
                    {videoGenerationModalSource.subtitle}
                  </p>
                  <p className={`text-xs ${isLight ? "text-slate-500" : "text-gray-400"}`}>
                    Qualidade fixa: baixa (720p)
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(360px,1.15fr)]">
                  <div
                    className={`overflow-hidden rounded-xl border ${
                      isLight ? "border-slate-200 bg-slate-100" : "border-gray-700 bg-black/35"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={videoGenerationModalSource.imageUrl}
                      alt="Imagem do historico para gerar video"
                      className="max-h-[420px] w-full object-contain"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label
                        className={`mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] ${
                          isLight ? "text-slate-500" : "text-gray-300"
                        }`}
                      >
                        Prompt do video
                      </label>
                      <textarea
                        value={videoGenerationPromptInput}
                        onChange={(event) => setVideoGenerationPromptInput(event.target.value)}
                        rows={3}
                        disabled={isGeneratingAnyVideo}
                        className={`w-full resize-y rounded-xl border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isLight
                            ? "border-slate-300 bg-white text-slate-900"
                            : "border-gray-700 bg-gray-900/85 text-gray-100"
                        } ${imageFocusClass}`}
                      />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label
                          className={`mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] ${
                            isLight ? "text-slate-500" : "text-gray-300"
                          }`}
                        >
                          Formato
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {VIDEO_ASPECT_RATIO_OPTIONS.map((option) => (
                            <button
                              key={`video-aspect-modal-${option.value}`}
                              type="button"
                              onClick={() => setVideoGenerationAspectRatioInput(option.value)}
                              disabled={isGeneratingAnyVideo}
                              className={`h-9 rounded-lg border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                videoGenerationAspectRatioInput === option.value
                                  ? isLight
                                    ? "border-cyan-300 bg-cyan-500 text-white"
                                    : "border-cyan-400/60 bg-cyan-500/25 text-cyan-100"
                                  : isLight
                                    ? "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                                    : "border-gray-700 bg-gray-900/70 text-gray-300 hover:bg-gray-800"
                              }`}
                            >
                              {option.value}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label
                          className={`mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] ${
                            isLight ? "text-slate-500" : "text-gray-300"
                          }`}
                        >
                          Segundos
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {VIDEO_DURATION_OPTIONS.map((seconds) => (
                            <button
                              key={`video-duration-modal-${seconds}`}
                              type="button"
                              onClick={() => setVideoGenerationDurationInput(seconds)}
                              disabled={isGeneratingAnyVideo}
                              className={`h-9 rounded-lg border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                videoGenerationDurationInput === seconds
                                  ? isLight
                                    ? "border-cyan-300 bg-cyan-500 text-white"
                                    : "border-cyan-400/60 bg-cyan-500/25 text-cyan-100"
                                  : isLight
                                    ? "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                                    : "border-gray-700 bg-gray-900/70 text-gray-300 hover:bg-gray-800"
                              }`}
                            >
                              {seconds}s
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void handleGenerateVideo({
                          imageUrl: videoGenerationModalSource.imageUrl,
                          prompt: videoGenerationPromptInput.trim(),
                          aspectRatio: videoGenerationAspectRatioInput,
                          durationSeconds: videoGenerationDurationInput,
                          targetKey: videoGenerationModalTargetKey,
                        })
                      }
                      disabled={isGeneratingAnyVideo}
                      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${
                        isLight
                          ? "border-cyan-300 bg-cyan-500 text-white hover:bg-cyan-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                          : "border-cyan-400/45 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                      }`}
                    >
                      <MdMovie className="h-5 w-5" />
                      {isGeneratingVideoGenerationModal ? "Gerando video..." : "Gerar video"}
                    </button>

                    {isGeneratingVideoGenerationModal ? (
                      <p className={`text-xs ${isLight ? "text-slate-500" : "text-gray-400"}`}>
                        Aguarde, estamos processando o video desta imagem...
                      </p>
                    ) : null}

                    {videoGenerationModalResultUrl ? (
                      <div className="space-y-2">
                        <video
                          src={videoGenerationModalResultUrl}
                          controls
                          preload="metadata"
                          className={`w-full rounded-xl border ${
                            isLight ? "border-slate-200 bg-white" : "border-gray-700 bg-black/30"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            void handleDownloadVideo(videoGenerationModalResultUrl, "video-modal")
                          }
                          disabled={downloadingVideo}
                          className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
                            isLight
                              ? "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                              : "border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700 disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
                          }`}
                        >
                          <MdDownload className="h-4 w-4" />
                          {downloadingVideo ? "Baixando video..." : "Baixar video"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {!historyLightboxItem && previewLightboxImageUrl ? (
            <div
              className="fixed inset-0 z-90 flex items-center justify-center bg-black/85 p-3 sm:p-6"
              onClick={closePreviewLightbox}
            >
              <div
                className={`relative w-full max-w-5xl rounded-2xl border p-3 shadow-2xl sm:p-4 ${
                  isLight ? "border-slate-200 bg-white" : "border-gray-700 bg-gray-900"
                }`}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={closePreviewLightbox}
                  className={`absolute top-3 right-3 z-20 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition ${
                    isLight
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-gray-800 text-gray-200 hover:bg-gray-700"
                  }`}
                  aria-label="Fechar lightbox"
                >
                  <MdClose className="h-4 w-4" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewLightboxImageUrl}
                  alt="Preview ampliado da imagem gerada"
                  className={`max-h-[80vh] w-full rounded-xl object-contain ${
                    isLight ? "border border-slate-200" : "border border-gray-700"
                  }`}
                />
              </div>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className={mainClass}>
      {topActionMenu}
      <section className="flex h-dvh min-h-dvh w-full flex-col px-0 pt-0 pb-0 sm:h-screen sm:min-h-screen">
        <header className={chatHeaderClass}>
          <div
            className={`absolute -top-16 -right-10 h-44 w-44 rounded-full blur-3xl ${
              isLight ? "bg-cyan-200/50" : "bg-cyan-500/20"
            }`}
          />
          <div
            className={`absolute -bottom-20 left-1/3 h-56 w-56 rounded-full blur-3xl ${
              isLight ? "bg-violet-200/40" : "bg-blue-500/10"
            }`}
          />

          <div className="flex items-center gap-2 font-semibold">
            <button
              type="button"
              onClick={() => setIsMobileChatSidebarOpen(true)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition lg:hidden ${
                isLight
                  ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  : "border border-gray-700 bg-gray-900/70 text-gray-100 hover:bg-gray-800"
              }`}
              aria-label="Abrir lista de chats"
            >
              <MdMenu className="h-4 w-4" />
            </button>
            <SiOpenai className="h-5 w-5 text-purple-300 sm:h-6 sm:w-6" />
            <h1 className="text-base sm:text-2xl">{copy.title}</h1>
          </div>
        </header>

        {isMobileChatSidebarOpen ? (
          <>
            <button
              type="button"
              onClick={() => setIsMobileChatSidebarOpen(false)}
              className={mobileChatOverlayClass}
              aria-label="Fechar lista de chats"
            />

            <aside className={mobileChatDrawerClass} role="dialog" aria-modal="true" aria-label="Chats salvos">
              <div
                className={`flex items-center justify-between border-b px-3 py-3 ${
                  isLight ? "border-slate-200" : "border-gray-700"
                }`}
              >
                <p className={`text-sm font-semibold ${isLight ? "text-slate-800" : "text-gray-100"}`}>
                  Chats
                </p>
                <button
                  type="button"
                  onClick={() => setIsMobileChatSidebarOpen(false)}
                  className={topMenuCloseButtonClass}
                  aria-label="Fechar chats"
                >
                  <MdClose className="h-4 w-4" />
                </button>
              </div>

              <div className={`border-b px-3 py-3 ${isLight ? "border-slate-200" : "border-gray-700"}`}>
                <button
                  type="button"
                  onClick={handleCreateNewChat}
                  disabled={loading}
                  className={`inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
                    isLight
                      ? "border border-violet-300 bg-violet-500 text-white hover:bg-violet-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                      : "border border-purple-400/45 bg-purple-500/25 text-purple-100 hover:bg-purple-500/35 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                  }`}
                >
                  + Novo chat
                </button>
              </div>

              <div
                className={`min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-3 chat-scrollbar ${
                  isLight ? "chat-scrollbar-light" : "chat-scrollbar-dark"
                }`}
              >
                {chatSessionsLoaded ? (
                  chatSessions.map((session) => {
                    const isActive = session.id === activeChatId;

                    return (
                      <article
                        key={`mobile-${session.id}`}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                          isActive
                            ? isLight
                              ? "border-violet-300 bg-violet-50 text-violet-900"
                              : "border-purple-300/60 bg-purple-500/15 text-purple-100"
                            : isLight
                              ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              : "border-gray-700 bg-gray-900/70 text-gray-200 hover:border-gray-600 hover:bg-gray-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectChat(session.id)}
                            disabled={loading || isDeletingChat}
                            className="min-w-0 flex-1 text-left"
                            aria-label={`Abrir chat ${session.title}`}
                          >
                            <p className="truncate text-sm font-semibold">{session.title}</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => requestDeleteChat(session.id)}
                            disabled={loading || isDeletingChat}
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
                              isLight
                                ? "text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                            }`}
                            aria-label={`Excluir chat ${session.title}`}
                            title="Excluir chat"
                          >
                            <MdDeleteOutline className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectChat(session.id)}
                          disabled={loading || isDeletingChat}
                          className="mt-1 w-full text-left"
                          aria-label={`Abrir chat ${session.title}`}
                        >
                          <p className={`truncate text-xs ${isLight ? "text-slate-500" : "text-gray-400"}`}>
                            {getChatSessionPreview(session.messages)}
                          </p>
                          <p className={`mt-1 text-[10px] ${isLight ? "text-slate-400" : "text-gray-500"}`}>
                            {formatCreatedAt(session.updatedAt)}
                          </p>
                        </button>
                      </article>
                    );
                  })
                ) : (
                  <p className={`px-2 text-xs ${isLight ? "text-slate-500" : "text-gray-400"}`}>
                    Carregando chats...
                  </p>
                )}
              </div>
            </aside>
          </>
        ) : null}

        <div
          className="chat-font-scope mt-0 flex min-h-0 flex-1 flex-col gap-4 sm:mt-4 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-4"
          data-chat-font={isLargeChatFont ? "large" : "normal"}
        >
          <aside
            className={`hidden min-h-0 lg:flex lg:flex-col lg:overflow-hidden lg:rounded-2xl ${
              isLight
                ? "border border-slate-200 bg-white shadow-sm"
                : "border border-gray-700/80 bg-gray-900/70"
            }`}
          >
            <div className={`border-b px-3 py-3 ${isLight ? "border-slate-200" : "border-gray-700"}`}>
              <button
                type="button"
                onClick={handleCreateNewChat}
                disabled={loading}
                className={`inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
                  isLight
                    ? "border border-violet-300 bg-violet-500 text-white hover:bg-violet-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                    : "border border-purple-400/45 bg-purple-500/25 text-purple-100 hover:bg-purple-500/35 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                }`}
              >
                + Novo chat
              </button>
            </div>

            <div
              className={`min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-3 chat-scrollbar ${
                isLight ? "chat-scrollbar-light" : "chat-scrollbar-dark"
              }`}
            >
              {chatSessionsLoaded ? (
                chatSessions.map((session) => {
                  const isActive = session.id === activeChatId;

                  return (
                    <article
                      key={session.id}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed ${
                        isActive
                          ? isLight
                            ? "border-violet-300 bg-violet-50 text-violet-900"
                            : "border-purple-300/60 bg-purple-500/15 text-purple-100"
                          : isLight
                            ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            : "border-gray-700 bg-gray-900/70 text-gray-200 hover:border-gray-600 hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectChat(session.id)}
                          disabled={loading || isDeletingChat}
                          className="min-w-0 flex-1 text-left"
                          aria-label={`Abrir chat ${session.title}`}
                        >
                          <p className="truncate text-sm font-semibold">{session.title}</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => requestDeleteChat(session.id)}
                          disabled={loading || isDeletingChat}
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
                            isLight
                              ? "text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                          }`}
                          aria-label={`Excluir chat ${session.title}`}
                          title="Excluir chat"
                        >
                          <MdDeleteOutline className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectChat(session.id)}
                        disabled={loading || isDeletingChat}
                        className="mt-1 w-full text-left"
                        aria-label={`Abrir chat ${session.title}`}
                      >
                        <p className={`truncate text-xs ${isLight ? "text-slate-500" : "text-gray-400"}`}>
                          {getChatSessionPreview(session.messages)}
                        </p>
                        <p className={`mt-1 text-[10px] ${isLight ? "text-slate-400" : "text-gray-500"}`}>
                          {formatCreatedAt(session.updatedAt)}
                        </p>
                      </button>
                    </article>
                  );
                })
              ) : (
                <p className={`px-2 text-xs ${isLight ? "text-slate-500" : "text-gray-400"}`}>
                  Carregando chats...
                </p>
              )}
            </div>

          </aside>

          <div
            className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-none sm:rounded-2xl ${
              isLight
                ? "border border-slate-200 bg-slate-50 shadow-sm"
                : "border border-gray-700/80 bg-gray-800 shadow"
            }`}
          >
          <div
            ref={chatMessagesContainerRef}
            onScroll={handleChatMessagesScroll}
            className={`min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 chat-scrollbar ${
              isLight ? "chat-scrollbar-light" : "chat-scrollbar-dark"
            }`}
          >
            <div className={`flex w-full flex-col gap-4 ${messages.length === 0 ? "min-h-full" : ""}`}>
              {messages.length === 0 ? (
                <section className="flex min-h-[62vh] flex-1 items-center justify-center sm:min-h-[66vh]">
                  <div className="flex max-w-md flex-col items-center justify-center text-center">
                    <span
                      className={`inline-flex h-20 w-20 items-center justify-center rounded-2xl border ${
                        isLight
                          ? "border-violet-200 bg-violet-50 text-violet-600"
                          : "border-purple-400/45 bg-purple-500/15 text-purple-200"
                      }`}
                    >
                      <SiOpenai className="h-11 w-11" />
                    </span>
                    <h2
                      className={`chat-empty-greeting-title mt-6 font-medium ${
                        isLight ? "text-slate-900" : "text-white"
                      }`}
                    >
                      Olá, como posso ajudar?
                    </h2>
                  </div>
                </section>
              ) : null}

              {messages.map((message, index) => {
                const isMessageEmpty =
                  message.content.trim().length === 0 && !message.imageUrl;

                if (isMessageEmpty) {
                  return null;
                }

                return (
                  <article
                    key={message.id ?? `${message.role}-${index}`}
                    className={`max-w-[92%] rounded-2xl px-4 py-3 text-base leading-relaxed shadow-lg sm:max-w-[80%] ${
                      message.role === "user"
                        ? isLight
                          ? "ml-auto border border-violet-200 bg-violet-50 text-violet-800"
                          : "ml-auto border border-purple-400/45 bg-purple-500/15 text-purple-100"
                        : isLight
                          ? "mr-auto border border-slate-200 bg-white text-slate-800 shadow-sm"
                          : "mr-auto border border-gray-700/80 bg-gray-900/70 text-gray-100"
                    }`}
                  >
                    <div className="space-y-2">
                      {renderMessageContent(message.content, `message-${index}`)}
                    </div>
                    {message.tables && message.tables.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {message.tables.map((table, tableIndex) =>
                          renderTablePreview(
                            table,
                            `${message.id ?? `message-${index}`}-table-${tableIndex}`
                          )
                        )}
                      </div>
                    ) : null}
                    {message.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={message.imageUrl}
                        alt="Imagem gerada pela IA"
                        className="mt-3 w-full rounded-xl border border-white/20 object-cover"
                      />
                    ) : null}
                  </article>
                );
              })}

              {loading ? (
                <article
                  className={`mr-auto inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-lg ${
                    isLight
                      ? "border-violet-200 bg-violet-50 text-violet-700"
                      : "border-purple-400/40 bg-purple-500/15 text-purple-100"
                  }`}
                >
                  <SiOpenai className="h-5 w-5 animate-spin" />
                  <span className="sr-only">Gerando resposta...</span>
                </article>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className={`relative border-t px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-5 ${
              isLight ? "border-slate-200 bg-white" : "border-gray-700/80 bg-gray-900/55"
            }`}
          >
            {!isChatNearBottom && hasReturnedAssistantMessages ? (
              <button
                type="button"
                onClick={handleScrollToChatBottom}
                aria-label="Ir para o final da conversa"
                title="Ir para o final"
                className={`absolute -top-12 right-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition sm:right-6 ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    : "border-gray-600 bg-gray-900/95 text-gray-100 hover:bg-gray-800"
                }`}
              >
                <MdArrowDownward className="h-5 w-5" />
              </button>
            ) : null}

            {error ? (
              <p className="mb-3 rounded-xl border border-red-500/40 bg-red-900/35 px-3 py-2 text-sm text-red-100">
                {error}
              </p>
            ) : null}
            {warnings.length > 0 ? (
              <div className="mb-3 rounded-xl border border-purple-400/35 bg-purple-500/15 px-3 py-2 text-sm text-purple-100">
                {warnings.map((warning, index) => (
                  <p key={`${warning}-${index}`}>{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="mb-3">
              <input
                ref={fileInputRef}
                id="file-upload"
                name="file-upload"
                type="file"
                multiple
                onChange={handleFilesChange}
                disabled={loading}
                className="hidden"
              />

              {selectedFiles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                        isLight
                          ? "border border-violet-200 bg-violet-50 text-violet-700"
                          : "border border-purple-400/35 bg-purple-500/15 text-purple-100"
                      }`}
                    >
                      <span className="max-w-50 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(file)}
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full transition ${
                          isLight
                            ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
                            : "bg-black/25 text-zinc-200 hover:bg-black/45"
                        }`}
                        aria-label={`Remover ${file.name}`}
                      >
                        <MdClose className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                aria-label="Anexar arquivos"
                className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-semibold transition disabled:cursor-not-allowed ${
                  isLight
                    ? "border border-violet-300/60 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                    : "border border-purple-400/45 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                }`}
              >
                +
              </button>

              <label htmlFor="prompt" className="sr-only">
                Prompt
              </label>
              <textarea
                ref={chatPromptRef}
                id="prompt"
                name="prompt"
                rows={1}
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value);
                  autoResizeChatPrompt(event.currentTarget);
                }}
                onKeyDown={handleTextareaKeyDown}
                placeholder={copy.placeholder}
                disabled={loading}
                className={`h-12 min-h-12 max-h-44 flex-1 resize-none rounded-xl px-4 py-3 text-base outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isLight
                    ? "border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    : "border border-gray-700/90 bg-gray-900/85 text-gray-100 placeholder:text-gray-500"
                } ${chatFocusClass}`}
              />

              <button
                type={canStopChatStream ? "button" : "submit"}
                onClick={canStopChatStream ? handleStopChatStream : undefined}
                disabled={canStopChatStream ? false : !canSend}
                aria-label={canStopChatStream ? "Parar geracao" : loading ? "Aguarde" : "Enviar mensagem"}
                className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition disabled:cursor-not-allowed ${
                  isLight
                    ? "border border-violet-400/45 bg-violet-500 text-white hover:bg-violet-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                    : "border border-purple-400/45 bg-purple-500/25 text-purple-100 hover:bg-purple-500/35 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                }`}
              >
                {canStopChatStream ? <MdStop className="h-5 w-5" /> : <MdArrowUpward className="h-5 w-5" />}
              </button>
            </div>

            {copy.hint ? <p className={`mt-2 ${mutedTextClass}`}>{copy.hint}</p> : null}
          </form>
        </div>
        </div>
      </section>

      {chatIdPendingDelete ? (
        <div
          className="fixed inset-0 z-92 flex items-center justify-center bg-black/60 p-4"
          onClick={closeDeleteChatModal}
        >
          <div
            className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
              isLight ? "border-slate-200 bg-white text-slate-900" : "border-gray-700 bg-gray-900 text-gray-100"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Excluir chat</h3>
            <p className={`mt-2 text-sm leading-relaxed ${isLight ? "text-slate-600" : "text-gray-300"}`}>
              Deseja realmente excluir
              {" "}
              <strong>{pendingDeleteSession?.title ?? "este chat"}</strong>
              ?
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteChatModal}
                disabled={isDeletingChat}
                className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition disabled:cursor-not-allowed ${
                  isLight
                    ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400"
                    : "border border-gray-600 bg-gray-900/70 text-gray-200 hover:bg-gray-800 disabled:border-gray-700 disabled:text-gray-500"
                }`}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  void confirmDeleteChat();
                }}
                disabled={isDeletingChat}
                className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${
                  isLight
                    ? "border border-red-300 bg-red-500 text-white hover:bg-red-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                    : "border border-red-400/50 bg-red-500/20 text-red-100 hover:bg-red-500/30 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-500"
                }`}
              >
                {isDeletingChat ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

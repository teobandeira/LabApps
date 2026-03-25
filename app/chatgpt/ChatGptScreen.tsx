"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  MdAutoFixHigh,
  MdArrowUpward,
  MdArrowBack,
  MdAttachFile,
  MdChevronLeft,
  MdChevronRight,
  MdClose,
  MdDownload,
  MdImage,
  MdMoreVert,
} from "react-icons/md";
import { SiOpenai } from "react-icons/si";

type GenerationMode = "chat" | "image";
type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";
type ThemeMode = "dark" | "light";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  imageId?: string;
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

type ChatGptScreenProps = {
  mode: GenerationMode;
};

const MAX_FILES = 5;
const ACCEPTED_FILE_TYPES =
  ".txt,.md,.csv,.json,.xml,.yml,.yaml,.log,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.go,.rs,.sql,.html,.css,.scss";

const IMAGE_SIZE_OPTIONS: Array<{ label: string; value: ImageSize }> = [
  { label: "Quadrada 1024x1024", value: "1024x1024" },
  { label: "Paisagem 1536x1024", value: "1536x1024" },
  { label: "Retrato 1024x1536", value: "1024x1536" },
];
const IMAGE_MODEL_LABEL = "chatgpt-image-latest";
const THEME_STORAGE_KEY = "chatgpt-theme-mode";
const CHAT_PROMPT_MAX_HEIGHT = 176;
const IMAGE_PROMPT_MAX_HEIGHT = 220;
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
    placeholder: "Escreva seu prompt aqui...",
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
  const [loadingVerse, setLoadingVerse] = useState<string>(() => getRandomBibleVerse());
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generatedHistory, setGeneratedHistory] = useState<GeneratedImageHistoryItem[]>([]);
  const [loadingGeneratedHistory, setLoadingGeneratedHistory] = useState(false);
  const [generatedHistoryWarning, setGeneratedHistoryWarning] = useState("");
  const [historyLightboxIndex, setHistoryLightboxIndex] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceImageInputRef = useRef<HTMLInputElement>(null);
  const chatPromptRef = useRef<HTMLTextAreaElement>(null);
  const imagePromptRef = useRef<HTMLTextAreaElement>(null);
  const topMenuRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canSend =
    (mode === "image"
      ? prompt.trim().length > 0
      : prompt.trim().length > 0 || selectedFiles.length > 0) && !loading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

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
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage issues
    }
  }, [theme]);

  useEffect(() => {
    if (!isTopMenuOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!topMenuRef.current) {
        return;
      }
      if (!topMenuRef.current.contains(event.target as Node)) {
        setIsTopMenuOpen(false);
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsTopMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isTopMenuOpen]);

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

    const filesToSend = mode === "chat" ? [...selectedFiles] : [];
    const sourceImageToSend = mode === "image" ? sourceImage : null;
    const imageAction = mode === "image" && sourceImageToSend ? "edit" : "generate";
    const userMessageParts: string[] = [];

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
      setPrompt("");
    }
    setSelectedFiles([]);
    setLoading(true);
    setError("");
    setWarnings([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setMessages((current) => [
      ...current,
      { role: "user", content: userMessageParts.join("\n\n") },
    ]);

    try {
      const formData = new FormData();
      formData.append("prompt", cleanPrompt);
      formData.append("mode", mode);
      formData.append("imageSize", imageSize);
      formData.append("imageAction", imageAction);

      for (const file of filesToSend) {
        formData.append("files", file);
      }
      if (sourceImageToSend) {
        formData.append("sourceImage", sourceImageToSend);
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
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Falha ao gerar resposta.");
      }

      if (!data.answer) {
        throw new Error("A API retornou resposta vazia.");
      }

      const usedFiles = Array.isArray(data.filesUsed) ? data.filesUsed : [];
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

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: answerParts.join("\n\n"),
          imageUrl: hasImage ? data.imageUrl : undefined,
          imageId: hasImage ? storedImageId : undefined,
        },
      ]);

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
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: `Arquivos usados no contexto: ${usedFiles.join(", ")}`,
          },
        ]);
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Erro inesperado na requisicao.";

      setError(message);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Nao consegui processar agora. Confira OPENAI_API_KEY e tente novamente.",
        },
      ]);
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
    if (historyLightboxIndex === null) {
      return;
    }

    function handleLightboxKeyboard(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setHistoryLightboxIndex(null);
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
  }, [historyLightboxIndex, generatedHistory.length]);

  const mainClass = `font-(family-name:--font-montserrat) min-h-screen [&_button:enabled]:cursor-pointer [&_a]:cursor-pointer ${
    isLight ? "bg-slate-100 text-slate-900" : "bg-gray-900 text-white"
  }`;
  const headerClass = isLight
    ? "relative overflow-hidden rounded-none border border-slate-200 bg-white px-4 py-3 shadow-sm sm:rounded-3xl sm:px-6 sm:py-5 lg:px-8 lg:py-6"
    : "relative overflow-hidden rounded-none border border-cyan-500/20 bg-linear-to-br from-gray-900 via-slate-900 to-gray-900 px-4 py-3 sm:rounded-3xl sm:px-6 sm:py-5 lg:px-8 lg:py-6";
  const chatHeaderClass = isLight
    ? "relative overflow-hidden rounded-none border border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:rounded-3xl sm:px-5 sm:py-3.5 lg:px-6 lg:py-4"
    : "relative overflow-hidden rounded-none border border-cyan-500/20 bg-linear-to-br from-gray-900 via-slate-900 to-gray-900 px-4 py-2.5 sm:rounded-3xl sm:px-5 sm:py-3.5 lg:px-6 lg:py-4";
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
  const topMenuPanelClass = isLight
    ? "absolute right-0 top-10 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:top-12"
    : "absolute right-0 top-10 w-44 overflow-hidden rounded-xl border border-gray-700 bg-gray-900/95 shadow-lg sm:top-12";
  const topMenuItemClass = isLight
    ? "inline-flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
    : "inline-flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-100 transition hover:bg-gray-800";

  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  const historyLightboxItem =
    historyLightboxIndex !== null ? generatedHistory[historyLightboxIndex] ?? null : null;

  function openHistoryLightbox(index: number) {
    setHistoryLightboxIndex(index);
  }

  function closeHistoryLightbox() {
    setHistoryLightboxIndex(null);
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
    <div ref={topMenuRef} className="fixed top-1 right-2 z-80 sm:top-4 sm:right-4">
      <button
        type="button"
        onClick={() => setIsTopMenuOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={isTopMenuOpen}
        aria-label="Abrir menu"
        className={topMenuTriggerClass}
      >
        <MdMoreVert className="h-5 w-5" />
      </button>

      {isTopMenuOpen ? (
        <div className={topMenuPanelClass} role="menu">
          <button
            type="button"
            onClick={() => {
              toggleTheme();
              setIsTopMenuOpen(false);
            }}
            className={topMenuItemClass}
            role="menuitem"
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

          <Link
            href="/chatgpt"
            onClick={() => setIsTopMenuOpen(false)}
            className={topMenuItemClass}
            role="menuitem"
          >
            <MdArrowBack className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      ) : null}
    </div>
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

  if (mode === "image") {
    return (
      <main className={mainClass}>
        {topActionMenu}
        <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-0 py-0">
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
                    className={`relative mt-3 h-44 overflow-hidden rounded-2xl ${
                      isLight
                        ? "border border-violet-300/35 bg-violet-100/60"
                        : "border border-purple-400/35 bg-purple-500/10"
                    }`}
                  >
                    {latestGenerated?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={latestGenerated.imageUrl}
                        alt="Preview anterior"
                        className="h-full w-full object-cover opacity-35 blur-[1px]"
                      />
                    ) : null}
                    <div className={`absolute inset-0 ${isLight ? "bg-slate-200/35" : "bg-slate-900/45"}`} />
                    <div className="pointer-events-none absolute inset-0">
                      <span
                        className={`absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full animate-[ping_2s_ease-in-out_infinite] ${
                          isLight ? "bg-slate-300/45" : "bg-slate-400/20"
                        }`}
                      />
                      <span
                        className={`absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-2xl animate-pulse ${
                          isLight ? "bg-slate-300/55" : "bg-slate-400/30"
                        }`}
                      />
                    </div>
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 ${
                        isLight ? "text-slate-800" : "text-purple-100"
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {sourceImage ? "Modificando imagem..." : "Criando nova imagem..."}
                      </p>
                      <div className="space-y-2">
                        <span
                          className={`mx-auto block h-2 w-40 rounded-full animate-pulse ${
                            isLight ? "bg-slate-400/45" : "bg-slate-300/35"
                          }`}
                          style={{ animationDuration: "1.4s" }}
                        />
                        <span
                          className={`mx-auto block h-2 w-28 rounded-full animate-pulse ${
                            isLight ? "bg-slate-400/45" : "bg-slate-300/35"
                          }`}
                          style={{ animationDuration: "1.8s" }}
                        />
                        <span
                          className={`mx-auto block h-2 w-20 rounded-full animate-pulse ${
                            isLight ? "bg-slate-400/45" : "bg-slate-300/35"
                          }`}
                          style={{ animationDuration: "1.2s" }}
                        />
                      </div>
                      <p
                        className={`max-w-sm text-center text-xs leading-relaxed ${
                          isLight ? "text-slate-600" : "text-purple-200/90"
                        }`}
                      >
                        {loadingVerse}
                      </p>
                    </div>
                  </div>
                ) : latestGenerated?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={latestGenerated.imageUrl}
                    alt="Imagem gerada mais recente"
                    className={`mt-3 h-auto w-full rounded-2xl object-cover ${
                      isLight ? "border border-slate-200" : "border border-gray-700"
                    }`}
                  />
                ) : (
                  <div
                    className={`mt-3 flex h-44 items-center justify-center rounded-2xl border border-dashed text-sm ${
                      isLight
                        ? "border-slate-300 bg-slate-100 text-slate-500"
                        : "border-purple-400/45 bg-purple-500/12 text-purple-100"
                    }`}
                  >
                    Sua primeira imagem vai aparecer aqui.
                  </div>
                )}

                {latestGenerated?.imageUrl ? (
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={downloadingImage}
                    className={`mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${
                      isLight
                        ? "border border-violet-300 bg-violet-500 text-white hover:bg-violet-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                        : "border border-purple-400/45 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                    }`}
                  >
                    <MdDownload className="h-5 w-5" />
                    {downloadingImage ? "Baixando..." : "Download da imagem"}
                  </button>
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
                    className={`relative mt-3 h-52 overflow-hidden rounded-2xl ${
                      isLight
                        ? "border border-violet-300/35 bg-violet-100/60"
                        : "border border-purple-400/35 bg-purple-500/10"
                    }`}
                  >
                    {latestGenerated?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={latestGenerated.imageUrl}
                        alt="Preview anterior"
                        className="h-full w-full object-cover opacity-35 blur-[1px]"
                      />
                    ) : null}
                    <div className={`absolute inset-0 ${isLight ? "bg-slate-200/35" : "bg-slate-900/45"}`} />
                    <div className="pointer-events-none absolute inset-0">
                      <span
                        className={`absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full animate-[ping_2s_ease-in-out_infinite] ${
                          isLight ? "bg-slate-300/45" : "bg-slate-400/20"
                        }`}
                      />
                      <span
                        className={`absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-2xl animate-pulse ${
                          isLight ? "bg-slate-300/55" : "bg-slate-400/30"
                        }`}
                      />
                    </div>
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 ${
                        isLight ? "text-slate-800" : "text-purple-100"
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {sourceImage ? "Modificando imagem..." : "Criando nova imagem..."}
                      </p>
                      <div className="space-y-2">
                        <span
                          className={`mx-auto block h-2 w-40 rounded-full animate-pulse ${
                            isLight ? "bg-slate-400/45" : "bg-slate-300/35"
                          }`}
                          style={{ animationDuration: "1.4s" }}
                        />
                        <span
                          className={`mx-auto block h-2 w-28 rounded-full animate-pulse ${
                            isLight ? "bg-slate-400/45" : "bg-slate-300/35"
                          }`}
                          style={{ animationDuration: "1.8s" }}
                        />
                        <span
                          className={`mx-auto block h-2 w-20 rounded-full animate-pulse ${
                            isLight ? "bg-slate-400/45" : "bg-slate-300/35"
                          }`}
                          style={{ animationDuration: "1.2s" }}
                        />
                      </div>
                      <p
                        className={`max-w-sm text-center text-xs leading-relaxed ${
                          isLight ? "text-slate-600" : "text-purple-200/90"
                        }`}
                      >
                        {loadingVerse}
                      </p>
                    </div>
                  </div>
                ) : latestGenerated?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={latestGenerated.imageUrl}
                    alt="Imagem gerada mais recente"
                    className={`mt-3 h-auto w-full rounded-2xl object-cover ${
                      isLight ? "border border-slate-200" : "border border-gray-700"
                    }`}
                  />
                ) : (
                  <div
                    className={`mt-3 flex h-52 items-center justify-center rounded-2xl border border-dashed text-sm ${
                      isLight
                        ? "border-slate-300 bg-slate-100 text-slate-500"
                        : "border-purple-400/45 bg-purple-500/12 text-purple-100"
                    }`}
                  >
                    Sua primeira imagem vai aparecer aqui.
                  </div>
                )}
                {latestGenerated?.imageUrl ? (
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={downloadingImage}
                    className={`mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${
                      isLight
                        ? "border border-violet-300 bg-violet-500 text-white hover:bg-violet-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                        : "border border-purple-400/45 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                    }`}
                  >
                    <MdDownload className="h-5 w-5" />
                    {downloadingImage ? "Baixando..." : "Download da imagem"}
                  </button>
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
                  <article
                    key={`thumb-${item.id}-${index}`}
                    className={`overflow-hidden rounded-xl border ${
                      isLight ? "border-slate-200 bg-white" : "border-gray-700/80 bg-gray-900/70"
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
                    <p
                      className={`px-2 py-1 text-[10px] ${
                        isLight ? "text-slate-600" : "text-gray-300"
                      }`}
                    >
                      {formatCreatedAt(item.createdAt)}
                    </p>
                  </article>
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
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-3 sm:p-6"
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
                  <p className={`text-xs ${isLight ? "text-slate-500" : "text-gray-400"}`}>
                    {historyLightboxIndex !== null ? historyLightboxIndex + 1 : 1}/
                    {generatedHistory.length}
                  </p>
                </div>
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
      <section className="mx-auto flex h-dvh min-h-dvh w-full max-w-6xl flex-col px-0 pt-0 pb-0 sm:h-screen sm:min-h-screen sm:px-5 sm:pt-3 sm:pb-6 lg:px-6 lg:pt-4">
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
            <SiOpenai className="h-5 w-5 text-purple-300 sm:h-6 sm:w-6" />
            <h1 className="text-base sm:text-2xl">{copy.title}</h1>
          </div>
        </header>

        <div
          className={`mt-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-none sm:mt-4 sm:rounded-2xl ${
            isLight ? "border border-slate-200 bg-slate-50 shadow-sm" : "border border-gray-700/80 bg-gray-800 shadow"
          }`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
              {messages.length === 0 ? (
                <section className="flex min-h-full flex-1 items-center justify-center">
                  <div className="flex max-w-md flex-col items-center justify-center text-center">
                    <span
                      className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl border ${
                        isLight
                          ? "border-violet-200 bg-violet-50 text-violet-600"
                          : "border-purple-400/45 bg-purple-500/15 text-purple-200"
                      }`}
                    >
                      <SiOpenai className="h-9 w-9" />
                    </span>
                    <h2 className={`mt-5 text-xl font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                      Olá, como posso ajudar?
                    </h2>
                  </div>
                </section>
              ) : null}

              {messages.map((message, index) => (
                <article
                  key={`${message.role}-${index}`}
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-lg sm:max-w-[80%] ${
                    message.role === "user"
                      ? isLight
                        ? "ml-auto border border-violet-200 bg-violet-50 text-violet-800"
                        : "ml-auto border border-purple-400/45 bg-purple-500/15 text-purple-100"
                      : isLight
                        ? "mr-auto border border-slate-200 bg-white text-slate-800 shadow-sm"
                        : "mr-auto border border-gray-700/80 bg-gray-900/70 text-gray-100"
                  }`}
                >
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
                    {message.role === "user" ? "Voce" : "Assistente"}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.imageUrl}
                      alt="Imagem gerada pela IA"
                      className="mt-3 w-full rounded-xl border border-white/20 object-cover"
                    />
                  ) : null}
                </article>
              ))}

              {loading ? (
                <article
                  className={`mr-auto max-w-[92%] rounded-2xl px-4 py-3 text-[15px] shadow-lg sm:max-w-[80%] ${
                    isLight
                      ? "border border-violet-200 bg-violet-50 text-violet-700"
                      : "border border-purple-400/40 bg-purple-500/15 text-purple-100"
                  }`}
                >
                  Gerando resposta...
                </article>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className={`border-t px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-5 ${
              isLight ? "border-slate-200 bg-white" : "border-gray-700/80 bg-gray-900/55"
            }`}
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

            <div className="mb-3">
              <input
                ref={fileInputRef}
                id="file-upload"
                name="file-upload"
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
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
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-semibold transition disabled:cursor-not-allowed ${
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
                className={`h-11 min-h-11 max-h-44 flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isLight
                    ? "border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    : "border border-gray-700/90 bg-gray-900/85 text-gray-100 placeholder:text-gray-500"
                } ${chatFocusClass}`}
              />

              <button
                type="submit"
                disabled={!canSend}
                aria-label={loading ? "Aguarde" : "Enviar mensagem"}
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition disabled:cursor-not-allowed ${
                  isLight
                    ? "border border-violet-400/45 bg-violet-500 text-white hover:bg-violet-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                    : "border border-purple-400/45 bg-purple-500/25 text-purple-100 hover:bg-purple-500/35 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                }`}
              >
                <MdArrowUpward className="h-5 w-5" />
              </button>
            </div>

            {copy.hint ? <p className={`mt-2 ${mutedTextClass}`}>{copy.hint}</p> : null}
          </form>
        </div>
      </section>
    </main>
  );
}

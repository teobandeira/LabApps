"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  MdAutoFixHigh,
  MdArrowBack,
  MdAttachFile,
  MdClose,
  MdDownload,
  MdImage,
} from "react-icons/md";
import { SiOpenai } from "react-icons/si";

type GenerationMode = "chat" | "image";
type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";
type ThemeMode = "dark" | "light";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
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
const CHAT_TEXT_MODEL_LABEL = "gpt-5.2";
const IMAGE_MODEL_LABEL = "chatgpt-image-latest";
const THEME_STORAGE_KEY = "chatgpt-theme-mode";
const MOBILE_PREVIEW_BREAKPOINT = "(max-width: 1023px)";
const BIBLE_LOADING_VERSES = [
  "Tudo posso naquele que me fortalece. (Filipenses 4:13)",
  "O Senhor e o meu pastor; nada me faltara. (Salmos 23:1)",
  "Entrega o teu caminho ao Senhor; confia nele. (Salmos 37:5)",
  "Buscai primeiro o Reino de Deus. (Mateus 6:33)",
  "A minha graca te basta. (2 Corintios 12:9)",
  "Alegrai-vos na esperanca. (Romanos 12:12)",
  "Sede fortes e corajosos. (Josue 1:9)",
  "Em paz me deito e logo adormeco. (Salmos 4:8)",
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
    hint: "Upload de imagem base e opcional. Sem upload, a imagem e criada do zero.",
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
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceImageInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canSend =
    (mode === "image"
      ? prompt.trim().length > 0
      : prompt.trim().length > 0 || selectedFiles.length > 0) && !loading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

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
    if (mode !== "image") {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_PREVIEW_BREAKPOINT);
    const handleChange = () => {
      setIsMobileViewport(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setIsPreviewModalOpen(false);
      }
    };

    handleChange();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
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

    setPrompt("");
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
        },
      ]);

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

  const chatFocusClass = "focus:border-purple-400/60 focus:ring-4 focus:ring-purple-500/15";
  const imageFocusClass = "focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30";
  const imageMessages = messages.filter((message) => Boolean(message.imageUrl));
  const latestGenerated = imageMessages.length > 0 ? imageMessages[imageMessages.length - 1] : null;
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
    if (mode !== "image" || !isMobileViewport) {
      return;
    }

    if (loading || latestGenerated?.imageUrl) {
      setIsPreviewModalOpen(true);
    }
  }, [mode, isMobileViewport, loading, latestGenerated?.imageUrl]);

  const mainClass = `font-(family-name:--font-montserrat) min-h-screen ${
    isLight ? "bg-slate-100 text-slate-900" : "bg-gray-900 text-white"
  }`;
  const headerClass = isLight
    ? "relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8"
    : "relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-linear-to-br from-gray-900 via-slate-900 to-gray-900 px-6 py-6 sm:px-8";
  const subtitleClass = isLight ? "mt-1 text-sm text-slate-600" : "mt-1 text-sm text-gray-300";
  const modelClass = isLight ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-cyan-200/90";
  const sectionTitleClass = isLight
    ? "text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-600"
    : "text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-300";
  const panelClass = isLight
    ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    : "rounded-2xl border border-gray-700/80 bg-linear-to-br from-gray-900/80 via-slate-900/70 to-gray-950/70 p-5 sm:p-6";
  const cardClass = isLight
    ? "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    : "rounded-2xl border border-gray-700/80 bg-linear-to-br from-gray-900/80 via-slate-900/70 to-gray-950/70 p-4";
  const mutedTextClass = isLight ? "text-[11px] text-slate-500" : "text-[11px] text-gray-400";
  const backLinkClass = isLight
    ? "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:border-slate-400 hover:text-slate-900 lg:w-auto lg:px-3 lg:py-1.5 lg:text-[10px]"
    : "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-600 bg-gray-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-100 transition hover:border-cyan-400/40 hover:text-cyan-200 lg:w-auto lg:px-3 lg:py-1.5 lg:text-[10px]";
  const toggleButtonClass = isLight
    ? "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:border-slate-400 lg:w-auto lg:px-3 lg:py-1.5 lg:text-[10px]"
    : "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-600 bg-gray-900/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-100 transition hover:border-purple-300/60 lg:w-auto lg:px-3 lg:py-1.5 lg:text-[10px]";

  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  async function handleDownloadImage() {
    const imageUrl = latestGenerated?.imageUrl;
    if (!imageUrl || downloadingImage) {
      return;
    }

    try {
      setDownloadingImage(true);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error("Falha ao baixar imagem.");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `imagem-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingImage(false);
    }
  }

  if (mode === "image") {
    return (
      <main className={mainClass}>
        <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
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

            <div className="mt-4 flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
              <SiOpenai className="h-8 w-8 text-purple-300" />
              <h1>{copy.title}</h1>
            </div>
            <p className={subtitleClass}>{copy.subtitle}</p>
            <p className={modelClass}>Modelo: {IMAGE_MODEL_LABEL}</p>
          </header>

          <div
            className={`mt-4 grid min-h-0 flex-1 gap-4 rounded-2xl p-4 sm:p-5 lg:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)] ${
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
                    className={`w-full rounded-xl px-3 py-2 text-sm outline-none transition sm:w-[280px] ${
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

              <div className="space-y-3">
                <label htmlFor="prompt" className="sr-only">
                  Prompt
                </label>
                <textarea
                  id="prompt"
                  name="prompt"
                  rows={7}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder={copy.placeholder}
                  disabled={loading}
                  className={`min-h-36 w-full resize-y rounded-2xl px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isLight
                      ? "border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                      : "border border-gray-700/90 bg-gray-900/85 text-gray-100 placeholder:text-gray-500"
                  } ${imageFocusClass}`}
                />

                <button
                  type="submit"
                  disabled={!canSend}
                  className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold transition disabled:cursor-not-allowed ${
                    isLight
                      ? "border border-violet-400/45 bg-violet-500 text-white hover:bg-violet-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                      : "border border-purple-400/45 bg-purple-500/25 text-purple-100 hover:bg-purple-500/35 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                  }`}
                >
                  <MdAutoFixHigh className="h-5 w-5" />
                  {loading ? "Aguarde..." : sourceImage ? "Modificar com IA" : "Criar com IA"}
                </button>
              </div>
              <div className="mt-4">
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

                <label
                  htmlFor="source-image"
                  className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold transition ${
                    isLight
                      ? "border border-violet-300/50 bg-violet-50 text-violet-700 hover:bg-violet-100"
                      : "border border-purple-400/45 bg-gray-500/25 text-purple-100 hover:bg-purple-500/35 disabled:cursor-not-allowed disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                  }`}
                >
                  <MdAttachFile className="h-4 w-4" />
                  Upload
                </label>

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

              <p className={`mt-3 ${mutedTextClass}`}>{copy.hint}</p>
            </form>

            <div className="flex min-h-0 flex-col gap-4">
              {loading || latestGenerated?.imageUrl ? (
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className={`lg:hidden inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                    isLight
                      ? "border border-violet-300/50 bg-violet-50 text-violet-700 hover:bg-violet-100"
                      : "border border-purple-400/45 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25"
                  }`}
                >
                  <MdImage className="h-4 w-4" />
                  {loading ? "Acompanhar geracao" : "Abrir preview"}
                </button>
              ) : null}

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
                    <div
                      className={`absolute inset-0 ${
                        isLight
                          ? "bg-linear-to-br from-violet-200/40 via-indigo-200/20 to-cyan-200/30"
                          : "bg-linear-to-br from-purple-500/20 via-fuchsia-500/10 to-indigo-500/20"
                      }`}
                    />
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 ${
                        isLight ? "text-slate-800" : "text-purple-100"
                      }`}
                    >
                      <span
                        className={`h-10 w-10 animate-spin rounded-full border-2 border-t-transparent ${
                          isLight ? "border-violet-500/70" : "border-purple-200/70"
                        }`}
                      />
                      <p className="text-sm font-medium">
                        {sourceImage ? "Modificando imagem..." : "Criando nova imagem..."}
                      </p>
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

              <article className={`flex min-h-0 flex-1 flex-col ${cardClass}`}>
                <p className={`mb-3 ${sectionTitleClass}`}>Historico de Geracoes</p>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {messages.map((message, index) => (
                    <article
                      key={`${message.role}-${index}`}
                      className={`rounded-2xl border px-3 py-3 text-sm leading-relaxed ${
                        message.role === "user"
                          ? isLight
                            ? "border-violet-200 bg-violet-50 text-violet-800"
                            : "border-purple-400/45 bg-purple-500/15 text-purple-100"
                          : isLight
                            ? "border-slate-200 bg-white text-slate-800"
                            : "border-gray-700/80 bg-gray-900/60 text-gray-100"
                      }`}
                    >
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-85">
                        {message.role === "user" ? "Prompt" : "Assistente"}
                      </p>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </article>
                  ))}

                  <div ref={bottomRef} />
                </div>
              </article>
            </div>
          </div>
          {isMobileViewport && isPreviewModalOpen && (loading || latestGenerated?.imageUrl) ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 lg:hidden">
              <div
                className={`relative w-full max-w-lg rounded-2xl p-4 shadow-2xl ${
                  isLight ? "border border-slate-200 bg-white" : "border border-gray-700 bg-gray-900"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className={`absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                    isLight
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-gray-800 text-gray-200 hover:bg-gray-700"
                  }`}
                  aria-label="Fechar preview"
                >
                  <MdClose className="h-4 w-4" />
                </button>

                <p className={sectionTitleClass}>Preview Atual</p>

                {loading ? (
                  <div
                    className={`relative mt-3 h-[62vh] max-h-[520px] overflow-hidden rounded-2xl ${
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
                    <div
                      className={`absolute inset-0 ${
                        isLight
                          ? "bg-linear-to-br from-violet-200/40 via-indigo-200/20 to-cyan-200/30"
                          : "bg-linear-to-br from-purple-500/20 via-fuchsia-500/10 to-indigo-500/20"
                      }`}
                    />
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 ${
                        isLight ? "text-slate-800" : "text-purple-100"
                      }`}
                    >
                      <span
                        className={`h-10 w-10 animate-spin rounded-full border-2 border-t-transparent ${
                          isLight ? "border-violet-500/70" : "border-purple-200/70"
                        }`}
                      />
                      <p className="text-sm font-medium">
                        {sourceImage ? "Modificando imagem..." : "Criando nova imagem..."}
                      </p>
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
                    className={`mt-3 max-h-[62vh] w-full rounded-2xl object-contain ${
                      isLight ? "border border-slate-200" : "border border-gray-700"
                    }`}
                  />
                ) : null}

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
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:flex lg:justify-end">
            <button type="button" onClick={toggleTheme} className={toggleButtonClass}>
              <span
                className={`relative inline-flex h-5 w-10 rounded-full transition ${
                  isLight ? "bg-violet-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                    isLight ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </span>
              {isLight ? "Tema Claro" : "Tema Escuro"}
            </button>
            <Link
              href="/chatgpt"
              className={backLinkClass}
            >
              <MdArrowBack className="h-4 w-4" />
              Voltar
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={mainClass}>
      <section className="mx-auto flex h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
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

          <div className="mt-3 flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
            <SiOpenai className="h-7 w-7 text-purple-300" />
            <h1>{copy.title}</h1>
          </div>
          <p className={subtitleClass}>{copy.subtitle}</p>
          <p className={modelClass}>Modelo: {CHAT_TEXT_MODEL_LABEL}</p>
        </header>

        <div
          className={`mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl ${
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
                      Ola, como posso ajudar?
                    </h2>
                  </div>
                </section>
              ) : null}

              {messages.map((message, index) => (
                <article
                  key={`${message.role}-${index}`}
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg sm:max-w-[80%] ${
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
                  className={`mr-auto max-w-[92%] rounded-2xl px-4 py-3 text-sm shadow-lg sm:max-w-[80%] ${
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
            className={`border-t px-4 py-4 sm:px-6 sm:py-5 ${
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
                      <span className="max-w-[200px] truncate">{file.name}</span>
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

            <div className="flex flex-col gap-3">
              <label htmlFor="prompt" className="sr-only">
                Prompt
              </label>
              <textarea
                id="prompt"
                name="prompt"
                rows={4}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={copy.placeholder}
                disabled={loading}
                className={`min-h-28 w-full resize-y rounded-xl px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isLight
                    ? "border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    : "border border-gray-700/90 bg-gray-900/85 text-gray-100 placeholder:text-gray-500"
                } ${chatFocusClass}`}
              />

              <div className="grid grid-cols-[20%_1fr] gap-3 lg:grid-cols-[10%_1fr]">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  aria-label="Anexar arquivos"
                  className={`inline-flex h-11 w-full items-center justify-center rounded-xl text-xl font-semibold transition disabled:cursor-not-allowed ${
                    isLight
                      ? "border border-violet-300/60 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                      : "border border-purple-400/45 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                  }`}
                >
                  +
                </button>

                <button
                  type="submit"
                  disabled={!canSend}
                  className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition disabled:cursor-not-allowed ${
                    isLight
                      ? "border border-violet-400/45 bg-violet-500 text-white hover:bg-violet-600 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
                      : "border border-purple-400/45 bg-purple-500/25 text-purple-100 hover:bg-purple-500/35 disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                  }`}
                >
                  {loading ? "Aguarde..." : "Enviar"}
                  <SiOpenai className="h-4 w-4" />
                </button>
              </div>
            </div>

            {copy.hint ? <p className={`mt-2 ${mutedTextClass}`}>{copy.hint}</p> : null}
          </form>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:flex lg:justify-end">
          <button type="button" onClick={toggleTheme} className={toggleButtonClass}>
            <span
              className={`relative inline-flex h-5 w-10 rounded-full transition ${
                isLight ? "bg-violet-500" : "bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                  isLight ? "left-[22px]" : "left-0.5"
                }`}
              />
            </span>
            {isLight ? "Tema Claro" : "Tema Escuro"}
          </button>
          <Link
            href="/chatgpt"
            className={backLinkClass}
          >
            <MdArrowBack className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </section>
    </main>
  );
}

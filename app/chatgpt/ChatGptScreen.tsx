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
    hint: "Enter envia. Shift + Enter quebra linha. Voce pode enviar apenas arquivos.",
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        mode === "chat"
          ? "Pronto para conversar. Envie um prompt e, se quiser, anexe arquivos de texto."
          : "Pronto para criar imagens. Descreva o resultado que voce quer.",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imageSize, setImageSize] = useState<ImageSize>("1024x1024");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
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
      <main className="font-(family-name:--font-montserrat) min-h-screen bg-gray-900 text-white">
        <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <header className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-linear-to-br from-gray-900 via-slate-900 to-gray-900 px-6 py-6 sm:px-8">
            <div className="absolute -top-16 -right-10 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="mt-4 flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
              <SiOpenai className="h-8 w-8 text-purple-300" />
              <h1>{copy.title}</h1>
            </div>
            <p className="mt-1 text-sm text-gray-300">{copy.subtitle}</p>
            <p className="mt-1 text-xs text-cyan-200/90">Modelo: {IMAGE_MODEL_LABEL}</p>
          </header>

          <div className="mt-4 grid min-h-0 flex-1 gap-4 rounded-2xl bg-gray-800 p-4 shadow sm:p-5 lg:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)]">
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="rounded-2xl border border-gray-700/80 bg-linear-to-br from-gray-900/80 via-slate-900/70 to-gray-950/70 p-5 sm:p-6"
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
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-300"
                >
                  Tamanho da imagem
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <MdImage className="h-5 w-5 text-purple-300" />
                  <select
                    id="image-size"
                    value={imageSize}
                    onChange={(event) => setImageSize(event.target.value as ImageSize)}
                    disabled={loading}
                    className="w-full rounded-xl border border-gray-700/90 bg-gray-900/85 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-purple-400/60 focus:ring-4 focus:ring-purple-500/15 sm:w-70"
                  >
                    {IMAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-gray-900">
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
                  className={`min-h-36 w-full resize-y rounded-2xl border border-gray-700/90 bg-gray-900/85 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60 ${imageFocusClass}`}
                />

                <button
                  type="submit"
                  disabled={!canSend}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-purple-400/45 bg-purple-500/25 px-6 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/35 disabled:cursor-not-allowed disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
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
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-purple-400/45 bg-gray-500/25 px-6 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/35 disabled:cursor-not-allowed disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                >
                  <MdAttachFile className="h-4 w-4" />
                  Upload 
                </label>

                <p className="mt-2 text-[11px] text-gray-400">Formatos: PNG, JPG/JPEG ou WEBP.</p>

                {sourceImage ? (
                  <div className="mt-3 flex w-full items-center gap-2 rounded-xl border border-purple-400/35 bg-purple-500/15 px-3 py-2 text-xs text-purple-100">
                    <span className="flex-1 truncate">{sourceImage.name}</span>
                    <button
                      type="button"
                      onClick={removeSourceImage}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/25 text-zinc-200 transition hover:bg-black/45"
                      aria-label="Remover imagem base"
                    >
                      <MdClose className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
              </div>

              <p className="mt-3 text-[11px] text-gray-400">{copy.hint}</p>
            </form>

            <div className="flex min-h-0 flex-col gap-4">
              <article className="rounded-2xl border border-gray-700/80 bg-linear-to-br from-gray-900/80 via-slate-900/70 to-gray-950/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-300">
                  Preview Atual
                </p>
                {loading ? (
                  <div className="relative mt-3 h-52 overflow-hidden rounded-2xl border border-purple-400/35 bg-purple-500/10">
                    {latestGenerated?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={latestGenerated.imageUrl}
                        alt="Preview anterior"
                        className="h-full w-full object-cover opacity-35 blur-[1px]"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-linear-to-br from-purple-500/20 via-fuchsia-500/10 to-indigo-500/20" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-purple-100">
                      <span className="h-10 w-10 animate-spin rounded-full border-2 border-purple-200/70 border-t-transparent" />
                      <p className="text-sm font-medium">
                        {sourceImage ? "Modificando imagem..." : "Criando nova imagem..."}
                      </p>
                      <div className="h-1.5 w-44 overflow-hidden rounded-full bg-purple-300/20">
                        <div className="h-full w-2/3 animate-pulse rounded-full bg-linear-to-r from-purple-200 via-fuchsia-100 to-purple-200" />
                      </div>
                    </div>
                  </div>
                ) : latestGenerated?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={latestGenerated.imageUrl}
                    alt="Imagem gerada mais recente"
                    className="mt-3 h-auto w-full rounded-2xl border border-gray-700 object-cover"
                  />
                ) : (
                  <div className="mt-3 flex h-52 items-center justify-center rounded-2xl border border-dashed border-purple-400/45 bg-purple-500/12 text-sm text-purple-100">
                    Sua primeira imagem vai aparecer aqui.
                  </div>
                )}
                {latestGenerated?.imageUrl ? (
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={downloadingImage}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-purple-400/45 bg-purple-500/15 px-4 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
                  >
                    <MdDownload className="h-5 w-5" />
                    {downloadingImage ? "Baixando..." : "Download da imagem"}
                  </button>
                ) : null}
              </article>

              <article className="flex min-h-0 flex-1 flex-col rounded-2xl border border-gray-700/80 bg-linear-to-br from-gray-900/80 via-slate-900/70 to-gray-950/70 p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-300">
                  Historico de Geracoes
                </p>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {messages.map((message, index) => (
                    <article
                      key={`${message.role}-${index}`}
                      className={`rounded-2xl border px-3 py-3 text-sm leading-relaxed ${
                        message.role === "user"
                          ? "border-purple-400/45 bg-purple-500/15 text-purple-100"
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
          <div className="mt-4 flex justify-end">
            <Link
              href="/chatgpt"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-600 bg-gray-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-100 transition hover:border-cyan-400/40 hover:text-cyan-200"
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
    <main className="font-(family-name:--font-montserrat) min-h-screen bg-gray-900 text-white">
      <section className="mx-auto flex h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-linear-to-br from-gray-900 via-slate-900 to-gray-900 px-6 py-6 sm:px-8">
          <div className="absolute -top-16 -right-10 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="mt-3 flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
            <SiOpenai className="h-7 w-7 text-purple-300" />
            <h1>{copy.title}</h1>
          </div>
          <p className="mt-1 text-sm text-gray-300">{copy.subtitle}</p>
          <p className="mt-1 text-xs text-cyan-200/90">Modelo: {CHAT_TEXT_MODEL_LABEL}</p>
        </header>

        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-700/80 bg-gray-800 shadow">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
              {messages.map((message, index) => (
                <article
                  key={`${message.role}-${index}`}
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg sm:max-w-[80%] ${
                    message.role === "user"
                      ? "ml-auto border border-purple-400/45 bg-purple-500/15 text-purple-100"
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
                <article className="mr-auto max-w-[92%] rounded-2xl border border-purple-400/40 bg-purple-500/15 px-4 py-3 text-sm text-purple-100 shadow-lg sm:max-w-[80%]">
                  Gerando resposta...
                </article>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="border-t border-gray-700/80 bg-gray-900/55 px-4 py-4 sm:px-6 sm:py-5"
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

              <label
                htmlFor="file-upload"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-purple-400/35 bg-purple-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-purple-100 transition hover:bg-purple-500/25"
              >
                <MdAttachFile className="h-4 w-4" />
                Anexar Arquivos
              </label>

              <p className="mt-2 text-[11px] text-gray-400">
                Ate {MAX_FILES} arquivos de texto por envio (maximo 2MB cada).
              </p>

              {selectedFiles.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedFiles.map((file) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="inline-flex items-center gap-2 rounded-full border border-purple-400/35 bg-purple-500/15 px-3 py-1 text-xs text-purple-100"
                    >
                      <span className="max-w-50 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(file)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/25 text-zinc-200 transition hover:bg-black/45"
                        aria-label={`Remover ${file.name}`}
                      >
                        <MdClose className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
                className={`min-h-28 w-full resize-y rounded-xl border border-gray-700/90 bg-gray-900/85 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60 ${chatFocusClass}`}
              />

              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-purple-400/45 bg-purple-500/25 px-5 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/35 disabled:cursor-not-allowed disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400"
              >
                {loading ? "Aguarde..." : "Enviar"}
                <SiOpenai className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-[11px] text-gray-400">{copy.hint}</p>
          </form>
        </div>
        <div className="mt-4 flex justify-end">
          <Link
            href="/chatgpt"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-600 bg-gray-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-100 transition hover:border-cyan-400/40 hover:text-cyan-200"
          >
            <MdArrowBack className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </section>
    </main>
  );
}

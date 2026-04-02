"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FaCoins,
  FaChevronDown,
  FaDownload,
  FaExchangeAlt,
  FaImage,
  FaPlay,
  FaRobot,
  FaTimes,
  FaVideo,
} from "react-icons/fa";
import { FiUploadCloud } from "react-icons/fi";
import { MdArrowBack, MdClose, MdImage, MdMoreVert, MdRocketLaunch } from "react-icons/md";
import { SiOpenai } from "react-icons/si";

type AmbientadorItem = {
  file: File | null;
  preview: string | null;
};

type VideoProvider = "veo";
type ImageModelOption = {
  value: string;
  label: string;
};
type VideoModelOption = {
  value: string;
  label: string;
  provider: VideoProvider;
  allowedDurations: readonly number[];
  allowedResolutions: readonly string[];
  defaultDuration: number;
  defaultResolution: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type BibliotecaFiltro = "image" | "video";

type GeneratedImageItem = {
  id: string;
  prompt: string;
  revisedPrompt: string | null;
  model: string;
  size: string;
  action: "generate" | "edit";
  createdAt: string;
  imageUrl: string;
};

type GeneratedVideoItem = {
  id: string;
  sourceImageId: string | null;
  model: string;
  aspectRatio: string;
  durationSeconds: number;
  resolution: string;
  createdAt: string;
  videoUrl: string;
};

type BibliotecaLightboxItem = {
  type: "image" | "video";
  url: string;
  title: string;
} | null;

type DeleteModalState =
  | { type: "image"; item: GeneratedImageItem }
  | { type: "video"; item: GeneratedVideoItem }
  | null;

type SocialFormatOption = {
  value: "9:16" | "1:1";
  label: string;
  details: string;
  imageSize: string;
  previewAspectRatio: string;
};

const SOCIAL_FORMAT_OPTIONS = [
  {
    value: "9:16",
    label: "Story (vertical)",
    details: "1080x1920 (9:16)",
    imageSize: "1024x1792",
    previewAspectRatio: "9 / 16",
  },
  {
    value: "1:1",
    label: "Feed (quadrada)",
    details: "1080x1080 (1:1)",
    imageSize: "1024x1024",
    previewAspectRatio: "1 / 1",
  },
] as const satisfies readonly SocialFormatOption[];

const VIDEO_MODEL_OPTIONS: VideoModelOption[] = [
  {
    value: "veo-3.1-generate-preview",
    label: "Veo 3.1 Standard",
    provider: "veo",
    allowedDurations: [8],
    allowedResolutions: ["720p"],
    defaultDuration: 8,
    defaultResolution: "720p",
  },
];

const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  { value: "nano_banana", label: "Nano Banana" },
  { value: "chatgpt-image-latest", label: "ChatGPT Image Latest" },
];

const FIXED_VIDEO_RESOLUTION = "720p";
const FIXED_VIDEO_DURATION_SECONDS = 8;
const CHAT_DEVICE_ID_STORAGE_KEY = "chatgpt-device-id-v1";
const IMAGE_GENERATION_CREDIT_COST = 1;
const VIDEO_GENERATION_CREDIT_COST = 2;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const VIDEO_PROMPT_PTBR_GUARDRAIL =
  "Idioma obrigatório: português do Brasil (pt-BR). Se houver qualquer texto, título, legenda ou narração, usar somente português do Brasil.";
const VIDEO_PROMPT_GUARDRAIL =
  "Regras obrigatórias: preserve exatamente a forma, proporções, rótulo e identidade visual do produto, sem deformar, sem redesenhar e sem alterar a embalagem. Não inserir legendas, textos, tipografia, logotipos ou marcas d'água, a menos que isso seja solicitado explicitamente no prompt.";
const AMBIENTADOR_DEFAULT_PERSONALIZED_PROMPT =
  "Ambientação premium de estúdio, produto central em destaque, luz suave e sombras realistas.";
const IMAGE_PROMPT_GUARDRAIL =
  "Use a imagem enviada como produto principal obrigatório. Preserve exatamente forma, proporções, rótulo e identidade visual do produto, sem redesenhar nem trocar embalagem.";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `device-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function getOrCreateChatDeviceId(): string {
  if (typeof window === "undefined") {
    return createClientId();
  }

  try {
    const stored = window.localStorage.getItem(CHAT_DEVICE_ID_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
  } catch {
    // ignore storage issues
  }

  const nextId = createClientId();
  try {
    window.localStorage.setItem(CHAT_DEVICE_ID_STORAGE_KEY, nextId);
  } catch {
    // ignore storage issues
  }

  return nextId;
}

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error("Nao foi possivel ler a imagem local para gerar video.");
  }

  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:image/")) {
        resolve(result);
        return;
      }
      reject(new Error("Nao foi possivel converter a imagem local."));
    };
    reader.onerror = () => reject(new Error("Falha ao converter imagem local."));
    reader.readAsDataURL(blob);
  });
}

function promptRequestsOnScreenText(prompt: string) {
  const normalized = prompt.toLowerCase();
  return /(legenda|legendas|texto|textos|caption|captions|subtitle|subtitles|title|titulo|título|tipografia|typography|logo|logotipo|marca d[’']água|watermark)/i.test(
    normalized,
  );
}

function formatDatePtBr(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeResultUrl(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isAcceptedImageFile(file: File) {
  const normalizedType = (file.type || "").toLowerCase();
  if (ALLOWED_IMAGE_TYPES.includes(normalizedType)) {
    return true;
  }

  const normalizedName = (file.name || "").toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.some((ext) => normalizedName.endsWith(ext));
}

function resolveAspectRatioFromImageSize(size: string): "9:16" | "1:1" | null {
  const normalized = normalizeResultUrl(size);
  const match = normalized.match(/^(\d+)x(\d+)$/i);
  if (!match) {
    return null;
  }

  const width = Number.parseInt(match[1] || "", 10);
  const height = Number.parseInt(match[2] || "", 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  if (width === height) {
    return "1:1";
  }

  if (height > width) {
    return "9:16";
  }

  return null;
}

export default function ImageGeneratorScreen() {
  const [produtoPrincipal, setProdutoPrincipal] = useState<AmbientadorItem>({
    file: null,
    preview: null,
  });
  const [model, setModel] = useState<string>(IMAGE_MODEL_OPTIONS[0].value);
  const [imageSize, setImageSize] = useState<string>(SOCIAL_FORMAT_OPTIONS[0].imageSize);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [ambientacaoLightboxOpen, setAmbientacaoLightboxOpen] = useState(false);
  const [promptPersonalizado, setPromptPersonalizado] = useState(
    AMBIENTADOR_DEFAULT_PERSONALIZED_PROMPT,
  );

  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [videoSourceUrl, setVideoSourceUrl] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState(
    "Transforme esta imagem em um vídeo publicitário com movimento suave de câmera, foco no produto principal, iluminação realista e preservação total da forma original do produto.",
  );
  const [videoNegativePrompt, setVideoNegativePrompt] = useState("");
  const [videoModel, setVideoModel] = useState<string>(VIDEO_MODEL_OPTIONS[0].value);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>(
    SOCIAL_FORMAT_OPTIONS[0].value,
  );
  const videoResolution = FIXED_VIDEO_RESOLUTION;
  const videoDurationSeconds = FIXED_VIDEO_DURATION_SECONDS;
  const [videoErrorMessage, setVideoErrorMessage] = useState<string | null>(null);
  const [toastState, setToastState] = useState<ToastState>(null);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const [isMainDropzoneActive, setIsMainDropzoneActive] = useState(false);
  const [bibliotecaFiltro, setBibliotecaFiltro] = useState<BibliotecaFiltro>("image");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>([]);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideoItem[]>([]);
  const [bibliotecaLoading, setBibliotecaLoading] = useState(false);
  const [bibliotecaError, setBibliotecaError] = useState<string | null>(null);
  const [deletingMediaIds, setDeletingMediaIds] = useState<string[]>([]);
  const [deleteModalState, setDeleteModalState] = useState<DeleteModalState>(null);
  const [bibliotecaLightboxItem, setBibliotecaLightboxItem] =
    useState<BibliotecaLightboxItem>(null);
  const [bibliotecaImageLightboxLoading, setBibliotecaImageLightboxLoading] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedVideoIdsForMerge, setSelectedVideoIdsForMerge] = useState<string[]>([]);
  const [mergePreserveAudio, setMergePreserveAudio] = useState(true);
  const [mergeAspectRatio, setMergeAspectRatio] = useState<string>(SOCIAL_FORMAT_OPTIONS[0].value);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeResultUrl, setMergeResultUrl] = useState<string | null>(null);
  const [chatDeviceId, setChatDeviceId] = useState<string>("");
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  const selectedVideoModelOption = useMemo(
    () => VIDEO_MODEL_OPTIONS.find((option) => option.value === videoModel) || VIDEO_MODEL_OPTIONS[0],
    [videoModel],
  );
  const selectedImageModelLabel = useMemo(
    () => IMAGE_MODEL_OPTIONS.find((option) => option.value === model)?.label || model,
    [model],
  );
  const selectedVideoFormat = useMemo(
    () =>
      SOCIAL_FORMAT_OPTIONS.find((option) => option.value === videoAspectRatio) ||
      SOCIAL_FORMAT_OPTIONS[0],
    [videoAspectRatio],
  );
  const canGenerateVideo = useMemo(
    () => Boolean(preview || produtoPrincipal.preview),
    [preview, produtoPrincipal.preview],
  );
  const deleteModalMediaId = useMemo(() => {
    if (!deleteModalState) return null;
    return `${deleteModalState.type}:${deleteModalState.item.id}`;
  }, [deleteModalState]);
  const isDeletingFromModal = deleteModalMediaId
    ? deletingMediaIds.includes(deleteModalMediaId)
    : false;
  const canGenerateImageByCredits = creditsBalance === null || creditsBalance >= IMAGE_GENERATION_CREDIT_COST;
  const canGenerateVideoByCredits = creditsBalance === null || creditsBalance >= VIDEO_GENERATION_CREDIT_COST;

  const sectionCardClass =
    "rounded-2xl border border-gray-700/80 bg-linear-to-br from-gray-900/80 via-slate-900/70 to-gray-950/70 p-4 sm:p-5";
  const fieldLabelClass =
    "block pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300";
  const inputClass =
    "w-full rounded-xl border border-gray-700/90 bg-gray-900/85 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 transition focus:border-purple-400/60 focus:outline-none focus:ring-4 focus:ring-purple-500/15";
  const textareaClass =
    "w-full rounded-xl border border-gray-700/90 bg-gray-900/85 p-3 text-sm text-gray-100 placeholder-gray-500 transition focus:border-purple-400/60 focus:outline-none focus:ring-4 focus:ring-purple-500/15";
  const selectClass =
    "w-full appearance-none rounded-xl border border-gray-600/90 bg-linear-to-b from-gray-800/95 to-gray-900/95 px-3 py-2.5 pr-10 text-sm font-medium text-gray-100 [color-scheme:dark] transition focus:border-cyan-400/60 focus:outline-none focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-70 [&>option]:bg-gray-900 [&>option]:text-gray-100";
  const selectWrapperClass = "relative";
  const selectIconClass =
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400";
  const mainDropzoneClass =
    "relative flex w-full min-h-[224px] flex-1 items-center justify-center rounded-2xl border border-dashed border-purple-500/70 bg-linear-to-br from-gray-800/90 via-gray-800/85 to-slate-800/80 p-6 text-center transition hover:border-purple-400 hover:from-gray-700/90 hover:to-slate-700/80";

  const bibliotecaImageCount = generatedImages.length;
  const bibliotecaVideoCount = generatedVideos.length;
  const selectedVideosForMerge = useMemo(() => {
    const map = new Map(generatedVideos.map((video) => [video.id, video]));
    return selectedVideoIdsForMerge
      .map((id) => map.get(id))
      .filter((item): item is GeneratedVideoItem => !!item);
  }, [generatedVideos, selectedVideoIdsForMerge]);

  const notify = (type: "success" | "error", message: string) => {
    setToastState({ type, message });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastState(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  const loadBiblioteca = async (deviceIdParam: string) => {
    setBibliotecaLoading(true);
    setBibliotecaError(null);

    try {
      const [imagesRes, videosRes] = await Promise.all([
        fetch(`/api/chatgpt/generated-images?deviceId=${encodeURIComponent(deviceIdParam)}`, {
          cache: "no-store",
        }),
        fetch(`/api/chatgpt/generated-videos?deviceId=${encodeURIComponent(deviceIdParam)}`, {
          cache: "no-store",
        }),
      ]);

      const imagesData = await imagesRes.json();
      const videosData = await videosRes.json();

      if (!imagesRes.ok || imagesData?.error) {
        throw new Error(imagesData?.error || "Falha ao carregar imagens da biblioteca.");
      }
      if (!videosRes.ok || videosData?.error) {
        throw new Error(videosData?.error || "Falha ao carregar vídeos da biblioteca.");
      }

      setGeneratedImages(Array.isArray(imagesData?.images) ? imagesData.images : []);
      setGeneratedVideos(Array.isArray(videosData?.videos) ? videosData.videos : []);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Não foi possível carregar a biblioteca.";
      setBibliotecaError(message);
    } finally {
      setBibliotecaLoading(false);
    }
  };

  useEffect(() => {
    const deviceId = getOrCreateChatDeviceId();
    setChatDeviceId(deviceId);
  }, []);

  const loadCredits = async (deviceIdParam: string) => {
    setCreditsLoading(true);
    try {
      const response = await fetch(
        `/api/chatgpt/credits?deviceId=${encodeURIComponent(deviceIdParam)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | {
            balance?: unknown;
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Nao foi possivel carregar creditos.");
      }

      const balance = Number(payload?.balance);
      setCreditsBalance(Number.isFinite(balance) ? balance : 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel carregar creditos.";
      notify("error", message);
    } finally {
      setCreditsLoading(false);
    }
  };

  useEffect(() => {
    if (!chatDeviceId) return;
    void Promise.all([loadBiblioteca(chatDeviceId), loadCredits(chatDeviceId)]);
  }, [chatDeviceId]);

  useEffect(() => {
    if (!bibliotecaLightboxItem || bibliotecaLightboxItem.type !== "image") {
      setBibliotecaImageLightboxLoading(false);
      return;
    }

    setBibliotecaImageLightboxLoading(true);
    const timer = window.setTimeout(() => {
      setBibliotecaImageLightboxLoading(false);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [bibliotecaLightboxItem]);

  useEffect(() => {
    setSelectedVideoIdsForMerge((current) =>
      current.filter((id) => generatedVideos.some((video) => video.id === id)),
    );
  }, [generatedVideos]);

  const handleProdutoPrincipalFile = useCallback((
    file: File,
    source: "upload" | "drop" | "paste" = "upload",
  ) => {
    if (!isAcceptedImageFile(file)) {
      notify("error", "Formato de imagem inválido. Utilize PNG, JPG ou WEBP.");
      return;
    }

    setProdutoPrincipal((prev) => {
      if (prev.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(prev.preview);
      }
      return {
        ...prev,
        file,
        preview: URL.createObjectURL(file),
      };
    });

    const actionLabel =
      source === "paste" ? "colada" : source === "drop" ? "arrastada" : "carregada";
    notify("success", `Imagem do produto principal ${actionLabel} com sucesso!`);
  }, []);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboard = event.clipboardData;
      if (!clipboard) return;

      const imageItem = Array.from(clipboard.items || []).find((item) =>
        item.type.startsWith("image/"),
      );
      if (!imageItem) return;

      const imageFile = imageItem.getAsFile();
      if (!imageFile) return;

      event.preventDefault();
      handleProdutoPrincipalFile(imageFile, "paste");
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleProdutoPrincipalFile]);

  const handleGenerate = async () => {
    if (!chatDeviceId) {
      notify("error", "Identificador do dispositivo indisponivel.");
      return;
    }
    if (!canGenerateImageByCredits) {
      notify("error", "Saldo insuficiente. Sao necessarios 1 credito para gerar imagem.");
      return;
    }
    if (!promptPersonalizado.trim()) {
      notify("error", "Por favor, preencha o prompt.");
      return;
    }

    const imageAction = produtoPrincipal.file ? "edit" : "generate";
    const formData = new FormData();
    formData.append("mode", "image");
    formData.append(
      "prompt",
      imageAction === "edit"
        ? `${promptPersonalizado.trim()}\n\n${IMAGE_PROMPT_GUARDRAIL}`
        : promptPersonalizado.trim(),
    );
    formData.append("model", model);
    formData.append("imageSize", imageSize);
    formData.append("imageAction", imageAction);
    formData.append("deviceId", chatDeviceId);
    formData.append("requestId", createRequestId());
    if (imageAction === "edit" && produtoPrincipal.file) {
      formData.append("sourceImage", produtoPrincipal.file);
    }

    setLoading(true);

    try {
      const res = await fetch("/api/chatgpt", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        notify("error", data.error || "Erro ao gerar a imagem.");
        if (res.status === 402) {
          void loadCredits(chatDeviceId);
        }
        return;
      }

      const generatedImage = String(data.imageUrl || "");
      if (!generatedImage) {
        notify("error", "API não retornou imagem.");
        return;
      }

      setPreview(generatedImage);
      setProdutoPrincipal((prev) => {
        if (prev.preview?.startsWith("blob:")) {
          URL.revokeObjectURL(prev.preview);
        }
        return {
          ...prev,
          preview: generatedImage,
        };
      });
      setVideoSourceUrl(generatedImage);
      const nextAspectRatio = resolveAspectRatioFromImageSize(imageSize);
      if (nextAspectRatio) {
        setVideoAspectRatio(nextAspectRatio);
      }
      setVideoResult(null);
      if (typeof data?.creditsBalance === "number") {
        setCreditsBalance(data.creditsBalance);
      } else {
        void loadCredits(chatDeviceId);
      }
      notify("success", "Imagem gerada com sucesso!");
      void loadBiblioteca(chatDeviceId);
    } catch {
      notify("error", "Erro ao gerar a imagem.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!preview) return;

    try {
      const res = await fetch(preview);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `ambientacao-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch {
      notify("error", "Erro ao baixar a imagem.");
    }
  };

  const openVideoModal = (sourceUrl?: string, preferredAspectRatio?: "9:16" | "1:1" | null) => {
    const targetSource = sourceUrl || preview || produtoPrincipal.preview;
    if (!targetSource || loading) return;
    setIsTopMenuOpen(false);
    if (window.matchMedia("(max-width: 640px)").matches) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setVideoSourceUrl(targetSource);
    if (preferredAspectRatio) {
      setVideoAspectRatio(preferredAspectRatio);
    }
    setVideoResult(null);
    setVideoErrorMessage(null);
    setVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setVideoModalOpen(false);
    setVideoLoading(false);
  };

  const handleGenerateVideo = async () => {
    if (!chatDeviceId) {
      notify("error", "Identificador do dispositivo indisponivel.");
      return;
    }
    if (!canGenerateVideoByCredits) {
      notify("error", "Saldo insuficiente. Sao necessarios 2 creditos para gerar video.");
      return;
    }
    if (!videoSourceUrl) {
      notify("error", "Gere uma imagem antes de gerar o vídeo.");
      return;
    }

    if (!videoPrompt.trim()) {
      notify("error", "Informe o prompt do vídeo.");
      return;
    }

    setVideoErrorMessage(null);
    setVideoLoading(true);
    setVideoResult(null);

    const baseVideoPrompt = videoPrompt.trim();
    const allowOnScreenText = promptRequestsOnScreenText(baseVideoPrompt);
    const promptSegments = [
      baseVideoPrompt,
      `Formato obrigatório: ${selectedVideoFormat.label} (${selectedVideoFormat.value}), preenchendo todo o quadro sem barras pretas ou letterbox.`,
      VIDEO_PROMPT_PTBR_GUARDRAIL,
      VIDEO_PROMPT_GUARDRAIL,
    ].filter(Boolean);
    const finalVideoPrompt = promptSegments.join("\n\n");
    const finalNegativePrompt = [
      videoNegativePrompt.trim(),
      !allowOnScreenText
        ? "sem texto na tela, sem legendas, sem tipografia, sem logotipos, sem marca d'água"
        : "",
    ]
      .filter(Boolean)
      .join(", ");

    try {
      const imageUrlForVideo = videoSourceUrl.startsWith("blob:")
        ? await blobUrlToDataUrl(videoSourceUrl)
        : videoSourceUrl;

      const body: Record<string, unknown> = {
        imageUrl: imageUrlForVideo,
        prompt: finalVideoPrompt,
        model: videoModel,
        aspectRatio: videoAspectRatio,
        resolution: videoResolution,
        durationSeconds: videoDurationSeconds,
        negativePrompt: finalNegativePrompt,
        deviceId: chatDeviceId,
        requestId: createRequestId(),
      };

      const res = await fetch("/api/chatgpt/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const startData = await res.json();
      if (!res.ok || startData?.error) {
        if (res.status === 402) {
          void loadCredits(chatDeviceId);
        }
        throw new Error(startData?.error || "Falha ao iniciar geração de vídeo.");
      }

      if (typeof startData?.creditsBalance === "number") {
        setCreditsBalance(startData.creditsBalance);
      } else {
        void loadCredits(chatDeviceId);
      }

      if (startData?.done && startData?.videoUrl) {
        setVideoResult(String(startData.videoUrl));
        setVideoErrorMessage(null);
        notify("success", "Vídeo gerado com sucesso!");
        void loadBiblioteca(chatDeviceId);
        return;
      }

      const operationName = String(startData?.operationName || "");
      if (!operationName) {
        throw new Error("A API não retornou o identificador da operação de vídeo.");
      }

      const maxPollCycles = 80;
      for (let i = 0; i < maxPollCycles; i += 1) {
        await sleep(3000);
        const params = new URLSearchParams();
        params.set("operationName", operationName);
        params.set("model", videoModel);
        params.set("aspectRatio", videoAspectRatio);
        params.set("resolution", videoResolution);
        params.set("durationSeconds", String(videoDurationSeconds));
        params.set("deviceId", chatDeviceId);

        const statusRes = await fetch(`/api/chatgpt/generate-video?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const statusData = await statusRes.json();

        if (!statusRes.ok) {
          throw new Error(statusData?.error || "Falha ao consultar status do vídeo.");
        }

        if (statusData?.error) {
          throw new Error(String(statusData.error));
        }

        if (statusData?.done && statusData?.videoUrl) {
          setVideoResult(String(statusData.videoUrl));
          setVideoErrorMessage(null);
          notify("success", "Vídeo gerado com sucesso!");
          void loadBiblioteca(chatDeviceId);
          return;
        }
      }

      throw new Error("Tempo limite excedido ao aguardar geração do vídeo.");
    } catch (err: unknown) {
      const friendlyMessage =
        err instanceof Error ? err.message : "Erro ao gerar vídeo.";
      setVideoErrorMessage(friendlyMessage);
      notify("error", friendlyMessage);
    } finally {
      setVideoLoading(false);
    }
  };

  const downloadVideo = async () => {
    if (!videoResult) return;

    try {
      const res = await fetch(videoResult);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `ambientacao-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch {
      notify("error", "Erro ao baixar o vídeo.");
    }
  };

  const downloadBibliotecaImage = (item: GeneratedImageItem) => {
    const link = document.createElement("a");
    link.href = `/api/chatgpt/generated-image/${item.id}?download=1&deviceId=${encodeURIComponent(chatDeviceId)}`;
    link.download = `imagem-${item.id}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadBibliotecaVideo = (item: GeneratedVideoItem) => {
    const link = document.createElement("a");
    link.href = `/api/chatgpt/generated-video/${item.id}?download=1&deviceId=${encodeURIComponent(chatDeviceId)}`;
    link.download = `video-${item.id}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDeleteBibliotecaImage = async (item: GeneratedImageItem) => {
    const mediaId = `image:${item.id}`;
    if (deletingMediaIds.includes(mediaId)) return;

    setDeletingMediaIds((current) => [...current, mediaId]);
    try {
      if (!chatDeviceId) {
        throw new Error("Identificador do dispositivo indisponivel.");
      }
      const response = await fetch(
        `/api/chatgpt/generated-image/${item.id}?deviceId=${encodeURIComponent(chatDeviceId)}`,
        {
          method: "DELETE",
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Não foi possível excluir a imagem.");
      }

      setGeneratedImages((current) => current.filter((entry) => entry.id !== item.id));
      if (bibliotecaLightboxItem?.type === "image" && bibliotecaLightboxItem.url === item.imageUrl) {
        setBibliotecaLightboxItem(null);
      }
      notify("success", "Imagem excluída com sucesso.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Não foi possível excluir a imagem.";
      notify("error", message);
    } finally {
      setDeletingMediaIds((current) => current.filter((id) => id !== mediaId));
    }
  };

  const handleDeleteBibliotecaVideo = async (item: GeneratedVideoItem) => {
    const mediaId = `video:${item.id}`;
    if (deletingMediaIds.includes(mediaId)) return;

    setDeletingMediaIds((current) => [...current, mediaId]);
    try {
      if (!chatDeviceId) {
        throw new Error("Identificador do dispositivo indisponivel.");
      }
      const response = await fetch(
        `/api/chatgpt/generated-video/${item.id}?deviceId=${encodeURIComponent(chatDeviceId)}`,
        {
          method: "DELETE",
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Não foi possível excluir o vídeo.");
      }

      setGeneratedVideos((current) => current.filter((entry) => entry.id !== item.id));
      setSelectedVideoIdsForMerge((current) => current.filter((id) => id !== item.id));
      if (bibliotecaLightboxItem?.type === "video" && bibliotecaLightboxItem.url === item.videoUrl) {
        setBibliotecaLightboxItem(null);
      }
      notify("success", "Vídeo excluído com sucesso.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Não foi possível excluir o vídeo.";
      notify("error", message);
    } finally {
      setDeletingMediaIds((current) => current.filter((id) => id !== mediaId));
    }
  };

  const openDeleteModalForImage = (item: GeneratedImageItem) => {
    setDeleteModalState({ type: "image", item });
  };

  const openDeleteModalForVideo = (item: GeneratedVideoItem) => {
    setDeleteModalState({ type: "video", item });
  };

  const closeDeleteModal = () => {
    setDeleteModalState(null);
  };

  const confirmDeleteFromModal = async () => {
    if (!deleteModalState) return;

    if (deleteModalState.type === "image") {
      await handleDeleteBibliotecaImage(deleteModalState.item);
      setDeleteModalState(null);
      return;
    }

    await handleDeleteBibliotecaVideo(deleteModalState.item);
    setDeleteModalState(null);
  };

  const toggleVideoSelectionForMerge = (videoId: string) => {
    setSelectedVideoIdsForMerge((current) => {
      if (current.includes(videoId)) {
        return current.filter((id) => id !== videoId);
      }
      return [...current, videoId];
    });
  };

  const openMergeModal = () => {
    if (selectedVideoIdsForMerge.length < 2) {
      notify("error", "Selecione ao menos 2 vídeos para juntar.");
      return;
    }
    setMergeError(null);
    setMergeResultUrl(null);
    setMergeModalOpen(true);
  };

  const closeMergeModal = () => {
    setMergeModalOpen(false);
    setMergeLoading(false);
    setMergeError(null);
  };

  const handleMergeVideos = async () => {
    if (selectedVideoIdsForMerge.length < 2) {
      notify("error", "Selecione ao menos 2 vídeos para juntar.");
      return;
    }

    setMergeLoading(true);
    setMergeError(null);
    setMergeResultUrl(null);
    try {
      const response = await fetch("/api/chatgpt/video/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoIds: selectedVideoIdsForMerge,
          preserveAudio: mergePreserveAudio,
          aspectRatio: mergeAspectRatio,
        }),
      });
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Falha ao juntar vídeos.");
      }
      const resultUrl = normalizeResultUrl(data?.video_url);
      if (!resultUrl) {
        throw new Error("Nenhum vídeo final foi retornado.");
      }
      setMergeResultUrl(resultUrl);
      notify("success", "Vídeos unidos com sucesso!");
      if (chatDeviceId) {
        void loadBiblioteca(chatDeviceId);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Não foi possível juntar os vídeos.";
      setMergeError(message);
      notify("error", message);
    } finally {
      setMergeLoading(false);
    }
  };

  const downloadMergedVideo = () => {
    if (!mergeResultUrl) return;
    const link = document.createElement("a");
    link.href = `${mergeResultUrl}${mergeResultUrl.includes("?") ? "&" : "?"}download=1`;
    link.download = `video-merge-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const renderAmbientacaoActions = () =>
    !loading &&
    preview && (
      <div className="mt-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setAmbientacaoLightboxOpen(true)}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-purple-400/45 bg-purple-500/20 px-3 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/30"
        >
          <FaImage />
          Visualizar
        </button>
        <button
          type="button"
          onClick={downloadImage}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-700 px-3 text-sm font-semibold text-white transition hover:bg-purple-600"
        >
          <FaDownload />
          Baixar
        </button>
        <button
          type="button"
          onClick={() => openVideoModal(preview, resolveAspectRatioFromImageSize(imageSize))}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-400/45 bg-cyan-500/20 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
        >
          <FaVideo />
          Gerar vídeo
        </button>
      </div>
    );

  const topMenuTriggerClass =
    "inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-700/80 bg-gray-900/90 text-gray-100 shadow-lg shadow-black/25 transition hover:border-purple-400/50 hover:bg-gray-800";
  const topMenuOverlayClass = "fixed inset-0 z-80 bg-black/45 backdrop-blur-[1px]";
  const topMenuDrawerClass =
    "fixed top-0 right-0 z-90 flex h-screen w-[min(92vw,360px)] flex-col border-l border-gray-700 bg-gray-900/98 text-gray-100 shadow-2xl";
  const topMenuCloseButtonClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-200 transition hover:bg-gray-700";
  const topMenuModeButtonClass =
    "group flex w-full items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/80 px-3 py-3 text-left transition hover:border-purple-400/45 hover:bg-gray-800";
  const topMenuModeButtonActiveClass = "border-purple-400/60 bg-purple-500/15";
  const topMenuActionButtonClass =
    "inline-flex w-full items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/80 px-3 py-2.5 text-sm font-medium text-gray-100 transition hover:border-purple-400/45 hover:bg-gray-800";

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
            <div className="flex items-center justify-between border-b border-gray-700 px-4 py-4">
              <p className="text-sm font-semibold text-gray-100">Acesso rapido</p>
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
                className={topMenuModeButtonClass}
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-purple-200">
                  <SiOpenai className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-100">ChatGPT</span>
                  <span className="block truncate text-[11px] text-gray-400">Modelo: gpt-5.2</span>
                </span>
              </Link>

              <Link
                href="/chatgpt/imagem"
                onClick={() => setIsTopMenuOpen(false)}
                className={`${topMenuModeButtonClass} ${topMenuModeButtonActiveClass}`}
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/35 text-purple-100">
                  <MdImage className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-100">Image Designer Pro</span>
                  <span className="block truncate text-[11px] text-gray-400">
                    Modelo: {selectedImageModelLabel}
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
            </div>
          </aside>
        </>
      ) : null}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white [&_button:enabled]:cursor-pointer [&_a]:cursor-pointer">
      {topActionMenu}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {toastState ? (
          <div
            className={`fixed top-4 right-4 z-70 rounded-lg border px-4 py-2 text-sm font-medium shadow-xl ${
              toastState.type === "success"
                ? "border-emerald-400/50 bg-emerald-900/90 text-emerald-100"
                : "border-red-400/50 bg-red-900/90 text-red-100"
            }`}
          >
            {toastState.message}
          </div>
        ) : null}

        <header className="relative mb-6 overflow-hidden rounded-3xl border border-cyan-500/20 bg-linear-to-br from-gray-900 via-slate-900 to-gray-900 p-6 sm:p-8">
          <div className="absolute -top-16 -right-10 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <MdRocketLaunch className="h-4 w-4" />
              Image Creator
            </p>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/55 bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-100 sm:text-sm">
              <FaCoins className="text-amber-300" />
              Créditos: {creditsLoading && creditsBalance === null ? "..." : creditsBalance ?? "--"}
            </span>
          </div>

          <div className="mt-5 flex items-start gap-3">
            <div className="flex items-center gap-3">
              <SiOpenai className="h-9 w-9 text-purple-300" />
              <h1 className="text-2xl font-bold leading-tight sm:text-4xl">
                IA Studio PRO
              </h1>
            </div>
          </div>
        </header>

        <section className={`${sectionCardClass} space-y-5`}>
          <h4 className="mb-1 flex items-center gap-2 text-md font-semibold">
            <FaRobot className="text-purple-400" />
            Geração por IA
          </h4>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <div
                className={`${mainDropzoneClass} ${
                  isMainDropzoneActive
                    ? "border-purple-300 bg-linear-to-br from-gray-700/95 via-gray-700/90 to-slate-700/85"
                    : ""
                }`}
                onDragEnter={(event) => {
                  if (loading) return;
                  event.preventDefault();
                  setIsMainDropzoneActive(true);
                }}
                onDragOver={(event) => {
                  if (loading) return;
                  event.preventDefault();
                  setIsMainDropzoneActive(true);
                }}
                onDragLeave={(event) => {
                  if (loading) return;
                  event.preventDefault();
                  const nextTarget = event.relatedTarget as Node | null;
                  if (nextTarget && event.currentTarget.contains(nextTarget)) {
                    return;
                  }
                  setIsMainDropzoneActive(false);
                }}
                onDrop={(event) => {
                  if (loading) return;
                  event.preventDefault();
                  setIsMainDropzoneActive(false);

                  const droppedFiles = Array.from(event.dataTransfer.files || []);
                  if (!droppedFiles.length) return;

                  const imageFile =
                    droppedFiles.find((file) => file.type.startsWith("image/")) || droppedFiles[0];

                  handleProdutoPrincipalFile(imageFile, "drop");
                }}
              >
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  id="produtoPrincipalUpload"
                  disabled={loading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    handleProdutoPrincipalFile(file, "upload");
                    e.currentTarget.value = "";
                  }}
                />
                <label
                  htmlFor="produtoPrincipalUpload"
                  className={`flex h-full w-full flex-col items-center justify-center gap-2 ${
                    loading ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  {produtoPrincipal.preview ? (
                    <div className="relative flex h-full w-full items-center justify-center">
                      <img
                        src={produtoPrincipal.preview}
                        alt="Produto principal"
                        className={`mx-auto max-h-60 w-auto rounded-md object-contain transition ${
                          loading ? "opacity-55" : "opacity-100"
                        }`}
                      />
                      {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-black/45 text-gray-100">
                          <div className="h-9 w-9 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                          <span className="text-xs font-medium">Gerando imagem...</span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {loading ? (
                        <>
                          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-500/15">
                            <span className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent" />
                          </span>
                          <span className="font-medium text-white">Gerando imagem...</span>
                          <span className="text-xs text-gray-300">Aguarde alguns instantes</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-300/35 bg-purple-500/15">
                            <FiUploadCloud className="text-3xl text-purple-200" />
                          </span>
                          <span className="font-medium text-white">Clique ou arraste a imagem aqui</span>
                          <span className="text-xs text-gray-300">JPG, PNG, WEBP (opcional)</span>
                        </>
                      )}
                    </>
                  )}
                </label>
              </div>

              {produtoPrincipal.file ? (
                <p className="mt-3 text-center text-xs text-gray-400">
                  Imagem selecionada: <strong>{produtoPrincipal.file.name}</strong>
                </p>
              ) : (
                <p className="mt-3 text-center text-xs text-gray-400">
                  Nenhuma imagem selecionada (a IA criará do zero).
                </p>
              )}

              {renderAmbientacaoActions()}
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="w-full md:w-[46%] md:min-w-65">
                  <label className={fieldLabelClass}>Modelo IA</label>
                  <div className={selectWrapperClass}>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className={selectClass}
                      disabled={loading}
                    >
                      {IMAGE_MODEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <FaChevronDown className={selectIconClass} />
                  </div>
                </div>
                <div className="w-full md:w-[46%] md:min-w-65">
                  <label className={fieldLabelClass}>Tamanho da imagem</label>
                  <div className={selectWrapperClass}>
                    <select
                      value={imageSize}
                      onChange={(e) => {
                        const nextSize = e.target.value;
                        setImageSize(nextSize);
                        const selectedOption = SOCIAL_FORMAT_OPTIONS.find(
                          (option) => option.imageSize === nextSize,
                        );
                        if (selectedOption) {
                          setVideoAspectRatio(selectedOption.value);
                        }
                      }}
                      className={selectClass}
                      disabled={loading}
                    >
                      {SOCIAL_FORMAT_OPTIONS.map((option) => (
                        <option key={`image-size-${option.value}`} value={option.imageSize}>
                          {option.label} - {option.details}
                        </option>
                      ))}
                    </select>
                    <FaChevronDown className={selectIconClass} />
                  </div>
                </div>
              </div>

              <div>
                <label className={fieldLabelClass} htmlFor="promptPersonalizado">
                  Prompt
                </label>
                <textarea
                  id="promptPersonalizado"
                  value={promptPersonalizado}
                  onChange={(e) => setPromptPersonalizado(e.target.value)}
                  className={`${textareaClass} h-28 min-h-24 max-h-45 resize-y`}
                  placeholder="Descreva a imagem desejada."
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !canGenerateImageByCredits}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-purple-400/45 bg-purple-500/25 px-4 py-3 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/35 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaRobot />
                  {loading ? "Aguarde, criando imagem..." : "Criar imagem com IA"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const directSource = preview || produtoPrincipal.preview || undefined;
                    const preferredAspectRatio = preview
                      ? resolveAspectRatioFromImageSize(imageSize)
                      : null;
                    openVideoModal(directSource, preferredAspectRatio);
                  }}
                  disabled={!canGenerateVideo || loading || !canGenerateVideoByCredits}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-400/45 bg-cyan-500/20 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaVideo />
                  Gerar vídeo (-2)
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 border-t border-gray-700 pt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">Biblioteca</h3>
              <p className="text-xs text-gray-400">
                Imagens e vídeos já gerados neste projeto.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="grid w-full grid-cols-2 gap-2 sm:w-80">
                <button
                  type="button"
                  onClick={() => setBibliotecaFiltro("image")}
                  className={`inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                    bibliotecaFiltro === "image"
                      ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100"
                      : "border-gray-600 bg-gray-900/50 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <FaImage className="text-[11px]" />
                  Imagens ({bibliotecaImageCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBibliotecaFiltro("video")}
                  className={`inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                    bibliotecaFiltro === "video"
                      ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100"
                      : "border-gray-600 bg-gray-900/50 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <FaVideo className="text-[11px]" />
                  Vídeos ({bibliotecaVideoCount})
                </button>
              </div>
              {bibliotecaFiltro === "video" && selectedVideoIdsForMerge.length > 0 ? (
                <span className="inline-flex h-8 items-center rounded-full border border-gray-600 bg-gray-900/60 px-3 text-xs font-medium text-gray-300">
                  Selecionados: {selectedVideoIdsForMerge.length}
                </span>
              ) : null}
              {bibliotecaFiltro === "video" && selectedVideoIdsForMerge.length >= 2 ? (
                <button
                  type="button"
                  onClick={openMergeModal}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-cyan-400/45 bg-cyan-500/20 px-4 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30 cursor-pointer"
                >
                  <FaExchangeAlt className="text-[11px]" />
                  Juntar vídeos
                </button>
              ) : null}
            </div>
          </div>

          {bibliotecaError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center text-sm text-red-100">
              <p>{bibliotecaError}</p>
            </div>
          ) : bibliotecaLoading ? (
            <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-6 text-center text-sm text-gray-300">
              Carregando biblioteca...
            </div>
          ) : bibliotecaFiltro === "image" ? (
            generatedImages.length === 0 ? (
              <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-6 text-center text-sm text-gray-300">
                Nenhuma imagem encontrada.
              </div>
            ) : (
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
                {generatedImages.map((item) => {
                  const deleting = deletingMediaIds.includes(`image:${item.id}`);
                  return (
                    <article
                      key={item.id}
                      className="mb-4 break-inside-avoid rounded-xl border border-gray-700 bg-gray-900/70 p-3"
                    >
                    <button
                      type="button"
                      onClick={() =>
                        setBibliotecaLightboxItem({
                          type: "image",
                          url: item.imageUrl,
                          title: item.prompt || "Imagem gerada",
                        })
                      }
                      className="relative w-full cursor-pointer overflow-hidden rounded-md bg-black"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.prompt || "Imagem gerada"}
                        className="h-auto w-full object-cover"
                      />
                    </button>

                    <p className="mt-2 line-clamp-2 text-[11px] text-gray-300">
                      {item.revisedPrompt || item.prompt}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="inline-flex items-center rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2 py-0.5 font-medium text-cyan-200">
                        {item.model}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-gray-600 bg-gray-800/70 px-2 py-0.5 font-medium text-gray-300">
                        {item.size}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-gray-600 bg-gray-800/70 px-2 py-0.5 font-medium text-gray-300">
                        {formatDatePtBr(item.createdAt)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadBibliotecaImage(item)}
                        disabled={deleting}
                        className="inline-flex h-8 w-[calc(50%-0.25rem)] cursor-pointer items-center justify-center gap-1.5 rounded-md border border-gray-600 bg-gray-800 px-2.5 text-xs font-medium text-gray-200 transition hover:bg-gray-700"
                      >
                        <FaDownload className="text-[11px]" />
                        Baixar
                      </button>
                      <button
                        type="button"
                        onClick={() => openVideoModal(item.imageUrl, resolveAspectRatioFromImageSize(item.size))}
                        disabled={deleting}
                        className="inline-flex h-8 w-[calc(50%-0.25rem)] cursor-pointer items-center justify-center gap-1.5 rounded-md border border-cyan-400/40 bg-cyan-500/20 px-2.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/30"
                      >
                        <FaVideo className="text-[11px]" />
                        Gerar vídeo
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModalForImage(item)}
                        disabled={deleting}
                        className="inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-red-500/35 bg-red-500/15 px-2.5 text-xs font-medium text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FaTimes className="text-[11px]" />
                        {deleting ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </article>
                  );
                })}
              </div>
            )
          ) : generatedVideos.length === 0 ? (
            <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-6 text-center text-sm text-gray-300">
              Nenhum vídeo encontrado.
            </div>
          ) : (
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
              {generatedVideos.map((item) => {
                const deleting = deletingMediaIds.includes(`video:${item.id}`);
                return (
                  <article
                    key={item.id}
                    className="mb-4 break-inside-avoid rounded-xl border border-gray-700 bg-gray-900/70 p-3"
                  >
                  <label className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-100">
                    <input
                      type="checkbox"
                      checked={selectedVideoIdsForMerge.includes(item.id)}
                      onChange={() => toggleVideoSelectionForMerge(item.id)}
                      disabled={deleting}
                      className="h-3.5 w-3.5 cursor-pointer accent-cyan-500"
                    />
                    Selecionar
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setBibliotecaLightboxItem({
                        type: "video",
                        url: item.videoUrl,
                        title: `Vídeo ${item.id}`,
                      })
                    }
                    className="relative w-full cursor-pointer overflow-hidden rounded-md bg-black"
                  >
                    <video
                      src={item.videoUrl}
                      preload="metadata"
                      muted
                      className="h-auto w-full object-cover"
                    />
                  </button>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="inline-flex items-center rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2 py-0.5 font-medium text-cyan-200">
                      {item.model}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-gray-600 bg-gray-800/70 px-2 py-0.5 font-medium text-gray-300">
                      {item.resolution} • {item.aspectRatio} • {item.durationSeconds}s
                    </span>
                    <span className="inline-flex items-center rounded-full border border-gray-600 bg-gray-800/70 px-2 py-0.5 font-medium text-gray-300">
                      {formatDatePtBr(item.createdAt)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center">
                    <button
                      type="button"
                      onClick={() => downloadBibliotecaVideo(item)}
                      disabled={deleting}
                      className="inline-flex h-8 w-[calc(50%-0.25rem)] cursor-pointer items-center justify-center gap-1.5 rounded-md border border-gray-600 bg-gray-800 px-2.5 text-xs font-medium text-gray-200 transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FaDownload className="text-[11px]" />
                      Baixar vídeo
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModalForVideo(item)}
                      disabled={deleting}
                      className="ml-2 inline-flex h-8 w-[calc(50%-0.25rem)] cursor-pointer items-center justify-center gap-1.5 rounded-md border border-red-500/35 bg-red-500/15 px-2.5 text-xs font-medium text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FaTimes className="text-[11px]" />
                      {deleting ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {mergeModalOpen ? (
        <div className="fixed inset-0 z-65 overflow-y-auto bg-black/60 p-3 backdrop-blur-[2px] sm:p-5">
          <div className="mx-auto my-2 w-full max-w-5xl rounded-2xl border border-gray-600/70 bg-gray-900 shadow-2xl shadow-black/30 sm:my-6">
            <div className="flex items-center justify-between border-b border-gray-700/80 px-4 py-3 sm:px-5">
              <h3 className="inline-flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
                <FaExchangeAlt className="text-cyan-300" />
                Juntar vídeos selecionados
              </h3>
              <button
                type="button"
                onClick={closeMergeModal}
                className="rounded-lg border border-gray-600 bg-gray-800 p-2 text-gray-300 transition hover:text-white cursor-pointer"
                aria-label="Fechar modal de junção de vídeos"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-gray-700/80 bg-gray-800/55 px-3 py-2.5 text-xs text-gray-200">
                  <p className="font-semibold uppercase tracking-[0.08em] text-gray-300">Quantidade</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {selectedVideosForMerge.length} vídeo(s)
                  </p>
                </div>

                <div className="rounded-xl border border-gray-700/80 bg-gray-800/55 px-3 py-2.5 text-xs text-gray-200">
                  <p className="font-semibold uppercase tracking-[0.08em] text-gray-300">Áudio</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMergePreserveAudio(true)}
                      disabled={mergeLoading}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                        mergePreserveAudio
                          ? "border-cyan-400/65 bg-cyan-500/20 text-cyan-100"
                          : "border-gray-700 bg-gray-900/70 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      Manter
                    </button>
                    <button
                      type="button"
                      onClick={() => setMergePreserveAudio(false)}
                      disabled={mergeLoading}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                        !mergePreserveAudio
                          ? "border-cyan-400/65 bg-cyan-500/20 text-cyan-100"
                          : "border-gray-700 bg-gray-900/70 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      Remover
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-700/80 bg-gray-800/55 px-3 py-2.5 text-xs text-gray-200">
                  <p className="font-semibold uppercase tracking-[0.08em] text-gray-300">Formato final</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {SOCIAL_FORMAT_OPTIONS.map((option) => (
                      <button
                        key={`merge-format-${option.value}`}
                        type="button"
                        onClick={() => setMergeAspectRatio(option.value)}
                        disabled={mergeLoading}
                        className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                          mergeAspectRatio === option.value
                            ? "border-cyan-400/65 bg-cyan-500/20 text-cyan-100"
                            : "border-gray-700 bg-gray-900/70 text-gray-300 hover:border-gray-500"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {mergeError ? (
                <p className="rounded-lg border border-red-500/45 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-100">
                  {mergeError}
                </p>
              ) : null}

              <p className="text-xs text-gray-400">A ordem da junção seguirá a ordem de seleção.</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {selectedVideosForMerge.map((item, index) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-gray-700 bg-gray-900/70 p-3"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-cyan-200">
                      Ordem {index + 1}
                    </p>
                    <video
                      src={item.videoUrl}
                      controls
                      preload="metadata"
                      className="h-44 w-full rounded-md bg-black object-cover"
                    />
                  </article>
                ))}
              </div>

              {mergeResultUrl ? (
                <div className="space-y-3 rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-4">
                  <p className="text-sm font-semibold text-cyan-100">Vídeo final gerado com sucesso</p>
                  <video
                    src={mergeResultUrl}
                    controls
                    className="max-h-90 w-full rounded-lg bg-black object-contain"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={downloadMergedVideo}
                      className="inline-flex h-10 min-w-41.25 items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-sm font-semibold text-white transition hover:bg-purple-600 cursor-pointer"
                    >
                      <FaDownload />
                      Baixar vídeo final
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-700/80 bg-gray-900/95 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={closeMergeModal}
                className="inline-flex h-10 min-w-36.25 items-center justify-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 text-sm font-medium text-gray-200 transition hover:bg-gray-700 cursor-pointer"
              >
                <FaTimes className="text-xs" />
                Fechar
              </button>
              <button
                type="button"
                onClick={handleMergeVideos}
                disabled={mergeLoading || selectedVideosForMerge.length < 2}
                className="inline-flex h-10 min-w-36.25 items-center justify-center gap-2 rounded-lg border border-cyan-400/45 bg-cyan-500/25 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                <FaExchangeAlt className={mergeLoading ? "animate-spin" : ""} />
                {mergeLoading ? "Juntando..." : "Juntar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {ambientacaoLightboxOpen && preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
          onClick={() => setAmbientacaoLightboxOpen(false)}
        >
          <div
            className="w-full max-w-5xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 p-4 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
                <FaImage className="text-purple-300" />
                Visualizar imagem
              </h3>
              <button
                type="button"
                onClick={() => setAmbientacaoLightboxOpen(false)}
                className="cursor-pointer rounded-lg border border-gray-600 bg-gray-800 p-2 text-gray-300 transition hover:text-white"
                aria-label="Fechar visualização"
              >
                <FaTimes />
              </button>
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-950/70">
              <img src={preview} alt="Imagem ambientada" className="mx-auto max-h-[70vh] w-full object-contain" />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={downloadImage}
                className="inline-flex h-10 min-w-47.5 cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-sm font-semibold text-white transition hover:bg-purple-600"
              >
                <FaDownload />
                Baixar imagem
              </button>
              <button
                type="button"
                onClick={() => {
                  setAmbientacaoLightboxOpen(false);
                  openVideoModal(preview, resolveAspectRatioFromImageSize(imageSize));
                }}
                className="inline-flex h-10 min-w-47.5 cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-400/45 bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
              >
                <FaVideo />
                Gerar vídeo (Veo)
              </button>
            </div>
          </div>
        </div>
      )}

      {bibliotecaLightboxItem && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm"
          onClick={() => setBibliotecaLightboxItem(null)}
        >
          <div
            className="w-full max-w-6xl max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 p-4 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {bibliotecaLightboxItem.type === "video"
                  ? "Visualizar vídeo da biblioteca"
                  : "Visualizar imagem da biblioteca"}
              </h3>
              <button
                type="button"
                onClick={() => setBibliotecaLightboxItem(null)}
                className="cursor-pointer rounded-lg border border-gray-600 bg-gray-800 p-2 text-gray-300 transition hover:text-white"
                aria-label="Fechar visualização da biblioteca"
              >
                <FaTimes />
              </button>
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-950/70">
              {bibliotecaLightboxItem.type === "video" ? (
                <video
                  src={bibliotecaLightboxItem.url}
                  controls
                  autoPlay
                  className="mx-auto max-h-[75vh] w-full object-contain"
                />
              ) : bibliotecaImageLightboxLoading ? (
                <div className="flex min-h-80 w-full flex-col items-center justify-center gap-3 px-4 py-10 text-center text-gray-200">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                  <p className="text-sm">Carregando imagem...</p>
                </div>
              ) : (
                <img
                  src={bibliotecaLightboxItem.url}
                  alt={bibliotecaLightboxItem.title}
                  className="mx-auto max-h-[75vh] w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {videoModalOpen && (
        <div className="fixed inset-0 z-95 overflow-y-auto bg-black/65 p-0 backdrop-blur-[2px] sm:p-5">
          <div className="mx-0 my-0 flex h-dvh w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-gray-900 shadow-2xl shadow-black/30 sm:mx-auto sm:my-4 sm:h-auto sm:max-w-352 sm:rounded-2xl sm:border sm:border-gray-600/70">
            <div className="flex items-center justify-between border-b border-gray-700/80 bg-gray-900/95 px-4 py-3 sm:px-5">
              <h3 className="inline-flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
                <FaPlay className="text-lg text-cyan-300" />
                Gerar vídeo com {selectedVideoModelOption.label}
              </h3>
              <button
                type="button"
                onClick={closeVideoModal}
                className="cursor-pointer rounded-lg border border-gray-600 bg-gray-800 p-2 text-gray-300 transition hover:text-white"
                aria-label="Fechar modal de vídeo"
              >
                <FaTimes />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:max-h-[70vh] sm:px-5 sm:py-5">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
                <div className="rounded-xl border border-gray-700/70 bg-gray-800/55 p-4">
                  <p className={fieldLabelClass}>{videoResult ? "Vídeo gerado" : "Preview da imagem"}</p>

                  <div
                    className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-gray-700 bg-black/80"
                    style={{ aspectRatio: selectedVideoFormat.previewAspectRatio }}
                  >
                    {videoLoading ? (
                      <div className="flex flex-col items-center gap-3 px-4 text-center text-gray-200">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                        <p className="text-sm">Processando no Veo. Isso pode levar alguns minutos.</p>
                      </div>
                    ) : videoResult ? (
                      <video controls src={videoResult} className="h-full w-full object-cover" />
                    ) : videoSourceUrl ? (
                      <img
                        src={videoSourceUrl}
                        alt="Preview da imagem para geração de vídeo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <p className="px-4 text-center text-sm text-gray-400">
                        Nenhuma imagem selecionada para gerar o vídeo.
                      </p>
                    )}
                  </div>

                  {videoResult && !videoLoading ? (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={downloadVideo}
                        className="inline-flex h-10 min-w-36.25 cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-sm font-semibold text-white transition hover:bg-purple-600"
                      >
                        <FaDownload />
                        Baixar vídeo
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="mt-3 text-xs text-gray-400">
                        A imagem de referência aparece aqui e será substituída pelo vídeo após a geração.
                      </p>
                      {videoErrorMessage && (
                        <p className="mt-2 rounded-lg border border-red-500/45 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-100">
                          {videoErrorMessage}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div className="space-y-4 rounded-xl border border-gray-700/70 bg-gray-800/55 p-4">
                      <div>
                        <label className={fieldLabelClass}>Modelo de vídeo</label>
                        <div className={selectWrapperClass}>
                          <select
                            value={videoModel}
                            onChange={(e) => setVideoModel(e.target.value)}
                            className={selectClass}
                            disabled={videoLoading}
                          >
                            {VIDEO_MODEL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <FaChevronDown className={selectIconClass} />
                        </div>
                      </div>

                      <div>
                        <label className={fieldLabelClass}>Resolução</label>
                        <div className="rounded-xl border border-cyan-400/45 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                          {videoResolution} (fixa)
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-700/70 bg-gray-800/55 p-4">
                      <label className={fieldLabelClass}>Formato para redes</label>
                      <div className="rounded-xl border border-cyan-400/45 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                        {SOCIAL_FORMAT_OPTIONS.find((option) => option.value === videoAspectRatio)?.label ||
                          "Formato selecionado"}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {SOCIAL_FORMAT_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setVideoAspectRatio(option.value)}
                            disabled={videoLoading}
                            className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              videoAspectRatio === option.value
                                ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100"
                                : "border-gray-700 bg-gray-900/70 text-gray-300 hover:border-gray-500"
                            }`}
                          >
                            <p className="font-semibold">{option.label}</p>
                            <p className="mt-0.5 text-[11px] opacity-80">{option.details}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-700/70 bg-gray-800/55 p-4">
                      <label className={fieldLabelClass}>Duração do vídeo</label>
                      <div className="rounded-xl border border-cyan-400/45 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                        {videoDurationSeconds}s (fixa)
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Configuração fixa para reduzir custo da geração.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-700/70 bg-gray-800/55 p-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className={fieldLabelClass}>Prompt do vídeo</label>
                        <textarea
                          value={videoPrompt}
                          onChange={(e) => setVideoPrompt(e.target.value)}
                          className={`${textareaClass} h-24`}
                          placeholder="Descreva movimento de câmera, ação e clima da cena."
                          disabled={videoLoading}
                        />
                      </div>

                      <div>
                        <label className={fieldLabelClass}>
                          Prompt negativo <small>(opcional)</small>
                        </label>
                        <input
                          value={videoNegativePrompt}
                          onChange={(e) => setVideoNegativePrompt(e.target.value)}
                          className={inputClass}
                          placeholder="Ex: sem distorções, sem texto, sem logotipos"
                          disabled={videoLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700/80 bg-gray-900/95 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeVideoModal}
                  className="inline-flex h-10 min-w-36.25 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 text-sm font-medium text-gray-200 transition hover:bg-gray-700"
                >
                  <FaTimes className="text-xs" />
                  {videoLoading ? "Cancelar" : "Fechar"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={videoLoading || !videoSourceUrl || !canGenerateVideoByCredits}
                  className="inline-flex h-10 min-w-36.25 cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-400/45 bg-cyan-500/25 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaVideo />
                  {videoLoading ? "Gerando vídeo..." : "Gerar vídeo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteModalState ? (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-5 shadow-2xl shadow-black/30">
            <h4 className="text-base font-semibold text-white">Confirmar exclusão</h4>
            <p className="mt-2 text-sm text-gray-300">
              {deleteModalState.type === "image"
                ? "Deseja excluir esta imagem da biblioteca? Esta ação não pode ser desfeita."
                : "Deseja excluir este vídeo da biblioteca? Esta ação não pode ser desfeita."}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeletingFromModal}
                className="inline-flex h-10 min-w-30 items-center justify-center rounded-lg border border-gray-600 bg-gray-800 px-4 text-sm font-medium text-gray-200 transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteFromModal()}
                disabled={isDeletingFromModal}
                className="inline-flex h-10 min-w-36.25 items-center justify-center rounded-lg border border-red-500/45 bg-red-500/20 px-4 text-sm font-semibold text-red-100 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingFromModal ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

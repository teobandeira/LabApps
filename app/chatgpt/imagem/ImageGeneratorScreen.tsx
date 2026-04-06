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
import Skeleton from "../components/Skeleton";

type AmbientadorItem = {
  file: File | null;
  preview: string | null;
};

type VideoProvider = "veo" | "sora";
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
  allowedAspectRatios: readonly ("16:9" | "9:16" | "1:1")[];
  defaultDuration: number;
  defaultResolution: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type GeneratedImageItem = {
  id: string;
  prompt: string;
  revisedPrompt: string | null;
  model: string;
  size: string;
  action: "generate" | "edit";
  createdAt: string;
  imageUrl: string;
  thumbnailUrl?: string;
};

type GeneratedVideoItem = {
  id: string;
  sourceImageId: string | null;
  sourceImageThumbnailUrl?: string | null;
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
  previewUrl?: string;
} | null;

type DeleteModalState =
  | { type: "image"; item: GeneratedImageItem }
  | { type: "video"; item: GeneratedVideoItem }
  | null;

type SocialFormatOption = {
  value: "16:9" | "9:16" | "1:1";
  label: string;
  details: string;
  imageSize: string;
  previewAspectRatio: string;
};
type ImageSizeOption = {
  value: string;
  label: string;
  details: string;
  videoAspectRatio: "16:9" | "9:16" | "1:1" | null;
};

const SOCIAL_FORMAT_OPTIONS = [
  {
    value: "16:9",
    label: "Paisagem (horizontal)",
    details: "1280x720 (16:9)",
    imageSize: "1280x720",
    previewAspectRatio: "16 / 9",
  },
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

const DEFAULT_IMAGE_SIZE_OPTIONS: readonly ImageSizeOption[] = [
  {
    value: "1024x1792",
    label: "Story (vertical)",
    details: "1080x1920 (9:16)",
    videoAspectRatio: "9:16",
  },
  {
    value: "1024x1024",
    label: "Feed (quadrada)",
    details: "1080x1080 (1:1)",
    videoAspectRatio: "1:1",
  },
];

const SORA_IMAGE_SIZE_OPTIONS: readonly ImageSizeOption[] = [
  {
    value: "720x1280",
    label: "Sora Vertical HD",
    details: "720x1280 (9:16)",
    videoAspectRatio: "9:16",
  },
  {
    value: "1280x720",
    label: "Sora Horizontal HD",
    details: "1280x720 (16:9)",
    videoAspectRatio: "16:9",
  },
];

const VIDEO_MODEL_OPTIONS: VideoModelOption[] = [
  {
    value: "veo-3.1-generate-preview",
    label: "Veo 3.1 Standard",
    provider: "veo",
    allowedDurations: [8],
    allowedResolutions: ["720p"],
    allowedAspectRatios: ["16:9", "9:16", "1:1"],
    defaultDuration: 8,
    defaultResolution: "720p",
  },
  {
    value: "veo-3.1-fast-generate-preview",
    label: "Veo 3.1 Fast",
    provider: "veo",
    allowedDurations: [8],
    allowedResolutions: ["720p"],
    allowedAspectRatios: ["16:9", "9:16", "1:1"],
    defaultDuration: 8,
    defaultResolution: "720p",
  },
  {
    value: "sora-2",
    label: "Sora 2",
    provider: "sora",
    allowedDurations: [8],
    allowedResolutions: ["720p"],
    allowedAspectRatios: ["16:9", "9:16"],
    defaultDuration: 8,
    defaultResolution: "720p",
  },
  {
    value: "sora-2-pro",
    label: "Sora 2 Pro",
    provider: "sora",
    allowedDurations: [8, 12],
    allowedResolutions: ["720p"],
    allowedAspectRatios: ["16:9", "9:16"],
    defaultDuration: 8,
    defaultResolution: "720p",
  },
];

const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  { value: "nano_banana", label: "Nano Banana" },
  { value: "chatgpt-image-latest", label: "ChatGPT Image Latest" },
];

const CHAT_DEVICE_ID_STORAGE_KEY = "chatgpt-device-id-v1";
const IMAGE_STUDIO_THEME_STORAGE_KEY = "chatgpt-image-studio-theme-v1";
const IMAGE_GENERATION_CREDIT_COST = 1;
const VIDEO_GENERATION_CREDIT_COST = 2;
const BIBLIOTECA_PAGE_LIMIT = 8;
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

function resolveAspectRatioFromImageSize(size: string): "16:9" | "9:16" | "1:1" | null {
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

  if (width > height) {
    return "16:9";
  }

  return null;
}

export default function ImageGeneratorScreen() {
  const [produtoPrincipal, setProdutoPrincipal] = useState<AmbientadorItem>({
    file: null,
    preview: null,
  });
  const [model, setModel] = useState<string>(IMAGE_MODEL_OPTIONS[0].value);
  const [imageSize, setImageSize] = useState<string>(DEFAULT_IMAGE_SIZE_OPTIONS[0].value);
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
  const [videoModel, setVideoModel] = useState<string>(VIDEO_MODEL_OPTIONS[0].value);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number>(
    VIDEO_MODEL_OPTIONS[0].defaultDuration,
  );
  const [videoResolution, setVideoResolution] = useState<string>(
    VIDEO_MODEL_OPTIONS[0].defaultResolution,
  );
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>(
    SOCIAL_FORMAT_OPTIONS[0].value,
  );
  const [videoErrorMessage, setVideoErrorMessage] = useState<string | null>(null);
  const [toastState, setToastState] = useState<ToastState>(null);
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const [isMainDropzoneActive, setIsMainDropzoneActive] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>([]);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideoItem[]>([]);
  const [bibliotecaCursorByTab, setBibliotecaCursorByTab] = useState<{
    images: string | null;
    videos: string | null;
  }>({
    images: null,
    videos: null,
  });
  const [bibliotecaHasMoreByTab, setBibliotecaHasMoreByTab] = useState<{
    images: boolean;
    videos: boolean;
  }>({
    images: false,
    videos: false,
  });
  const [bibliotecaLoadingMoreTab, setBibliotecaLoadingMoreTab] = useState<
    "images" | "videos" | null
  >(null);
  const [bibliotecaLoading, setBibliotecaLoading] = useState(false);
  const [bibliotecaError, setBibliotecaError] = useState<string | null>(null);
  const [bibliotecaActiveTab, setBibliotecaActiveTab] = useState<"images" | "videos">("images");
  const [deletingMediaIds, setDeletingMediaIds] = useState<string[]>([]);
  const [deleteModalState, setDeleteModalState] = useState<DeleteModalState>(null);
  const [bibliotecaLightboxItem, setBibliotecaLightboxItem] =
    useState<BibliotecaLightboxItem>(null);
  const [bibliotecaLightboxImageLoaded, setBibliotecaLightboxImageLoaded] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedVideoIdsForMerge, setSelectedVideoIdsForMerge] = useState<string[]>([]);
  const [mergePreserveAudio, setMergePreserveAudio] = useState(true);
  const [mergeAspectRatio, setMergeAspectRatio] = useState<string>(SOCIAL_FORMAT_OPTIONS[0].value);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeResultUrl, setMergeResultUrl] = useState<string | null>(null);
  const [feedActionMenuId, setFeedActionMenuId] = useState<string | null>(null);
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [chatDeviceId, setChatDeviceId] = useState<string>("");
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const videoPreviewAnchorRef = useRef<HTMLDivElement | null>(null);
  const feedVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const feedVideoVisibilityRef = useRef<Map<string, number>>(new Map());
  const feedVideoObserverRef = useRef<IntersectionObserver | null>(null);

  const selectedVideoModelOption = useMemo(
    () => VIDEO_MODEL_OPTIONS.find((option) => option.value === videoModel) || VIDEO_MODEL_OPTIONS[0],
    [videoModel],
  );
  const selectedImageModelLabel = useMemo(
    () => IMAGE_MODEL_OPTIONS.find((option) => option.value === model)?.label || model,
    [model],
  );
  const isSoraImageModel = useMemo(() => model.toLowerCase().includes("sora"), [model]);
  const imageSizeOptions = useMemo(
    () => (isSoraImageModel ? SORA_IMAGE_SIZE_OPTIONS : DEFAULT_IMAGE_SIZE_OPTIONS),
    [isSoraImageModel],
  );
  const selectedVideoFormat = useMemo(
    () =>
      SOCIAL_FORMAT_OPTIONS.find((option) => option.value === videoAspectRatio) ||
      SOCIAL_FORMAT_OPTIONS[0],
    [videoAspectRatio],
  );
  const availableVideoFormatOptions = useMemo(
    () =>
      SOCIAL_FORMAT_OPTIONS.filter((option) =>
        selectedVideoModelOption.allowedAspectRatios.includes(option.value),
      ),
    [selectedVideoModelOption],
  );
  const shouldShowVideoPreviewPanel = Boolean(
    videoSourceUrl || videoResult || videoLoading || videoErrorMessage,
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

  useEffect(() => {
    if (selectedVideoModelOption.allowedDurations.includes(videoDurationSeconds)) {
      return;
    }
    setVideoDurationSeconds(selectedVideoModelOption.defaultDuration);
  }, [selectedVideoModelOption, videoDurationSeconds]);

  useEffect(() => {
    if (selectedVideoModelOption.allowedResolutions.includes(videoResolution)) {
      return;
    }
    setVideoResolution(selectedVideoModelOption.defaultResolution);
  }, [selectedVideoModelOption, videoResolution]);

  useEffect(() => {
    if (
      selectedVideoModelOption.allowedAspectRatios.includes(
        videoAspectRatio as "16:9" | "9:16" | "1:1",
      )
    ) {
      return;
    }
    setVideoAspectRatio(selectedVideoModelOption.allowedAspectRatios[0] || SOCIAL_FORMAT_OPTIONS[0].value);
  }, [selectedVideoModelOption, videoAspectRatio]);

  useEffect(() => {
    if (imageSizeOptions.some((option) => option.value === imageSize)) {
      return;
    }
    setImageSize(imageSizeOptions[0]?.value || DEFAULT_IMAGE_SIZE_OPTIONS[0].value);
  }, [imageSize, imageSizeOptions]);

  const sectionCardClass = isLightTheme
    ? "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    : "rounded-2xl border border-gray-700/80 bg-linear-to-br from-gray-900/80 via-slate-900/70 to-gray-950/70 p-4 sm:p-5";
  const fieldLabelClass = isLightTheme
    ? "block pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700"
    : "block pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300";
  const textareaClass = isLightTheme
    ? "w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100"
    : "w-full rounded-xl border border-gray-700/90 bg-gray-900/85 p-3 text-sm text-gray-100 placeholder-gray-500 transition focus:border-purple-400/60 focus:outline-none focus:ring-4 focus:ring-purple-500/15";
  const selectClass = isLightTheme
    ? "w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm font-medium text-slate-900 transition focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-70 [&>option]:bg-white [&>option]:text-slate-900"
    : "w-full appearance-none rounded-xl border border-gray-600/90 bg-linear-to-b from-gray-800/95 to-gray-900/95 px-3 py-2.5 pr-10 text-sm font-medium text-gray-100 [color-scheme:dark] transition focus:border-cyan-400/60 focus:outline-none focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-70 [&>option]:bg-gray-900 [&>option]:text-gray-100";
  const selectWrapperClass = "relative";
  const selectIconClass = `pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
    isLightTheme ? "text-slate-500" : "text-gray-400"
  }`;
  const mainDropzoneClass = isLightTheme
    ? "relative flex w-full min-h-[224px] flex-1 items-center justify-center rounded-2xl border border-dashed border-sky-300 bg-linear-to-br from-sky-50 via-white to-cyan-50 p-6 text-center transition hover:border-sky-400"
    : "relative flex w-full min-h-[224px] flex-1 items-center justify-center rounded-2xl border border-dashed border-purple-500/70 bg-linear-to-br from-gray-800/90 via-gray-800/85 to-slate-800/80 p-6 text-center transition hover:border-purple-400 hover:from-gray-700/90 hover:to-slate-700/80";

  const bibliotecaImageCount = generatedImages.length;
  const bibliotecaVideoCount = generatedVideos.length;
  const bibliotecaImageItems = useMemo(
    () =>
      [...generatedImages]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((item) => ({
          caption: item.revisedPrompt || item.prompt || "",
          item,
        })),
    [generatedImages],
  );
  const bibliotecaVideoItems = useMemo(() => {
    const imagePromptById = new Map<string, string>();
    for (const image of generatedImages) {
      imagePromptById.set(image.id, image.revisedPrompt || image.prompt || "");
    }

    return [...generatedVideos]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((item) => ({
        caption:
          (item.sourceImageId ? imagePromptById.get(item.sourceImageId) : "") ||
          "Prompt não disponível para este vídeo.",
        item,
      }));
  }, [generatedImages, generatedVideos]);
  const selectedVideosForMerge = useMemo(() => {
    const map = new Map(generatedVideos.map((video) => [video.id, video]));
    return selectedVideoIdsForMerge
      .map((id) => map.get(id))
      .filter((item): item is GeneratedVideoItem => !!item);
  }, [generatedVideos, selectedVideoIdsForMerge]);
  const hasMoreBibliotecaImageItems = bibliotecaHasMoreByTab.images;
  const hasMoreBibliotecaVideoItems = bibliotecaHasMoreByTab.videos;

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

  const loadBiblioteca = async (
    deviceIdParam: string,
    options?: { append?: boolean; tab?: "images" | "videos" },
  ) => {
    const append = Boolean(options?.append);
    const tab = options?.tab;
    const targetTabs = tab ? [tab] : (["images", "videos"] as const);

    if (append && tab) {
      setBibliotecaLoadingMoreTab(tab);
    } else {
      setBibliotecaLoading(true);
    }
    setBibliotecaError(null);

    try {
      await Promise.all(
        targetTabs.map(async (targetTab) => {
          const isImages = targetTab === "images";
          const endpoint = isImages
            ? "/api/chatgpt/generated-images"
            : "/api/chatgpt/generated-videos";
          const mergedItems: (GeneratedImageItem | GeneratedVideoItem)[] = [];
          let nextCursor: string | null = append ? bibliotecaCursorByTab[targetTab] : null;
          let hasNextPage = true;

          while (hasNextPage) {
            const params = new URLSearchParams();
            params.set("deviceId", deviceIdParam);
            params.set("scope", "all");
            params.set("limit", String(BIBLIOTECA_PAGE_LIMIT));
            if (nextCursor) {
              params.set("cursor", nextCursor);
            }

            const res = await fetch(`${endpoint}?${params.toString()}`, {
              cache: "no-store",
            });
            const data = await res.json();
            if (!res.ok || data?.error) {
              throw new Error(
                data?.error ||
                  (isImages
                    ? "Falha ao carregar imagens da biblioteca."
                    : "Falha ao carregar vídeos da biblioteca."),
              );
            }

            const pageItems = Array.isArray(isImages ? data?.images : data?.videos)
              ? (isImages ? data.images : data.videos)
              : [];
            if (pageItems.length > 0) {
              mergedItems.push(...pageItems);
            }

            nextCursor = typeof data?.nextCursor === "string" ? data.nextCursor : null;
            if (append) {
              hasNextPage = false;
            } else {
              hasNextPage = Boolean(nextCursor);
            }
          }

          if (isImages) {
            setGeneratedImages((current) => {
              if (!append) return mergedItems as GeneratedImageItem[];
              const merged = [...current, ...(mergedItems as GeneratedImageItem[])];
              const unique = new Map<string, GeneratedImageItem>();
              merged.forEach((item) => unique.set(item.id, item));
              return Array.from(unique.values());
            });
          } else {
            setGeneratedVideos((current) => {
              if (!append) return mergedItems as GeneratedVideoItem[];
              const merged = [...current, ...(mergedItems as GeneratedVideoItem[])];
              const unique = new Map<string, GeneratedVideoItem>();
              merged.forEach((item) => unique.set(item.id, item));
              return Array.from(unique.values());
            });
          }

          setBibliotecaCursorByTab((current) => ({
            ...current,
            [targetTab]: nextCursor,
          }));
          setBibliotecaHasMoreByTab((current) => ({
            ...current,
            [targetTab]: Boolean(nextCursor),
          }));
        }),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Não foi possível carregar a biblioteca.";
      setBibliotecaError(message);
    } finally {
      if (append && tab) {
        setBibliotecaLoadingMoreTab((current) => (current === tab ? null : current));
      } else {
        setBibliotecaLoading(false);
      }
    }
  };

  useEffect(() => {
    const deviceId = getOrCreateChatDeviceId();
    setChatDeviceId(deviceId);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedTheme = window.localStorage.getItem(IMAGE_STUDIO_THEME_STORAGE_KEY);
      if (savedTheme === "light") {
        setIsLightTheme(true);
      }
    } catch {
      // ignore storage issues
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setIsLightTheme((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(IMAGE_STUDIO_THEME_STORAGE_KEY, next ? "light" : "dark");
      } catch {
        // ignore storage issues
      }
      return next;
    });
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
    setSelectedVideoIdsForMerge((current) =>
      current.filter((id) => generatedVideos.some((video) => video.id === id)),
    );
  }, [generatedVideos]);

  useEffect(() => {
    setFeedActionMenuId(null);
  }, [generatedImages, generatedVideos]);

  useEffect(() => {
    if (bibliotecaActiveTab === "images" && bibliotecaImageCount === 0 && bibliotecaVideoCount > 0) {
      setBibliotecaActiveTab("videos");
    }
    if (bibliotecaActiveTab === "videos" && bibliotecaVideoCount === 0 && bibliotecaImageCount > 0) {
      setBibliotecaActiveTab("images");
    }
  }, [bibliotecaActiveTab, bibliotecaImageCount, bibliotecaVideoCount]);

  const syncFeedVideoPlayback = useCallback(() => {
    let bestVisibleId: string | null = null;
    let bestRatio = 0;

    feedVideoVisibilityRef.current.forEach((ratio, id) => {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestVisibleId = id;
      }
    });

    feedVideoRefs.current.forEach((video, id) => {
      const shouldPlay = bestVisibleId === id && bestRatio >= 0.6;
      if (shouldPlay) {
        video.muted = true;
        const playAttempt = video.play();
        if (playAttempt && typeof playAttempt.catch === "function") {
          playAttempt.catch(() => undefined);
        }
      } else if (!video.paused) {
        video.pause();
      }
    });
  }, []);

  const setFeedVideoRef = useCallback(
    (videoId: string, node: HTMLVideoElement | null) => {
      const refs = feedVideoRefs.current;
      const observer = feedVideoObserverRef.current;
      const prev = refs.get(videoId);

      if (prev && observer) {
        observer.unobserve(prev);
      }

      if (node) {
        refs.set(videoId, node);
        if (observer) {
          observer.observe(node);
        }
      } else {
        refs.delete(videoId);
        feedVideoVisibilityRef.current.delete(videoId);
      }

      syncFeedVideoPlayback();
    },
    [syncFeedVideoPlayback],
  );

  useEffect(() => {
    const visibilityMap = feedVideoVisibilityRef.current;
    const videoRefs = feedVideoRefs.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLVideoElement;
          const id = target.dataset.feedVideoId;
          if (!id) continue;
          feedVideoVisibilityRef.current.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        syncFeedVideoPlayback();
      },
      {
        threshold: [0, 0.25, 0.5, 0.6, 0.75, 1],
      },
    );

    feedVideoObserverRef.current = observer;
    videoRefs.forEach((video) => observer.observe(video));

    return () => {
      observer.disconnect();
      feedVideoObserverRef.current = null;
      visibilityMap.clear();
      videoRefs.forEach((video) => video.pause());
    };
  }, [syncFeedVideoPlayback]);

  useEffect(() => {
    if (bibliotecaLightboxItem?.type !== "image") {
      setBibliotecaLightboxImageLoaded(false);
      return;
    }
    setBibliotecaLightboxImageLoaded(false);
  }, [bibliotecaLightboxItem]);

  const saveReferenceImageToLibrary = useCallback(
    async (file: File) => {
      const deviceIdForUpload = chatDeviceId || getOrCreateChatDeviceId();
      if (!chatDeviceId) {
        setChatDeviceId(deviceIdForUpload);
      }

      const formData = new FormData();
      formData.append("sourceImage", file);
      formData.append("deviceId", deviceIdForUpload);

      try {
        const response = await fetch("/api/chatgpt/reference-image", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              error?: string;
            }
          | null;

        if (!response.ok || payload?.error) {
          throw new Error(payload?.error || "Falha ao salvar imagem na biblioteca.");
        }

        notify("success", "Imagem de referência adicionada à biblioteca.");
        void loadBiblioteca(deviceIdForUpload);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Falha ao salvar imagem na biblioteca.";
        notify("error", message);
      }
    },
    [chatDeviceId],
  );

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
    void saveReferenceImageToLibrary(file);
  }, [saveReferenceImageToLibrary]);

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

  const openVideoModal = (
    sourceUrl?: string,
    preferredAspectRatio?: "16:9" | "9:16" | "1:1" | null,
  ) => {
    const targetSource = sourceUrl || preview || produtoPrincipal.preview;
    if (loading) return;
    setIsTopMenuOpen(false);
    if (window.matchMedia("(max-width: 640px)").matches) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setVideoSourceUrl(targetSource || null);
    if (!targetSource) {
      const soraOption = VIDEO_MODEL_OPTIONS.find((option) => option.provider === "sora");
      if (soraOption) {
        setVideoModel(soraOption.value);
      }
    }
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
    videoPreviewAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (!chatDeviceId) {
      notify("error", "Identificador do dispositivo indisponivel.");
      return;
    }
    if (!canGenerateVideoByCredits) {
      notify("error", "Saldo insuficiente. Sao necessarios 2 creditos para gerar video.");
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
      !allowOnScreenText
        ? "sem texto na tela, sem legendas, sem tipografia, sem logotipos, sem marca d'água"
        : "",
    ]
      .filter(Boolean)
      .join(", ");

    try {
      const body: Record<string, unknown> = {
        prompt: finalVideoPrompt,
        model: videoModel,
        aspectRatio: videoAspectRatio,
        resolution: videoResolution,
        durationSeconds: videoDurationSeconds,
        negativePrompt: finalNegativePrompt,
        deviceId: chatDeviceId,
        requestId: createRequestId(),
      };

      if (videoSourceUrl) {
        body.imageUrl = videoSourceUrl.startsWith("blob:")
          ? await blobUrlToDataUrl(videoSourceUrl)
          : videoSourceUrl;
      }

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

  const topMenuTriggerClass = isLightTheme
    ? "inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-sky-400 hover:bg-slate-50"
    : "inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-700/80 bg-gray-900/90 text-gray-100 shadow-lg shadow-black/25 transition hover:border-purple-400/50 hover:bg-gray-800";
  const topMenuOverlayClass = "fixed inset-0 z-80 bg-black/45 backdrop-blur-[1px]";
  const topMenuDrawerClass = isLightTheme
    ? "fixed top-0 right-0 z-90 flex h-screen w-[min(92vw,360px)] flex-col border-l border-slate-200 bg-white text-slate-900 shadow-2xl"
    : "fixed top-0 right-0 z-90 flex h-screen w-[min(92vw,360px)] flex-col border-l border-gray-700 bg-gray-900/98 text-gray-100 shadow-2xl";
  const topMenuCloseButtonClass = isLightTheme
    ? "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
    : "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-200 transition hover:bg-gray-700";
  const topMenuModeButtonClass = isLightTheme
    ? "group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-sky-400 hover:bg-sky-50"
    : "group flex w-full items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/80 px-3 py-3 text-left transition hover:border-purple-400/45 hover:bg-gray-800";
  const topMenuModeButtonActiveClass = isLightTheme
    ? "border-sky-400 bg-sky-50"
    : "border-purple-400/60 bg-purple-500/15";
  const topMenuActionButtonClass = isLightTheme
    ? "inline-flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-sky-400 hover:bg-sky-50"
    : "inline-flex w-full items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/80 px-3 py-2.5 text-sm font-medium text-gray-100 transition hover:border-purple-400/45 hover:bg-gray-800";

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
            <div className={`flex items-center justify-between border-b px-4 py-4 ${isLightTheme ? "border-slate-200" : "border-gray-700"}`}>
              <p className={`text-sm font-semibold ${isLightTheme ? "text-slate-900" : "text-gray-100"}`}>Acesso rapido</p>
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
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isLightTheme
                      ? "border border-slate-300 bg-slate-100 text-sky-700"
                      : "border border-gray-700 bg-gray-800 text-purple-200"
                  }`}
                >
                  <SiOpenai className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${isLightTheme ? "text-slate-900" : "text-gray-100"}`}>ChatGPT</span>
                  <span className={`block truncate text-[11px] ${isLightTheme ? "text-slate-500" : "text-gray-400"}`}>Modelo: gpt-5.2</span>
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
                  <span className={`block text-sm font-semibold ${isLightTheme ? "text-slate-900" : "text-gray-100"}`}>Image Designer Pro</span>
                  <span className={`block truncate text-[11px] ${isLightTheme ? "text-slate-500" : "text-gray-400"}`}>
                    Modelo: {selectedImageModelLabel}
                  </span>
                </span>
              </Link>

              <button type="button" onClick={toggleTheme} className={topMenuActionButtonClass}>
                {isLightTheme ? "Tema escuro" : "Tema claro"}
              </button>

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
    <div
      className={`min-h-screen [&_button:enabled]:cursor-pointer [&_a]:cursor-pointer ${
        isLightTheme
          ? "bg-linear-to-br from-slate-100 via-violet-50 to-fuchsia-50 text-slate-900"
          : "bg-gray-900 text-white"
      }`}
    >
      {topActionMenu}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {toastState ? (
          <div
            className={`fixed top-4 right-4 z-70 rounded-lg border px-4 py-2 text-sm font-medium shadow-xl ${
              toastState.type === "success"
                ? isLightTheme
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-emerald-400/50 bg-emerald-900/90 text-emerald-100"
                : isLightTheme
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-red-400/50 bg-red-900/90 text-red-100"
            }`}
          >
            {toastState.message}
          </div>
        ) : null}

        <header className={`relative mb-6 overflow-hidden rounded-3xl p-6 sm:p-8 ${
          isLightTheme
            ? "border border-slate-200 bg-linear-to-br from-white via-sky-50 to-cyan-50"
            : "border border-cyan-500/20 bg-linear-to-br from-gray-900 via-slate-900 to-gray-900"
        }`}>
          <div className={`absolute -top-16 -right-10 h-44 w-44 rounded-full blur-3xl ${isLightTheme ? "bg-sky-300/30" : "bg-cyan-500/20"}`} />
          <div className={`absolute -bottom-20 left-1/3 h-56 w-56 rounded-full blur-3xl ${isLightTheme ? "bg-cyan-200/40" : "bg-blue-500/10"}`} />

          <div className="flex items-center justify-between gap-3">
            <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
              isLightTheme
                ? "border border-sky-300 bg-sky-100 text-sky-800"
                : "border border-cyan-400/30 bg-cyan-500/10 text-cyan-300"
            }`}>
              <MdRocketLaunch className="h-4 w-4" />
              Image Creator
            </p>
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${
              isLightTheme
                ? "border border-amber-300 bg-amber-100 text-amber-900"
                : "border border-amber-300/55 bg-amber-400/20 text-amber-100"
            }`}>
              <FaCoins className={isLightTheme ? "text-amber-600" : "text-amber-300"} />
              Créditos: {creditsLoading && creditsBalance === null ? "..." : creditsBalance ?? "--"}
            </span>
          </div>

          <div className="mt-5 flex items-start gap-3">
            <div className="flex items-center gap-3">
              <SiOpenai className={`h-9 w-9 ${isLightTheme ? "text-sky-700" : "text-purple-300"}`} />
              <h1 className={`text-2xl font-bold leading-tight sm:text-4xl ${isLightTheme ? "text-slate-900" : "text-white"}`}>
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
                    ? isLightTheme
                      ? "border-sky-400 bg-linear-to-br from-sky-100 via-white to-cyan-100"
                      : "border-purple-300 bg-linear-to-br from-gray-700/95 via-gray-700/90 to-slate-700/85"
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
                        <div className="w-full max-w-sm space-y-3 px-6">
                          <Skeleton rounded="full" className="mx-auto h-14 w-14" />
                          <Skeleton className="h-4 w-2/3 mx-auto" />
                          <Skeleton className="h-3 w-1/2 mx-auto" />
                        </div>
                      ) : (
                        <>
                          <span
                            className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${
                              isLightTheme
                                ? "border border-slate-400 bg-slate-200"
                                : "border border-purple-300/35 bg-purple-500/15"
                            }`}
                          >
                            <FiUploadCloud className={`text-3xl ${isLightTheme ? "text-slate-700" : "text-purple-200"}`} />
                          </span>
                          <span className={`font-medium ${isLightTheme ? "text-slate-900" : "text-white"}`}>Clique ou arraste a imagem aqui</span>
                          <span className={`text-xs ${isLightTheme ? "text-slate-600" : "text-gray-300"}`}>JPG, PNG, WEBP (opcional)</span>
                        </>
                      )}
                    </>
                  )}
                </label>
              </div>

              {produtoPrincipal.file ? (
                <p className={`mt-3 text-center text-xs ${isLightTheme ? "text-slate-600" : "text-gray-400"}`}>
                  Imagem selecionada: <strong>{produtoPrincipal.file.name}</strong>
                </p>
              ) : (
                <p className={`mt-3 text-center text-xs ${isLightTheme ? "text-slate-600" : "text-gray-400"}`}>
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
                        const selectedOption = imageSizeOptions.find(
                          (option) => option.value === nextSize,
                        );
                        if (selectedOption?.videoAspectRatio) {
                          setVideoAspectRatio(selectedOption.videoAspectRatio);
                        }
                      }}
                      className={selectClass}
                      disabled={loading}
                    >
                      {imageSizeOptions.map((option) => (
                        <option key={`image-size-${option.value}`} value={option.value}>
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
                  className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isLightTheme
                      ? "border border-purple-800 bg-purple-800 text-white hover:bg-purple-700"
                      : "border border-purple-400/45 bg-purple-500/25 text-purple-100 hover:bg-purple-500/35"
                  }`}
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
                  disabled={loading || !canGenerateVideoByCredits}
                  className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isLightTheme
                      ? "border border-cyan-800 bg-cyan-800 text-white hover:bg-cyan-700"
                      : "border border-cyan-400/45 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30"
                  }`}
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
              <span className="inline-flex h-8 items-center rounded-full border border-gray-600 bg-gray-900/60 px-3 text-xs font-medium text-gray-300">
                Itens: {bibliotecaImageCount + bibliotecaVideoCount} ({bibliotecaImageCount} imagens •{" "}
                {bibliotecaVideoCount} vídeos)
              </span>
              {selectedVideoIdsForMerge.length > 0 ? (
                <span className="inline-flex h-8 items-center rounded-full border border-gray-600 bg-gray-900/60 px-3 text-xs font-medium text-gray-300">
                  Selecionados: {selectedVideoIdsForMerge.length}
                </span>
              ) : null}
              {selectedVideoIdsForMerge.length >= 2 ? (
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
            <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <article
                    key={`biblioteca-skeleton-${index}`}
                    className="space-y-2 rounded-xl border border-gray-700 bg-gray-900/70 p-3"
                  >
                    <Skeleton className="aspect-square w-full bg-gray-700/60" />
                    <Skeleton className="h-3 w-4/5 bg-gray-700/60" />
                    <Skeleton className="h-3 w-3/5 bg-gray-700/60" />
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-8 w-full bg-gray-700/60" />
                      <Skeleton className="h-8 w-full bg-gray-700/60" />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            bibliotecaImageItems.length === 0 && bibliotecaVideoItems.length === 0 ? (
              <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-6 text-center text-sm text-gray-300">
                Nenhum item encontrado.
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBibliotecaActiveTab("images")}
                      className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                        bibliotecaActiveTab === "images"
                          ? isLightTheme
                            ? "border-violet-500 bg-violet-100 text-violet-800"
                            : "border-violet-400/55 bg-violet-500/20 text-violet-100"
                          : isLightTheme
                            ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            : "border-gray-600 bg-gray-900/70 text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      Imagens ({bibliotecaImageCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBibliotecaActiveTab("videos")}
                      className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                        bibliotecaActiveTab === "videos"
                          ? isLightTheme
                            ? "border-cyan-500 bg-cyan-100 text-cyan-800"
                            : "border-cyan-400/55 bg-cyan-500/20 text-cyan-100"
                          : isLightTheme
                            ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            : "border-gray-600 bg-gray-900/70 text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      Vídeos ({bibliotecaVideoCount})
                    </button>
                  </div>

                  {bibliotecaActiveTab === "images" ? (
                  <section>
                    <div className="mb-2 flex items-center justify-between">
                      <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${isLightTheme ? "text-violet-700" : "text-violet-200"}`}>
                        Imagens
                      </p>
                      <span className={`text-[11px] ${isLightTheme ? "text-slate-600" : "text-gray-400"}`}>
                        {bibliotecaImageCount} itens
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {bibliotecaImageItems.map((feedItem) => (
                    <article
                      key={`image-${feedItem.item.id}`}
                      className={`rounded-xl p-3 ${
                        isLightTheme
                          ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                          : "border border-gray-700 bg-gray-900/70"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setBibliotecaLightboxItem({
                            type: "image",
                            url: feedItem.item.imageUrl,
                            title: feedItem.item.prompt || "Imagem gerada",
                            previewUrl: feedItem.item.thumbnailUrl || feedItem.item.imageUrl,
                          })
                        }
                        className="relative w-full cursor-pointer overflow-hidden rounded-md bg-black"
                      >
                        <img
                          src={feedItem.item.thumbnailUrl || feedItem.item.imageUrl}
                          alt={feedItem.item.prompt || "Imagem gerada"}
                          className="h-auto w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </button>

                      <p className={`mt-2 line-clamp-2 text-[11px] ${isLightTheme ? "text-slate-800" : "text-gray-300"}`}>{feedItem.caption}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                          isLightTheme
                            ? "border border-slate-300 bg-slate-100 text-slate-800"
                            : "border border-cyan-400/35 bg-cyan-500/10 text-cyan-200"
                        }`}>
                          {feedItem.item.model}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                          isLightTheme
                            ? "border border-slate-300 bg-slate-100 text-slate-700"
                            : "border border-gray-600 bg-gray-800/70 text-gray-300"
                        }`}>
                          {formatDatePtBr(feedItem.item.createdAt)}
                        </span>
                      </div>

                      <div className="relative mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setFeedActionMenuId((current) =>
                              current === `image:${feedItem.item.id}` ? null : `image:${feedItem.item.id}`,
                            )
                          }
                          className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition ${
                            isLightTheme
                              ? "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
                              : "border border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700"
                          }`}
                          aria-label="Abrir ações da imagem"
                        >
                          <MdMoreVert />
                        </button>
                        {feedActionMenuId === `image:${feedItem.item.id}` ? (
                          <div
                            className={`absolute top-9 right-0 z-20 w-44 rounded-md p-1.5 shadow-xl ${
                              isLightTheme
                                ? "border border-slate-300 bg-white"
                                : "border border-gray-600 bg-gray-900/98"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setFeedActionMenuId(null);
                                downloadBibliotecaImage(feedItem.item);
                              }}
                              disabled={deletingMediaIds.includes(`image:${feedItem.item.id}`)}
                              className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                isLightTheme
                                  ? "text-slate-800 hover:bg-slate-100"
                                  : "text-gray-200 hover:bg-gray-800"
                              }`}
                            >
                              <FaDownload className="text-[11px]" />
                              Baixar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFeedActionMenuId(null);
                                openVideoModal(
                                  feedItem.item.imageUrl,
                                  resolveAspectRatioFromImageSize(feedItem.item.size),
                                );
                              }}
                              disabled={deletingMediaIds.includes(`image:${feedItem.item.id}`)}
                              className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                isLightTheme
                                  ? "text-slate-800 hover:bg-slate-100"
                                  : "text-cyan-100 hover:bg-cyan-500/20"
                              }`}
                            >
                              <FaVideo className="text-[11px]" />
                              Gerar vídeo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFeedActionMenuId(null);
                                openDeleteModalForImage(feedItem.item);
                              }}
                              disabled={deletingMediaIds.includes(`image:${feedItem.item.id}`)}
                              className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                isLightTheme
                                  ? "text-red-700 hover:bg-red-50"
                                  : "text-red-100 hover:bg-red-500/20"
                              }`}
                            >
                              <FaTimes className="text-[11px]" />
                              {deletingMediaIds.includes(`image:${feedItem.item.id}`) ? "Excluindo..." : "Excluir"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                      ))}
                    </div>
                    {hasMoreBibliotecaImageItems ? (
                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={() => void loadBiblioteca(chatDeviceId, { append: true, tab: "images" })}
                          disabled={bibliotecaLoadingMoreTab === "images" || !chatDeviceId}
                          className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition ${
                            isLightTheme
                              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              : "border-gray-600 bg-gray-900/70 text-gray-200 hover:bg-gray-800"
                          }`}
                        >
                          {bibliotecaLoadingMoreTab === "images"
                            ? "Carregando..."
                            : "Carregar mais imagens"}
                        </button>
                      </div>
                    ) : null}
                  </section>
                  ) : (
                  <section>
                    <div className="mb-2 flex items-center justify-between">
                      <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${isLightTheme ? "text-cyan-700" : "text-cyan-200"}`}>
                        Vídeos
                      </p>
                      <span className={`text-[11px] ${isLightTheme ? "text-slate-600" : "text-gray-400"}`}>
                        {bibliotecaVideoCount} itens
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {bibliotecaVideoItems.map((feedItem) => (
                      <article
                        key={`video-${feedItem.item.id}`}
                        className={`rounded-xl p-3 ${
                          isLightTheme
                            ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                            : "border border-gray-700 bg-gray-900/70"
                        }`}
                      >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                          isLightTheme
                            ? "border border-slate-300 bg-slate-100 text-slate-800"
                            : "border border-white/20 bg-black/35 text-gray-100"
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedVideoIdsForMerge.includes(feedItem.item.id)}
                            onChange={() => toggleVideoSelectionForMerge(feedItem.item.id)}
                            disabled={deletingMediaIds.includes(`video:${feedItem.item.id}`)}
                            className="h-3.5 w-3.5 cursor-pointer accent-cyan-500"
                          />
                          Selecionar
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setFeedActionMenuId((current) =>
                                current === `video:${feedItem.item.id}` ? null : `video:${feedItem.item.id}`,
                              )
                            }
                            className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition ${
                              isLightTheme
                                ? "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
                                : "border border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700"
                            }`}
                            aria-label="Abrir ações do vídeo"
                          >
                            <MdMoreVert />
                          </button>
                          {feedActionMenuId === `video:${feedItem.item.id}` ? (
                            <div
                              className={`absolute top-9 right-0 z-20 w-40 rounded-md p-1.5 shadow-xl ${
                                isLightTheme
                                  ? "border border-slate-300 bg-white"
                                  : "border border-gray-600 bg-gray-900/98"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setFeedActionMenuId(null);
                                  downloadBibliotecaVideo(feedItem.item);
                                }}
                                disabled={deletingMediaIds.includes(`video:${feedItem.item.id}`)}
                                className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  isLightTheme
                                    ? "text-slate-800 hover:bg-slate-100"
                                    : "text-gray-200 hover:bg-gray-800"
                                }`}
                              >
                                <FaDownload className="text-[11px]" />
                                Baixar vídeo
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFeedActionMenuId(null);
                                  openDeleteModalForVideo(feedItem.item);
                                }}
                                disabled={deletingMediaIds.includes(`video:${feedItem.item.id}`)}
                                className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  isLightTheme
                                    ? "text-red-700 hover:bg-red-50"
                                    : "text-red-100 hover:bg-red-500/20"
                                }`}
                              >
                                <FaTimes className="text-[11px]" />
                                {deletingMediaIds.includes(`video:${feedItem.item.id}`) ? "Excluindo..." : "Excluir"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setBibliotecaLightboxItem({
                            type: "video",
                            url: feedItem.item.videoUrl,
                            title: `Vídeo ${feedItem.item.id}`,
                          })
                        }
                        className="relative w-full cursor-pointer overflow-hidden rounded-md bg-black"
                      >
                        <video
                          ref={(node) => setFeedVideoRef(feedItem.item.id, node)}
                          data-feed-video-id={feedItem.item.id}
                          src={feedItem.item.videoUrl}
                          preload="metadata"
                          poster={feedItem.item.sourceImageThumbnailUrl || undefined}
                          muted
                          playsInline
                          loop
                          className="h-auto w-full object-cover"
                        />
                      </button>

                      <p className={`mt-2 line-clamp-2 text-[11px] ${isLightTheme ? "text-slate-800" : "text-gray-300"}`}>{feedItem.caption}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                          isLightTheme
                            ? "border border-slate-300 bg-slate-100 text-slate-800"
                            : "border border-cyan-400/35 bg-cyan-500/10 text-cyan-200"
                        }`}>
                          {feedItem.item.model}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                          isLightTheme
                            ? "border border-slate-300 bg-slate-100 text-slate-700"
                            : "border border-gray-600 bg-gray-800/70 text-gray-300"
                        }`}>
                          {feedItem.item.resolution} • {feedItem.item.aspectRatio} •{" "}
                          {feedItem.item.durationSeconds}s
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                          isLightTheme
                            ? "border border-slate-300 bg-slate-100 text-slate-700"
                            : "border border-gray-600 bg-gray-800/70 text-gray-300"
                        }`}>
                          {formatDatePtBr(feedItem.item.createdAt)}
                        </span>
                      </div>

                      </article>
                      ))}
                    </div>
                    {hasMoreBibliotecaVideoItems ? (
                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={() => void loadBiblioteca(chatDeviceId, { append: true, tab: "videos" })}
                          disabled={bibliotecaLoadingMoreTab === "videos" || !chatDeviceId}
                          className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition ${
                            isLightTheme
                              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              : "border-gray-600 bg-gray-900/70 text-gray-200 hover:bg-gray-800"
                          }`}
                        >
                          {bibliotecaLoadingMoreTab === "videos"
                            ? "Carregando..."
                            : "Carregar mais vídeos"}
                        </button>
                      </div>
                    ) : null}
                  </section>
                  )}
                </div>
              </>
            )
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
          className="fixed inset-0 z-120 flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm"
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
                  className="mx-auto h-[75vh] w-full object-contain"
                />
              ) : (
                <div className="relative mx-auto h-[75vh] w-full overflow-hidden">
                  {bibliotecaLightboxItem.previewUrl ? (
                    <img
                      src={bibliotecaLightboxItem.previewUrl}
                      alt=""
                      aria-hidden="true"
                      className={`absolute inset-0 h-full w-full scale-105 object-contain blur-xl transition-opacity duration-200 ${
                        bibliotecaLightboxImageLoaded ? "opacity-0" : "opacity-100"
                      }`}
                    />
                  ) : null}
                  <img
                    src={bibliotecaLightboxItem.url}
                    alt={bibliotecaLightboxItem.title}
                    onLoad={() => setBibliotecaLightboxImageLoaded(true)}
                    onError={() => setBibliotecaLightboxImageLoaded(true)}
                    className={`relative mx-auto h-full w-full object-contain transition-opacity duration-200 ${
                      bibliotecaLightboxImageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
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
              <div
                className={`grid grid-cols-1 gap-4 ${
                  shouldShowVideoPreviewPanel ? "xl:grid-cols-[420px_minmax(0,1fr)]" : ""
                }`}
              >
                {shouldShowVideoPreviewPanel ? (
                  <div ref={videoPreviewAnchorRef} className="rounded-xl border border-gray-700/70 bg-gray-800/55 p-4">
                    <p className={fieldLabelClass}>{videoResult ? "Vídeo gerado" : "Preview da imagem"}</p>

                    <div
                      className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-gray-700 bg-black/80"
                      style={{ aspectRatio: selectedVideoFormat.previewAspectRatio }}
                    >
                    {videoResult ? (
                      <video controls src={videoResult} className="h-full w-full object-cover" />
                    ) : videoSourceUrl ? (
                      <img
                        src={videoSourceUrl}
                          alt="Preview da imagem para geração de vídeo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <p className="px-4 text-center text-sm text-gray-300">
                          A prévia será exibida quando a geração iniciar.
                        </p>
                      )}
                      {videoLoading ? (
                        <div className="pointer-events-none absolute inset-0 bg-black/80" />
                      ) : null}
                      {videoLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35 px-4 text-center text-gray-100 backdrop-blur-[1px]">
                          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                          <p className="text-sm">
                            Processando no {selectedVideoModelOption.provider === "sora" ? "Sora" : "Veo"}. Isso pode levar alguns minutos.
                          </p>
                        </div>
                      ) : null}
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
                ) : null}

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div className="space-y-4 rounded-xl border border-gray-700/70 bg-gray-800/55 p-4">
                      <div>
                        <label className={fieldLabelClass}>Modelo de vídeo</label>
                        <div className={selectWrapperClass}>
                          <select
                            value={videoModel}
                            onChange={(e) => {
                              const nextModel = e.target.value;
                              const nextOption =
                                VIDEO_MODEL_OPTIONS.find((option) => option.value === nextModel) ||
                                VIDEO_MODEL_OPTIONS[0];
                              setVideoModel(nextModel);
                              setVideoDurationSeconds(nextOption.defaultDuration);
                              setVideoResolution(nextOption.defaultResolution);
                            }}
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
                        <div className={selectWrapperClass}>
                          <select
                            value={videoResolution}
                            onChange={(e) => setVideoResolution(e.target.value)}
                            className={selectClass}
                            disabled={videoLoading}
                          >
                            {selectedVideoModelOption.allowedResolutions.map((resolution) => (
                              <option key={`${selectedVideoModelOption.value}-${resolution}`} value={resolution}>
                                {resolution}
                              </option>
                            ))}
                          </select>
                          <FaChevronDown className={selectIconClass} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-700/70 bg-gray-800/55 p-4">
                      <label className={fieldLabelClass}>Formato para redes</label>
                      <div className="rounded-xl border border-cyan-400/45 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                        {availableVideoFormatOptions.find((option) => option.value === videoAspectRatio)?.label ||
                          "Formato selecionado"}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {availableVideoFormatOptions.map((option) => (
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
                      <div className={selectWrapperClass}>
                        <select
                          value={String(videoDurationSeconds)}
                          onChange={(e) => setVideoDurationSeconds(Number(e.target.value))}
                          className={selectClass}
                          disabled={videoLoading}
                        >
                          {selectedVideoModelOption.allowedDurations.map((seconds) => (
                            <option key={seconds} value={seconds}>
                              {seconds}s
                            </option>
                          ))}
                        </select>
                        <FaChevronDown className={selectIconClass} />
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Opções compatíveis com o modelo selecionado.
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

                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700/80 bg-gray-900/95 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeVideoModal}
                  className="inline-flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-3 text-sm font-medium text-gray-200 transition hover:bg-gray-700 sm:min-w-36.25 sm:flex-none sm:px-4"
                >
                  <FaTimes className="text-xs" />
                  {videoLoading ? "Cancelar" : "Fechar"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={videoLoading || !canGenerateVideoByCredits}
                  className="inline-flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-400/45 bg-cyan-500/25 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-36.25 sm:flex-none sm:px-4"
                >
                  <FaVideo />
                  {videoLoading ? "Gerando vídeo..." : `Gerar vídeo (-${VIDEO_GENERATION_CREDIT_COST} créditos)`}
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

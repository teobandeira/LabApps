"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaRobot,
  FaExchangeAlt,
  FaDownload,
  FaPlus,
  FaVideo,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaImage,
  FaPlay,
  FaPause,
  FaVolumeMute,
  FaVolumeUp,
  FaStar,
  FaRegStar,
} from "react-icons/fa";
import { FiUploadCloud } from "react-icons/fi";

import MenuLateral from "./components/MenuLateral";

interface AmbientadorItem {
  file: File | null;
  preview: string | null;
}

type BibliotecaItem = {
  id: number;
  url: string;
  pathname: string;
  thumbUrl: string;
  model: string;
  mediaType?: "image" | "video";
  createdAt: string;
  createdBy?: { id: number; name: string; email: string } | null;
};

type BibliotecaFiltro = "image" | "video";
type VideoProvider = "veo" | "sora";
type SocialFormatValue = (typeof SOCIAL_FORMAT_OPTIONS)[number]["value"];
type MediaDimensions = { width: number; height: number };
type ToastVariant = "success" | "error" | "info";
type ToastState = { type: ToastVariant; message: string } | null;
type LocalToast = ((message: string) => void) & {
  success: (message: string) => void;
  error: (message: string) => void;
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

const VIDEO_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mpeg",
  ".mpg",
  ".m4v",
];

const SOCIAL_FORMAT_OPTIONS = [
  {
    value: "9:16",
    label: "Story/Reels",
    details: "1080x1920 (vertical)",
  },
  {
    value: "16:9",
    label: "Feed",
    details: "1920x1080 (paisagem)",
  },
] as const;

const VIDEO_MODEL_OPTIONS: VideoModelOption[] = [
  {
    value: "sora-2",
    label: "Sora 2",
    provider: "sora",
    allowedDurations: [8],
    allowedResolutions: ["720p"],
    defaultDuration: 8,
    defaultResolution: "720p",
  },
  {
    value: "sora-2-pro",
    label: "Sora 2 Pro",
    provider: "sora",
    allowedDurations: [8, 12],
    allowedResolutions: ["720p", "1080p"],
    defaultDuration: 8,
    defaultResolution: "1080p",
  },
];

const EMBEDDED_GRID_PAGE_SIZE = 4;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LATEST_GPT_IMAGE_MODEL = "gpt-image-1.5";
const VIDEO_PROMPT_PTBR_GUARDRAIL =
  "Idioma obrigatório: português do Brasil (pt-BR). Se houver qualquer texto, título, legenda ou narração, usar somente português do Brasil.";
const VIDEO_PROMPT_GUARDRAIL =
  "Regras obrigatórias: preserve exatamente a forma, proporções, rótulo e identidade visual do produto, sem deformar, sem redesenhar e sem alterar a embalagem. Não inserir legendas, textos, tipografia, logotipos ou marcas d'água, a menos que isso seja solicitado explicitamente no prompt.";
const VIDEO_PROMPT_SORA_QUALITY_GUARDRAIL =
  "Qualidade obrigatória: vídeo limpo e estável, sem chiado/ruído visual, sem granulação excessiva, sem flicker e sem artefatos de compressão.";
const AMBIENTADOR_DEFAULT_PERSONALIZED_PROMPT =
  "Ambientação premium de estúdio, produto central em destaque, luz suave e sombras realistas.";

function promptRequestsOnScreenText(prompt: string) {
  const normalized = prompt.toLowerCase();
  return /(legenda|legendas|texto|textos|caption|captions|subtitle|subtitles|title|titulo|título|tipografia|typography|logo|logotipo|marca d[’']água|watermark)/i.test(
    normalized,
  );
}

function getVideoModelOption(model: string) {
  return VIDEO_MODEL_OPTIONS.find((option) => option.value === model) || VIDEO_MODEL_OPTIONS[0];
}

function getVideoProviderLabel(model: string) {
  return getVideoModelOption(model).provider === "sora" ? "Sora" : "Veo";
}

function isVideoItem(item: BibliotecaItem) {
  if (item.mediaType) {
    return item.mediaType === "video";
  }

  const source = `${item.pathname || ""} ${item.url || ""}`.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => source.includes(ext));
}

function getFileNameFromItem(item: BibliotecaItem) {
  const pathnameParts = item.pathname?.split("/") ?? [];
  const originalName = pathnameParts[pathnameParts.length - 1];

  if (originalName && originalName.includes(".")) {
    return originalName;
  }

  const urlParts = item.url.split("?");
  const cleanUrl = urlParts[0];
  const lastUrlPart = cleanUrl.split("/").pop();

  if (lastUrlPart && lastUrlPart.includes(".")) {
    return lastUrlPart;
  }

  return `ambientador-${item.id}.png`;
}

function formatBibliotecaDateTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatModelLabel(model?: string | null) {
  if (!model) return "--";
  if (model === "nano_banana") return "Nano Banana";
  if (model === "gpt_image") return "GPT-Image";
  if (model === "veo-3.1-generate-preview") return "Veo 3.1 Standard";
  if (model === "veo-3.1-fast-generate-preview") return "Veo 3.1 Fast";
  if (model === "sora-2") return "Sora 2";
  if (model === "sora-2-pro") return "Sora 2 Pro";
  return model;
}

function sortBibliotecaByNewest(items: BibliotecaItem[]) {
  return [...items].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (Number.isNaN(timeA) || Number.isNaN(timeB)) return b.id - a.id;
    return timeB - timeA;
  });
}

function formatBytes(value?: number | null) {
  if (!Number.isFinite(value) || value === null || value === undefined || value < 0) {
    return "—";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

function simplifyAspectRatio(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(width), Math.round(height));
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function formatLabelFromMediaDimensions(dimensions?: MediaDimensions) {
  if (!dimensions) return "Formato";
  const isStory = dimensions.height > dimensions.width;
  const ratio = simplifyAspectRatio(dimensions.width, dimensions.height);
  if (!ratio) return isStory ? "Story" : "Feed";
  return `${isStory ? "Story" : "Feed"} ${ratio}`;
}

async function parseJsonSafe(response: Response) {
  const rawBody = await response.text();
  if (!rawBody) return null;
  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function Page() {
  const [settings, setSettings] = useState({
    versao_gpt_image: "",
    versao_nano_banana: "",
  });
  const [appLoading, setAppLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [ambientacaoLightboxOpen, setAmbientacaoLightboxOpen] = useState(false);

  const [produtoPrincipal, setProdutoPrincipal] = useState<AmbientadorItem>({
    file: null,
    preview: null,
  });
  const [model, setModel] = useState("nano_banana");

  const [loading, setLoading] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [videoSourceUrl, setVideoSourceUrl] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState(
    "Transforme esta ambientação em um vídeo publicitário com movimento suave de câmera, foco no produto principal, iluminação realista e preservação total da forma original do produto.",
  );
  const [videoNegativePrompt, setVideoNegativePrompt] = useState("");
  const [videoModel, setVideoModel] = useState<string>(
    VIDEO_MODEL_OPTIONS[0].value,
  );
  const [videoResolution, setVideoResolution] = useState<string>(
    VIDEO_MODEL_OPTIONS[0].defaultResolution,
  );
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>(
    SOCIAL_FORMAT_OPTIONS[0].value,
  );
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number>(
    VIDEO_MODEL_OPTIONS[0].defaultDuration,
  );
  const [videoErrorMessage, setVideoErrorMessage] = useState<string | null>(null);
  const [promptPersonalizado, setPromptPersonalizado] = useState(
    AMBIENTADOR_DEFAULT_PERSONALIZED_PROMPT,
  );

  const [bibliotecaItems, setBibliotecaItems] = useState<BibliotecaItem[]>([]);
  const [bibliotecaCursor, setBibliotecaCursor] = useState<number | null>(null);
  const [bibliotecaLoading, setBibliotecaLoading] = useState(false);
  const [bibliotecaLoadedOnce, setBibliotecaLoadedOnce] = useState(false);
  const [bibliotecaLoadError, setBibliotecaLoadError] = useState<string | null>(
    null,
  );
  const [bibliotecaCounts, setBibliotecaCounts] = useState({
    image: 0,
    video: 0,
  });
  const [bibliotecaFiltro, setBibliotecaFiltro] = useState<BibliotecaFiltro>("image");
  const [bibliotecaFavoritosIds, setBibliotecaFavoritosIds] = useState<number[]>(
    [],
  );
  const [bibliotecaMostrarSomenteFavoritos, setBibliotecaMostrarSomenteFavoritos] =
    useState(false);
  const [bibliotecaSelectedIndex, setBibliotecaSelectedIndex] = useState<
    number | null
  >(null);
  const [bibliotecaVideoSelecionadosIds, setBibliotecaVideoSelecionadosIds] =
    useState<number[]>([]);
  const [bibliotecaDownloadingId, setBibliotecaDownloadingId] = useState<
    number | null
  >(null);
  const [videoPreviewReadyById, setVideoPreviewReadyById] = useState<
    Record<number, boolean>
  >({});
  const [videoPreviewErrorById, setVideoPreviewErrorById] = useState<
    Record<number, boolean>
  >({});
  const [videoPreviewPlayingById, setVideoPreviewPlayingById] = useState<
    Record<number, boolean>
  >({});
  const [videoPreviewMutedById, setVideoPreviewMutedById] = useState<
    Record<number, boolean>
  >({});
  const [bibliotecaMediaDimensionsById, setBibliotecaMediaDimensionsById] =
    useState<Record<number, MediaDimensions>>({});
  const videoPreviewRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const videoRequestAbortRef = useRef<AbortController | null>(null);
  const videoMergeRequestAbortRef = useRef<AbortController | null>(null);
  const [videoMergeModalOpen, setVideoMergeModalOpen] = useState(false);
  const [videoMergeKeepAudio, setVideoMergeKeepAudio] = useState(true);
  const [videoMergeAspectRatio, setVideoMergeAspectRatio] =
    useState<SocialFormatValue>(SOCIAL_FORMAT_OPTIONS[0].value);
  const [videoMergeDraggingId, setVideoMergeDraggingId] = useState<number | null>(
    null,
  );
  const [videoMergeDragOverId, setVideoMergeDragOverId] = useState<number | null>(
    null,
  );
  const [videoMergeEstimating, setVideoMergeEstimating] = useState(false);
  const [videoMergeLoading, setVideoMergeLoading] = useState(false);
  const [videoMergeDownloading, setVideoMergeDownloading] = useState(false);
  const [videoMergeErrorMessage, setVideoMergeErrorMessage] = useState<
    string | null
  >(null);
  const [videoMergeEstimatedSizeBytes, setVideoMergeEstimatedSizeBytes] =
    useState<number | null>(null);
  const [videoMergeSourceTotalBytes, setVideoMergeSourceTotalBytes] = useState<
    number | null
  >(null);
  const [videoMergeResultUrl, setVideoMergeResultUrl] = useState<string | null>(
    null,
  );
  const [videoMergeResultSizeBytes, setVideoMergeResultSizeBytes] = useState<
    number | null
  >(null);
  const [toastState, setToastState] = useState<ToastState>(null);
  const [isMainDropzoneActive, setIsMainDropzoneActive] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const selectedVideoModelOption = getVideoModelOption(videoModel);
  const selectedVideoProviderLabel = getVideoProviderLabel(videoModel);
  const isSoraSelected = selectedVideoModelOption.provider === "sora";

  const showToast = useCallback((type: ToastVariant, message: string) => {
    setToastState({ type, message });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastState(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

  const toast = useMemo<LocalToast>(() => {
    const notify = ((message: string) => showToast("info", message)) as LocalToast;
    notify.success = (message: string) => showToast("success", message);
    notify.error = (message: string) => showToast("error", message);
    return notify;
  }, [showToast]);

  const sectionCardClass =
    "rounded-2xl border border-gray-700/80 bg-linear-to-br from-gray-900/80 via-slate-900/70 to-gray-950/70 p-4 sm:p-5";
  const fieldLabelClass =
    "block pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300";
  const inputClass =
    "w-full rounded-xl border border-gray-700/90 bg-gray-900/85 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 transition focus:border-purple-400/60 focus:outline-none focus:ring-4 focus:ring-purple-500/15";
  const textareaClass =
    "w-full rounded-xl border border-gray-700/90 bg-gray-900/85 p-3 text-sm text-gray-100 placeholder-gray-500 transition focus:border-purple-400/60 focus:outline-none focus:ring-4 focus:ring-purple-500/15";
  const selectClass =
    "w-full appearance-none rounded-xl border border-gray-600/90 bg-linear-to-b from-gray-800/95 to-gray-900/95 px-3 py-2.5 pr-10 text-sm font-medium text-gray-100 [color-scheme:dark] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_30px_rgba(0,0,0,0.25)] transition focus:border-cyan-400/60 focus:outline-none focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-70 [&>option]:bg-gray-900 [&>option]:text-gray-100 [&>option:checked]:bg-cyan-900/70";
  const selectOptionClass = "bg-gray-900 text-gray-100";
  const selectWrapperClass = "relative";
  const selectIconClass =
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400";
  const mainDropzoneClass =
    "relative flex w-full min-h-[224px] flex-1 items-center justify-center rounded-2xl border border-dashed border-purple-500/70 bg-linear-to-br from-gray-800/90 via-gray-800/85 to-slate-800/80 p-6 text-center transition hover:border-purple-400 hover:from-gray-700/90 hover:to-slate-700/80";
  const accessoryDropzoneClass =
    "w-full rounded-xl border border-dashed border-gray-600/90 bg-gray-800/85 p-4 text-center transition hover:border-purple-400/60 hover:bg-gray-800";

  const bibliotecaFiltrada = useMemo(() => {
    if (!bibliotecaMostrarSomenteFavoritos) return bibliotecaItems;
    const favoritos = new Set(bibliotecaFavoritosIds);
    return bibliotecaItems.filter((item) => favoritos.has(item.id));
  }, [
    bibliotecaItems,
    bibliotecaFavoritosIds,
    bibliotecaMostrarSomenteFavoritos,
  ]);
  const bibliotecaVideosSelecionados = useMemo(() => {
    const itemsById = new Map(bibliotecaItems.map((item) => [item.id, item]));
    return bibliotecaVideoSelecionadosIds
      .map((itemId) => itemsById.get(itemId))
      .filter((item): item is BibliotecaItem => {
        if (!item) return false;
        return isVideoItem(item);
      });
  }, [bibliotecaItems, bibliotecaVideoSelecionadosIds]);
  const bibliotecaVideosSelecionadosIdsKey = useMemo(
    () => bibliotecaVideosSelecionados.map((item) => item.id).join(","),
    [bibliotecaVideosSelecionados],
  );
  const bibliotecaImageCount = bibliotecaCounts.image;
  const bibliotecaVideoCount = bibliotecaCounts.video;
  const bibliotecaFavoritosCount = useMemo(() => {
    const favoritos = new Set(bibliotecaFavoritosIds);
    return bibliotecaItems.reduce(
      (count, item) => (favoritos.has(item.id) ? count + 1 : count),
      0,
    );
  }, [bibliotecaItems, bibliotecaFavoritosIds]);

  const registerBibliotecaMediaDimensions = (
    itemId: number,
    width: number,
    height: number,
  ) => {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return;
    }

    setBibliotecaMediaDimensionsById((prev) => {
      const current = prev[itemId];
      if (current && current.width === width && current.height === height) {
        return prev;
      }
      return { ...prev, [itemId]: { width, height } };
    });
  };

  const getBibliotecaItemAspectRatio = (
    itemId: number,
    fallback = "1 / 1",
  ) => {
    const dimensions = bibliotecaMediaDimensionsById[itemId];
    if (!dimensions) return fallback;
    return `${dimensions.width} / ${dimensions.height}`;
  };

  useEffect(() => {
    const timer = setTimeout(() => setAppLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/settings");
        const data = await parseJsonSafe(response);
        if (!response.ok || !data || data.error) {
          return;
        }

        setSettings({
          versao_gpt_image: String(data.versao_gpt_image || ""),
          versao_nano_banana: String(data.versao_nano_banana || ""),
        });
      } catch (err) {
        console.error("Erro ao carregar configurações da IA:", err);
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const loadBiblioteca = async (reset = false, filter?: BibliotecaFiltro) => {
    if (bibliotecaLoading) return;
    setBibliotecaLoading(true);

    const targetFilter = filter ?? bibliotecaFiltro;
    const nextCursor = reset ? null : bibliotecaCursor;
    try {
      const params = new URLSearchParams();
      params.set("limit", String(EMBEDDED_GRID_PAGE_SIZE));
      params.set("mediaType", targetFilter);
      if (nextCursor) {
        params.set("cursor", String(nextCursor));
      }

      const res = await fetch(
        `/api/ambientador-produtos/biblioteca?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Falha ao carregar a biblioteca.");
      }

      const data = (await res.json()) as {
        items?: BibliotecaItem[];
        nextCursor?: number | null;
        counts?: { image?: number; video?: number };
      };
      const incomingItems = Array.isArray(data.items) ? data.items : [];

      if (reset) {
        setBibliotecaItems(sortBibliotecaByNewest(incomingItems));
      } else {
        setBibliotecaItems((prev) => {
          const merged = [...prev, ...incomingItems];
          const unique = new Map<number, BibliotecaItem>();
          merged.forEach((item) => unique.set(item.id, item));
          return sortBibliotecaByNewest(Array.from(unique.values()));
        });
      }

      setBibliotecaCursor(
        typeof data.nextCursor === "number" ? data.nextCursor : null,
      );
      setBibliotecaCounts({
        image: Number(data.counts?.image ?? 0),
        video: Number(data.counts?.video ?? 0),
      });
      setBibliotecaLoadError(null);
    } catch {
      setBibliotecaLoadError("Não foi possível carregar a biblioteca.");
      toast.error("Não foi possível carregar a biblioteca.");
    } finally {
      setBibliotecaLoadedOnce(true);
      setBibliotecaLoading(false);
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ambientador:biblioteca:favoritos");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const ids = parsed
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);
      setBibliotecaFavoritosIds(Array.from(new Set(ids)));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "ambientador:biblioteca:favoritos",
      JSON.stringify(bibliotecaFavoritosIds),
    );
  }, [bibliotecaFavoritosIds]);

  useEffect(() => {
    setBibliotecaSelectedIndex(null);
    if (bibliotecaFiltro !== "video") {
      setBibliotecaVideoSelecionadosIds([]);
      setVideoMergeModalOpen(false);
    }
    void loadBiblioteca(true, bibliotecaFiltro);
  }, [bibliotecaFiltro]);

  useEffect(() => {
    if (videoMergeModalOpen) return;
    setBibliotecaVideoSelecionadosIds((prev) =>
      prev.filter((itemId) =>
        bibliotecaItems.some(
          (item) => item.id === itemId && isVideoItem(item),
        ),
      ),
    );
  }, [bibliotecaItems, videoMergeModalOpen]);

  useEffect(() => {
    if (!videoMergeModalOpen) return;
    if (bibliotecaVideosSelecionados.length < 2) {
      setVideoMergeEstimatedSizeBytes(null);
      setVideoMergeSourceTotalBytes(null);
      setVideoMergeErrorMessage("Selecione ao menos 2 vídeos para juntar.");
      return;
    }

    const controller = new AbortController();
    videoMergeRequestAbortRef.current?.abort();
    videoMergeRequestAbortRef.current = controller;
    setVideoMergeEstimating(true);
    setVideoMergeErrorMessage(null);

    void (async () => {
      try {
        const res = await fetch("/api/ambientador-produtos/video/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            videoIds: bibliotecaVideosSelecionados.map((item) => item.id),
            estimateOnly: true,
            preserveAudio: videoMergeKeepAudio,
            aspectRatio: videoMergeAspectRatio,
          }),
        });

        const rawBody = await res.text();
        let data: any = null;
        if (rawBody) {
          data = JSON.parse(rawBody);
        }

        if (!res.ok || data?.error) {
          throw new Error(data?.error || "Falha ao estimar tamanho do vídeo.");
        }

        setVideoMergeEstimatedSizeBytes(
          Number.isFinite(Number(data?.estimated_size_bytes))
            ? Number(data.estimated_size_bytes)
            : null,
        );
        setVideoMergeSourceTotalBytes(
          Number.isFinite(Number(data?.source_total_bytes))
            ? Number(data.source_total_bytes)
            : null,
        );
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return;
        }
        const message =
          error?.message || "Não foi possível calcular o tamanho previsto.";
        setVideoMergeErrorMessage(message);
      } finally {
        if (videoMergeRequestAbortRef.current === controller) {
          videoMergeRequestAbortRef.current = null;
        }
        setVideoMergeEstimating(false);
      }
    })();

    return () => {
      controller.abort();
      if (videoMergeRequestAbortRef.current === controller) {
        videoMergeRequestAbortRef.current = null;
      }
    };
  }, [
    videoMergeModalOpen,
    videoMergeKeepAudio,
    videoMergeAspectRatio,
    bibliotecaVideosSelecionados,
    bibliotecaVideosSelecionadosIdsKey,
  ]);

  useEffect(() => {
    if (bibliotecaSelectedIndex === null) return;
    if (bibliotecaFiltrada.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setBibliotecaSelectedIndex((prevIndex) =>
          prevIndex! > 0 ? prevIndex! - 1 : bibliotecaFiltrada.length - 1,
        );
      }
      if (e.key === "ArrowRight") {
        setBibliotecaSelectedIndex((prevIndex) =>
          prevIndex! < bibliotecaFiltrada.length - 1 ? prevIndex! + 1 : 0,
        );
      }
      if (e.key === "Escape") {
        setBibliotecaSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bibliotecaSelectedIndex, bibliotecaFiltrada.length]);

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
  }, []);

  const handleProdutoPrincipalFile = (
    file: File,
    source: "upload" | "drop" | "paste" = "upload",
  ) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Formato de imagem inválido. Utilize PNG, JPG ou WEBP.");
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
      source === "paste"
        ? "colada"
        : source === "drop"
          ? "arrastada"
          : "carregada";
    toast.success(`Imagem do produto principal ${actionLabel} com sucesso!`);
  };

  const handleGenerate = async () => {
    if (!promptPersonalizado.trim()) {
      toast.error("Por favor, preencha o prompt.");
      return;
    }

    const formData = new FormData();
    formData.append("usarPromptPersonalizado", "1");
    formData.append(
      "promptPersonalizado",
      promptPersonalizado.trim(),
    );

    if (produtoPrincipal.file) {
      formData.append("image", produtoPrincipal.file);
    }
    formData.append("model", model);

    setLoading(true);

    try {
      const endpoint = "/api/ambientador-produtos";

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await parseJsonSafe(res);
      if (!res.ok || !data) {
        throw new Error("Não foi possível gerar a ambientação no momento.");
      }

      if (data.error) {
        toast.error(String(data.error));
        setLoading(false);
        return;
      }

      const generatedImage = String(data.image || "");
      if (!generatedImage) {
        throw new Error("Nenhuma imagem foi retornada pela API.");
      }

      const blobUrl = await saveGeneratedImage(generatedImage);
      if (!blobUrl) {
        toast.error("Erro ao salvar a imagem gerada.");
        setLoading(false);
        return;
      }

      setPreview(blobUrl);
      setProdutoPrincipal((prev) => {
        if (prev.preview?.startsWith("blob:")) {
          URL.revokeObjectURL(prev.preview);
        }
        return {
          ...prev,
          preview: blobUrl,
        };
      });
      setVideoSourceUrl(blobUrl);
      setVideoResult(null);
      toast.success("Ambientação gerada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar a ambientação.");
    } finally {
      setLoading(false);
    }
  };

  const saveGeneratedImage = async (base64Image: string) => {
    const res = await fetch(base64Image);
    const blob = await res.blob();
    const file = new File([blob], `ambientacao-${Date.now()}.jpg`, {
      type: blob.type || "image/jpeg",
    });

    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("model", model);

    const uploadRes = await fetch("/api/blob/upload", {
      method: "POST",
      body: uploadData,
    });

    const data = await uploadRes.json();
    if (data.error) {
      toast.error("Erro ao salvar a imagem gerada.");
      return null;
    }

    return data.url;
  };

  const persistVideoSourceImageIfNeeded = async (sourceUrl: string) => {
    if (!sourceUrl.startsWith("blob:")) {
      return sourceUrl;
    }

    const sourceRes = await fetch(sourceUrl);
    if (!sourceRes.ok) {
      throw new Error("Não foi possível preparar a imagem local para gerar o vídeo.");
    }

    const sourceBlob = await sourceRes.blob();
    const sourceMime = sourceBlob.type || "image/jpeg";
    if (!ALLOWED_IMAGE_TYPES.includes(sourceMime)) {
      throw new Error("Formato de imagem inválido. Utilize PNG, JPG ou WEBP.");
    }

    const extension = sourceMime.includes("png")
      ? "png"
      : sourceMime.includes("webp")
        ? "webp"
        : "jpg";
    const sourceFile = new File(
      [sourceBlob],
      `ambientacao-video-source-${Date.now()}.${extension}`,
      { type: sourceMime },
    );

    const uploadData = new FormData();
    uploadData.append("file", sourceFile);
    uploadData.append("model", videoModel);

    const uploadRes = await fetch("/api/blob/upload", {
      method: "POST",
      body: uploadData,
    });
    const uploadJson = await uploadRes.json();

    if (!uploadRes.ok || uploadJson?.error || !uploadJson?.url) {
      throw new Error("Não foi possível enviar a imagem para gerar o vídeo.");
    }

    const persistedUrl = String(uploadJson.url);
    setVideoSourceUrl(persistedUrl);
    return persistedUrl;
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
    } catch (err) {
      toast.error("Erro ao baixar a imagem.");
    }
  };

  const openVideoModal = (sourceUrl?: string) => {
    const targetSource = sourceUrl || preview;
    if (!targetSource || loading) return;
    setVideoSourceUrl(targetSource);
    setVideoResult(null);
    setVideoErrorMessage(null);
    setVideoModalOpen(true);
  };

  const getVideoFailureMessage = (rawMessage?: string, modelValue = videoModel) => {
    const providerLabel = getVideoProviderLabel(modelValue);
    const original = (rawMessage || "").trim();
    const message = original.toLowerCase();

    if (
      original &&
      !message.includes("http ") &&
      !message.startsWith("falha ao consultar status do vídeo")
    ) {
      return original;
    }

    if (
      message.includes("high demand") ||
      message.includes("try again later") ||
      message.includes("resource_exhausted")
    ) {
      return `O ${providerLabel} está com alta demanda no momento. Tente novamente em instantes.`;
    }
    return `Não foi possível gerar o vídeo com ${providerLabel} agora. Tente novamente em instantes.`;
  };

  const closeVideoModal = () => {
    if (videoLoading) {
      videoRequestAbortRef.current?.abort();
      videoRequestAbortRef.current = null;
      setVideoLoading(false);
      toast("Geração de vídeo cancelada.");
    }
    setVideoModalOpen(false);
  };

  const handleGenerateVideo = async () => {
    if (!videoSourceUrl) {
      toast.error("Gere uma ambientação antes de gerar o vídeo.");
      return;
    }

    if (!videoPrompt.trim()) {
      toast.error("Informe o prompt do vídeo.");
      return;
    }

    if (!videoAspectRatio) {
      toast.error("Escolha o formato de rede social.");
      return;
    }

    if (!selectedVideoModelOption.allowedResolutions.includes(videoResolution)) {
      toast.error(`Resolução inválida para ${selectedVideoProviderLabel}.`);
      return;
    }

    if (!selectedVideoModelOption.allowedDurations.includes(videoDurationSeconds)) {
      toast.error(`Duração inválida para ${selectedVideoProviderLabel}.`);
      return;
    }

    setVideoErrorMessage(null);
    setVideoLoading(true);
    setVideoResult(null);
    const baseVideoPrompt = videoPrompt.trim();
    const allowOnScreenText = promptRequestsOnScreenText(baseVideoPrompt);
    const promptSegments = [
      baseVideoPrompt,
      VIDEO_PROMPT_PTBR_GUARDRAIL,
      VIDEO_PROMPT_GUARDRAIL,
      selectedVideoModelOption.provider === "sora"
        ? VIDEO_PROMPT_SORA_QUALITY_GUARDRAIL
        : "",
    ].filter(Boolean);
    const finalVideoPrompt = promptSegments.join("\n\n");
    const finalNegativePrompt =
      selectedVideoModelOption.provider === "veo"
        ? [
            videoNegativePrompt.trim(),
            !allowOnScreenText
              ? "sem texto na tela, sem legendas, sem tipografia, sem logotipos, sem marca d'água"
              : "",
          ]
            .filter(Boolean)
            .join(", ")
        : "";
    const endpoint = "/api/ambientador-produtos/video";
    const controller = new AbortController();
    videoRequestAbortRef.current = controller;

    try {
      const resolvedVideoSourceUrl = await persistVideoSourceImageIfNeeded(
        videoSourceUrl,
      );
      const body: Record<string, unknown> = {
        imageUrl: resolvedVideoSourceUrl,
        prompt: finalVideoPrompt,
        model: videoModel,
        aspectRatio: videoAspectRatio,
        resolution: videoResolution,
        durationSeconds: videoDurationSeconds,
      };

      if (selectedVideoModelOption.provider === "veo") {
        body.negativePrompt = finalNegativePrompt;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(body),
      });

      const rawBody = await res.text();
      let data: any = null;

      if (rawBody) {
        try {
          data = JSON.parse(rawBody);
        } catch {
          throw new Error(rawBody);
        }
      }

      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Falha ao gerar vídeo.");
      }

      if (data?.video_url) {
        setVideoResult(data.video_url);
        setVideoErrorMessage(null);
        toast.success("Vídeo gerado e salvo na biblioteca!");
        void loadBiblioteca(true);
        return;
      }

      if (data?.video) {
        setVideoResult(data.video);
        setVideoErrorMessage(null);
        toast.error(
          "Vídeo gerado, mas sem URL persistida. Tente novamente em instantes.",
        );
        return;
      }

      throw new Error(`Nenhum vídeo retornado pelo ${selectedVideoProviderLabel}.`);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }

      const friendlyMessage = getVideoFailureMessage(
        err?.message || "Erro ao gerar vídeo.",
        videoModel,
      );
      setVideoErrorMessage(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      if (videoRequestAbortRef.current === controller) {
        videoRequestAbortRef.current = null;
      }
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
    } catch (err) {
      toast.error("Erro ao baixar o vídeo.");
    }
  };

  const toggleVideoPreviewPlay = (itemId: number) => {
    const player = videoPreviewRefs.current[itemId];
    if (!player) return;

    if (player.paused) {
      void player.play().catch(() => {
        setVideoPreviewErrorById((prev) =>
          prev[itemId] ? prev : { ...prev, [itemId]: true },
        );
      });
      return;
    }

    player.pause();
  };

  const toggleVideoPreviewMute = (itemId: number) => {
    const player = videoPreviewRefs.current[itemId];
    if (!player) return;

    setVideoPreviewMutedById((prev) => {
      const nextMuted = !(prev[itemId] ?? true);
      player.muted = nextMuted;
      return { ...prev, [itemId]: nextMuted };
    });
  };

  const toggleBibliotecaVideoSelection = (itemId: number) => {
    setBibliotecaVideoSelecionadosIds((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      }
      return [...prev, itemId];
    });
  };

  const reorderBibliotecaVideosSelecionados = (
    draggedItemId: number,
    targetItemId: number,
  ) => {
    if (draggedItemId === targetItemId) return;

    setBibliotecaVideoSelecionadosIds((prev) => {
      const fromIndex = prev.indexOf(draggedItemId);
      const toIndex = prev.indexOf(targetItemId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const next = [...prev];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggedItemId);
      return next;
    });
  };

  const openVideoMergeModal = () => {
    if (bibliotecaVideosSelecionados.length < 2) {
      toast.error("Selecione ao menos 2 vídeos para juntar.");
      return;
    }
    setVideoMergeErrorMessage(null);
    setVideoMergeResultUrl(null);
    setVideoMergeResultSizeBytes(null);
    setVideoMergeModalOpen(true);
  };

  const closeVideoMergeModal = () => {
    videoMergeRequestAbortRef.current?.abort();
    videoMergeRequestAbortRef.current = null;
    setVideoMergeEstimating(false);
    setVideoMergeLoading(false);
    setVideoMergeDraggingId(null);
    setVideoMergeDragOverId(null);
    setVideoMergeErrorMessage(null);
    setVideoMergeModalOpen(false);
    if (bibliotecaFiltro === "video") {
      void loadBiblioteca(true, "video");
    }
  };

  const handleMergeVideos = async () => {
    if (bibliotecaVideosSelecionados.length < 2) {
      toast.error("Selecione ao menos 2 vídeos para juntar.");
      return;
    }

    videoMergeRequestAbortRef.current?.abort();
    const controller = new AbortController();
    videoMergeRequestAbortRef.current = controller;
    setVideoMergeLoading(true);
    setVideoMergeErrorMessage(null);

    try {
      const res = await fetch("/api/ambientador-produtos/video/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          videoIds: bibliotecaVideosSelecionados.map((item) => item.id),
          preserveAudio: videoMergeKeepAudio,
          aspectRatio: videoMergeAspectRatio,
        }),
      });

      const rawBody = await res.text();
      let data: any = null;
      if (rawBody) {
        data = JSON.parse(rawBody);
      }

      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Falha ao juntar vídeos.");
      }

      const mergedUrl = typeof data?.video_url === "string" ? data.video_url : "";
      if (!mergedUrl) {
        throw new Error("Nenhum vídeo final foi retornado.");
      }

      setVideoMergeResultUrl(mergedUrl);
      setVideoMergeResultSizeBytes(
        Number.isFinite(Number(data?.merged_size_bytes))
          ? Number(data.merged_size_bytes)
          : null,
      );
      setVideoMergeEstimatedSizeBytes(
        Number.isFinite(Number(data?.estimated_size_bytes))
          ? Number(data.estimated_size_bytes)
          : videoMergeEstimatedSizeBytes,
      );
      setVideoMergeSourceTotalBytes(
        Number.isFinite(Number(data?.source_total_bytes))
          ? Number(data.source_total_bytes)
          : videoMergeSourceTotalBytes,
      );

      toast.success("Vídeos unidos e salvos na biblioteca!");
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }
      const message = error?.message || "Não foi possível juntar os vídeos.";
      setVideoMergeErrorMessage(message);
      toast.error(message);
    } finally {
      if (videoMergeRequestAbortRef.current === controller) {
        videoMergeRequestAbortRef.current = null;
      }
      setVideoMergeLoading(false);
    }
  };

  const downloadMergedVideo = async () => {
    if (!videoMergeResultUrl) return;

    try {
      setVideoMergeDownloading(true);
      const response = await fetch(videoMergeResultUrl);
      if (!response.ok) {
        throw new Error("Falha ao baixar vídeo final.");
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `ambientacao-video-merge-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Não foi possível baixar o vídeo final.");
    } finally {
      setVideoMergeDownloading(false);
    }
  };

  const handleDownloadBiblioteca = async (item: BibliotecaItem) => {
    try {
      setBibliotecaDownloadingId(item.id);

      const response = await fetch(item.url);
      if (!response.ok) {
        throw new Error("Falha ao baixar arquivo");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = getFileNameFromItem(item);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Não foi possível baixar o arquivo.");
    } finally {
      setBibliotecaDownloadingId(null);
    }
  };

  const itemEstaFavoritado = (itemId: number) =>
    bibliotecaFavoritosIds.includes(itemId);

  const toggleFavoritoBiblioteca = (itemId: number) => {
    setBibliotecaFavoritosIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const gptImageVersion = settings.versao_gpt_image;
  const gptImageDisplayModel = (gptImageVersion || LATEST_GPT_IMAGE_MODEL).trim();

  const renderPromptControls = () => (
    <div className="flex flex-col gap-4">
      <div className="w-full max-w-[760px]">
        <label className={fieldLabelClass}>Modelo IA</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label
            className={`flex w-full cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold transition ${
              model === "nano_banana"
                ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100"
                : "border-gray-600/80 bg-gray-900/70 text-gray-300 hover:border-gray-500"
            }`}
          >
            <input
              type="radio"
              name="modelo-imagem"
              value="nano_banana"
              checked={model === "nano_banana"}
              onChange={(e) => setModel(e.target.value)}
              className="sr-only"
            />
            <span className="whitespace-nowrap leading-none">Nano Banana 2</span>
          </label>

          <label
            className={`flex w-full cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-[13px] font-semibold transition md:text-sm ${
              model === "gpt_image"
                ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100"
                : "border-gray-600/80 bg-gray-900/70 text-gray-300 hover:border-gray-500"
            }`}
          >
            <input
              type="radio"
              name="modelo-imagem"
              value="gpt_image"
              checked={model === "gpt_image"}
              onChange={(e) => setModel(e.target.value)}
              className="sr-only"
            />
            <span className="whitespace-nowrap leading-none">
              GPT Image ({gptImageDisplayModel})
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderAmbientacaoActions = () =>
    !loading &&
    preview && (
      <div className="mt-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setAmbientacaoLightboxOpen(true)}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-purple-400/45 bg-purple-500/20 px-3 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/30 cursor-pointer"
        >
          <FaImage />
          Visualizar
        </button>
        <button
          type="button"
          onClick={downloadImage}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-purple-700 px-3 text-sm font-semibold text-white transition hover:bg-purple-600 cursor-pointer"
        >
          <FaDownload />
          Baixar
        </button>
        <button
          type="button"
          onClick={() => openVideoModal(preview)}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/45 bg-cyan-500/20 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 cursor-pointer"
        >
          <FaVideo />
          Gerar vídeo
        </button>
      </div>
    );

  const renderVideoGenerationControls = ({
    showNegativePrompt = true,
  }: {
    showNegativePrompt?: boolean;
  } = {}) => (
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
                  setVideoModel(nextModel);
                  const nextOption = getVideoModelOption(nextModel);
                  setVideoResolution((current) =>
                    nextOption.allowedResolutions.includes(current)
                      ? current
                      : nextOption.defaultResolution,
                  );
                  setVideoDurationSeconds((current) =>
                    nextOption.allowedDurations.includes(current)
                      ? current
                      : nextOption.defaultDuration,
                  );
                }}
                className={selectClass}
                disabled={videoLoading}
              >
                {VIDEO_MODEL_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    className={selectOptionClass}
                    value={option.value}
                  >
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
                {selectedVideoModelOption.allowedResolutions.map((resolutionValue) => (
                  <option
                    key={`${videoModel}-${resolutionValue}`}
                    className={selectOptionClass}
                    value={resolutionValue}
                  >
                    {resolutionValue}
                  </option>
                ))}
              </select>
              <FaChevronDown className={selectIconClass} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-700/70 bg-gray-800/55 p-4">
          <label className={fieldLabelClass}>Formato para redes</label>
          {videoAspectRatio ? (
            <div className="rounded-xl border border-cyan-400/45 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
              {SOCIAL_FORMAT_OPTIONS.find(
                (option) => option.value === videoAspectRatio,
              )?.label || "Formato selecionado"}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-600 bg-gray-900/70 px-3 py-2 text-xs text-gray-400">
              Selecione um formato de rede social
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {SOCIAL_FORMAT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setVideoAspectRatio(option.value)}
                disabled={videoLoading}
                className={`rounded-xl border px-3 py-2 text-left text-xs transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                  videoAspectRatio === option.value
                    ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100"
                    : "border-gray-700 bg-gray-900/70 text-gray-300 hover:border-gray-500"
                }`}
              >
                <p className="font-semibold">{option.label}</p>
                <p className="mt-0.5 text-[11px] opacity-80">
                  {option.details}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-700/70 bg-gray-800/55 p-4">
          <label className={fieldLabelClass}>Duração do vídeo</label>
          <div className={selectWrapperClass}>
            <select
              value={String(videoDurationSeconds)}
              onChange={(e) =>
                setVideoDurationSeconds(Number.parseInt(e.target.value, 10) || 8)
              }
              className={selectClass}
              disabled={videoLoading}
            >
              {selectedVideoModelOption.allowedDurations.map((secondsValue) => (
                <option
                  key={`${videoModel}-${secondsValue}`}
                  className={selectOptionClass}
                  value={String(secondsValue)}
                >
                  {secondsValue}s
                </option>
              ))}
            </select>
            <FaChevronDown className={selectIconClass} />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            Opções disponíveis de acordo com o modelo selecionado.
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

          {isSoraSelected ? (
            <p className="text-[11px] text-gray-400">
              O Sora usa apenas prompt principal e imagem de referência.
            </p>
          ) : showNegativePrompt ? (
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
          ) : null
          }
        </div>
      </div>
    </div>
  );

  const renderMainProductUpload = (inputId = "produtoPrincipalUpload") => (
    <>
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
            droppedFiles.find((file) => file.type.startsWith("image/")) ||
            droppedFiles[0];

          handleProdutoPrincipalFile(imageFile, "drop");
        }}
      >
        <input
          type="file"
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          id={inputId}
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            handleProdutoPrincipalFile(file, "upload");
            e.currentTarget.value = "";
          }}
        />
        <label
          htmlFor={inputId}
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
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-md bg-black/40">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
                  <p className="text-xs font-medium text-gray-100">
                    Gerando ambientação...
                  </p>
                </div>
              )}
            </div>
          ) : loading ? (
            <>
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" />
              <span className="text-sm font-medium text-gray-100">
                Gerando ambientação...
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-300/35 bg-purple-500/15 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_16px_35px_-22px_rgba(168,85,247,0.75)]">
                <FiUploadCloud className="text-3xl text-purple-200" />
              </span>
              <span className="font-medium text-white">
                Clique ou arraste a imagem aqui
              </span>
              <span className="text-xs text-gray-300">
                JPG, PNG, WEBP ou cole com Ctrl+V
              </span>
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
          Nenhuma imagem selecionada.
        </p>
      )}

      {renderAmbientacaoActions()}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {toastState ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-4 top-4 z-[140] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toastState.type === "success"
              ? "border-emerald-500/40 bg-emerald-900 text-emerald-100"
              : toastState.type === "error"
                ? "border-red-500/40 bg-red-900 text-red-100"
                : "border-gray-600 bg-gray-800 text-gray-100"
          }`}
        >
          {toastState.message}
        </div>
      ) : null}
      <main className="grow px-6 py-8">
        {/* Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full lg:w-1/5">
            <MenuLateral />
          </aside>

          {/* Conteúdo */}
          <section className="flex bg-gray-800 rounded-2xl shadow p-6 w-full">
            {appLoading ? (
              <div className="w-full flex flex-col items-center justify-center animate-fade">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-purple-400 font-medium">
                  Carregando módulo...
                </p>
              </div>
            ) : (
              <div className="w-full space-y-6">
                <div className="grid grid-cols-1 items-start gap-4">
                  <section
                    className={`${sectionCardClass} space-y-5`}
                  >
                    <h4 className="mb-1 flex items-center gap-2 text-md font-semibold">
                      <FaRobot className="text-purple-400" />
                      Geração por IA
                    </h4>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <div>{renderMainProductUpload("produtoPrincipalUploadCompleto")}</div>

                      <div className="space-y-5">
                        <div>{renderPromptControls()}</div>
                        <div>
                          <label className={fieldLabelClass} htmlFor="promptPersonalizado">
                            Prompt
                          </label>
                          <textarea
                            id="promptPersonalizado"
                            value={promptPersonalizado}
                            onChange={(e) => setPromptPersonalizado(e.target.value)}
                            className={`${textareaClass} h-28 min-h-24 max-h-[180px] resize-y`}
                            placeholder="Descreva a ambientação desejada."
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            onClick={handleGenerate}
                            disabled={!produtoPrincipal.file || loading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-purple-400/45 bg-purple-500/25 px-4 py-3 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/35 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <FaRobot />
                            {loading
                              ? "Aguarde, criando imagem..."
                              : "Criar imagem com IA"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openVideoModal(produtoPrincipal.preview || undefined)}
                            disabled={!produtoPrincipal.preview || loading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/45 bg-cyan-500/20 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <FaVideo />
                            Gerar vídeo
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="border-t border-gray-700 pt-8">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold">Biblioteca</h3>
                      <p className="text-xs text-gray-400">
                        Histórico de ambientações com ação rápida para gerar vídeo.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBibliotecaFiltro("image")}
                        className={`inline-flex h-8 min-w-[135px] items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition cursor-pointer ${
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
                        className={`inline-flex h-8 min-w-[135px] items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition cursor-pointer ${
                          bibliotecaFiltro === "video"
                            ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100"
                            : "border-gray-600 bg-gray-900/50 text-gray-300 hover:border-gray-500"
                        }`}
                      >
                        <FaVideo className="text-[11px]" />
                        Vídeos ({bibliotecaVideoCount})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBibliotecaMostrarSomenteFavoritos((prev) => !prev)
                        }
                        className={`inline-flex h-8 min-w-[135px] items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition cursor-pointer ${
                          bibliotecaMostrarSomenteFavoritos
                            ? "border-yellow-300/70 bg-yellow-500/20 text-yellow-100"
                            : "border-gray-600 bg-gray-900/50 text-gray-300 hover:border-gray-500"
                        }`}
                      >
                        <FaStar className="text-[11px] text-yellow-300" />
                        Favoritos ({bibliotecaFavoritosCount})
                      </button>

                      {bibliotecaFiltro === "video" &&
                        bibliotecaVideoSelecionadosIds.length > 0 && (
                          <span className="inline-flex h-8 items-center rounded-full border border-gray-600 bg-gray-900/60 px-3 text-xs font-medium text-gray-300">
                            Selecionados: {bibliotecaVideoSelecionadosIds.length}
                          </span>
                        )}

                      {bibliotecaFiltro === "video" &&
                        bibliotecaVideoSelecionadosIds.length >= 2 && (
                          <button
                            type="button"
                            onClick={openVideoMergeModal}
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-cyan-400/45 bg-cyan-500/20 px-4 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/30 cursor-pointer"
                          >
                            <FaExchangeAlt className="text-[11px]" />
                            Juntar vídeos
                          </button>
                        )}
                    </div>
                  </div>

                  {!bibliotecaLoadedOnce && bibliotecaLoading ? (
                    <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-6 text-center text-sm text-gray-300">
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                        Carregando biblioteca...
                      </div>
                    </div>
                  ) : bibliotecaFiltrada.length === 0 ? (
                    <div className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-6 text-center text-sm text-gray-300">
                      {bibliotecaLoadError ? (
                        <div className="space-y-3">
                          <p>{bibliotecaLoadError}</p>
                          <button
                            type="button"
                            onClick={() => void loadBiblioteca(true)}
                            disabled={bibliotecaLoading}
                            className="inline-flex h-8 min-w-[150px] items-center justify-center gap-1.5 rounded-full border border-gray-600 bg-gray-800 px-4 text-xs font-medium text-gray-200 transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                          >
                            {bibliotecaLoading ? "Tentando..." : "Tentar novamente"}
                          </button>
                        </div>
                      ) : (
                        <p>Nenhum item encontrado para este filtro.</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {bibliotecaFiltrada.map((item, index) => {
                        const itemIsVideo = isVideoItem(item);
                        const isSelectedForMerge =
                          itemIsVideo &&
                          bibliotecaVideoSelecionadosIds.includes(item.id);
                        const mediaLabel = formatLabelFromMediaDimensions(
                          bibliotecaMediaDimensionsById[item.id],
                        );
                        const isFavorito = itemEstaFavoritado(item.id);

                        return (
                          <article
                            key={item.id}
                            className={`rounded-xl border p-3 ${
                              isSelectedForMerge
                                ? "border-cyan-400/70 bg-cyan-500/10"
                                : "border-gray-700 bg-gray-900/70"
                            }`}
                          >
                            {itemIsVideo ? (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setBibliotecaSelectedIndex(index)}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    setBibliotecaSelectedIndex(index);
                                  }
                                }}
                                className="relative w-full overflow-hidden rounded-md bg-black text-left cursor-pointer"
                                style={{
                                  aspectRatio: getBibliotecaItemAspectRatio(item.id, "9 / 16"),
                                }}
                              >
                                {(() => {
                                  const isReady = !!videoPreviewReadyById[item.id];
                                  const hasError = !!videoPreviewErrorById[item.id];
                                  const isMuted =
                                    videoPreviewMutedById[item.id] ?? true;
                                  const isPlaying =
                                    videoPreviewPlayingById[item.id] ?? false;

                                  return (
                                    <>
                                      <label
                                        className={`absolute left-2 top-2 z-20 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] backdrop-blur-sm ${
                                          isSelectedForMerge
                                            ? "border-cyan-300/65 bg-cyan-500/30 text-cyan-50"
                                            : "border-white/25 bg-black/55 text-gray-100"
                                        }`}
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelectedForMerge}
                                          onChange={() =>
                                            toggleBibliotecaVideoSelection(item.id)
                                          }
                                          className="h-3.5 w-3.5 cursor-pointer accent-cyan-500"
                                        />
                                        Selecionar
                                      </label>

                                      {item.thumbUrl ? (
                                        <img
                                          src={item.thumbUrl}
                                          alt={`Preview do vídeo ${item.id}`}
                                          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                                            isReady && !hasError
                                              ? "opacity-0"
                                              : "opacity-100"
                                          }`}
                                        />
                                      ) : null}

                                      <video
                                        ref={(element) => {
                                          videoPreviewRefs.current[item.id] = element;
                                        }}
                                        src={item.url}
                                        preload="auto"
                                        muted={isMuted}
                                        loop
                                        playsInline
                                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                                          hasError
                                            ? "opacity-0"
                                            : isReady
                                              ? "opacity-100"
                                              : "opacity-0"
                                        }`}
                                        onLoadedMetadata={(event) => {
                                          const player = event.currentTarget;
                                          registerBibliotecaMediaDimensions(
                                            item.id,
                                            player.videoWidth,
                                            player.videoHeight,
                                          );
                                          if (!Number.isFinite(player.duration)) {
                                            setVideoPreviewReadyById((prev) =>
                                              prev[item.id]
                                                ? prev
                                                : { ...prev, [item.id]: true },
                                            );
                                            return;
                                          }
                                          const previewTime = Math.min(
                                            0.8,
                                            Math.max(0.1, player.duration * 0.1),
                                          );
                                          try {
                                            player.currentTime = previewTime;
                                          } catch {
                                            setVideoPreviewReadyById((prev) =>
                                              prev[item.id]
                                                ? prev
                                                : { ...prev, [item.id]: true },
                                            );
                                          }
                                        }}
                                        onSeeked={() => {
                                          setVideoPreviewReadyById((prev) =>
                                            prev[item.id]
                                              ? prev
                                              : { ...prev, [item.id]: true },
                                          );
                                        }}
                                        onLoadedData={() => {
                                          setVideoPreviewReadyById((prev) =>
                                            prev[item.id]
                                              ? prev
                                              : { ...prev, [item.id]: true },
                                          );
                                        }}
                                        onPlay={() => {
                                          setVideoPreviewPlayingById((prev) =>
                                            prev[item.id]
                                              ? prev
                                              : { ...prev, [item.id]: true },
                                          );
                                        }}
                                        onPause={() => {
                                          setVideoPreviewPlayingById((prev) => ({
                                            ...prev,
                                            [item.id]: false,
                                          }));
                                        }}
                                        onError={() => {
                                          setVideoPreviewErrorById((prev) =>
                                            prev[item.id]
                                              ? prev
                                              : { ...prev, [item.id]: true },
                                          );
                                        }}
                                      />

                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          toggleVideoPreviewPlay(item.id);
                                        }}
                                        className="absolute inset-0 m-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/45 text-base text-white transition hover:bg-black/60 cursor-pointer"
                                        aria-label={
                                          isPlaying
                                            ? "Pausar preview do vídeo"
                                            : "Reproduzir preview do vídeo"
                                        }
                                      >
                                        {isPlaying ? <FaPause /> : <FaPlay />}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          toggleVideoPreviewMute(item.id);
                                        }}
                                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/45 bg-black/55 text-cyan-100 transition hover:bg-black/70 cursor-pointer"
                                        aria-label={
                                          isMuted
                                            ? "Ativar som do preview"
                                            : "Silenciar preview"
                                        }
                                      >
                                        {isMuted ? (
                                          <FaVolumeMute className="text-sm" />
                                        ) : (
                                          <FaVolumeUp className="text-sm" />
                                        )}
                                      </button>

                                      <div className="pointer-events-none absolute right-2 bottom-2 rounded-full border border-cyan-300/40 bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100">
                                        {mediaLabel}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          toggleFavoritoBiblioteca(item.id);
                                        }}
                                        className={`absolute left-2 bottom-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border transition cursor-pointer ${
                                          isFavorito
                                            ? "border-yellow-300/80 bg-yellow-500/25 text-yellow-300"
                                            : "border-white/25 bg-black/55 text-gray-200 hover:border-yellow-300/60 hover:text-yellow-300"
                                        }`}
                                        aria-label={
                                          isFavorito
                                            ? "Remover dos favoritos"
                                            : "Adicionar aos favoritos"
                                        }
                                      >
                                        {isFavorito ? (
                                          <FaStar className="text-sm" />
                                        ) : (
                                          <FaRegStar className="text-sm" />
                                        )}
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div
                                className="relative w-full overflow-hidden rounded-md bg-black text-left cursor-pointer"
                                style={{
                                  aspectRatio: getBibliotecaItemAspectRatio(item.id),
                                }}
                                onClick={() => setBibliotecaSelectedIndex(index)}
                              >
                                <img
                                  src={item.thumbUrl}
                                  alt={item.pathname}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  onLoad={(event) => {
                                    registerBibliotecaMediaDimensions(
                                      item.id,
                                      event.currentTarget.naturalWidth,
                                      event.currentTarget.naturalHeight,
                                    );
                                  }}
                                />
                                <div className="pointer-events-none absolute right-2 bottom-2 rounded-full border border-white/25 bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-100">
                                  {mediaLabel}
                                </div>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleFavoritoBiblioteca(item.id);
                                  }}
                                  className={`absolute left-2 bottom-2 inline-flex h-8 w-8 items-center justify-center rounded-full border transition cursor-pointer ${
                                    isFavorito
                                      ? "border-yellow-300/80 bg-yellow-500/25 text-yellow-300"
                                      : "border-white/25 bg-black/55 text-gray-200 hover:border-yellow-300/60 hover:text-yellow-300"
                                  }`}
                                  aria-label={
                                    isFavorito
                                      ? "Remover dos favoritos"
                                      : "Adicionar aos favoritos"
                                  }
                                >
                                  {isFavorito ? (
                                    <FaStar className="text-sm" />
                                  ) : (
                                    <FaRegStar className="text-sm" />
                                  )}
                                </button>
                              </div>
                            )}

                            <p className="mt-2 text-[11px] text-gray-400">
                              {item.createdBy?.name
                                ? `Gerado por ${item.createdBy.name}`
                                : "Sem autor registrado"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="inline-flex items-center rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2 py-0.5 font-medium text-cyan-200">
                                Modelo: {formatModelLabel(item.model)}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-gray-600 bg-gray-800/70 px-2 py-0.5 font-medium text-gray-300">
                                Data: {formatBibliotecaDateTime(item.createdAt)}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadBiblioteca(item)}
                                disabled={bibliotecaDownloadingId === item.id}
                                className="inline-flex h-8 w-[calc(50%-0.25rem)] items-center justify-center gap-1.5 rounded-md border border-gray-600 bg-gray-800 px-2.5 text-xs font-medium text-gray-200 transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                              >
                                <FaDownload className="text-[11px]" />
                                {bibliotecaDownloadingId === item.id
                                  ? "Baixando..."
                                  : "Baixar"}
                              </button>

                              {!itemIsVideo && (
                                <button
                                  type="button"
                                  onClick={() => openVideoModal(item.url)}
                                  className="inline-flex h-8 w-[calc(50%-0.25rem)] items-center justify-center gap-1.5 rounded-md border border-cyan-400/40 bg-cyan-500/20 px-2.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/30 cursor-pointer"
                                >
                                  <FaVideo className="text-[11px]" />
                                  Gerar vídeo
                                </button>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {bibliotecaCursor && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => void loadBiblioteca(false)}
                        disabled={bibliotecaLoading}
                        className="inline-flex h-9 min-w-[150px] items-center justify-center gap-1.5 rounded-full border border-gray-600 bg-gray-800 px-4 text-xs font-medium text-gray-200 transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                      >
                        <FaPlus className="text-[11px]" />
                        {bibliotecaLoading ? "Carregando..." : "Carregar mais"}
                      </button>
                    </div>
                  )}
                </section>
              </div>
            )}
          </section>
        </div>
      </main>

      {ambientacaoLightboxOpen && preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
          onClick={() => setAmbientacaoLightboxOpen(false)}
        >
          <div
            className="w-full max-w-5xl rounded-2xl border border-gray-700 bg-gray-900 p-4 sm:p-6 max-h-[calc(100vh-3rem)] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
                <FaImage className="text-purple-300" />
                Visualizar ambientação
              </h3>
              <button
                type="button"
                onClick={() => setAmbientacaoLightboxOpen(false)}
                className="rounded-lg border border-gray-600 bg-gray-800 p-2 text-gray-300 transition hover:text-white cursor-pointer"
                aria-label="Fechar visualização da ambientação"
              >
                <FaTimes />
              </button>
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-950/70">
              <img
                src={preview}
                alt="Imagem ambientada"
                className="mx-auto max-h-[70vh] w-full object-contain"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={downloadImage}
                className="inline-flex h-10 min-w-[190px] items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-sm font-semibold text-white transition hover:bg-purple-600 cursor-pointer"
              >
                <FaDownload />
                Baixar Ambientação
              </button>
              <button
                type="button"
                onClick={() => {
                  setAmbientacaoLightboxOpen(false);
                  openVideoModal(preview);
                }}
                className="inline-flex h-10 min-w-[190px] items-center justify-center gap-2 rounded-lg border border-cyan-400/45 bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30 cursor-pointer"
              >
                <FaVideo />
                Gerar vídeo (Veo)
              </button>
            </div>
          </div>
        </div>
      )}

      {bibliotecaSelectedIndex !== null &&
        bibliotecaFiltrada[bibliotecaSelectedIndex] && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setBibliotecaSelectedIndex(null)}
          >
            <button
              className="absolute left-6 rounded-full bg-black/40 p-4 text-2xl text-white transition hover:bg-black/60 cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                setBibliotecaSelectedIndex(
                  bibliotecaSelectedIndex > 0
                    ? bibliotecaSelectedIndex - 1
                    : bibliotecaFiltrada.length - 1,
                );
              }}
            >
              <FaChevronLeft />
            </button>

            {isVideoItem(bibliotecaFiltrada[bibliotecaSelectedIndex]) ? (
              <video
                src={bibliotecaFiltrada[bibliotecaSelectedIndex].url}
                controls
                autoPlay
                className="max-h-[90%] max-w-[90%] rounded-lg bg-black shadow-lg"
                onClick={(event) => event.stopPropagation()}
              />
            ) : (
              <img
                src={bibliotecaFiltrada[bibliotecaSelectedIndex].url}
                className="max-h-[90%] max-w-[90%] rounded-lg shadow-lg"
                onClick={(event) => event.stopPropagation()}
              />
            )}

            <button
              className="absolute right-6 rounded-full bg-black/40 p-4 text-2xl text-white transition hover:bg-black/60 cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                setBibliotecaSelectedIndex(
                  bibliotecaSelectedIndex < bibliotecaFiltrada.length - 1
                    ? bibliotecaSelectedIndex + 1
                    : 0,
                );
              }}
            >
              <FaChevronRight />
            </button>

            <button
              className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-xl text-white transition hover:bg-gray-700 cursor-pointer"
              onClick={() => setBibliotecaSelectedIndex(null)}
            >
              <FaTimes />
            </button>
          </div>
        )}

      {videoMergeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 backdrop-blur-[2px] sm:p-5">
          <div className="mx-auto my-2 w-full max-w-6xl rounded-2xl border border-gray-600/70 bg-gray-900 shadow-2xl shadow-black/30 sm:my-6">
            <div className="flex items-center justify-between border-b border-gray-700/80 px-4 py-3 sm:px-5">
              <h3 className="inline-flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
                <FaExchangeAlt className="text-cyan-300" />
                Juntar vídeos selecionados
              </h3>
              <button
                type="button"
                onClick={closeVideoMergeModal}
                className="rounded-lg border border-gray-600 bg-gray-800 p-2 text-gray-300 transition hover:text-white cursor-pointer"
                aria-label="Fechar modal de junção de vídeos"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-gray-700/80 bg-gray-800/55 px-3 py-2.5 text-xs text-gray-200">
                  <p className="font-semibold uppercase tracking-[0.08em] text-gray-300">
                    Quantidade
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {bibliotecaVideosSelecionados.length} vídeo(s)
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-400/45 bg-cyan-500/12 px-3 py-2.5 text-xs text-cyan-100">
                  <p className="font-semibold uppercase tracking-[0.08em]">
                    Tamanho previsto
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {videoMergeEstimating
                      ? "Calculando..."
                      : formatBytes(videoMergeEstimatedSizeBytes)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-700/80 bg-gray-800/55 px-3 py-2.5 text-xs text-gray-200">
                  <p className="font-semibold uppercase tracking-[0.08em] text-gray-300">
                    Soma dos originais
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {videoMergeEstimating
                      ? "Calculando..."
                      : formatBytes(videoMergeSourceTotalBytes)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-700/80 bg-gray-800/55 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-300">
                    Áudio do vídeo final
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setVideoMergeKeepAudio(true)}
                      disabled={videoMergeLoading}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        videoMergeKeepAudio
                          ? "border-cyan-400/65 bg-cyan-500/20 text-cyan-100"
                          : "border-gray-700 bg-gray-900/70 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      Manter áudio
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoMergeKeepAudio(false)}
                      disabled={videoMergeLoading}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        !videoMergeKeepAudio
                          ? "border-cyan-400/65 bg-cyan-500/20 text-cyan-100"
                          : "border-gray-700 bg-gray-900/70 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      Remover áudio
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-700/80 bg-gray-800/55 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-300">
                    Tamanho do vídeo final
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SOCIAL_FORMAT_OPTIONS.map((option) => {
                      const selected = videoMergeAspectRatio === option.value;
                      return (
                        <button
                          key={`video-merge-size-${option.value}`}
                          type="button"
                          onClick={() => setVideoMergeAspectRatio(option.value)}
                          disabled={videoMergeLoading}
                          className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            selected
                              ? "border-cyan-400/65 bg-cyan-500/20 text-cyan-100"
                              : "border-gray-700 bg-gray-900/70 text-gray-300 hover:border-gray-500"
                          }`}
                        >
                          <span className="block text-xs font-semibold">{option.label}</span>
                          <span className="mt-0.5 block text-[11px] text-gray-400">
                            {option.details}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {videoMergeErrorMessage && (
                <p className="rounded-lg border border-red-500/45 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-100">
                  {videoMergeErrorMessage}
                </p>
              )}

              <p className="text-xs text-gray-400">
                Arraste os cards para definir a ordem final da junção.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {bibliotecaVideosSelecionados.map((item, index) => (
                  <article
                    key={item.id}
                    draggable={!videoMergeLoading}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(item.id));
                      setVideoMergeDraggingId(item.id);
                      setVideoMergeDragOverId(null);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      if (videoMergeDragOverId !== item.id) {
                        setVideoMergeDragOverId(item.id);
                      }
                    }}
                    onDragLeave={(event) => {
                      const nextTarget = event.relatedTarget as Node | null;
                      if (nextTarget && event.currentTarget.contains(nextTarget)) {
                        return;
                      }
                      if (videoMergeDragOverId === item.id) {
                        setVideoMergeDragOverId(null);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const draggedRaw = event.dataTransfer.getData("text/plain");
                      const draggedId = Number(draggedRaw);
                      if (Number.isInteger(draggedId)) {
                        reorderBibliotecaVideosSelecionados(draggedId, item.id);
                      }
                      setVideoMergeDraggingId(null);
                      setVideoMergeDragOverId(null);
                    }}
                    onDragEnd={() => {
                      setVideoMergeDraggingId(null);
                      setVideoMergeDragOverId(null);
                    }}
                    className={`rounded-xl border bg-gray-900/70 p-3 transition ${
                      videoMergeDragOverId === item.id
                        ? "border-cyan-400/70"
                        : "border-gray-700"
                    } ${
                      videoMergeDraggingId === item.id
                        ? "cursor-grabbing opacity-80"
                        : "cursor-grab"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cyan-200">
                        Ordem {index + 1}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-600 bg-gray-800/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-300">
                        <FaExchangeAlt className="text-[9px]" />
                        Arraste
                      </span>
                    </div>
                    <video
                      src={item.url}
                      controls
                      preload="metadata"
                      className="h-44 w-full rounded-md bg-black object-cover"
                    />
                  </article>
                ))}
              </div>

              {videoMergeResultUrl && (
                <div className="space-y-3 rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-cyan-100">
                      Vídeo final gerado com sucesso
                    </p>
                    <p className="text-xs font-medium text-cyan-100">
                      Tamanho final: {formatBytes(videoMergeResultSizeBytes)}
                    </p>
                  </div>
                  <video
                    src={videoMergeResultUrl}
                    controls
                    className="max-h-[360px] w-full rounded-lg bg-black object-contain"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={downloadMergedVideo}
                      disabled={videoMergeDownloading}
                      className="inline-flex h-10 min-w-[165px] items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-sm font-semibold text-white transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      <FaDownload />
                      {videoMergeDownloading ? "Baixando..." : "Baixar vídeo final"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-700/80 bg-gray-900/95 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={closeVideoMergeModal}
                className="inline-flex h-10 min-w-[145px] items-center justify-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 text-sm font-medium text-gray-200 transition hover:bg-gray-700 cursor-pointer"
              >
                <FaTimes className="text-xs" />
                Fechar
              </button>
              <button
                type="button"
                onClick={handleMergeVideos}
                disabled={
                  videoMergeLoading ||
                  videoMergeEstimating ||
                  bibliotecaVideosSelecionados.length < 2
                }
                className="inline-flex h-10 min-w-[145px] items-center justify-center gap-2 rounded-lg border border-cyan-400/45 bg-cyan-500/25 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                <FaExchangeAlt className={videoMergeLoading ? "animate-spin" : ""} />
                {videoMergeLoading ? "Juntando..." : "Juntar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {videoModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/55 p-3 backdrop-blur-[2px] sm:p-5">
          <div className="mx-auto my-1 flex w-full max-w-352 flex-col overflow-hidden rounded-2xl border border-gray-600/70 bg-gray-900 shadow-2xl shadow-black/30 sm:my-4">
            <div className="flex items-center justify-between border-b border-gray-700/80 bg-gray-900/95 px-4 py-3 sm:px-5">
              <h3 className="inline-flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
                <FaPlay className="text-lg text-cyan-300" />
                Gerar vídeo com {selectedVideoModelOption.label}
              </h3>
              <button
                type="button"
                onClick={closeVideoModal}
                className="rounded-lg border border-gray-600 bg-gray-800 p-2 text-gray-300 transition hover:text-white cursor-pointer"
                aria-label="Fechar modal de vídeo"
              >
                <FaTimes />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
                <div className="rounded-xl border border-gray-700/70 bg-gray-800/55 p-4">
                  <p className={fieldLabelClass}>
                    {videoResult ? "Vídeo gerado" : "Preview da imagem"}
                  </p>

                  <div
                    className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-gray-700 bg-black/80"
                    style={{
                      aspectRatio: videoAspectRatio === "9:16" ? "9 / 16" : "16 / 9",
                    }}
                  >
                    {videoLoading ? (
                      <div className="flex flex-col items-center gap-3 px-4 text-center text-gray-200">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                        <p className="text-sm">
                          Processando no {selectedVideoProviderLabel}. Isso pode levar alguns minutos.
                        </p>
                      </div>
                    ) : videoResult ? (
                      <video
                        controls
                        src={videoResult}
                        className="h-full w-full object-cover"
                      />
                    ) : videoSourceUrl ? (
                      <img
                        src={videoSourceUrl}
                        alt="Preview da ambientação para geração de vídeo"
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
                        className="inline-flex h-10 min-w-[145px] items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-sm font-semibold text-white transition hover:bg-purple-600 cursor-pointer"
                      >
                        <FaDownload />
                        Baixar vídeo
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="mt-3 text-xs text-gray-400">
                        A imagem de referência aparece aqui e será substituída
                        pelo vídeo após a geração.
                      </p>
                      {videoErrorMessage && (
                        <p className="mt-2 rounded-lg border border-red-500/45 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-100">
                          {videoErrorMessage}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {renderVideoGenerationControls()}
              </div>
            </div>

            <div className="border-t border-gray-700/80 bg-gray-900/95 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeVideoModal}
                  className="inline-flex h-10 min-w-[145px] items-center justify-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 text-sm font-medium text-gray-200 transition hover:bg-gray-700 cursor-pointer"
                >
                  <FaTimes className="text-xs" />
                  {videoLoading ? "Cancelar" : "Fechar"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={videoLoading || !videoSourceUrl}
                  className="inline-flex h-10 min-w-[145px] items-center justify-center gap-2 rounded-lg border border-cyan-400/45 bg-cyan-500/25 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/35 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  <FaVideo />
                  {videoLoading ? "Gerando vídeo..." : "Gerar vídeo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

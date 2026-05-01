"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MenuLateral from "./../components/MenuLateral";
import {
  FaArrowLeft,
  FaChevronLeft,
  FaChevronRight,
  FaTrash,
  FaPause,
  FaPlay,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";

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
type MediaDimensions = { width: number; height: number };
type ToastVariant = "success" | "error" | "info";
type ToastState = { type: ToastVariant; message: string } | null;
type LocalToast = ((message: string) => void) & {
  success: (message: string) => void;
  error: (message: string) => void;
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
const GRID_PAGE_SIZE = 4;

function formatModelName(model: string) {
  const normalized = String(model || "").toUpperCase();

  if (normalized === "GPT_IMAGE") {
    return "GPT-IMAGE";
  }

  if (normalized === "NANO_BANANA") {
    return "Nano Banana";
  }

  return normalized.replaceAll("_", " ");
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

function isVideoItem(item: BibliotecaItem) {
  if (item.mediaType) {
    return item.mediaType === "video";
  }

  const source = `${item.pathname || ""} ${item.url || ""}`.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => source.includes(ext));
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

export default function BibliotecaPage() {
  const [items, setItems] = useState<BibliotecaItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filtroAtivo, setFiltroAtivo] = useState<BibliotecaFiltro>("image");
  const [cursor, setCursor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ image: 0, video: 0 });

  const [itemParaExcluir, setItemParaExcluir] = useState<BibliotecaItem | null>(
    null,
  );
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
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
  const [mediaDimensionsById, setMediaDimensionsById] = useState<
    Record<number, MediaDimensions>
  >({});
  const [toastState, setToastState] = useState<ToastState>(null);
  const videoPreviewRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const toastTimerRef = useRef<number | null>(null);

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

  const imageCount = counts.image;
  const videoCount = counts.video;
  const filteredItems = useMemo(() => items, [items]);

  function registerMediaDimensions(itemId: number, width: number, height: number) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return;
    }

    setMediaDimensionsById((prev) => {
      const current = prev[itemId];
      if (current && current.width === width && current.height === height) {
        return prev;
      }
      return { ...prev, [itemId]: { width, height } };
    });
  }

  function getItemAspectRatio(itemId: number, fallback = "1 / 1") {
    const dimensions = mediaDimensionsById[itemId];
    if (!dimensions) return fallback;
    return `${dimensions.width} / ${dimensions.height}`;
  }

  async function load(reset = false, filter?: BibliotecaFiltro) {
    if (isLoading) return;
    setIsLoading(true);
    const activeFilter = filter ?? filtroAtivo;

    const params = new URLSearchParams();
    params.set("limit", String(GRID_PAGE_SIZE));
    params.set("mediaType", activeFilter);
    if (!reset && cursor) {
      params.set("cursor", String(cursor));
    }

    try {
      const res = await fetch(
        `/api/ambientador-produtos/biblioteca?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Falha ao carregar a biblioteca.");
      }

      const data = await res.json();
      const nextItems = Array.isArray(data.items) ? data.items : [];

      if (reset) {
        setItems(nextItems);
      } else {
        setItems((prev) => {
          const unique = new Map<number, BibliotecaItem>();
          [...prev, ...nextItems].forEach((item) => unique.set(item.id, item));
          return Array.from(unique.values());
        });
      }
      setCursor(data.nextCursor ?? null);
      setCounts({
        image: Number(data.counts?.image ?? 0),
        video: Number(data.counts?.video ?? 0),
      });
      setLoadError(null);
    } catch {
      setLoadError("Não foi possível carregar a biblioteca agora.");
      toast.error("Não foi possível carregar a biblioteca.");
    } finally {
      setHasLoadedOnce(true);
      setIsLoading(false);
    }
  }

  function toggleVideoPreviewPlay(itemId: number) {
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
  }

  function toggleVideoPreviewMute(itemId: number) {
    const player = videoPreviewRefs.current[itemId];
    if (!player) return;

    setVideoPreviewMutedById((prev) => {
      const nextMuted = !(prev[itemId] ?? true);
      player.muted = nextMuted;
      return { ...prev, [itemId]: nextMuted };
    });
  }

  useEffect(() => {
    if (selectedIndex === null) return;
    if (filteredItems.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setSelectedIndex((prevIndex) =>
          prevIndex! > 0 ? prevIndex! - 1 : filteredItems.length - 1,
        );
      }
      if (e.key === "ArrowRight") {
        setSelectedIndex((prevIndex) =>
          prevIndex! < filteredItems.length - 1 ? prevIndex! + 1 : 0,
        );
      }
      if (e.key === "Escape") {
        setSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, filteredItems.length]);

  useEffect(() => {
    setSelectedIndex(null);
    void load(true, filtroAtivo);
  }, [filtroAtivo]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  async function handleDelete(itemId: number) {
    try {
      setExcluindo(true);

      const res = await fetch(
        `/api/ambientador-produtos/biblioteca/${itemId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Não foi possível excluir a imagem.");
        return;
      }

      setItems((prev) => {
        return prev.filter((item) => item.id !== itemId);
      });
      setSelectedIndex(null);

      toast.success("Imagem excluída com sucesso.");
      fecharModalExcluir();
    } catch {
      toast.error("Erro ao excluir a imagem.");
    } finally {
      setExcluindo(false);
    }
  }
  function abrirModalExcluir(item: BibliotecaItem) {
    setItemParaExcluir(item);
    setModalExcluirOpen(true);
  }

  function fecharModalExcluir() {
    if (excluindo) return;
    setModalExcluirOpen(false);
    setItemParaExcluir(null);
  }

  async function confirmarExcluir() {
    if (!itemParaExcluir) return;
    await handleDelete(itemParaExcluir.id);
  }
  async function handleDownload(item: BibliotecaItem) {
    try {
      setDownloadingId(item.id);

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
      setDownloadingId(null);
    }
  }
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
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">
              Ambientador de Produtos IA
            </h2>
            <p className="mt-2 opacity-60">
              Gere ambientações profissionais usando IA com base na sua imagem.
            </p>
          </div>

          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-800 rounded-full text-sm text-white cursor-pointer"
          >
            <FaArrowLeft /> Voltar
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* SIDEBAR */}
          <aside className="w-full lg:w-1/5">
            <MenuLateral />
          </aside>

          {/* ÁREA PRINCIPAL */}
          <section className="flex bg-gray-800 rounded-2xl shadow p-6 w-full">
            <div className="w-full">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltroAtivo("image")}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition cursor-pointer ${
                    filtroAtivo === "image"
                      ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100"
                      : "border-gray-600 bg-gray-900/50 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  Imagens ({imageCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroAtivo("video")}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition cursor-pointer ${
                    filtroAtivo === "video"
                      ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100"
                      : "border-gray-600 bg-gray-900/50 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  Vídeos ({videoCount})
                </button>
              </div>

              {!hasLoadedOnce && isLoading && (
                <div className="mb-4 rounded-xl border border-gray-700 bg-gray-900/50 px-4 py-6 text-center text-sm text-gray-300">
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                    Carregando biblioteca...
                  </div>
                </div>
              )}

              {hasLoadedOnce && filteredItems.length === 0 && (
                <div className="mb-4 rounded-xl border border-gray-700 bg-gray-900/50 px-4 py-6 text-center text-sm text-gray-300">
                  {loadError ? (
                    <div className="space-y-3">
                      <p>{loadError}</p>
                      <button
                        type="button"
                        onClick={() => void load()}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center rounded-full border border-gray-600 bg-gray-800 px-4 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isLoading ? "Tentando..." : "Tentar novamente"}
                      </button>
                    </div>
                  ) : (
                    <p>Nenhum item encontrado para este filtro.</p>
                  )}
                </div>
              )}

              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
                {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  className="mb-4 break-inside-avoid rounded-lg border border-gray-700 bg-gray-900 p-3"
                >
                  {isVideoItem(item) ? (
                    <div
                      className="relative w-full overflow-hidden rounded-md bg-black"
                      style={{ aspectRatio: getItemAspectRatio(item.id, "9 / 16") }}
                    >
                      {(() => {
                        const isReady = !!videoPreviewReadyById[item.id];
                        const hasError = !!videoPreviewErrorById[item.id];
                        const isPlaying = !!videoPreviewPlayingById[item.id];
                        const isMuted = videoPreviewMutedById[item.id] ?? true;
                        const mediaLabel = formatLabelFromMediaDimensions(
                          mediaDimensionsById[item.id],
                        );

                        return (
                          <>
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
                                registerMediaDimensions(
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
                                setVideoPreviewPlayingById((prev) => ({
                                  ...prev,
                                  [item.id]: true,
                                }));
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
                              onClick={() => toggleVideoPreviewPlay(item.id)}
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
                              onClick={() => toggleVideoPreviewMute(item.id)}
                              className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/45 bg-black/55 text-cyan-100 transition hover:bg-black/70 cursor-pointer"
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

                            <button
                              type="button"
                              onClick={() => setSelectedIndex(index)}
                              className="absolute right-2 top-2 rounded-md border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[10px] font-semibold text-cyan-100 transition hover:bg-cyan-500/30 cursor-pointer"
                            >
                              Abrir
                            </button>

                            <div className="pointer-events-none absolute right-2 bottom-2 rounded-full border border-cyan-300/40 bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100">
                              {mediaLabel}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div
                      className="relative w-full overflow-hidden rounded-md bg-black"
                      style={{ aspectRatio: getItemAspectRatio(item.id) }}
                    >
                      <img
                        src={item.thumbUrl}
                        alt={item.pathname}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full cursor-pointer object-cover transition hover:opacity-80"
                        onClick={() => setSelectedIndex(index)}
                        onLoad={(event) => {
                          registerMediaDimensions(
                            item.id,
                            event.currentTarget.naturalWidth,
                            event.currentTarget.naturalHeight,
                          );
                        }}
                      />
                      <div className="pointer-events-none absolute right-2 bottom-2 rounded-full border border-white/25 bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-100">
                        {formatLabelFromMediaDimensions(mediaDimensionsById[item.id])}
                      </div>
                    </div>
                  )}

                  <p className="mt-2 text-xs opacity-60 break-all">
                    ID: {item.id}
                  </p>

                  {item.createdBy?.name && (
                    <p className="text-xs opacity-60 wrap-break-word">
                      Gerado por: {item.createdBy.name}
                    </p>
                  )}
                  <p className="text-xs opacity-60">
                    Modelo:{" "}
                    <span className="font-bold">
                      {formatModelName(item.model) || ""}
                    </span>
                  </p>
                  <p className="text-xs opacity-60">
                    Tipo:{" "}
                    <span className="font-bold">
                      {isVideoItem(item) ? "Vídeo" : "Imagem"}
                    </span>
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      disabled={downloadingId === item.id}
                      className="text-blue-400 underline text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloadingId === item.id ? "Baixando..." : "Baixar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => abrirModalExcluir(item)}
                      className="inline-flex items-center gap-2 text-xs text-red-400 hover:text-red-300 cursor-pointer transition"
                      title="Excluir imagem"
                    >
                      <FaTrash />
                      Excluir
                    </button>
                  </div>
                </div>
                ))}

              </div>

              {cursor && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => void load()}
                    disabled={isLoading}
                    className="rounded-full bg-gray-700 px-6 py-2 transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? "Carregando..." : "Carregar mais"}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Modal de Visualização */}
      {selectedIndex !== null && filteredItems[selectedIndex] && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setSelectedIndex(null)} // fechar ao clicar no fundo
        >
          {/* Botão Esquerda (voltar) */}
          <button
            className="absolute left-6 text-white text-2xl p-4 rounded-full cursor-pointer bg-black/40 hover:bg-black/60 transition"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(
                selectedIndex > 0 ? selectedIndex - 1 : filteredItems.length - 1,
              );
            }}
          >
            <FaChevronLeft />
          </button>

          {/* Mídia Selecionada (FULL) */}
          {isVideoItem(filteredItems[selectedIndex]) ? (
            <video
              src={filteredItems[selectedIndex].url}
              controls
              autoPlay
              className="max-w-[90%] max-h-[90%] rounded-lg shadow-lg bg-black"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={filteredItems[selectedIndex].url}
              className="max-w-[90%] max-h-[90%] rounded-lg shadow-lg"
              onClick={(e) => e.stopPropagation()} // impede fechar ao clicar na imagem
            />
          )}

          {/* Botão Direita (avançar) */}
          <button
            className="absolute right-6 text-white text-2xl p-4 rounded-full cursor-pointer bg-black/40 hover:bg-black/60 transition"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(
                selectedIndex < filteredItems.length - 1 ? selectedIndex + 1 : 0,
              );
            }}
          >
            <FaChevronRight />
          </button>

          {/* Botão X */}
          <button
            className="absolute top-6 right-6 text-white text-3xl cursor-pointer bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-700"
            onClick={() => setSelectedIndex(null)}
          >
            &times;
          </button>
        </div>
      )}

      {modalExcluirOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={fecharModalExcluir}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Confirmar exclusão
                </h3>

                <p className="mt-2 text-sm text-gray-300">
                  Tem certeza que deseja excluir esta imagem da biblioteca?
                </p>

                {itemParaExcluir && (
                  <div className="mt-3 rounded-lg border border-gray-700 bg-gray-800/70 p-3">
                    <p className="text-xs text-gray-400">
                      ID: {itemParaExcluir.id}
                    </p>
                    <p className="mt-1 text-sm text-white break-all">
                      {itemParaExcluir.pathname}
                    </p>
                    {itemParaExcluir.createdBy?.name && (
                      <p className="mt-1 text-xs text-gray-400">
                        Gerado por: {itemParaExcluir.createdBy.name}
                      </p>
                    )}
                  </div>
                )}

                <p className="mt-3 text-xs text-gray-400">
                  Esta ação não poderá ser desfeita.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModalExcluir}
                className="text-gray-400 hover:text-white transition cursor-pointer"
                aria-label="Fechar"
                disabled={excluindo}
              >
                ✕
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={fecharModalExcluir}
                className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 transition cursor-pointer"
                disabled={excluindo}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarExcluir}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                disabled={excluindo}
              >
                {excluindo ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

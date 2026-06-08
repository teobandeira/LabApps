"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IconType } from "react-icons";
import {
  MdBolt,
  MdCampaign,
  MdChevronRight,
  MdChecklist,
  MdDarkMode,
  MdDownload,
  MdEmergency,
  MdFoodBank,
  MdHealthAndSafety,
  MdHomeWork,
  MdInventory2,
  MdLightMode,
  MdMedicalServices,
  MdMenuBook,
  MdOutlineHealthAndSafety,
  MdPictureAsPdf,
  MdReport,
  MdRoute,
  MdSearch,
  MdSanitizer,
  MdScience,
  MdWaterDrop,
} from "react-icons/md";
import {
  DEFAULT_CONTACTS,
  LAYER_REFERENCE,
  MANUAL_CHAPTERS,
  VITAL_SIGNS_REFERENCE,
  WATER_REFERENCE,
  type ManualChapter,
} from "./content";

type ThemeMode = "light" | "dark";

type SurvivalNotesAppProps = {
  displayFontClass: string;
  monoFontClass: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

const THEME_STORAGE_KEY = "survival-notes-theme";

const CHAPTER_ICON_BY_ID: Record<string, IconType> = {
  "principios-prioridades": MdEmergency,
  "preparacao-planejamento": MdRoute,
  "kit-sobrevivencia": MdInventory2,
  "primeiros-socorros-saude": MdMedicalServices,
  agua: MdWaterDrop,
  "abrigo-termorregulacao": MdHomeWork,
  alimentacao: MdFoodBank,
  "navegacao-evacuacao": MdRoute,
  "comunicacao-sinalizacao": MdCampaign,
  "seguranca-autoprotecao": MdHealthAndSafety,
  "saneamento-higiene": MdSanitizer,
  "cenarios-especificos": MdEmergency,
  "checklists-prontos": MdChecklist,
  "farmacia-vs-natural": MdScience,
  "evasao-floresta-parana": MdRoute,
  "apendices-uteis": MdMenuBook,
};

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function chapterLabel(chapter: ManualChapter) {
  return `${chapter.number}. ${chapter.title}`;
}

const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const PDF_MARGIN_X = 42;
const PDF_MARGIN_TOP = 46;
const PDF_MARGIN_BOTTOM = 46;
const PDF_BODY_FONT_SIZE = 10.6;
const PDF_LINE_HEIGHT = 14.2;

function normalizePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ");
}

function escapePdfText(value: string) {
  return normalizePdfText(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function approxCharsPerLine(fontSize: number, indent = 0) {
  const usableWidth = PDF_PAGE_WIDTH - PDF_MARGIN_X * 2 - indent;
  const averageCharWidth = fontSize * 0.52;
  return Math.max(24, Math.floor(usableWidth / averageCharWidth));
}

function wrapText(value: string, maxChars: number) {
  const text = normalizePdfText(value).replace(/\s+/g, " ").trim();
  if (!text) {
    return [];
  }

  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      if (word.length <= maxChars) {
        current = word;
      } else {
        lines.push(word.slice(0, maxChars));
        current = word.slice(maxChars);
      }
      continue;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    lines.push(current);
    if (word.length <= maxChars) {
      current = word;
      continue;
    }

    let remaining = word;
    while (remaining.length > maxChars) {
      lines.push(remaining.slice(0, maxChars));
      remaining = remaining.slice(maxChars);
    }
    current = remaining;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function buildPdfPages(generatedAt: string) {
  const pages: string[] = [];
  let pageOps: string[] = [];
  let cursorY = PDF_PAGE_HEIGHT - PDF_MARGIN_TOP;

  const startNewPage = () => {
    if (pageOps.length) {
      pages.push(pageOps.join("\n"));
    }
    pageOps = [];
    cursorY = PDF_PAGE_HEIGHT - PDF_MARGIN_TOP;
  };

  const ensureSpace = (requiredLines = 1) => {
    if (cursorY - requiredLines * PDF_LINE_HEIGHT < PDF_MARGIN_BOTTOM) {
      startNewPage();
    }
  };

  const drawLine = (text: string, font: "F1" | "F2", size: number, indent = 0) => {
    const x = PDF_MARGIN_X + indent;
    pageOps.push(
      `BT /${font} ${size.toFixed(2)} Tf 1 0 0 1 ${x.toFixed(2)} ${cursorY.toFixed(2)} Tm (${escapePdfText(
        text,
      )}) Tj ET`,
    );
    cursorY -= PDF_LINE_HEIGHT;
  };

  const addParagraph = (text: string, options?: { font?: "F1" | "F2"; size?: number; indent?: number }) => {
    const font = options?.font ?? "F1";
    const size = options?.size ?? PDF_BODY_FONT_SIZE;
    const indent = options?.indent ?? 0;
    const maxChars = approxCharsPerLine(size, indent);
    const lines = wrapText(text, maxChars);
    if (!lines.length) {
      return;
    }
    ensureSpace(lines.length);
    for (const line of lines) {
      drawLine(line, font, size, indent);
    }
  };

  const addSpacing = (lines = 0.5) => {
    cursorY -= PDF_LINE_HEIGHT * lines;
  };

  addParagraph("SurvivalNotes - Manual Completo", { font: "F2", size: 18 });
  addParagraph("Manual em texto para preparacao e resposta em emergencia.", { font: "F1", size: 11.5 });
  addParagraph(`Gerado em: ${generatedAt}`, { font: "F1", size: 10.5 });
  addSpacing(0.4);
  addParagraph("Ordem de prioridades", { font: "F2", size: 12 });
  addParagraph("1. Seguranca", { indent: 10 });
  addParagraph("2. Primeiros socorros", { indent: 10 });
  addParagraph("3. Abrigo e termorregulacao", { indent: 10 });
  addParagraph("4. Agua", { indent: 10 });
  addParagraph("5. Sinalizacao e comunicacao", { indent: 10 });
  addParagraph("6. Comida", { indent: 10 });
  addSpacing(0.7);

  for (const chapter of MANUAL_CHAPTERS) {
    ensureSpace(3);
    addParagraph(chapterLabel(chapter).toUpperCase(), { font: "F2", size: 13 });
    addParagraph(chapter.objective, { font: "F1", size: 10.8 });
    addSpacing(0.2);

    addParagraph("Acoes imediatas", { font: "F2", size: 11.2 });
    for (const action of chapter.quickActions) {
      addParagraph(`- ${action}`, { indent: 10 });
    }

    addSpacing(0.1);
    addParagraph("Conteudo do capitulo", { font: "F2", size: 11.2 });
    for (const block of chapter.blocks) {
      addParagraph(block.title, { font: "F2", size: 10.8, indent: 6 });
      for (const point of block.points) {
        addParagraph(`- ${point}`, { indent: 14 });
      }
    }

    addSpacing(0.1);
    addParagraph("Erros comuns", { font: "F2", size: 11.2 });
    for (const mistake of chapter.commonMistakes) {
      addParagraph(`- ${mistake}`, { indent: 10 });
    }

    addSpacing(0.8);
  }

  ensureSpace(4);
  addParagraph("Apendice de referencias rapidas", { font: "F2", size: 13 });
  addParagraph("Consumo de agua", { font: "F2", size: 11.2 });
  for (const row of WATER_REFERENCE) {
    addParagraph(`- ${row.scenario}: ${row.liters}`, { indent: 10 });
  }
  addSpacing(0.1);
  addParagraph("Sinais vitais (referencia)", { font: "F2", size: 11.2 });
  for (const row of VITAL_SIGNS_REFERENCE) {
    addParagraph(`- ${row.signal}: ${row.value}`, { indent: 10 });
  }
  addSpacing(0.1);
  addParagraph("Camadas de roupa", { font: "F2", size: 11.2 });
  for (const row of LAYER_REFERENCE) {
    addParagraph(`- ${row.range}: ${row.strategy}`, { indent: 10 });
  }
  addSpacing(0.1);
  addParagraph("Contatos essenciais", { font: "F2", size: 11.2 });
  for (const contact of DEFAULT_CONTACTS) {
    addParagraph(`- ${contact}`, { indent: 10 });
  }

  if (pageOps.length) {
    pages.push(pageOps.join("\n"));
  }
  return pages;
}

function buildPdfBlob(generatedAt: string) {
  const pageContents = buildPdfPages(generatedAt);
  const objects: string[] = [""];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length - 1;
  };

  const catalogRef = addObject("");
  const pagesRef = addObject("");
  const regularFontRef = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldFontRef = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageRefs: number[] = [];

  for (const content of pageContents) {
    const contentRef = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageRef = addObject(
      `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH.toFixed(2)} ${PDF_PAGE_HEIGHT.toFixed(
        2,
      )}] /Resources << /Font << /F1 ${regularFontRef} 0 R /F2 ${boldFontRef} 0 R >> >> /Contents ${contentRef} 0 R >>`,
    );
    pageRefs.push(pageRef);
  }

  objects[pagesRef] = `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${
    pageRefs.length
  } >>`;
  objects[catalogRef] = `<< /Type /Catalog /Pages ${pagesRef} 0 R >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export default function SurvivalNotesApp({
  displayFontClass,
  monoFontClass,
}: SurvivalNotesAppProps) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [query, setQuery] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState(MANUAL_CHAPTERS[0]?.id ?? "");
  const contentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/survivalnotes-sw.js", { scope: "/survival-notes" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const selectedChapter =
    MANUAL_CHAPTERS.find((chapter) => chapter.id === selectedChapterId) ?? MANUAL_CHAPTERS[0];

  const filteredChapters = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return MANUAL_CHAPTERS;
    }

    return MANUAL_CHAPTERS.filter((chapter) => {
      if (chapter.title.toLowerCase().includes(normalized)) {
        return true;
      }
      if (chapter.objective.toLowerCase().includes(normalized)) {
        return true;
      }
      return chapter.quickActions.some((action) => action.toLowerCase().includes(normalized));
    });
  }, [query]);

  const categoryCards = useMemo(
    () =>
      filteredChapters.map((chapter) => ({
        chapter,
        icon: CHAPTER_ICON_BY_ID[chapter.id] ?? MdMenuBook,
      })),
    [filteredChapters],
  );

  const isDark = theme === "dark";
  const vividIconToneClass = isDark ? "text-red-400" : "text-red-600";

  const handleSelectChapter = (chapterId: string) => {
    setSelectedChapterId(chapterId);
    window.setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  };

  const exportAsPdf = () => {
    const generatedAt = new Date().toLocaleString("pt-BR", {
      dateStyle: "full",
      timeStyle: "short",
    });
    const blob = buildPdfBlob(generatedAt);
    const url = window.URL.createObjectURL(blob);
    const fileDate = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SurvivalNotes-Manual-${fileDate}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  const installAsApp = async () => {
    if (!installPromptEvent) {
      return;
    }

    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPromptEvent(null);
      }
    } catch {
      setInstallPromptEvent(null);
    }
  };

  return (
    <main
      className={`${displayFontClass} min-h-screen transition-colors duration-300 ${
        isDark ? "bg-[#0e1014] text-zinc-100" : "bg-[#ececf0] text-zinc-900"
      }`}
      suppressHydrationWarning
    >
      <div
        className={`fixed inset-0 -z-10 ${
          isDark
            ? "bg-[repeating-linear-gradient(145deg,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.04)_22px,transparent_22px,transparent_44px),linear-gradient(160deg,#0e1014,#171b22_50%,#0f1218)]"
            : "bg-[repeating-linear-gradient(145deg,rgba(0,0,0,0.035)_0px,rgba(0,0,0,0.035)_22px,transparent_22px,transparent_44px),linear-gradient(160deg,#ececf0,#e1e2e7_52%,#ececf1)]"
        }`}
      />

      <div className="mx-auto max-w-[1300px] px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        <header
          className={`rounded-3xl border p-4 sm:p-6 ${
            isDark ? "border-red-400/30 bg-[#151821]/88" : "border-red-700/20 bg-white/85"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p
                className={`${monoFontClass} text-[11px] font-semibold uppercase tracking-[0.18em] ${
                  isDark ? "text-red-300" : "text-red-700"
                }`}
              >
                SurvivalNotes
              </p>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-tight sm:text-3xl">
                Skills & Training
              </h1>
              <p
                className={`text-xl font-black uppercase tracking-tight sm:text-3xl ${
                  isDark ? "text-red-300" : "text-red-700"
                }`}
              >
                Equipment & Supplies
              </p>
            </div>

            <div className="flex items-center gap-2">
              {installPromptEvent ? (
                <button
                  type="button"
                  onClick={installAsApp}
                  aria-label="Instalar app"
                  title="Instalar app"
                  className={`inline-flex h-10 w-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition sm:h-auto sm:w-auto sm:px-3 sm:py-2 ${
                    isDark
                      ? "border-red-300/40 bg-red-500/15 text-red-100 hover:bg-red-500/25"
                      : "border-red-700/35 bg-red-50 text-red-800 hover:bg-red-100"
                  }`}
                >
                  <MdDownload className="h-4 w-4" />
                  <span className="hidden sm:inline">Instalar app</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={exportAsPdf}
                aria-label="Exportar PDF"
                title="Exportar PDF"
                className={`inline-flex h-10 w-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition sm:h-auto sm:w-auto sm:px-3 sm:py-2 ${
                  isDark
                    ? "border-red-300/40 bg-red-500/15 text-red-100 hover:bg-red-500/25"
                    : "border-red-700/35 bg-red-50 text-red-800 hover:bg-red-100"
                }`}
              >
                <MdPictureAsPdf className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
                aria-label={isDark ? "Mudar para tema light" : "Mudar para tema black"}
                title={isDark ? "Mudar para tema light" : "Mudar para tema black"}
                className={`inline-flex h-10 w-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition sm:h-auto sm:w-auto sm:px-3 sm:py-2 ${
                  isDark
                    ? "border-zinc-500/50 bg-zinc-800/80 text-zinc-100 hover:bg-zinc-700"
                    : "border-zinc-400/70 bg-white text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                {isDark ? <MdLightMode className="h-4 w-4" /> : <MdDarkMode className="h-4 w-4" />}
                <span className="hidden sm:inline">{isDark ? "Tema light" : "Tema black"}</span>
              </button>
            </div>
          </div>
        </header>

        <section
          className={`mt-4 rounded-3xl border px-4 py-5 sm:px-7 ${
            isDark ? "border-zinc-500/35 bg-[#161a22]/88" : "border-zinc-300 bg-white/88"
          }`}
        >
          <div className="border-t-4 border-red-600 pt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-extrabold uppercase tracking-[0.1em]">
                Categorias de navegacao
              </h2>
              <label
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  isDark ? "border-zinc-600 bg-zinc-900/60" : "border-zinc-300 bg-white"
                }`}
              >
                <MdSearch className={vividIconToneClass} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar categoria"
                  className={`w-[210px] bg-transparent text-sm outline-none placeholder:text-zinc-400 ${
                    isDark ? "text-zinc-100" : "text-zinc-900"
                  }`}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
              {categoryCards.map(({ chapter, icon: ChapterIcon }) => {
                const active = chapter.id === selectedChapter?.id;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => handleSelectChapter(chapter.id)}
                    className={`rounded-2xl border p-3 text-center transition ${
                      active
                        ? isDark
                          ? "border-red-300/70 bg-red-500/14"
                          : "border-red-700/50 bg-red-50"
                        : isDark
                          ? "border-zinc-600/60 bg-[#10141c]/90 hover:border-red-400/60"
                          : "border-zinc-300 bg-zinc-50/95 hover:border-red-600/45"
                    }`}
                  >
                    <ChapterIcon className={`mx-auto h-11 w-11 ${vividIconToneClass}`} />
                    <h3
                      className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] sm:text-xs ${
                        isDark ? "text-zinc-400" : "text-zinc-500"
                      }`}
                    >
                      Capitulo {chapter.number}
                    </h3>
                    <p
                      className={`mt-1 text-sm font-semibold leading-snug sm:text-base ${
                        isDark ? "text-zinc-300" : "text-zinc-700"
                      }`}
                    >
                      {chapter.title}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section ref={contentRef} className="mt-4">
          {selectedChapter ? (
            <article
              className={`rounded-3xl border p-4 sm:p-6 ${
                isDark ? "border-red-400/25 bg-[#151821]/88" : "border-red-700/18 bg-white/90"
              }`}
            >
              <p
                className={`${monoFontClass} text-[11px] font-semibold uppercase tracking-[0.15em] ${
                  isDark ? "text-red-300" : "text-red-700"
                }`}
              >
                {chapterLabel(selectedChapter)}
              </p>
              <h2
                className={`mt-1 text-3xl font-black uppercase tracking-tight sm:text-4xl ${
                  isDark ? "text-zinc-100" : "text-zinc-900"
                }`}
              >
                {selectedChapter.title}
              </h2>

              <p
                className={`mt-3 rounded-xl border px-3 py-3 text-sm leading-relaxed ${
                  isDark
                    ? "border-red-300/20 bg-red-500/10 text-zinc-100"
                    : "border-red-700/20 bg-red-50 text-zinc-700"
                }`}
              >
                {selectedChapter.objective}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <section
                  className={`rounded-2xl border p-3 ${
                    isDark ? "border-zinc-700 bg-zinc-900/55" : "border-zinc-300 bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MdEmergency className={`h-5 w-5 ${vividIconToneClass}`} />
                    <h3 className="text-sm font-bold uppercase">Acoes imediatas</h3>
                  </div>
                  <ul className="mt-2 space-y-2 text-sm">
                    {selectedChapter.quickActions.map((action) => (
                      <li key={action} className="flex items-start gap-2">
                        <MdBolt className={`mt-0.5 h-4 w-4 shrink-0 ${vividIconToneClass}`} />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section
                  className={`rounded-2xl border p-3 ${
                    isDark ? "border-zinc-700 bg-zinc-900/55" : "border-zinc-300 bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MdOutlineHealthAndSafety className={`h-5 w-5 ${vividIconToneClass}`} />
                    <h3 className="text-sm font-bold uppercase">Erros comuns</h3>
                  </div>
                  <ul className="mt-2 space-y-2 text-sm">
                    {selectedChapter.commonMistakes.map((mistake) => (
                      <li key={mistake} className="flex items-start gap-2">
                        <MdReport className={`mt-0.5 h-4 w-4 shrink-0 ${vividIconToneClass}`} />
                        <span>{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <div className="mt-4 space-y-3">
                {selectedChapter.blocks.map((block) => (
                  <section
                    key={block.title}
                    className={`rounded-2xl border p-3 ${
                      isDark ? "border-zinc-700 bg-zinc-900/55" : "border-zinc-300 bg-zinc-50"
                    }`}
                  >
                    <h3 className="text-sm font-bold uppercase">{block.title}</h3>
                    <ul className="mt-2 space-y-2 text-sm">
                      {block.points.map((point) => (
                        <li key={point} className="flex items-start gap-2">
                          <MdChevronRight className={`mt-0.5 h-4 w-4 shrink-0 ${vividIconToneClass}`} />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </article>
          ) : null}
        </section>

        <footer
          className={`mt-4 rounded-2xl border px-4 py-3 text-xs ${
            isDark
              ? "border-red-400/25 bg-[#151821]/85 text-zinc-300"
              : "border-red-700/20 bg-white/85 text-zinc-600"
          }`}
        >
          <div className="flex items-center gap-2">
            <MdOutlineHealthAndSafety className={`h-4 w-4 ${vividIconToneClass}`} />
            <span>Tema black/light com destaque vermelho e icones para consulta rapida.</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

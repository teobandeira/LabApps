"use client";

import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  MdChecklist,
  MdDarkMode,
  MdInsights,
  MdLightMode,
  MdMenuBook,
  MdOutlineHealthAndSafety,
  MdSearch,
  MdShield,
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

const THEME_STORAGE_KEY = "survival-notes-theme";

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

const metrics: Array<{ label: string; value: string; hint: string; icon: IconType }> = [
  {
    label: "Capitulos",
    value: String(MANUAL_CHAPTERS.length),
    hint: "Manual completo e offline",
    icon: MdMenuBook,
  },
  {
    label: "Checklist",
    value: "40+",
    hint: "Acoes acionaveis",
    icon: MdChecklist,
  },
  {
    label: "Prioridade",
    value: "Vida",
    hint: "Seguranca antes de tudo",
    icon: MdShield,
  },
  {
    label: "Formato",
    value: "Texto",
    hint: "Sem banco de dados",
    icon: MdInsights,
  },
];

export default function SurvivalNotesApp({
  displayFontClass,
  monoFontClass,
}: SurvivalNotesAppProps) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [query, setQuery] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState(MANUAL_CHAPTERS[0]?.id ?? "");
  const [visitedChapters, setVisitedChapters] = useState<string[]>(
    MANUAL_CHAPTERS[0] ? [MANUAL_CHAPTERS[0].id] : [],
  );
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const isDark = theme === "dark";

  const filteredChapters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return MANUAL_CHAPTERS;
    }

    return MANUAL_CHAPTERS.filter((chapter) => {
      if (chapter.title.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      if (chapter.objective.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      if (chapter.quickActions.some((action) => action.toLowerCase().includes(normalizedQuery))) {
        return true;
      }
      return chapter.blocks.some((block) =>
        block.points.some((point) => point.toLowerCase().includes(normalizedQuery)),
      );
    });
  }, [query]);

  const selectedChapter =
    MANUAL_CHAPTERS.find((chapter) => chapter.id === selectedChapterId) ?? MANUAL_CHAPTERS[0];

  const progressPercent = Math.round((visitedChapters.length / MANUAL_CHAPTERS.length) * 100);

  const selectChapter = (chapterId: string) => {
    setSelectedChapterId(chapterId);
    setVisitedChapters((current) =>
      current.includes(chapterId) ? current : [...current, chapterId],
    );
  };

  const toggleAction = (actionKey: string) => {
    setCheckedItems((current) => ({
      ...current,
      [actionKey]: !current[actionKey],
    }));
  };

  return (
    <main
      className={`${displayFontClass} min-h-screen transition-colors duration-300 ${
        isDark ? "bg-[#071120] text-slate-100" : "bg-[#f4f7fb] text-slate-900"
      }`}
      suppressHydrationWarning
    >
      <div
        className={`fixed inset-0 -z-10 ${
          isDark
            ? "bg-[radial-gradient(circle_at_6%_0%,rgba(6,182,212,0.22),transparent_34%),radial-gradient(circle_at_96%_4%,rgba(16,185,129,0.18),transparent_32%),linear-gradient(165deg,#071120,#0d1d37_52%,#081328)]"
            : "bg-[radial-gradient(circle_at_8%_0%,rgba(14,165,233,0.2),transparent_34%),radial-gradient(circle_at_96%_0%,rgba(20,184,166,0.16),transparent_32%),linear-gradient(165deg,#f4f7fb,#e9f0fb_52%,#f8fbff)]"
        }`}
      />

      <div className="mx-auto max-w-[1700px] px-3 pb-8 pt-4 sm:px-5 lg:px-8">
        <header
          className={`mb-4 rounded-3xl border p-4 shadow-lg backdrop-blur-xl sm:p-6 ${
            isDark ? "border-cyan-300/20 bg-[#0c1b33]/86" : "border-cyan-800/15 bg-white/90"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p
                className={`${monoFontClass} text-[11px] font-semibold uppercase tracking-[0.18em] ${
                  isDark ? "text-cyan-200/85" : "text-cyan-700/80"
                }`}
              >
                SurvivalNotes
              </p>
              <h1 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">
                Manual Operacional de Sobrevivencia
              </h1>
              <p className={`mt-2 max-w-3xl text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Guia textual completo para preparacao, resposta inicial e continuidade em cenarios
                de risco. Foco em decisao clara, prioridades reais e acao pratica.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                isDark
                  ? "border-cyan-300/35 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/18"
                  : "border-cyan-700/25 bg-cyan-50 text-cyan-800 hover:bg-cyan-100"
              }`}
            >
              {isDark ? <MdLightMode className="h-4 w-4" /> : <MdDarkMode className="h-4 w-4" />}
              {isDark ? "Tema claro" : "Tema escuro"}
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className={`rounded-2xl border p-3 ${
                  isDark ? "border-cyan-300/15 bg-[#0a1730]/78" : "border-cyan-700/15 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
                      isDark ? "bg-cyan-400/15 text-cyan-100" : "bg-cyan-100 text-cyan-800"
                    }`}
                  >
                    <metric.icon className="h-4 w-4" />
                  </span>
                  <p
                    className={`${monoFontClass} text-[11px] uppercase tracking-[0.14em] ${
                      isDark ? "text-cyan-100/75" : "text-cyan-700/75"
                    }`}
                  >
                    {metric.label}
                  </p>
                </div>
                <p className="mt-2 text-xl font-semibold">{metric.value}</p>
                <p className={`text-xs ${isDark ? "text-slate-300/90" : "text-slate-600"}`}>
                  {metric.hint}
                </p>
              </article>
            ))}
          </div>
        </header>

        <section className="mb-4 lg:hidden">
          <label
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
              isDark ? "border-cyan-300/25 bg-[#0b1932]/80" : "border-slate-300 bg-white"
            }`}
          >
            <MdSearch className={isDark ? "text-cyan-100" : "text-cyan-700"} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar capitulo, objetivo ou acao"
              className={`w-full bg-transparent text-sm outline-none placeholder:text-slate-400 ${
                isDark ? "text-slate-100" : "text-slate-900"
              }`}
            />
          </label>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {filteredChapters.map((chapter) => {
              const active = chapter.id === selectedChapter?.id;
              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => selectChapter(chapter.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? isDark
                        ? "border-cyan-200/60 bg-cyan-400/18 text-cyan-100"
                        : "border-cyan-700/50 bg-cyan-100 text-cyan-900"
                      : isDark
                        ? "border-slate-700 bg-slate-900/60 text-slate-200"
                        : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {chapter.number}
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <aside
            className={`hidden lg:block lg:sticky lg:top-4 lg:h-[calc(100vh-48px)] lg:overflow-hidden rounded-3xl border p-4 ${
              isDark ? "border-cyan-300/20 bg-[#0b1932]/88" : "border-cyan-700/15 bg-white/92"
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em]">Capitulos</h2>
              <span className={`${monoFontClass} text-xs ${isDark ? "text-cyan-100/80" : "text-cyan-700/80"}`}>
                {filteredChapters.length}/{MANUAL_CHAPTERS.length}
              </span>
            </div>

            <label
              className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 ${
                isDark ? "border-cyan-300/25 bg-slate-900/55" : "border-slate-300 bg-white"
              }`}
            >
              <MdSearch className={isDark ? "text-cyan-100" : "text-cyan-700"} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar"
                className={`w-full bg-transparent text-sm outline-none placeholder:text-slate-400 ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}
              />
            </label>

            <div className="h-[calc(100%-124px)] overflow-y-auto pr-1">
              <ul className="space-y-2">
                {filteredChapters.map((chapter) => {
                  const active = chapter.id === selectedChapter?.id;
                  const visited = visitedChapters.includes(chapter.id);

                  return (
                    <li key={chapter.id}>
                      <button
                        type="button"
                        onClick={() => selectChapter(chapter.id)}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          active
                            ? isDark
                              ? "border-cyan-200/55 bg-cyan-400/16"
                              : "border-cyan-700/45 bg-cyan-100"
                            : isDark
                              ? "border-slate-700/90 bg-slate-900/45 hover:border-cyan-300/35"
                              : "border-slate-300 bg-white hover:border-cyan-700/35"
                        }`}
                      >
                        <p
                          className={`${monoFontClass} text-[11px] uppercase tracking-[0.14em] ${
                            isDark ? "text-cyan-100/75" : "text-cyan-800/75"
                          }`}
                        >
                          Capitulo {chapter.number}
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-tight">{chapter.title}</p>
                        <p className={`mt-2 text-xs ${isDark ? "text-slate-300/90" : "text-slate-600"}`}>
                          {visited ? "Lido" : "Novo"}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          <section className="min-w-0 space-y-4">
            {selectedChapter ? (
              <article
                className={`rounded-3xl border p-4 shadow-lg sm:p-6 ${
                  isDark ? "border-cyan-300/20 bg-[#0b1933]/88" : "border-cyan-700/15 bg-white/94"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p
                      className={`${monoFontClass} text-[11px] uppercase tracking-[0.16em] ${
                        isDark ? "text-cyan-100/75" : "text-cyan-800/70"
                      }`}
                    >
                      Capitulo selecionado
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">
                      {chapterLabel(selectedChapter)}
                    </h2>
                  </div>

                  <div
                    className={`rounded-xl border px-3 py-2 text-right ${
                      isDark ? "border-cyan-300/20 bg-cyan-400/10" : "border-cyan-700/15 bg-cyan-50"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.08em]">Progresso</p>
                    <p className="text-lg font-semibold">{progressPercent}%</p>
                    <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      {visitedChapters.length} / {MANUAL_CHAPTERS.length}
                    </p>
                  </div>
                </div>

                <p
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                    isDark ? "border-cyan-300/20 bg-cyan-400/8 text-slate-100" : "border-cyan-700/15 bg-cyan-50 text-slate-700"
                  }`}
                >
                  {selectedChapter.objective}
                </p>

                <section className="mt-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em]">Acoes imediatas</h3>
                  <ul className="mt-3 space-y-2">
                    {selectedChapter.quickActions.map((action, actionIndex) => {
                      const actionKey = `${selectedChapter.id}-quick-${actionIndex}`;
                      const checked = Boolean(checkedItems[actionKey]);
                      return (
                        <li
                          key={actionKey}
                          className={`flex items-start gap-3 rounded-xl border px-3 py-2 ${
                            checked
                              ? isDark
                                ? "border-emerald-300/35 bg-emerald-400/12"
                                : "border-emerald-700/35 bg-emerald-50"
                              : isDark
                                ? "border-slate-700 bg-slate-900/50"
                                : "border-slate-300 bg-slate-50"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleAction(actionKey)}
                            aria-label={`Marcar acao: ${action}`}
                            className={`mt-0.5 h-4 w-4 shrink-0 rounded border transition ${
                              checked
                                ? isDark
                                  ? "border-emerald-300 bg-emerald-400/80"
                                  : "border-emerald-700 bg-emerald-600"
                                : isDark
                                  ? "border-slate-500 bg-slate-950"
                                  : "border-slate-400 bg-white"
                            }`}
                          />
                          <span className={`text-sm leading-relaxed ${checked ? "line-through opacity-70" : ""}`}>
                            {action}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section className="mt-6 space-y-4">
                  {selectedChapter.blocks.map((block) => (
                    <div
                      key={block.title}
                      className={`rounded-2xl border p-4 ${
                        isDark ? "border-cyan-300/12 bg-slate-900/48" : "border-slate-300 bg-slate-50"
                      }`}
                    >
                      <h4 className="text-base font-semibold">{block.title}</h4>
                      <ul className="mt-3 space-y-2">
                        {block.points.map((point) => (
                          <li key={point} className="flex items-start gap-2 text-sm leading-relaxed">
                            <span
                              className={`mt-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                                isDark ? "bg-emerald-300" : "bg-emerald-700"
                              }`}
                            />
                            <span className={isDark ? "text-slate-200" : "text-slate-700"}>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>

                <section
                  className={`mt-6 rounded-2xl border p-4 ${
                    isDark ? "border-rose-300/20 bg-rose-400/10" : "border-rose-700/20 bg-rose-50"
                  }`}
                >
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em]">Erros comuns</h3>
                  <ul className="mt-3 space-y-2">
                    {selectedChapter.commonMistakes.map((mistake) => (
                      <li key={mistake} className="flex items-start gap-2 text-sm leading-relaxed">
                        <span
                          className={`mt-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                            isDark ? "bg-rose-300" : "bg-rose-700"
                          }`}
                        />
                        <span>{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </article>
            ) : null}

            <article
              className={`rounded-3xl border p-4 sm:p-6 ${
                isDark ? "border-cyan-300/20 bg-[#0b1933]/88" : "border-cyan-700/15 bg-white/94"
              }`}
            >
              <h3 className="text-lg font-semibold">Referencias rapidas</h3>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <div
                  className={`rounded-xl border p-3 ${
                    isDark ? "border-cyan-300/12 bg-slate-900/48" : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold">Consumo de agua</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {WATER_REFERENCE.map((item) => (
                      <li key={item.scenario}>
                        <p className="font-medium">{item.scenario}</p>
                        <p className={isDark ? "text-slate-300" : "text-slate-600"}>{item.liters}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className={`rounded-xl border p-3 ${
                    isDark ? "border-cyan-300/12 bg-slate-900/48" : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold">Sinais vitais</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {VITAL_SIGNS_REFERENCE.map((item) => (
                      <li key={item.signal}>
                        <p className="font-medium">{item.signal}</p>
                        <p className={isDark ? "text-slate-300" : "text-slate-600"}>{item.value}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className={`rounded-xl border p-3 ${
                    isDark ? "border-cyan-300/12 bg-slate-900/48" : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold">Camadas de roupa</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {LAYER_REFERENCE.map((item) => (
                      <li key={item.range}>
                        <p className="font-medium">{item.range}</p>
                        <p className={isDark ? "text-slate-300" : "text-slate-600"}>{item.strategy}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          </section>

          <aside
            className={`hidden xl:block xl:sticky xl:top-4 xl:h-[calc(100vh-48px)] rounded-3xl border p-4 ${
              isDark ? "border-cyan-300/20 bg-[#0b1932]/88" : "border-cyan-700/15 bg-white/92"
            }`}
          >
            <div
              className={`rounded-2xl border p-3 ${
                isDark ? "border-cyan-300/20 bg-cyan-400/8" : "border-cyan-700/15 bg-cyan-50"
              }`}
            >
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em]">Prioridade base</h3>
              <ol className="mt-3 space-y-2 text-sm">
                <li>1. Seguranca</li>
                <li>2. Primeiros socorros</li>
                <li>3. Abrigo e temperatura</li>
                <li>4. Agua</li>
                <li>5. Comunicacao</li>
                <li>6. Comida</li>
              </ol>
            </div>

            <div className="mt-3 rounded-2xl border border-emerald-600/20 bg-emerald-400/10 p-3">
              <h3 className="text-sm font-semibold">Checklist de saida em 5 min</h3>
              <ul className="mt-2 space-y-2 text-sm">
                <li>- Pessoas prioritarias reunidas</li>
                <li>- Documento + celular + agua</li>
                <li>- Rota definida e contato avisado</li>
              </ul>
            </div>

            <div
              className={`mt-3 rounded-2xl border p-3 ${
                isDark ? "border-cyan-300/15 bg-slate-900/50" : "border-slate-300 bg-slate-50"
              }`}
            >
              <h3 className="text-sm font-semibold">Contatos essenciais</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {DEFAULT_CONTACTS.map((contact) => (
                  <li key={contact} className="leading-relaxed">
                    - {contact}
                  </li>
                ))}
              </ul>
            </div>

            <div className={`mt-3 rounded-2xl border p-3 ${isDark ? "border-cyan-300/15 bg-slate-900/50" : "border-slate-300 bg-slate-50"}`}>
              <p className="text-sm font-semibold">Uso recomendado</p>
              <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Revise um capitulo por semana, execute simulados mensais e mantenha os checklists
                impressos em local acessivel.
              </p>
            </div>
          </aside>
        </div>

        <footer className={`mt-4 rounded-2xl border px-4 py-3 text-xs ${isDark ? "border-cyan-300/20 bg-[#0b1932]/80 text-slate-300" : "border-cyan-700/15 bg-white text-slate-600"}`}>
          <div className="flex items-center gap-2">
            <MdOutlineHealthAndSafety className="h-4 w-4" />
            <span>Manual textual sem banco de dados, focado em prevencao e acao responsavel.</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

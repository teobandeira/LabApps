"use client";

import { useEffect, useMemo, useState } from "react";
import { MdSmokeFree, MdSmokingRooms, MdStars } from "react-icons/md";

const PRECO_MACO = 15;
const CIGARROS_POR_MACO = 20;
const CUSTO_POR_CIGARRO = PRECO_MACO / CIGARROS_POR_MACO;
const BONUS_ATRASO_MINUTOS = 10;
const BONUS_ATRASO_MS = BONUS_ATRASO_MINUTOS * 60 * 1000;
const BONUS_ESTRELAS_ATRASO = 5;
const PERDA_ESTRELAS_ANTES_HORARIO = 5;
const DEFAULT_HORARIO_INICIO = "05:00";
const DEFAULT_HORARIO_FIM = "22:00";
const THEME_STORAGE_KEY = "fumar-theme";
const LAST_SMOKE_AT_STORAGE_KEY = "fumar-last-smoke-at";
const APP_STATE_STORAGE_KEY = "fumar-app-state-v1";
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, "0")).join(":");
}

function formatHorario(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}

function formatHorarioCurto(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatDia(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(timestamp);
}

function parseHorario(horario: string) {
  const [horaTexto, minutoTexto] = horario.split(":");
  const hora = Number(horaTexto);
  const minuto = Number(minutoTexto);
  const ehValido =
    Number.isInteger(hora) &&
    Number.isInteger(minuto) &&
    hora >= 0 &&
    hora <= 23 &&
    minuto >= 0 &&
    minuto <= 59;

  if (!ehValido) return null;
  return hora * 60 + minuto;
}

function minutosParaHorario(totalMinutos: number) {
  const minutosNormalizados = Math.min(23 * 60 + 59, Math.max(0, totalMinutos));
  const hora = Math.floor(minutosNormalizados / 60);
  const minuto = minutosNormalizados % 60;
  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

function getJanelaDoDia(referenceTimestamp: number, horarioInicio: string, horarioFim: string) {
  const minutosInicio = parseHorario(horarioInicio) ?? parseHorario(DEFAULT_HORARIO_INICIO) ?? 300;
  const minutosFim = parseHorario(horarioFim) ?? parseHorario(DEFAULT_HORARIO_FIM) ?? 1320;
  const inicio = new Date(referenceTimestamp);
  inicio.setHours(Math.floor(minutosInicio / 60), minutosInicio % 60, 0, 0);

  const fim = new Date(referenceTimestamp);
  fim.setHours(Math.floor(minutosFim / 60), minutosFim % 60, 0, 0);

  return {
    inicio: inicio.getTime(),
    fim: fim.getTime(),
  };
}

function getHorariosDaMeta(
  meta: number,
  referenceTimestamp: number,
  horarioInicio: string,
  horarioFim: string,
) {
  if (meta <= 0) return [];

  const { inicio, fim } = getJanelaDoDia(referenceTimestamp, horarioInicio, horarioFim);
  if (meta === 1) return [inicio];

  const intervalo = (fim - inicio) / (meta - 1);
  return Array.from({ length: meta }, (_, index) => Math.round(inicio + intervalo * index));
}

type HistoricoFumada = {
  timestamp: number;
  horarioMeta: number | null;
  impactoEstrelas: -5 | 0 | 5;
};

type PersistedAppState = {
  metaDia: number;
  horarioInicio: string;
  horarioFim: string;
  estrelas: number;
  cigarrosHoje: number;
  historicoFumadas: HistoricoFumada[];
  ultimoCigarroEm: number;
};

function isHistoricoFumada(value: unknown): value is HistoricoFumada {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;
  const timestamp = item.timestamp;
  const horarioMeta = item.horarioMeta;
  const impactoEstrelas = item.impactoEstrelas;

  const timestampValido = typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp > 0;
  const horarioMetaValido =
    horarioMeta === null ||
    (typeof horarioMeta === "number" && Number.isFinite(horarioMeta) && horarioMeta > 0);
  const impactoValido =
    impactoEstrelas === -5 || impactoEstrelas === 0 || impactoEstrelas === 5;

  return timestampValido && horarioMetaValido && impactoValido;
}

function getInitialPersistedState(): PersistedAppState {
  const now = Date.now();
  const defaultState: PersistedAppState = {
    metaDia: 10,
    horarioInicio: DEFAULT_HORARIO_INICIO,
    horarioFim: DEFAULT_HORARIO_FIM,
    estrelas: 0,
    cigarrosHoje: 0,
    historicoFumadas: [],
    ultimoCigarroEm: now,
  };

  if (typeof window === "undefined") return defaultState;

  const lastSmokeLegacy = Number(window.localStorage.getItem(LAST_SMOKE_AT_STORAGE_KEY));
  const legacyLastSmokeAt =
    Number.isFinite(lastSmokeLegacy) && lastSmokeLegacy > 0 ? lastSmokeLegacy : now;

  const raw = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
  if (!raw) {
    return {
      ...defaultState,
      ultimoCigarroEm: legacyLastSmokeAt,
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {
        ...defaultState,
        ultimoCigarroEm: legacyLastSmokeAt,
      };
    }

    const data = parsed as Record<string, unknown>;
    const metaDia =
      typeof data.metaDia === "number" && Number.isFinite(data.metaDia)
        ? Math.max(0, Math.floor(data.metaDia))
        : defaultState.metaDia;
    const horarioInicio =
      typeof data.horarioInicio === "string" && parseHorario(data.horarioInicio) !== null
        ? data.horarioInicio
        : defaultState.horarioInicio;
    const horarioFimBruto =
      typeof data.horarioFim === "string" && parseHorario(data.horarioFim) !== null
        ? data.horarioFim
        : defaultState.horarioFim;
    const inicioMinutos = parseHorario(horarioInicio) ?? parseHorario(DEFAULT_HORARIO_INICIO) ?? 300;
    const fimMinutosBruto = parseHorario(horarioFimBruto) ?? parseHorario(DEFAULT_HORARIO_FIM) ?? 1320;
    const horarioFim =
      fimMinutosBruto <= inicioMinutos
        ? minutosParaHorario(Math.min(23 * 60 + 59, inicioMinutos + 60))
        : horarioFimBruto;
    const estrelas =
      typeof data.estrelas === "number" && Number.isFinite(data.estrelas)
        ? Math.floor(data.estrelas)
        : defaultState.estrelas;
    const cigarrosHoje =
      typeof data.cigarrosHoje === "number" && Number.isFinite(data.cigarrosHoje)
        ? Math.max(0, Math.floor(data.cigarrosHoje))
        : defaultState.cigarrosHoje;
    const historicoFumadas = Array.isArray(data.historicoFumadas)
      ? data.historicoFumadas.filter(isHistoricoFumada)
      : defaultState.historicoFumadas;
    const ultimoCigarroEm =
      typeof data.ultimoCigarroEm === "number" &&
      Number.isFinite(data.ultimoCigarroEm) &&
      data.ultimoCigarroEm > 0
        ? data.ultimoCigarroEm
        : legacyLastSmokeAt;

    return {
      metaDia,
      horarioInicio,
      horarioFim,
      estrelas,
      cigarrosHoje,
      historicoFumadas,
      ultimoCigarroEm,
    };
  } catch {
    return {
      ...defaultState,
      ultimoCigarroEm: legacyLastSmokeAt,
    };
  }
}

export default function StopSmokingScreen() {
  const [tema, setTema] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const temaSalvo = window.localStorage.getItem(THEME_STORAGE_KEY);
    return temaSalvo === "dark" || temaSalvo === "light" ? temaSalvo : "dark";
  });
  const [initialAppState] = useState(getInitialPersistedState);
  const [metaDia, setMetaDia] = useState(initialAppState.metaDia);
  const [metaInput, setMetaInput] = useState(String(initialAppState.metaDia));
  const [horarioInicio, setHorarioInicio] = useState(initialAppState.horarioInicio);
  const [horarioFim, setHorarioFim] = useState(initialAppState.horarioFim);
  const [horarioInicioInput, setHorarioInicioInput] = useState(initialAppState.horarioInicio);
  const [horarioFimInput, setHorarioFimInput] = useState(initialAppState.horarioFim);
  const [estrelas, setEstrelas] = useState(initialAppState.estrelas);
  const [cigarrosHoje, setCigarrosHoje] = useState(initialAppState.cigarrosHoje);
  const [historicoFumadas, setHistoricoFumadas] = useState<HistoricoFumada[]>(
    initialAppState.historicoFumadas,
  );
  const [ultimoCigarroEm, setUltimoCigarroEm] = useState(initialAppState.ultimoCigarroEm);
  const [agora, setAgora] = useState(() => Date.now());
  const [modalAberto, setModalAberto] = useState(false);
  const [modalConfirmacaoAntesAberto, setModalConfirmacaoAntesAberto] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAgora(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, tema);
  }, [tema]);

  useEffect(() => {
    const payload: PersistedAppState = {
      metaDia,
      horarioInicio,
      horarioFim,
      estrelas,
      cigarrosHoje,
      historicoFumadas,
      ultimoCigarroEm,
    };
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(payload));
    window.localStorage.setItem(LAST_SMOKE_AT_STORAGE_KEY, String(ultimoCigarroEm));
  }, [
    cigarrosHoje,
    estrelas,
    historicoFumadas,
    horarioFim,
    horarioInicio,
    metaDia,
    ultimoCigarroEm,
  ]);

  const isDark = tema === "dark";

  const tempoSemFumar = useMemo(
    () => formatDuration(Math.max(0, agora - ultimoCigarroEm)),
    [agora, ultimoCigarroEm],
  );

  const progresso = useMemo(() => {
    if (metaDia <= 0) return 0;
    return Math.min(100, Math.round((cigarrosHoje / metaDia) * 100));
  }, [cigarrosHoje, metaDia]);

  const creditoUsado = useMemo(() => cigarrosHoje * CUSTO_POR_CIGARRO, [cigarrosHoje]);

  const creditoUsadoLabel = useMemo(
    () => `-${currencyFormatter.format(creditoUsado)}`,
    [creditoUsado],
  );

  const historicoMetasPorDia = useMemo(() => {
    const contadorPorDia = new Map<
      string,
      { dia: string; cigarros: number; timestamp: number; meta: number }
    >();

    historicoFumadas.forEach((registro) => {
      const dia = new Date(registro.timestamp);
      const diaKey = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(
        dia.getDate(),
      ).padStart(2, "0")}`;
      const atual = contadorPorDia.get(diaKey);

      if (atual) {
        atual.cigarros += 1;
        return;
      }

      contadorPorDia.set(diaKey, {
        dia: formatDia(registro.timestamp),
        cigarros: 1,
        timestamp: registro.timestamp,
        meta: metaDia,
      });
    });

    return Array.from(contadorPorDia.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [historicoFumadas, metaDia]);

  const controleHorario = useMemo(() => {
    const horarios = getHorariosDaMeta(metaDia, agora, horarioInicio, horarioFim);
    const dentroDaMeta = cigarrosHoje < metaDia;
    const podeFumarAgora = metaDia > 0 && dentroDaMeta;
    const proximoHorario = cigarrosHoje < horarios.length ? horarios[cigarrosHoje] : null;
    const estaNaJanelaIdeal =
      proximoHorario !== null &&
      agora >= proximoHorario &&
      agora <= proximoHorario + BONUS_ATRASO_MS;
    const antesDoHorario = proximoHorario !== null && agora < proximoHorario;

    let mensagemControle = "";
    if (metaDia <= 0) {
      mensagemControle = "Defina uma meta do dia maior que zero.";
    } else if (!dentroDaMeta) {
      mensagemControle = "Meta do dia atingida.";
    } else if (antesDoHorario && proximoHorario) {
      mensagemControle = `Fora da janela ideal. Se confirmar antes de ${formatHorarioCurto(
        proximoHorario,
      )}, perde ${PERDA_ESTRELAS_ANTES_HORARIO} estrelas.`;
    } else if (proximoHorario && agora - proximoHorario > BONUS_ATRASO_MS) {
      mensagemControle = `Se fumar agora, ganha ${BONUS_ESTRELAS_ATRASO} estrelas (mais de ${BONUS_ATRASO_MINUTOS} min apos o horario).`;
    } else if (estaNaJanelaIdeal) {
      mensagemControle = "Janela ideal ativa: botao verde para fumar.";
    } else {
      mensagemControle = "Botao vermelho fora da janela ideal.";
    }

    return {
      horarios,
      proximoHorario,
      estaNaJanelaIdeal,
      antesDoHorario,
      podeFumarAgora,
      mensagemControle,
    };
  }, [agora, cigarrosHoje, horarioFim, horarioInicio, metaDia]);

  const registrarCigarro = (confirmadoAntesDoHorario = false) => {
    if (!controleHorario.podeFumarAgora) return;

    const agoraAtual = Date.now();
    const horarioMeta = controleHorario.horarios[cigarrosHoje] ?? null;
    const estaAntesDoHorario = horarioMeta !== null && agoraAtual < horarioMeta;
    const confirmouAntesDoHorario = confirmadoAntesDoHorario === true;

    if (estaAntesDoHorario && !confirmouAntesDoHorario) {
      setModalConfirmacaoAntesAberto(true);
      return;
    }

    let impactoEstrelas: -5 | 0 | 5 = 0;

    if (horarioMeta !== null) {
      if (estaAntesDoHorario) {
        impactoEstrelas = -5;
      } else if (agoraAtual - horarioMeta > BONUS_ATRASO_MS) {
        impactoEstrelas = 5;
      }
    }

    setCigarrosHoje((valorAtual) => valorAtual + 1);
    setEstrelas((valorAtual) => valorAtual + impactoEstrelas);
    setHistoricoFumadas((valorAtual) => [
      ...valorAtual,
      {
        timestamp: agoraAtual,
        horarioMeta,
        impactoEstrelas,
      },
    ]);
    setUltimoCigarroEm(agoraAtual);
    setAgora(agoraAtual);
    setModalConfirmacaoAntesAberto(false);
  };

  const abrirModalMeta = () => {
    setMetaInput(String(metaDia));
    setHorarioInicioInput(horarioInicio);
    setHorarioFimInput(horarioFim);
    setModalAberto(true);
  };

  const confirmarFumarAntesDoHorario = () => {
    registrarCigarro(true);
  };

  const zerarCigarros = () => {
    const agoraAtual = Date.now();
    setCigarrosHoje(0);
    setHistoricoFumadas([]);
    setUltimoCigarroEm(agoraAtual);
    setAgora(agoraAtual);
    setModalConfirmacaoAntesAberto(false);
    setModalAberto(false);
  };

  const salvarMeta = () => {
    const numero = Number(metaInput);
    const metaNormalizada = Number.isFinite(numero) ? Math.max(0, Math.floor(numero)) : metaDia;
    const inicioMinutos = parseHorario(horarioInicioInput);
    const fimMinutos = parseHorario(horarioFimInput);
    const inicioNormalizado = inicioMinutos ?? parseHorario(horarioInicio) ?? 300;
    let fimNormalizado = fimMinutos ?? parseHorario(horarioFim) ?? 1320;

    if (fimNormalizado <= inicioNormalizado) {
      fimNormalizado = Math.min(23 * 60 + 59, inicioNormalizado + 60);
    }

    setMetaDia(metaNormalizada);
    setMetaInput(String(metaNormalizada));
    setHorarioInicio(minutosParaHorario(inicioNormalizado));
    setHorarioFim(minutosParaHorario(fimNormalizado));
    setHorarioInicioInput(minutosParaHorario(inicioNormalizado));
    setHorarioFimInput(minutosParaHorario(fimNormalizado));
    setModalAberto(false);
  };

  const mainClassName = isDark
    ? "min-h-screen bg-[radial-gradient(circle_at_20%_0%,#2b1247_0%,#12071f_42%,#05020a_100%)] text-zinc-100 [&_a]:cursor-pointer [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed"
    : "min-h-screen bg-[linear-gradient(160deg,#ffffff_0%,#f7f2ff_55%,#efe7ff_100%)] text-[#251a36] [&_a]:cursor-pointer [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed";

  const articleClassName = isDark
    ? "rounded-3xl border border-violet-900/60 bg-[#0f0a1acc] p-6 shadow-[0_24px_54px_rgba(45,16,85,0.45)] backdrop-blur-sm sm:p-8"
    : "rounded-3xl border border-[#ddccff] bg-white/95 p-6 shadow-[0_24px_54px_rgba(85,43,163,0.16)] backdrop-blur-sm sm:p-8";

  const cardClassName = isDark
    ? "rounded-2xl border border-violet-900/60 bg-violet-950/30 p-4"
    : "rounded-2xl border border-[#e2d5ff] bg-[#fcfaff] p-4";

  return (
    <main className={mainClassName}>
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-10 sm:px-7">
        <article className={articleClassName}>
          <header>
            <div className="flex items-center justify-between gap-3">
              <p
                className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                  isDark ? "text-violet-300" : "text-[#7040c9]"
                }`}
              >
                APP
              </p>

              <div className="inline-flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold leading-none ${
                    isDark
                      ? "border-violet-700/70 bg-violet-950/60 text-amber-200"
                      : "border-[#ccb8ff] bg-[#f4eeff] text-amber-700"
                  }`}
                >
                  <MdStars className="h-5 w-5" />
                  {estrelas}
                </span>

                <button
                  type="button"
                  onClick={() => setTema((valorAtual) => (valorAtual === "dark" ? "light" : "dark"))}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    isDark
                      ? "border-violet-700/70 bg-violet-950/60 text-violet-100 hover:bg-violet-900/70"
                      : "border-[#ccb8ff] bg-[#f4eeff] text-[#4f2c8c] hover:bg-[#ece1ff]"
                  }`}
                >
                  <span>{isDark ? "Black" : "Light"}</span>
                  <span
                    className={`relative h-5 w-10 rounded-full transition ${
                      isDark ? "bg-violet-800" : "bg-violet-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                        isDark ? "left-0.5" : "left-5"
                      }`}
                    />
                  </span>
                </button>
              </div>
            </div>

            <h1
              className={`mt-3 inline-flex items-center gap-2 text-3xl font-bold leading-tight sm:text-4xl ${
                isDark ? "text-zinc-100" : "text-[#2b164a]"
              }`}
            >
              <MdSmokeFree
                className={`h-8 w-8 sm:h-9 sm:w-9 ${isDark ? "text-violet-300" : "text-[#7c3aed]"}`}
              />
              Smoke Control
            </h1>
            <p className={`mt-2 text-sm ${isDark ? "text-violet-200/85" : "text-[#5f428f]"}`}>
              Cada clique em <strong className={isDark ? "text-zinc-100" : ""}>Fumar</strong> registra
              um cigarro e reinicia o cronometro.
            </p>
          </header>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className={cardClassName}>
              <p className={`text-xs uppercase tracking-[0.14em] ${isDark ? "text-violet-300" : "text-[#7141c9]"}`}>
                Cronometro
              </p>
              <p className={`mt-2 font-mono text-4xl font-semibold ${isDark ? "text-zinc-100" : "text-[#2f1a53]"}`}>
                {tempoSemFumar}
              </p>
              <p className={`mt-2 text-xs ${isDark ? "text-violet-200/70" : "text-[#7458a2]"}`}>
                Tempo desde o ultimo cigarro
              </p>
            </div>

            <div className={cardClassName}>
              <p className={`text-xs uppercase tracking-[0.14em] ${isDark ? "text-violet-300" : "text-[#7141c9]"}`}>
                Meta do dia
              </p>
              <p className={`mt-2 text-3xl font-semibold ${isDark ? "text-zinc-100" : "text-[#2f1a53]"}`}>
                {cigarrosHoje} / {metaDia}
              </p>
              <div
                className={`mt-3 h-3 overflow-hidden rounded-full ${
                  isDark ? "bg-violet-950/80" : "bg-violet-100"
                }`}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    isDark
                      ? "bg-[linear-gradient(90deg,#a855f7_0%,#7c3aed_100%)]"
                      : "bg-[linear-gradient(90deg,#8b5cf6_0%,#6d28d9_100%)]"
                  }`}
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <p className={`mt-2 text-xs ${isDark ? "text-violet-200/70" : "text-[#7458a2]"}`}>
                {progresso}% da meta consumida
              </p>
            </div>

            <div className={cardClassName}>
              <p className={`text-xs uppercase tracking-[0.14em] ${isDark ? "text-violet-300" : "text-[#7141c9]"}`}>
                Dinheiro gasto
              </p>
              <p className={`mt-2 text-3xl font-semibold ${isDark ? "text-rose-300" : "text-[#b91c1c]"}`}>
                {creditoUsadoLabel}
              </p>
              <p className={`mt-2 text-xs ${isDark ? "text-violet-200/70" : "text-[#7458a2]"}`}>
                Custo por clique: {currencyFormatter.format(CUSTO_POR_CIGARRO)} (maco{" "}
                {currencyFormatter.format(PRECO_MACO)} / {CIGARROS_POR_MACO} cigarros)
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => registrarCigarro(false)}
              disabled={!controleHorario.podeFumarAgora}
              className={`inline-flex flex-1 items-center justify-center rounded-2xl px-6 py-4 text-lg font-semibold transition ${
                controleHorario.podeFumarAgora
                  ? controleHorario.estaNaJanelaIdeal
                    ? isDark
                      ? "bg-[linear-gradient(135deg,#22c55e_0%,#15803d_100%)] text-white shadow-[0_16px_30px_rgba(34,197,94,0.3)] hover:brightness-110 active:translate-y-px"
                      : "bg-[linear-gradient(135deg,#22c55e_0%,#15803d_100%)] text-white shadow-[0_16px_30px_rgba(21,128,61,0.35)] hover:brightness-105 active:translate-y-px"
                    : isDark
                      ? "bg-[linear-gradient(135deg,#ef4444_0%,#b91c1c_100%)] text-white shadow-[0_16px_30px_rgba(239,68,68,0.3)] hover:brightness-110 active:translate-y-px"
                      : "bg-[linear-gradient(135deg,#ef4444_0%,#b91c1c_100%)] text-[#fff9f3] shadow-[0_16px_30px_rgba(185,28,28,0.35)] hover:brightness-105 active:translate-y-px"
                  : isDark
                    ? "cursor-not-allowed bg-zinc-800 text-zinc-500 opacity-70"
                    : "cursor-not-allowed bg-[#c6a88f] text-[#fff9f3] opacity-70"
              }`}
            >
              Fumar
            </button>

            <button
              type="button"
              onClick={abrirModalMeta}
              className={`inline-flex items-center justify-center rounded-2xl border px-6 py-4 text-lg font-semibold transition ${
                isDark
                  ? "border-violet-700/70 bg-violet-900/40 text-violet-100 hover:bg-violet-900/60"
                  : "border-[#cbb5ff] bg-[#f4eeff] text-[#5a3696] hover:bg-[#ece3ff]"
              }`}
            >
              Meta do dia
            </button>
          </div>

          <p className={`mt-3 text-sm ${isDark ? "text-violet-100/90" : "text-[#5f428f]"}`}>
            {controleHorario.mensagemControle}
          </p>

          <div className={`${cardClassName} mt-6`}>
            <p className={`text-xs uppercase tracking-[0.14em] ${isDark ? "text-violet-300" : "text-[#7141c9]"}`}>
              Horarios da meta ({horarioInicio} ate {horarioFim})
            </p>
            {controleHorario.horarios.length > 0 ? (
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {controleHorario.horarios.map((horario, index) => {
                  const jaConsumido = index < cigarrosHoje;
                  const proximoDaFila = index === cigarrosHoje;
                  return (
                    <li
                      key={`${horario}-${index}`}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                        jaConsumido
                          ? isDark
                            ? "border-violet-700/60 bg-violet-900/30 text-violet-200"
                            : "border-[#d2bfff] bg-[#f4eeff] text-[#5a3a92]"
                          : proximoDaFila
                            ? isDark
                              ? "border-violet-400/80 bg-violet-500/20 text-violet-100"
                              : "border-[#8b5cf6] bg-[#efe7ff] text-[#4c2f84]"
                            : isDark
                              ? "border-violet-900/60 bg-violet-950/25 text-violet-200/85"
                              : "border-[#e2d5ff] bg-white text-[#5d4389]"
                      }`}
                    >
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                          jaConsumido
                            ? isDark
                              ? "border-violet-300/40 bg-violet-300/15"
                              : "border-[#8b5cf6]/35 bg-[#ede2ff]"
                            : proximoDaFila
                              ? isDark
                                ? "border-violet-200/60 bg-violet-300/20"
                                : "border-[#7c3aed]/45 bg-[#e8ddff]"
                              : isDark
                                ? "border-violet-400/25 bg-violet-500/10"
                                : "border-[#a78bfa]/35 bg-[#f3eeff]"
                        }`}
                      >
                        <MdSmokingRooms
                          className={`h-4 w-4 ${
                            jaConsumido
                              ? isDark
                                ? "text-violet-200"
                                : "text-[#6a3fb5]"
                              : proximoDaFila
                                ? isDark
                                  ? "text-violet-100"
                                  : "text-[#4c2f84]"
                                : isDark
                                  ? "text-violet-300/80"
                                  : "text-[#7b5bb6]"
                          }`}
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold">{formatHorarioCurto(horario)}</p>
                        <p className="mt-0.5 text-[11px]">
                          {jaConsumido
                            ? "Consumido"
                            : proximoDaFila
                              ? "Proximo"
                              : "Futuro"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={`mt-2 text-sm ${isDark ? "text-violet-200/70" : "text-[#7458a2]"}`}>
                Defina a meta para gerar os horarios do dia.
              </p>
            )}
          </div>

          <div className={`${cardClassName} mt-6`}>
            <p className={`text-xs uppercase tracking-[0.14em] ${isDark ? "text-violet-300" : "text-[#7141c9]"}`}>
              Horarios registrados
            </p>
            {historicoFumadas.length > 0 ? (
              <ul className="mt-3 max-h-40 space-y-2 overflow-auto pr-1">
                {[...historicoFumadas].reverse().map((registro, index) => {
                  const quantidadeEstrelas = Math.abs(registro.impactoEstrelas);
                  const sufixoEstrela = quantidadeEstrelas === 1 ? "estrela" : "estrelas";
                  const impactoLabel =
                    registro.impactoEstrelas > 0
                      ? `+${quantidadeEstrelas} ${sufixoEstrela}`
                      : registro.impactoEstrelas < 0
                        ? `-${quantidadeEstrelas} ${sufixoEstrela}`
                        : `0 ${sufixoEstrela}`;

                  const impactoClassName =
                    registro.impactoEstrelas > 0
                      ? isDark
                        ? "text-emerald-300"
                        : "text-emerald-700"
                      : registro.impactoEstrelas < 0
                        ? isDark
                          ? "text-rose-300"
                          : "text-rose-700"
                        : isDark
                          ? "text-violet-200"
                          : "text-[#6b4ea1]";

                  return (
                    <li
                      key={`${registro.timestamp}-${index}`}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        isDark
                          ? "border-violet-900/60 bg-violet-950/25 text-violet-100"
                          : "border-[#e2d5ff] bg-white text-[#5d4389]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{formatHorario(registro.timestamp)}</span>
                        <span className={`font-semibold ${isDark ? "text-rose-300" : "text-[#8a2e2a]"}`}>
                          -{currencyFormatter.format(CUSTO_POR_CIGARRO)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
                        <span className={isDark ? "text-violet-300/90" : "text-[#7458a2]"}>
                          Meta: {registro.horarioMeta ? formatHorarioCurto(registro.horarioMeta) : "--:--"}
                        </span>
                        <span className={`font-semibold ${impactoClassName}`}>{impactoLabel}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={`mt-2 text-sm ${isDark ? "text-violet-200/70" : "text-[#7458a2]"}`}>
                Nenhum horario registrado por enquanto.
              </p>
            )}
          </div>

          <div className={`${cardClassName} mt-6`}>
            <p className={`text-xs uppercase tracking-[0.14em] ${isDark ? "text-violet-300" : "text-[#7141c9]"}`}>
              Historico de metas
            </p>
            {historicoMetasPorDia.length > 0 ? (
              <ul className="mt-3 max-h-40 space-y-2 overflow-auto pr-1">
                {historicoMetasPorDia.map((dia) => (
                  <li
                    key={dia.dia}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                      isDark
                        ? "border-violet-900/60 bg-violet-950/25 text-violet-100"
                        : "border-[#e2d5ff] bg-white text-[#5d4389]"
                    }`}
                  >
                    <span>{dia.dia}</span>
                    <span className={`font-semibold ${isDark ? "text-zinc-100" : "text-[#2f1a53]"}`}>
                      {dia.cigarros} de {dia.meta}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`mt-2 text-sm ${isDark ? "text-violet-200/70" : "text-[#7458a2]"}`}>
                Ainda nao ha dias registrados.
              </p>
            )}
          </div>
        </article>
      </section>

      {modalAberto ? (
        <div
          className={`fixed inset-0 z-40 flex items-center justify-center px-4 ${
            isDark ? "bg-black/70" : "bg-violet-900/30"
          }`}
        >
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] sm:p-6 ${
              isDark
                ? "border-violet-700/60 bg-[#120a1f]"
                : "border-[#ddccff] bg-white"
            }`}
          >
            <h2 className={`text-xl font-bold ${isDark ? "text-zinc-100" : "text-[#2b164a]"}`}>
              Configurar meta do dia
            </h2>
            <p className={`mt-1 text-sm ${isDark ? "text-violet-200/85" : "text-[#5f428f]"}`}>
              Defina quantos cigarros voce quer limitar hoje.
            </p>

            <label
              className={`mt-4 block text-sm font-medium ${isDark ? "text-violet-100" : "text-[#5a3696]"}`}
              htmlFor="meta-dia-input"
            >
              Numero de cigarros
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="meta-dia-input"
                type="number"
                min={0}
                step={1}
                value={metaInput}
                onChange={(event) => setMetaInput(event.target.value)}
                className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ${
                  isDark
                    ? "border-violet-700/70 bg-violet-950/40 text-zinc-100 focus:border-violet-400 focus:ring-violet-400/25"
                    : "border-[#d8c7ff] bg-white text-[#2f1a53] focus:border-[#7c3aed] focus:ring-[#8b5cf6]/35"
                }`}
              />
              <button
                type="button"
                onClick={zerarCigarros}
                className={`inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2 font-semibold transition ${
                  isDark
                    ? "bg-rose-600 text-white hover:bg-rose-500"
                    : "bg-[#ef4444] text-white hover:bg-[#dc2626]"
                }`}
              >
                Zerar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-violet-100" : "text-[#5a3696]"}`}
                  htmlFor="horario-inicio-input"
                >
                  Inicio
                </label>
                <input
                  id="horario-inicio-input"
                  type="time"
                  value={horarioInicioInput}
                  onChange={(event) => setHorarioInicioInput(event.target.value)}
                  className={`mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ${
                    isDark
                      ? "border-violet-700/70 bg-violet-950/40 text-zinc-100 [color-scheme:dark] focus:border-violet-400 focus:ring-violet-400/25"
                      : "border-[#d8c7ff] bg-white text-[#2f1a53] focus:border-[#7c3aed] focus:ring-[#8b5cf6]/35"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-violet-100" : "text-[#5a3696]"}`}
                  htmlFor="horario-fim-input"
                >
                  Fim
                </label>
                <input
                  id="horario-fim-input"
                  type="time"
                  value={horarioFimInput}
                  onChange={(event) => setHorarioFimInput(event.target.value)}
                  className={`mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ${
                    isDark
                      ? "border-violet-700/70 bg-violet-950/40 text-zinc-100 [color-scheme:dark] focus:border-violet-400 focus:ring-violet-400/25"
                      : "border-[#d8c7ff] bg-white text-[#2f1a53] focus:border-[#7c3aed] focus:ring-[#8b5cf6]/35"
                  }`}
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={salvarMeta}
                className={`inline-flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 font-semibold transition ${
                  isDark
                    ? "bg-violet-600 text-white hover:bg-violet-500"
                    : "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                }`}
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className={`inline-flex flex-1 items-center justify-center rounded-xl border px-4 py-2.5 font-semibold transition ${
                  isDark
                    ? "border-violet-700/60 bg-violet-950/30 text-violet-100 hover:bg-violet-900/45"
                    : "border-[#ccb8ff] bg-[#f4eeff] text-[#5a3696] hover:bg-[#ece3ff]"
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalConfirmacaoAntesAberto ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
            isDark ? "bg-black/70" : "bg-violet-900/30"
          }`}
        >
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] sm:p-6 ${
              isDark ? "border-violet-700/60 bg-[#120a1f]" : "border-[#ddccff] bg-white"
            }`}
          >
            <h2 className={`text-xl font-bold ${isDark ? "text-zinc-100" : "text-[#2b164a]"}`}>
              Fumar antes do horario?
            </h2>
            <p className={`mt-2 text-sm ${isDark ? "text-violet-200/85" : "text-[#5f428f]"}`}>
              Deseja mesmo fumar antes do horario? Voce perdera {PERDA_ESTRELAS_ANTES_HORARIO} estrelas
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={confirmarFumarAntesDoHorario}
                className={`inline-flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 font-semibold transition ${
                  isDark
                    ? "bg-[#ef4444] text-white hover:bg-[#dc2626]"
                    : "bg-[#ef4444] text-white hover:bg-[#dc2626]"
                }`}
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setModalConfirmacaoAntesAberto(false)}
                className={`inline-flex flex-1 items-center justify-center rounded-xl border px-4 py-2.5 font-semibold transition ${
                  isDark
                    ? "border-violet-700/60 bg-violet-950/30 text-violet-100 hover:bg-violet-900/45"
                    : "border-[#ccb8ff] bg-[#f4eeff] text-[#5a3696] hover:bg-[#ece3ff]"
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

"use client";

import Link from "next/link";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  MdAnalytics,
  MdArrowOutward,
  MdAssessment,
  MdAssignmentTurnedIn,
  MdAutoAwesome,
  MdBalance,
  MdBiotech,
  MdCalendarMonth,
  MdCircle,
  MdDataUsage,
  MdEventNote,
  MdFactCheck,
  MdFilterAlt,
  MdGavel,
  MdGroups,
  MdHub,
  MdManageSearch,
  MdModelTraining,
  MdNotificationsActive,
  MdOutlineSearch,
  MdPsychologyAlt,
  MdSchedule,
  MdSecurity,
  MdSmartToy,
  MdSpaceDashboard,
  MdSummarize,
  MdTimeline,
  MdTrendingUp,
  MdTune,
  MdUploadFile,
  MdViewKanban,
  MdWarningAmber,
} from "react-icons/md";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

type ProcessRisk = "Alto" | "Medio" | "Baixo";

type MenuItem = {
  label: string;
  icon: IconType;
  active?: boolean;
  badge?: string;
};

type ProcessBase = {
  numero: string;
  cliente: string;
  area: string;
  advogado: string;
  fase: string;
  tribunal: string;
  prazoDias: number;
  diasSemAtualizacao: number;
  valorMilhoes: number;
  chancePerda: number;
  docsPendentes: number;
  mudancasRecentes: number;
  sensibilidade: number;
  urgenciaOperacional: number;
  historicoVitorias: number;
  timeline: Array<{ data: string; titulo: string; detalhe: string }>;
};

type EnrichedProcess = ProcessBase & {
  risco: ProcessRisk;
  prioridade: "Hoje" | "72h" | "Semana";
  riskScore: number;
  aiConfidence: number;
  dueDate: string;
  expectedLossMilhoes: number;
  fatorCritico: string;
  aiSummary: string;
  recommendations: string[];
};

type AiTool = {
  nome: string;
  proposito: string;
  cobertura: string;
  status: "Ativo" | "Treino" | "Ajuste";
  icon: IconType;
};

const MENU_ITEMS: MenuItem[] = [
  { label: "Visao geral", icon: MdSpaceDashboard, active: true },
  { label: "Copiloto IA", icon: MdSmartToy, badge: "24" },
  { label: "Processos", icon: MdViewKanban, badge: "248" },
  { label: "Alertas", icon: MdNotificationsActive, badge: "17" },
  { label: "Analises", icon: MdAnalytics },
];

const FILTERS = [
  "Cliente",
  "Tribunal",
  "Advogado",
  "Fase",
  "Area juridica",
  "Status",
  "Risco IA",
  "Periodo",
  "Valor da causa",
];

const PROCESS_BASE: ProcessBase[] = [
  {
    numero: "0034217-19.2022.8.26.0100",
    cliente: "Atlas Metalurgia",
    area: "Trabalhista",
    advogado: "Carla Mendes",
    fase: "Recursal",
    tribunal: "TRT-2",
    prazoDias: 2,
    diasSemAtualizacao: 18,
    valorMilhoes: 2.4,
    chancePerda: 0.64,
    docsPendentes: 2,
    mudancasRecentes: 3,
    sensibilidade: 0.9,
    urgenciaOperacional: 0.86,
    historicoVitorias: 0.41,
    timeline: [
      {
        data: "17 Mar 2026",
        titulo: "Intimacao recente",
        detalhe: "Prazo para contrarrazoes ate 21 Mar 2026.",
      },
      {
        data: "16 Jan 2026",
        titulo: "Recurso ordinario",
        detalhe: "Recurso da parte autora protocolado.",
      },
      {
        data: "04 Nov 2025",
        titulo: "Sentenca parcial",
        detalhe: "Decisao parcialmente procedente.",
      },
    ],
  },
  {
    numero: "1009842-55.2021.8.19.0001",
    cliente: "Ventura Logistica",
    area: "Civel",
    advogado: "Rafael Telles",
    fase: "Instrucao",
    tribunal: "TJRJ",
    prazoDias: 4,
    diasSemAtualizacao: 27,
    valorMilhoes: 0.98,
    chancePerda: 0.48,
    docsPendentes: 3,
    mudancasRecentes: 2,
    sensibilidade: 0.62,
    urgenciaOperacional: 0.74,
    historicoVitorias: 0.53,
    timeline: [
      {
        data: "15 Mar 2026",
        titulo: "Pedido de pericia complementar",
        detalhe: "Parte adversa solicitou novo laudo tecnico.",
      },
      {
        data: "02 Fev 2026",
        titulo: "Contestacao juntada",
        detalhe: "Defesa protocolada com anexos contratuais.",
      },
    ],
  },
  {
    numero: "0007781-43.2020.5.02.0013",
    cliente: "Orbita Energia",
    area: "Regulatorio",
    advogado: "Paula Nery",
    fase: "Conhecimento",
    tribunal: "TRT-2",
    prazoDias: 1,
    diasSemAtualizacao: 8,
    valorMilhoes: 4.9,
    chancePerda: 0.59,
    docsPendentes: 1,
    mudancasRecentes: 4,
    sensibilidade: 0.95,
    urgenciaOperacional: 0.92,
    historicoVitorias: 0.46,
    timeline: [
      {
        data: "17 Mar 2026",
        titulo: "Notificacao de fiscalizacao",
        detalhe: "Autarquia pediu comprovantes em 48h.",
      },
      {
        data: "10 Mar 2026",
        titulo: "Audiencia tecnica",
        detalhe: "Sessao encerrada com pedidos adicionais.",
      },
    ],
  },
  {
    numero: "5012204-88.2023.8.21.7000",
    cliente: "Norte Telecom",
    area: "Tributario",
    advogado: "Diego Prado",
    fase: "Cumprimento",
    tribunal: "TJRS",
    prazoDias: 7,
    diasSemAtualizacao: 12,
    valorMilhoes: 0.62,
    chancePerda: 0.23,
    docsPendentes: 1,
    mudancasRecentes: 1,
    sensibilidade: 0.38,
    urgenciaOperacional: 0.44,
    historicoVitorias: 0.68,
    timeline: [
      {
        data: "11 Mar 2026",
        titulo: "Despacho de liquidacao",
        detalhe: "Valores homologados para pagamento final.",
      },
    ],
  },
  {
    numero: "0821455-07.2024.8.12.0001",
    cliente: "Grupo Ciano",
    area: "Civel",
    advogado: "Carla Mendes",
    fase: "Conhecimento",
    tribunal: "TJMS",
    prazoDias: 9,
    diasSemAtualizacao: 21,
    valorMilhoes: 0.31,
    chancePerda: 0.34,
    docsPendentes: 2,
    mudancasRecentes: 1,
    sensibilidade: 0.42,
    urgenciaOperacional: 0.47,
    historicoVitorias: 0.61,
    timeline: [
      {
        data: "06 Mar 2026",
        titulo: "Contestacao protocolada",
        detalhe: "Defesa aceita e prazo aberto para replica.",
      },
    ],
  },
  {
    numero: "0904412-22.2021.8.26.0020",
    cliente: "Vetta Alimentos",
    area: "Empresarial",
    advogado: "Rafael Telles",
    fase: "Recursal",
    tribunal: "TJSP",
    prazoDias: 3,
    diasSemAtualizacao: 34,
    valorMilhoes: 3.1,
    chancePerda: 0.57,
    docsPendentes: 4,
    mudancasRecentes: 2,
    sensibilidade: 0.78,
    urgenciaOperacional: 0.84,
    historicoVitorias: 0.44,
    timeline: [
      {
        data: "14 Mar 2026",
        titulo: "Intimacao para memoriais",
        detalhe: "Prazo de memoriais em 72 horas.",
      },
      {
        data: "03 Jan 2026",
        titulo: "Acordo frustrado",
        detalhe: "Tentativa de acordo sem sucesso.",
      },
    ],
  },
  {
    numero: "0770219-89.2022.8.06.0001",
    cliente: "Alfa Saude",
    area: "Trabalhista",
    advogado: "Paula Nery",
    fase: "Instrucao",
    tribunal: "TJCE",
    prazoDias: 5,
    diasSemAtualizacao: 16,
    valorMilhoes: 1.35,
    chancePerda: 0.37,
    docsPendentes: 1,
    mudancasRecentes: 2,
    sensibilidade: 0.51,
    urgenciaOperacional: 0.58,
    historicoVitorias: 0.62,
    timeline: [
      {
        data: "12 Mar 2026",
        titulo: "Designacao de audiencia",
        detalhe: "Audiencia de conciliacao marcada para 28 Mar.",
      },
    ],
  },
  {
    numero: "0661405-11.2020.8.15.2001",
    cliente: "Porto Minerio",
    area: "Regulatorio",
    advogado: "Diego Prado",
    fase: "Cumprimento",
    tribunal: "TJPB",
    prazoDias: 11,
    diasSemAtualizacao: 41,
    valorMilhoes: 2.9,
    chancePerda: 0.44,
    docsPendentes: 3,
    mudancasRecentes: 1,
    sensibilidade: 0.66,
    urgenciaOperacional: 0.52,
    historicoVitorias: 0.55,
    timeline: [
      {
        data: "01 Mar 2026",
        titulo: "Bloqueio de garantia",
        detalhe: "Execucao parcial de garantia em conta judicial.",
      },
    ],
  },
];

const AI_TOOLS: AiTool[] = [
  {
    nome: "Resumo Executivo LLM",
    proposito: "Consolidar movimentacoes e status do processo em linguagem clara.",
    cobertura: "92% dos processos ativos",
    status: "Ativo",
    icon: MdSummarize,
  },
  {
    nome: "Busca Semantica Juridica",
    proposito: "Encontrar casos, pecas e precedentes por similaridade contextual.",
    cobertura: "2,1M trechos indexados",
    status: "Ativo",
    icon: MdManageSearch,
  },
  {
    nome: "Predicao de Risco",
    proposito: "Estimar probabilidade de perda e impacto financeiro potencial.",
    cobertura: "Modelos por area juridica",
    status: "Treino",
    icon: MdModelTraining,
  },
  {
    nome: "Validador de Evidencias",
    proposito: "Detectar lacunas documentais e inconsistencias em anexos.",
    cobertura: "89% de acuracia media",
    status: "Ativo",
    icon: MdFactCheck,
  },
  {
    nome: "OCR + Classificador",
    proposito: "Extrair entidades e classificar documentos automaticamente.",
    cobertura: "307 mil arquivos processados",
    status: "Ajuste",
    icon: MdBiotech,
  },
];

const formatMilhoes = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}M`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const BASE_DATE = new Date("2026-03-17T09:00:00-03:00");

const dueDateLabel = (days: number) => {
  const date = new Date(BASE_DATE);
  date.setDate(BASE_DATE.getDate() + days);
  return date
    .toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(".", "");
};

const riskBand = (score: number): ProcessRisk => {
  if (score >= 70) return "Alto";
  if (score >= 45) return "Medio";
  return "Baixo";
};

const priorityBand = (prazoDias: number, score: number): "Hoje" | "72h" | "Semana" => {
  if (prazoDias <= 2 || score >= 80) return "Hoje";
  if (prazoDias <= 5 || score >= 60) return "72h";
  return "Semana";
};

const calcRiskScore = (processo: ProcessBase) => {
  const prazoScore = clamp(((14 - processo.prazoDias) / 14) * 100, 0, 100);
  const staleScore = clamp(((processo.diasSemAtualizacao - 5) / 40) * 100, 0, 100);
  const docsScore = clamp(processo.docsPendentes * 22, 0, 100);
  const financialScore = clamp((processo.valorMilhoes / 5) * 100, 0, 100);
  const lossScore = clamp(processo.chancePerda * 100, 0, 100);
  const volatilityScore = clamp(processo.mudancasRecentes * 18, 0, 100);
  const sensitivityScore = clamp(processo.sensibilidade * 100, 0, 100);
  const urgencyScore = clamp(processo.urgenciaOperacional * 100, 0, 100);

  return Math.round(
    prazoScore * 0.2 +
      staleScore * 0.12 +
      docsScore * 0.1 +
      financialScore * 0.16 +
      lossScore * 0.2 +
      volatilityScore * 0.07 +
      sensitivityScore * 0.07 +
      urgencyScore * 0.08,
  );
};

const calcAiConfidence = (processo: ProcessBase) => {
  const freshness = clamp(100 - processo.diasSemAtualizacao * 1.4, 35, 100);
  const coverage = clamp(100 - processo.docsPendentes * 12, 30, 100);
  const volatilityPenalty = clamp(processo.mudancasRecentes * 5, 0, 30);
  const confidence = freshness * 0.46 + coverage * 0.44 + (100 - volatilityPenalty) * 0.1;
  return Math.round(clamp(confidence, 35, 98));
};

const topFactor = (processo: ProcessBase) => {
  if (processo.prazoDias <= 2) return "Prazo critico";
  if (processo.chancePerda >= 0.55) return "Prob. de perda elevada";
  if (processo.docsPendentes >= 3) return "Lacuna documental";
  if (processo.diasSemAtualizacao >= 30) return "Processo estagnado";
  if (processo.valorMilhoes >= 3) return "Impacto financeiro";
  return "Monitoramento regular";
};

const createRecommendations = (processo: ProcessBase, score: number): string[] => {
  const actions: string[] = [];

  if (processo.prazoDias <= 2) {
    actions.push("Priorizar peticao e validacao final com time de suporte em ate 24h.");
  }
  if (processo.docsPendentes >= 2) {
    actions.push("Acionar checklist de documentos pendentes com SLA de 48h.");
  }
  if (processo.diasSemAtualizacao >= 25) {
    actions.push("Solicitar impulso processual e registrar follow-up no tribunal.");
  }
  if (processo.chancePerda >= 0.55 || score >= 72) {
    actions.push("Escalar para comite juridico com simulacao de cenarios financeiros.");
  }
  if (actions.length === 0) {
    actions.push("Manter monitoramento semanal e revisar estrategia no ciclo mensal.");
  }

  return actions.slice(0, 3);
};

const createSummary = (processo: ProcessBase, score: number, risco: ProcessRisk) => {
  return `Processo ${processo.area.toLowerCase()} em ${processo.fase.toLowerCase()} no ${processo.tribunal}, score IA ${score}/100, risco ${risco.toLowerCase()} e prazo em ${processo.prazoDias} dia(s).`;
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

export default function ProcessAnalyzerPortal() {
  const [uploadedFileName, setUploadedFileName] = useState("");

  const intelligence = useMemo(() => {
    const enriched: EnrichedProcess[] = PROCESS_BASE.map((processo) => {
      const riskScore = calcRiskScore(processo);
      const risco = riskBand(riskScore);
      const prioridade = priorityBand(processo.prazoDias, riskScore);
      const aiConfidence = calcAiConfidence(processo);
      const expectedLossMilhoes = Number((processo.valorMilhoes * processo.chancePerda).toFixed(2));

      return {
        ...processo,
        riskScore,
        risco,
        prioridade,
        aiConfidence,
        dueDate: dueDateLabel(processo.prazoDias),
        expectedLossMilhoes,
        fatorCritico: topFactor(processo),
        recommendations: createRecommendations(processo, riskScore),
        aiSummary: createSummary(processo, riskScore, risco),
      };
    });

    const ordered = [...enriched].sort((a, b) => b.riskScore - a.riskScore);
    const critical = ordered.filter((item) => item.risco === "Alto");

    const totalValue = Number(enriched.reduce((acc, item) => acc + item.valorMilhoes, 0).toFixed(1));
    const totalExpectedLoss = Number(
      enriched.reduce((acc, item) => acc + item.expectedLossMilhoes, 0).toFixed(1),
    );

    const deadlines72h = enriched.filter((item) => item.prazoDias <= 3).length;
    const highRiskCount = critical.length;
    const successForecast = Math.round((1 - average(enriched.map((item) => item.chancePerda))) * 100);
    const automationCoverage = Math.round(average(enriched.map((item) => item.aiConfidence)));

    const heroSpotlight = [
      {
        label: "Risco alto preditivo",
        value: `${highRiskCount} casos`,
        detail: `${deadlines72h} com prazo em ate 72h`,
        icon: MdWarningAmber,
      },
      {
        label: "Perda esperada",
        value: formatMilhoes(totalExpectedLoss),
        detail: "projecao IA de impacto",
        icon: MdBalance,
      },
      {
        label: "Cobertura de automacao",
        value: `${automationCoverage}%`,
        detail: "dados utilizaveis pelo motor",
        icon: MdDataUsage,
      },
    ];

    const heroPriorities = ordered.slice(0, 3).map((item) => {
      return `${item.numero}: ${item.recommendations[0]} (prazo ${item.dueDate})`;
    });

    const alerts = [
      ...ordered
        .filter((item) => item.prazoDias <= 2)
        .map(
          (item) =>
            `${item.numero}: prazo critico em ${item.prazoDias} dia(s) com score ${item.riskScore}.`,
        ),
      ...ordered
        .filter((item) => item.diasSemAtualizacao >= 30)
        .map(
          (item) =>
            `${item.numero}: ${item.diasSemAtualizacao} dias sem atualizacao, possivel gargalo operacional.`,
        ),
      ...ordered
        .filter((item) => item.docsPendentes >= 3)
        .map(
          (item) =>
            `${item.numero}: ${item.docsPendentes} documentos pendentes reduzindo confianca da estrategia.`,
        ),
    ].slice(0, 6);

    const phaseMap = new Map<string, { total: number; scoreSum: number }>();
    for (const item of enriched) {
      const current = phaseMap.get(item.fase) ?? { total: 0, scoreSum: 0 };
      current.total += 1;
      current.scoreSum += item.riskScore;
      phaseMap.set(item.fase, current);
    }

    const phaseFlow = Array.from(phaseMap.entries())
      .map(([fase, data]) => {
        const avgScore = data.scoreSum / data.total;
        return {
          fase,
          total: data.total,
          progresso: Math.round(clamp(avgScore, 25, 95)),
        };
      })
      .sort((a, b) => b.total - a.total);

    const riskDistribution = ["Alto", "Medio", "Baixo"].map((nivel) => {
      const subset = enriched.filter((item) => item.risco === nivel);
      const impacto = Number(subset.reduce((acc, item) => acc + item.expectedLossMilhoes, 0).toFixed(1));
      return {
        nivel: nivel as ProcessRisk,
        processos: subset.length,
        impacto,
      };
    });

    const productivityMap = new Map<
      string,
      { ativos: number; scoreSum: number; prazoCritico: number; confidenceSum: number }
    >();
    for (const item of enriched) {
      const current = productivityMap.get(item.advogado) ?? {
        ativos: 0,
        scoreSum: 0,
        prazoCritico: 0,
        confidenceSum: 0,
      };
      current.ativos += 1;
      current.scoreSum += item.riskScore;
      current.confidenceSum += item.aiConfidence;
      if (item.prazoDias <= 3) current.prazoCritico += 1;
      productivityMap.set(item.advogado, current);
    }

    const productivity = Array.from(productivityMap.entries())
      .map(([advogado, stats]) => ({
        advogado,
        ativos: stats.ativos,
        scoreMedio: Math.round(stats.scoreSum / stats.ativos),
        prazosCriticos: stats.prazoCritico,
        confiancaMedia: Math.round(stats.confidenceSum / stats.ativos),
      }))
      .sort((a, b) => b.ativos - a.ativos);

    const clientMap = new Map<string, { processos: number; riscoSum: number; perdaEsperada: number }>();
    for (const item of enriched) {
      const current = clientMap.get(item.cliente) ?? { processos: 0, riscoSum: 0, perdaEsperada: 0 };
      current.processos += 1;
      current.riscoSum += item.riskScore;
      current.perdaEsperada += item.expectedLossMilhoes;
      clientMap.set(item.cliente, current);
    }

    const clientHeatmap = Array.from(clientMap.entries())
      .map(([cliente, stats]) => {
        const scoreMedio = stats.riscoSum / stats.processos;
        return {
          cliente,
          ativos: stats.processos,
          risco: riskBand(scoreMedio),
          perdaEsperada: Number(stats.perdaEsperada.toFixed(1)),
        };
      })
      .sort((a, b) => b.perdaEsperada - a.perdaEsperada);

    const areaMap = new Map<string, { volume: number; perda: number; chanceMedia: number }>();
    for (const item of enriched) {
      const current = areaMap.get(item.area) ?? { volume: 0, perda: 0, chanceMedia: 0 };
      current.volume += 1;
      current.perda += item.expectedLossMilhoes;
      current.chanceMedia += item.chancePerda;
      areaMap.set(item.area, current);
    }

    const areaForecast = Array.from(areaMap.entries())
      .map(([area, stats]) => ({
        area,
        volume: stats.volume,
        perdaProjetada: Number(stats.perda.toFixed(1)),
        chanceMedia: Math.round((stats.chanceMedia / stats.volume) * 100),
      }))
      .sort((a, b) => b.perdaProjetada - a.perdaProjetada);

    const modelMetrics = [
      { label: "Precisao risco alto", value: "83%", detail: "jan-2026 a mar-2026" },
      { label: "Recall de prazo critico", value: "91%", detail: "deteccao em ate 48h" },
      { label: "Deriva de dados", value: "Baixa", detail: "2,4% acima do baseline" },
      { label: "Confianca media", value: `${automationCoverage}%`, detail: "por processo ativo" },
    ];

    const todayBoard = ordered.slice(0, 5).map((item) => {
      return `${item.dueDate}: ${item.recommendations[0]}`;
    });

    const featuredProcess = ordered[0];

    return {
      enriched,
      ordered,
      critical,
      alerts,
      phaseFlow,
      riskDistribution,
      productivity,
      clientHeatmap,
      areaForecast,
      modelMetrics,
      todayBoard,
      featuredProcess,
      heroSpotlight,
      heroPriorities,
      kpis: {
        ativos: enriched.length,
        valorTotal: totalValue,
        prazo72h: deadlines72h,
        riscoAlto: highRiskCount,
        sucessoProjetado: successForecast,
        coberturaIa: automationCoverage,
      },
    };
  }, []);

  const styles = {
    main: "bg-[#0f1013] text-slate-100",
    bgAura:
      "bg-[radial-gradient(circle_at_0%_0%,rgba(244,63,94,0.18),transparent_38%),radial-gradient(circle_at_100%_8%,rgba(239,68,68,0.14),transparent_36%),linear-gradient(180deg,#0f1013,#14171c_50%,#0b0d11)]",
    bgGrid:
      "bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)]",
    hero:
      "border-slate-700 bg-[linear-gradient(140deg,#181b21,#12151a_46%,#1f1316_82%,#2a1318)] shadow-[0_24px_48px_rgba(0,0,0,0.42)]",
    heroGlowLeft: "bg-rose-500/30",
    heroGlowRight: "bg-red-500/25",
    panel: "border-slate-700 bg-[#171a20] shadow-[0_14px_30px_rgba(0,0,0,0.32)]",
    panelSoft: "border-slate-700 bg-[#1f232b]",
    panelSoft2: "border-slate-700 bg-[#1a1d24]",
    sidebar: "border-slate-700 bg-[#15181d]/95",
    footer: "border-slate-700 bg-[#171a20]",
    textPrimary: "text-slate-100",
    textSecondary: "text-slate-300",
    textMuted: "text-slate-400",
    accentPill: "border-rose-400/40 bg-rose-500/12 text-rose-200",
    accentPanel: "border-rose-400/35 bg-rose-500/10",
    accentPanelWarn: "border-red-400/35 bg-red-500/10",
    accentButton: "border-rose-400/40 bg-rose-500/12 text-rose-200 hover:bg-rose-500/20",
    chip: "border-rose-400/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/18",
    navActive: "border-rose-400/40 bg-rose-500/12 text-rose-200",
    navIdle: "border-transparent text-slate-300 hover:border-slate-600 hover:bg-[#20242c]",
    badge: "border-slate-600 bg-[#111318] text-slate-300",
    input: "border-slate-600 bg-[#101318] text-slate-100 placeholder:text-slate-500 focus:border-rose-400",
    tableHead: "bg-[#1f242c] text-slate-400",
    tableRow: "border-slate-700 text-slate-200",
    tableProcess: "text-rose-300",
    progressTrack: "bg-slate-700/60",
    progressFill: "bg-[linear-gradient(to_right,#fb7185,#ef4444)]",
    iconAccent: "text-rose-300",
    ringWarn: "text-amber-300",
    ringInfo: "text-slate-400",
    iconSearch: "text-slate-500",
    selector: "border-slate-600 bg-[#101318] text-slate-100 focus:border-rose-400",
    uploadZone:
      "border-rose-400/30 bg-[linear-gradient(130deg,rgba(31,35,43,0.95),rgba(24,27,33,0.95))]",
    uploadPrimary:
      "border-rose-400/45 bg-[linear-gradient(135deg,rgba(251,113,133,0.2),rgba(239,68,68,0.14))] text-rose-100 hover:bg-[linear-gradient(135deg,rgba(251,113,133,0.3),rgba(239,68,68,0.22))]",
  };

  const riskBadge: Record<ProcessRisk, string> = {
    Alto: "border-rose-400/45 bg-rose-500/12 text-rose-200",
    Medio: "border-amber-400/45 bg-amber-500/12 text-amber-200",
    Baixo: "border-emerald-400/45 bg-emerald-500/12 text-emerald-200",
  };

  return (
    <main className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-screen ${styles.main}`}>
      <div className={`pointer-events-none fixed inset-0 -z-50 ${styles.bgAura}`} />
      <div
        className={`pointer-events-none fixed inset-0 -z-40 opacity-40 ${styles.bgGrid} bg-size-[34px_34px]`}
      />

      <div className="mx-auto w-full max-w-[1560px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside
            className={cx(
              "rounded-3xl shadow-[0_16px_36px_rgba(15,23,42,0.10)] backdrop-blur-sm lg:sticky lg:top-6",
              styles.sidebar,
            )}
          >
            <div className="border-b border-current/10 p-5">
              <p
                className={cx(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-(family-name:--font-jetbrains-mono) text-[11px] font-semibold tracking-[0.18em]",
                  styles.accentPill,
                )}
              >
                <MdPsychologyAlt className={cx("h-4 w-4", styles.iconAccent)} />
                JURIDICO IA OPS
              </p>
              <h1
                className={cx(
                  "mt-3 font-(family-name:--font-space-grotesk) text-2xl font-bold",
                  styles.textPrimary,
                )}
              >
                Analisador de Processos
              </h1>
              <p className={cx("mt-2 text-xs leading-relaxed", styles.textSecondary)}>
                Motor de analise preditiva, risco financeiro e priorizacao automatica.
              </p>
            </div>

            <nav className="space-y-1 p-3">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={cx(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition",
                    item.active ? styles.navActive : styles.navIdle,
                  )}
                >
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span className={cx("rounded-full border px-2 py-0.5 text-[11px]", styles.badge)}>
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>

            <div className="space-y-3 border-t border-current/10 p-4">
              <div className={cx("rounded-2xl border p-3", styles.accentPanelWarn)}>
                <p className={cx("text-[11px] uppercase tracking-[0.14em]", styles.ringWarn)}>
                  Motor de risco
                </p>
                <p className={cx("mt-1 text-2xl font-semibold", styles.textPrimary)}>
                  {intelligence.kpis.riscoAlto}
                </p>
                <p className={cx("text-xs", styles.textSecondary)}>casos com score IA acima de 70.</p>
              </div>

              <div className={cx("rounded-2xl border p-3", styles.accentPanel)}>
                <p className={cx("text-[11px] uppercase tracking-[0.14em]", styles.iconAccent)}>
                  Confianca media
                </p>
                <p className={cx("mt-1 text-base font-semibold", styles.textPrimary)}>
                  {intelligence.kpis.coberturaIa}%
                </p>
                <p className={cx("text-xs", styles.textSecondary)}>
                  qualidade de dados para recomendacoes automaticas.
                </p>
              </div>

              <Link
                href="/"
                className={cx(
                  "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                  "border-slate-600 bg-[#101318] text-slate-200 hover:bg-[#1d2128]",
                )}
              >
                Voltar ao hub
                <MdArrowOutward className="h-4 w-4" />
              </Link>
            </div>
          </aside>

          <section className="space-y-4">
            <header className={cx("relative overflow-hidden rounded-3xl border p-6", styles.hero)}>
              <div
                className={cx(
                  "pointer-events-none absolute -left-20 top-0 h-48 w-48 rounded-full blur-3xl",
                  styles.heroGlowLeft,
                )}
              />
              <div
                className={cx(
                  "pointer-events-none absolute -right-8 bottom-2 h-40 w-40 rounded-full blur-3xl",
                  styles.heroGlowRight,
                )}
              />

              <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
                <div>
                  <p
                    className={cx(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-(family-name:--font-jetbrains-mono) text-[11px] font-semibold tracking-[0.18em]",
                      styles.accentPill,
                    )}
                  >
                    <MdAutoAwesome className={cx("h-4 w-4", styles.iconAccent)} />
                    COPILOTO ANALITICO
                  </p>
                  <div className="mt-3 space-y-2">
                    <label className="relative block">
                      <MdOutlineSearch
                        className={cx(
                          "pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2",
                          styles.iconSearch,
                        )}
                      />
                      <input
                        type="search"
                        defaultValue="Atlas Metalurgia"
                        className={cx(
                          "w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none transition",
                          styles.input,
                        )}
                        placeholder="Buscar por numero, parte, cliente ou palavra-chave"
                      />
                    </label>
                    <button
                      type="button"
                      className={cx(
                        "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                        styles.accentButton,
                      )}
                    >
                      <MdTune className="h-4 w-4" />
                      Ajustar filtros e pesos IA
                    </button>
                  </div>
                  <h2
                    className={cx(
                      "mt-4 max-w-4xl font-(family-name:--font-space-grotesk) text-4xl font-bold leading-tight sm:text-5xl",
                      styles.textPrimary,
                    )}
                  >
                    Inteligencia Juridica com IA
                  </h2>
                  <p className={cx("mt-3 max-w-3xl text-sm leading-relaxed sm:text-base", styles.textSecondary)}>
                    Score preditivo de risco, explicabilidade por processo, alertas de anomalia e
                    recomendacoes automaticas para acelerar decisoes juridicas.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {intelligence.heroSpotlight.map((item) => (
                      <article key={item.label} className={cx("rounded-2xl border p-3", styles.panelSoft2)}>
                        <span
                          className={cx(
                            "inline-flex h-9 w-9 items-center justify-center rounded-lg border",
                            styles.accentPanel,
                          )}
                        >
                          <item.icon className={cx("h-5 w-5", styles.iconAccent)} />
                        </span>
                        <p className={cx("mt-2 text-[11px] uppercase tracking-[0.12em]", styles.textMuted)}>
                          {item.label}
                        </p>
                        <p className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>{item.value}</p>
                        <p className={cx("text-xs", styles.textSecondary)}>{item.detail}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className={cx("rounded-2xl border p-4", styles.panelSoft2)}>
                  <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                    Prioridades sugeridas pela IA
                  </p>
                  <ul className="mt-2 space-y-2">
                    {intelligence.heroPriorities.map((item) => (
                      <li key={item} className={cx("rounded-xl border px-3 py-2 text-sm", styles.panelSoft)}>
                        {item}
                      </li>
                    ))}
                  </ul>

                </div>
              </div>

              <div className="relative z-10 mt-5 flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={cx(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      styles.chip,
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </header>

            <section className={cx("rounded-3xl border p-5 sm:p-6", styles.panel)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                    Upload de processo com IA
                  </p>
                  <h3 className={cx("mt-1 font-(family-name:--font-space-grotesk) text-2xl font-semibold", styles.textPrimary)}>
                    Envie um processo para analise automatica
                  </h3>
                  <p className={cx("mt-1 text-sm", styles.textSecondary)}>
                    O motor gera score de risco, resumo executivo, lacunas documentais e plano de acao.
                  </p>
                </div>
                <span className={cx("rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.14em]", styles.accentPill)}>
                  Formatos: PDF, DOCX, TXT
                </span>
              </div>

              <div className={cx("mt-4 rounded-2xl border border-dashed p-4 sm:p-5", styles.uploadZone)}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.12em]", styles.textMuted)}>Campo de arquivo</p>
                    <label
                      htmlFor="process-ai-upload"
                      className={cx(
                        "mt-2 flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition",
                        styles.uploadPrimary,
                      )}
                    >
                      <span className={cx("inline-flex h-10 w-10 items-center justify-center rounded-lg border", styles.accentPanel)}>
                        <MdUploadFile className={cx("h-5 w-5", styles.iconAccent)} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">Selecionar arquivo do processo</span>
                        <span className={cx("block truncate text-xs", styles.textSecondary)}>
                          {uploadedFileName || "Arraste e solte aqui ou clique para buscar no computador"}
                        </span>
                      </span>
                      <input
                        id="process-ai-upload"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          setUploadedFileName(file?.name ?? "");
                        }}
                      />
                    </label>
                    <p className={cx("mt-2 text-xs", styles.textMuted)}>
                      {uploadedFileName ? `Arquivo pronto: ${uploadedFileName}` : "Nenhum arquivo selecionado."}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!uploadedFileName}
                    className={cx(
                      "inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition",
                      styles.accentButton,
                      !uploadedFileName && "cursor-not-allowed opacity-55",
                    )}
                  >
                    <MdAutoAwesome className="h-4 w-4" />
                    Rodar analise IA
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className={cx("rounded-2xl border p-4", styles.panel)}>
                <span
                  className={cx(
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
                    styles.accentPanel,
                  )}
                >
                  <MdGavel className={cx("h-5 w-5", styles.iconAccent)} />
                </span>
                <p className={cx("mt-3 text-xs uppercase tracking-[0.12em]", styles.textMuted)}>
                  Processos ativos
                </p>
                <p className={cx("mt-1 text-2xl font-semibold", styles.textPrimary)}>
                  {intelligence.kpis.ativos}
                </p>
                <p className={cx("text-xs", styles.textSecondary)}>base monitorada pelo motor IA</p>
              </article>

              <article className={cx("rounded-2xl border p-4", styles.panel)}>
                <span
                  className={cx(
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
                    styles.accentPanel,
                  )}
                >
                  <MdBalance className={cx("h-5 w-5", styles.iconAccent)} />
                </span>
                <p className={cx("mt-3 text-xs uppercase tracking-[0.12em]", styles.textMuted)}>
                  Valor consolidado
                </p>
                <p className={cx("mt-1 text-2xl font-semibold", styles.textPrimary)}>
                  {formatMilhoes(intelligence.kpis.valorTotal)}
                </p>
                <p className={cx("text-xs", styles.textSecondary)}>carteira ativa total</p>
              </article>

              <article className={cx("rounded-2xl border p-4", styles.panel)}>
                <span
                  className={cx(
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
                    styles.accentPanelWarn,
                  )}
                >
                  <MdSchedule className={cx("h-5 w-5", styles.ringWarn)} />
                </span>
                <p className={cx("mt-3 text-xs uppercase tracking-[0.12em]", styles.textMuted)}>
                  Prazos 72h
                </p>
                <p className={cx("mt-1 text-2xl font-semibold", styles.textPrimary)}>
                  {intelligence.kpis.prazo72h}
                </p>
                <p className={cx("text-xs", styles.textSecondary)}>casos com entrega critica</p>
              </article>

              <article className={cx("rounded-2xl border p-4", styles.panel)}>
                <span
                  className={cx(
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
                    styles.accentPanel,
                  )}
                >
                  <MdTrendingUp className={cx("h-5 w-5", styles.iconAccent)} />
                </span>
                <p className={cx("mt-3 text-xs uppercase tracking-[0.12em]", styles.textMuted)}>
                  Exito projetado
                </p>
                <p className={cx("mt-1 text-2xl font-semibold", styles.textPrimary)}>
                  {intelligence.kpis.sucessoProjetado}%
                </p>
                <p className={cx("text-xs", styles.textSecondary)}>estimativa de resultado anual</p>
              </article>
            </section>

            <section className="space-y-4">
              <article className={cx("overflow-hidden rounded-3xl border", styles.panel)}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 p-5">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                      Priorizacao preditiva
                    </p>
                    <h3 className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>
                      Fila IA de processos criticos
                    </h3>
                  </div>
                  <button
                    type="button"
                    className={cx(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition",
                      styles.accentButton,
                    )}
                  >
                    <MdFilterAlt className="h-4 w-4" />
                    Exportar ranking
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className={cx("text-xs uppercase tracking-[0.12em]", styles.tableHead)}>
                      <tr>
                        <th className="px-4 py-3 font-medium">Processo</th>
                        <th className="px-4 py-3 font-medium">Cliente</th>
                        <th className="px-4 py-3 font-medium">Area</th>
                        <th className="px-4 py-3 font-medium">Prazo</th>
                        <th className="px-4 py-3 font-medium">Score IA</th>
                        <th className="px-4 py-3 font-medium">Confianca</th>
                        <th className="px-4 py-3 font-medium">Risco</th>
                        <th className="px-4 py-3 font-medium">Acao sugerida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intelligence.ordered.slice(0, 6).map((processo) => (
                        <tr key={processo.numero} className={cx("border-t", styles.tableRow)}>
                          <td
                            className={cx(
                              "whitespace-nowrap px-4 py-3 font-(family-name:--font-jetbrains-mono) text-xs",
                              styles.tableProcess,
                            )}
                          >
                            {processo.numero}
                          </td>
                          <td className="px-4 py-3">{processo.cliente}</td>
                          <td className="px-4 py-3">{processo.area}</td>
                          <td className="whitespace-nowrap px-4 py-3">{processo.dueDate}</td>
                          <td className="px-4 py-3">
                            <span className={cx("font-semibold", styles.textPrimary)}>{processo.riskScore}</span>
                          </td>
                          <td className="px-4 py-3">{processo.aiConfidence}%</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBadge[processo.risco]}`}
                            >
                              <MdCircle className="h-2.5 w-2.5" />
                              {processo.risco}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">{processo.recommendations[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <article className={cx("rounded-3xl border p-5", styles.panel)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                      Copiloto IA
                    </p>
                    <h3 className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>
                      Alertas analiticos
                    </h3>
                  </div>
                  <MdNotificationsActive className={cx("h-6 w-6", styles.ringWarn)} />
                </div>
                <ul className="mt-4 space-y-2.5">
                  {intelligence.alerts.map((alerta) => (
                    <li key={alerta} className={cx("rounded-xl border p-3 text-sm", styles.panelSoft)}>
                      {alerta}
                    </li>
                  ))}
                </ul>
              </article>

              <article className={cx("rounded-3xl border p-5", styles.panel)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                      Explicabilidade
                    </p>
                    <h3 className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>
                      Processo mais critico
                    </h3>
                  </div>
                  <MdTimeline className={cx("h-6 w-6", styles.iconAccent)} />
                </div>

                <div className={cx("mt-4 rounded-xl border p-3", styles.panelSoft)}>
                  <p className={cx("text-xs", styles.textMuted)}>{intelligence.featuredProcess.numero}</p>
                  <p className={cx("mt-1 text-sm font-semibold", styles.textPrimary)}>
                    {intelligence.featuredProcess.aiSummary}
                  </p>
                  <p className={cx("mt-1 text-xs", styles.textSecondary)}>
                    Fator dominante: {intelligence.featuredProcess.fatorCritico}.
                  </p>
                </div>

                <ol className="mt-3 space-y-2">
                  {intelligence.featuredProcess.recommendations.map((item) => (
                    <li key={item} className={cx("rounded-xl border px-3 py-2 text-sm", styles.panelSoft)}>
                      {item}
                    </li>
                  ))}
                </ol>
              </article>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <article className={cx("rounded-3xl border p-5", styles.panel)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                      Distribuicao por fase
                    </p>
                    <h3 className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>
                      Fluxo processual IA
                    </h3>
                  </div>
                  <MdHub className={cx("h-6 w-6", styles.iconAccent)} />
                </div>
                <div className="mt-4 space-y-3">
                  {intelligence.phaseFlow.map((item) => (
                    <div key={item.fase}>
                      <div className={cx("mb-1 flex items-center justify-between text-xs", styles.textSecondary)}>
                        <span>{item.fase}</span>
                        <span>{item.total} processos</span>
                      </div>
                      <div className={cx("h-2.5 overflow-hidden rounded-full", styles.progressTrack)}>
                        <div
                          className={cx("h-full rounded-full", styles.progressFill)}
                          style={{ width: `${item.progresso}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className={cx("rounded-3xl border p-5", styles.panel)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                      Risco financeiro
                    </p>
                    <h3 className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>
                      Perda esperada por nivel
                    </h3>
                  </div>
                  <MdWarningAmber className={cx("h-6 w-6", styles.ringWarn)} />
                </div>
                <div className="mt-4 space-y-3">
                  {intelligence.riskDistribution.map((item) => (
                    <div key={item.nivel} className={cx("rounded-xl border p-3", styles.panelSoft)}>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBadge[item.nivel]}`}
                        >
                          {item.nivel}
                        </span>
                        <span className={cx("text-xs", styles.textSecondary)}>{item.processos} processos</span>
                      </div>
                      <p className={cx("mt-1 text-sm", styles.textPrimary)}>
                        Impacto: {formatMilhoes(item.impacto)}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className={cx("rounded-3xl border p-5", styles.panel)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                      Produtividade da equipe
                    </p>
                    <h3 className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>
                      Carga e risco por advogado
                    </h3>
                  </div>
                  <MdAssignmentTurnedIn className={cx("h-6 w-6", styles.iconAccent)} />
                </div>
                <ul className="mt-4 space-y-2.5">
                  {intelligence.productivity.map((item) => (
                    <li key={item.advogado} className={cx("rounded-xl border px-3 py-2.5", styles.panelSoft)}>
                      <p className={cx("text-sm font-semibold", styles.textPrimary)}>{item.advogado}</p>
                      <p className={cx("mt-1 text-xs", styles.textSecondary)}>
                        {item.ativos} ativos | score medio {item.scoreMedio} | {item.prazosCriticos} prazos
                        criticos | confianca {item.confiancaMedia}%
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <article className={cx("rounded-3xl border p-5", styles.panel)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                      Ferramentas de IA
                    </p>
                    <h3 className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>
                      Stack inteligente em operacao
                    </h3>
                  </div>
                  <MdSmartToy className={cx("h-6 w-6", styles.iconAccent)} />
                </div>
                <ul className="mt-4 space-y-2.5">
                  {AI_TOOLS.map((tool) => (
                    <li key={tool.nome} className={cx("rounded-xl border p-3", styles.panelSoft)}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={cx("text-sm font-semibold", styles.textPrimary)}>{tool.nome}</p>
                          <p className={cx("text-xs", styles.textSecondary)}>{tool.proposito}</p>
                        </div>
                        <tool.icon className={cx("mt-0.5 h-5 w-5 shrink-0", styles.iconAccent)} />
                      </div>
                      <div className={cx("mt-2 flex items-center justify-between text-xs", styles.textMuted)}>
                        <span>{tool.cobertura}</span>
                        <span>{tool.status}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>

              <article className={cx("rounded-3xl border p-5", styles.panel)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                      Qualidade do modelo
                    </p>
                    <h3 className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>
                      Governanca e performance
                    </h3>
                  </div>
                  <MdAssessment className={cx("h-6 w-6", styles.iconAccent)} />
                </div>
                <ul className="mt-4 space-y-2.5">
                  {intelligence.modelMetrics.map((metric) => (
                    <li key={metric.label} className={cx("rounded-xl border p-3", styles.panelSoft)}>
                      <p className={cx("text-xs uppercase tracking-[0.12em]", styles.textMuted)}>
                        {metric.label}
                      </p>
                      <p className={cx("mt-1 text-lg font-semibold", styles.textPrimary)}>{metric.value}</p>
                      <p className={cx("text-xs", styles.textSecondary)}>{metric.detail}</p>
                    </li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <article className={cx("rounded-3xl border p-5", styles.panel)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                      Clientes criticos
                    </p>
                    <h3 className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>
                      Priorizacao por impacto
                    </h3>
                  </div>
                  <MdGroups className={cx("h-6 w-6", styles.iconAccent)} />
                </div>
                <ul className="mt-4 space-y-2">
                  {intelligence.clientHeatmap.slice(0, 5).map((item) => (
                    <li
                      key={item.cliente}
                      className={cx(
                        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5",
                        styles.panelSoft,
                      )}
                    >
                      <div>
                        <p className={cx("text-sm", styles.textPrimary)}>{item.cliente}</p>
                        <p className={cx("text-xs", styles.textMuted)}>
                          {item.ativos} processos | perda esperada {formatMilhoes(item.perdaEsperada)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBadge[item.risco]}`}
                      >
                        {item.risco}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className={cx("rounded-3xl border p-5", styles.panel)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                      Painel de acoes do dia
                    </p>
                    <h3 className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>
                      Fila operacional sugerida
                    </h3>
                  </div>
                  <MdCalendarMonth className={cx("h-6 w-6", styles.ringWarn)} />
                </div>
                <ul className="mt-4 space-y-2.5">
                  {intelligence.todayBoard.map((item) => (
                    <li key={item} className={cx("rounded-xl border p-3 text-sm", styles.panelSoft)}>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className={cx("mt-3 rounded-xl border p-3 text-xs", styles.accentPanel)}>
                  Modo de busca inteligente ativo com indice semantico, score de risco e contexto
                  historico por processo.
                </div>
              </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <article className={cx("rounded-3xl border p-5", styles.panel)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                      Forecast por area
                    </p>
                    <h3 className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>
                      Analise de concentracao de risco
                    </h3>
                  </div>
                  <MdTrendingUp className={cx("h-6 w-6", styles.iconAccent)} />
                </div>
                <ul className="mt-4 space-y-2.5">
                  {intelligence.areaForecast.map((item) => (
                    <li key={item.area} className={cx("rounded-xl border p-3", styles.panelSoft)}>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cx("text-sm font-semibold", styles.textPrimary)}>{item.area}</p>
                        <span className={cx("text-xs", styles.textMuted)}>{item.volume} processos</span>
                      </div>
                      <p className={cx("mt-1 text-xs", styles.textSecondary)}>
                        Perda projetada {formatMilhoes(item.perdaProjetada)} | chance media de perda {item.chanceMedia}%
                      </p>
                    </li>
                  ))}
                </ul>
              </article>

              <article className={cx("rounded-3xl border p-5", styles.panel)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={cx("text-xs uppercase tracking-[0.14em]", styles.textMuted)}>
                      Linha do tempo automatica
                    </p>
                    <h3 className={cx("mt-1 text-xl font-semibold", styles.textPrimary)}>
                      Eventos do caso critico
                    </h3>
                  </div>
                  <MdTimeline className={cx("h-6 w-6", styles.iconAccent)} />
                </div>
                <ol className="mt-4 space-y-3">
                  {intelligence.featuredProcess.timeline.map((event) => (
                    <li
                      key={`${event.data}-${event.titulo}`}
                      className={cx("relative rounded-xl border p-3 pl-9", styles.panelSoft)}
                    >
                      <span className={cx("absolute left-3 top-3.5 h-2.5 w-2.5 rounded-full", styles.iconAccent)} />
                      <p className={cx("text-xs", styles.textMuted)}>{event.data}</p>
                      <p className={cx("text-sm font-semibold", styles.textPrimary)}>{event.titulo}</p>
                      <p className={cx("text-xs", styles.textSecondary)}>{event.detalhe}</p>
                    </li>
                  ))}
                </ol>
              </article>
            </section>

            <footer className={cx("rounded-2xl border px-5 py-3 text-xs", styles.footer, styles.textSecondary)}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-(family-name:--font-jetbrains-mono)">
                  JURIDICO IA OPS // analise preditiva, explicavel e orientada a acao
                </p>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <MdEventNote className={cx("h-4 w-4", styles.iconAccent)} />
                    {intelligence.ordered.length} processos modelados
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MdSecurity className={cx("h-4 w-4", styles.ringInfo)} />
                    Governanca de dados ativa
                  </span>
                </div>
              </div>
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}

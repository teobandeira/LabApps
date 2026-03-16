"use client";

import Link from "next/link";
import { IBM_Plex_Mono, Sora } from "next/font/google";
import { useEffect, useMemo, useState } from "react";
import {
  MdAdjust,
  MdArrowOutward,
  MdAutoGraph,
  MdClose,
  MdLanguage,
  MdNotificationsActive,
  MdOutlineFilterAlt,
  MdOutlineSearch,
  MdPublic,
  MdSecurity,
  MdTrackChanges,
} from "react-icons/md";

type ConflictStatus = "Ativo" | "Escalada" | "Contido" | "Cessar-fogo";
type ConflictRisk = "Baixo" | "Moderado" | "Alto" | "Critico";

type ConflictZone = {
  id: string;
  region: string;
  country: string;
  continent: string;
  conflictType: string;
  attackType: string;
  status: ConflictStatus;
  risk: ConflictRisk;
  intensity: 1 | 2 | 3 | 4 | 5;
  attacks24h: number;
  casualties: number;
  civiliansAffected: number;
  involvedCountries: string[];
  position: {
    x: number;
    y: number;
  };
  summary: string;
  history: string[];
  localTrend: number[];
};

type ConflictEvent = {
  id: string;
  zoneId: string;
  date: string;
  location: string;
  aggressor: string;
  affected: string;
  impact: number;
  note: string;
};

type FilterState = {
  continent: string;
  country: string;
  conflictType: string;
  period: "24h" | "7d" | "30d" | "90d";
  intensity: "all" | "1" | "2" | "3" | "4" | "5";
  attackType: string;
  status: "all" | ConflictStatus;
};

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const MAP_CONTINENTS = [
  {
    id: "America do Norte",
    d: "M105 128 L190 88 L292 95 L334 150 L305 210 L252 225 L182 205 L120 165 Z",
    labelX: 220,
    labelY: 82,
  },
  {
    id: "America do Sul",
    d: "M302 252 L354 274 L375 338 L348 432 L304 505 L268 458 L282 362 Z",
    labelX: 308,
    labelY: 242,
  },
  {
    id: "Europa",
    d: "M534 120 L590 98 L664 112 L678 148 L634 174 L562 162 Z",
    labelX: 604,
    labelY: 90,
  },
  {
    id: "Africa",
    d: "M566 192 L642 204 L672 284 L648 392 L602 462 L558 420 L546 324 Z",
    labelX: 620,
    labelY: 188,
  },
  {
    id: "Asia",
    d: "M674 114 L792 96 L930 126 L994 190 L952 252 L870 274 L798 240 L734 220 L688 170 Z",
    labelX: 840,
    labelY: 90,
  },
  {
    id: "Oceania",
    d: "M900 332 L978 338 L1032 390 L1010 450 L934 472 L890 420 Z",
    labelX: 954,
    labelY: 320,
  },
] as const;

const CONFLICT_ZONES: ConflictZone[] = [
  {
    id: "eu-east",
    region: "Corredor Leste Europeu",
    country: "Ucrania Oriental",
    continent: "Europa",
    conflictType: "Guerra convencional",
    attackType: "Misseis e artilharia",
    status: "Escalada",
    risk: "Critico",
    intensity: 5,
    attacks24h: 61,
    casualties: 1240,
    civiliansAffected: 53200,
    involvedCountries: ["Ucrania", "Russia"],
    position: { x: 56.2, y: 33.8 },
    summary:
      "Fronteira ativa com ataques de precisao e fogo de saturacao. Infraestrutura energetica segue sob pressao.",
    history: [
      "Novas brigadas mecanizadas deslocadas para o setor norte.",
      "Ataques de longo alcance contra hubs logisticos.",
      "Corredores humanitarios operam com janela limitada.",
    ],
    localTrend: [39, 42, 46, 52, 57, 60, 63],
  },
  {
    id: "levant",
    region: "Faixa do Levante",
    country: "Israel / Gaza / Sul do Libano",
    continent: "Asia",
    conflictType: "Conflito assimetrico",
    attackType: "Rocket e drone",
    status: "Ativo",
    risk: "Alto",
    intensity: 4,
    attacks24h: 43,
    casualties: 910,
    civiliansAffected: 44100,
    involvedCountries: ["Israel", "Palestina", "Libano"],
    position: { x: 58.8, y: 42.6 },
    summary:
      "Ataques intermitentes em fronteiras urbanas e aumento de interceptacoes aereas noturnas.",
    history: [
      "Escalada em setores densamente povoados.",
      "Aumento de atividade de UAV tatico.",
      "Pressao diplomatica para pausas operacionais.",
    ],
    localTrend: [22, 24, 27, 31, 36, 39, 44],
  },
  {
    id: "red-sea",
    region: "Corredor Mar Vermelho",
    country: "Iemen e eixo maritimo sul",
    continent: "Africa",
    conflictType: "Conflito naval",
    attackType: "Drone naval e missil antinavio",
    status: "Escalada",
    risk: "Alto",
    intensity: 4,
    attacks24h: 29,
    casualties: 460,
    civiliansAffected: 12800,
    involvedCountries: ["Iemen", "Forcas de coalizao", "Transito internacional"],
    position: { x: 55.4, y: 47.4 },
    summary:
      "Rota comercial sob risco com tentativas recorrentes de interdicao e resposta naval imediata.",
    history: [
      "Trens de escolta foram reforcados.",
      "Novos avisos de navegacao emitidos.",
      "Aumento de monitoramento por ISR embarcado.",
    ],
    localTrend: [16, 18, 19, 23, 26, 28, 30],
  },
  {
    id: "sahel",
    region: "Arco do Sahel Central",
    country: "Mali / Burkina Faso / Niger",
    continent: "Africa",
    conflictType: "Insurgencia",
    attackType: "Emboscada e IED",
    status: "Ativo",
    risk: "Alto",
    intensity: 4,
    attacks24h: 34,
    casualties: 520,
    civiliansAffected: 31800,
    involvedCountries: ["Mali", "Burkina Faso", "Niger"],
    position: { x: 50.8, y: 45.4 },
    summary:
      "Movimentos insurgentes em corredores deserticos e pressao sobre postos de fronteira.",
    history: [
      "Ataques coordenados em vias de abastecimento.",
      "Reforco de patrulhas em nucleos urbanos.",
      "Fluxo interno de deslocados segue elevado.",
    ],
    localTrend: [20, 21, 24, 27, 29, 33, 36],
  },
  {
    id: "kashmir",
    region: "Linha de Controle da Caxemira",
    country: "India / Paquistao",
    continent: "Asia",
    conflictType: "Disputa territorial",
    attackType: "Artilharia de fronteira",
    status: "Ativo",
    risk: "Moderado",
    intensity: 3,
    attacks24h: 18,
    casualties: 220,
    civiliansAffected: 9700,
    involvedCountries: ["India", "Paquistao"],
    position: { x: 66.6, y: 35.8 },
    summary:
      "Trocas de fogo localizadas com janela curta, mantendo alto risco de incidente de escalada.",
    history: [
      "Aumento de vigilancia noturna nas encostas.",
      "Trocas de fogo em setores de altitude.",
      "Canal militar bilateral com dialogo intermitente.",
    ],
    localTrend: [11, 12, 15, 16, 18, 19, 21],
  },
  {
    id: "taiwan",
    region: "Estreito de Taiwan",
    country: "Taiwan e entorno maritimo",
    continent: "Asia",
    conflictType: "Pressao militar",
    attackType: "Incursao aerea e naval",
    status: "Escalada",
    risk: "Alto",
    intensity: 4,
    attacks24h: 27,
    casualties: 110,
    civiliansAffected: 4300,
    involvedCountries: ["Taiwan", "China"],
    position: { x: 81.8, y: 43.2 },
    summary:
      "Aumento de patrulhas de projecao e manobras de saturacao no eixo maritimo oriental.",
    history: [
      "Picos de atividade aeronaval no fim de semana.",
      "Novas zonas temporarias de exercicio declaradas.",
      "Maior intensidade de acompanhamento por radar.",
    ],
    localTrend: [14, 16, 17, 19, 22, 24, 29],
  },
  {
    id: "sudan",
    region: "Centro-Sul do Sudao",
    country: "Sudao",
    continent: "Africa",
    conflictType: "Guerra urbana",
    attackType: "Combate urbano",
    status: "Ativo",
    risk: "Critico",
    intensity: 5,
    attacks24h: 39,
    casualties: 880,
    civiliansAffected: 61800,
    involvedCountries: ["Forcas armadas locais", "Milicias regionais"],
    position: { x: 53.8, y: 50.6 },
    summary:
      "Confronto urbano com quebra de servicos essenciais e impacto humanitario severo.",
    history: [
      "Bairros estrategicos alternam controle tatico.",
      "Hospitais operam com capacidade critica.",
      "Aumentam pedidos de corredor humanitario protegido.",
    ],
    localTrend: [24, 26, 29, 33, 37, 41, 45],
  },
  {
    id: "korea-dmz",
    region: "Faixa da DMZ Coreana",
    country: "Peninsula Coreana",
    continent: "Asia",
    conflictType: "Dissuasao militar",
    attackType: "Teste balistico",
    status: "Contido",
    risk: "Moderado",
    intensity: 3,
    attacks24h: 8,
    casualties: 20,
    civiliansAffected: 1500,
    involvedCountries: ["Coreia do Norte", "Coreia do Sul"],
    position: { x: 79.6, y: 33.6 },
    summary:
      "Ambiente de dissuasao com picos de retorica e testes de alcance limitado.",
    history: [
      "Novos avisos de defesa civil emitidos.",
      "Atividade de sensores na linha de contato aumentou.",
      "Sem conflito aberto, mas risco de erro permanece.",
    ],
    localTrend: [6, 7, 7, 8, 8, 9, 9],
  },
  {
    id: "andean",
    region: "Eixo Andino Norte",
    country: "Fronteira Colombia / Venezuela",
    continent: "America do Sul",
    conflictType: "Conflito irregular",
    attackType: "Incursao terrestre",
    status: "Ativo",
    risk: "Moderado",
    intensity: 3,
    attacks24h: 15,
    casualties: 170,
    civiliansAffected: 12200,
    involvedCountries: ["Colombia", "Venezuela", "grupos armados"],
    position: { x: 24.8, y: 59.2 },
    summary:
      "Movimentacoes transfronteiricas e choques localizados em corredores de selva.",
    history: [
      "Patrulhas reforcadas em passagens fluviais.",
      "Aumento de incidentes com grupos nao estatais.",
      "Inteligencia aponta rotas irregulares ativas.",
    ],
    localTrend: [8, 9, 10, 11, 13, 15, 16],
  },
  {
    id: "caucasus",
    region: "Caucaso Sul",
    country: "Armenia / Azerbaijao",
    continent: "Europa",
    conflictType: "Disputa fronteirica",
    attackType: "Fogo de precisao",
    status: "Cessar-fogo",
    risk: "Baixo",
    intensity: 2,
    attacks24h: 4,
    casualties: 35,
    civiliansAffected: 900,
    involvedCountries: ["Armenia", "Azerbaijao"],
    position: { x: 59.4, y: 35.8 },
    summary:
      "Area sob cessar-fogo monitorado, com violacoes pontuais e vigilancia reforcada.",
    history: [
      "Linhas de observacao permanecem ativas.",
      "Canal diplomatico mantem contato tecnico.",
      "Indicadores de risco estao em tendencia de queda.",
    ],
    localTrend: [4, 4, 5, 5, 4, 4, 3],
  },
  {
    id: "baltic",
    region: "Faixa Baltica",
    country: "Mar Baltico e espaco aereo adjacente",
    continent: "Europa",
    conflictType: "Pressao hibrida",
    attackType: "Guerra eletronica",
    status: "Ativo",
    risk: "Moderado",
    intensity: 3,
    attacks24h: 12,
    casualties: 8,
    civiliansAffected: 600,
    involvedCountries: ["Paises balticos", "Rusia"],
    position: { x: 53.6, y: 27.4 },
    summary:
      "Interferencias de sinal e incidentes de monitoramento em corredor estrategico de energia.",
    history: [
      "Janelas de jammer detectadas em horarios de pico.",
      "Fluxo maritimo mantido com escolta de vigilancia.",
      "Sem combate direto, mas com alerta elevado.",
    ],
    localTrend: [7, 8, 9, 10, 11, 12, 13],
  },
];

const CONFLICT_EVENTS: ConflictEvent[] = [
  {
    id: "ev-1",
    zoneId: "eu-east",
    date: "2026-03-15T08:10:00Z",
    location: "Donetsk",
    aggressor: "Forca A",
    affected: "Forca B",
    impact: 88,
    note: "Ataque de missil em nodo logistico com interrupcao de energia local.",
  },
  {
    id: "ev-2",
    zoneId: "levant",
    date: "2026-03-15T03:40:00Z",
    location: "Faixa costeira sul",
    aggressor: "Grupo armado",
    affected: "Zona urbana",
    impact: 81,
    note: "Serie de lancamentos de curto alcance seguida de interceptacao.",
  },
  {
    id: "ev-3",
    zoneId: "sudan",
    date: "2026-03-14T22:15:00Z",
    location: "Khartoum",
    aggressor: "Milicia regional",
    affected: "Distritos civis",
    impact: 93,
    note: "Combate urbano com danos em infraestrutura hospitalar.",
  },
  {
    id: "ev-4",
    zoneId: "sahel",
    date: "2026-03-14T18:50:00Z",
    location: "Corredor Gao-Niger",
    aggressor: "Celula insurgente",
    affected: "Convoy militar",
    impact: 74,
    note: "Emboscada com IED em via de abastecimento estrategica.",
  },
  {
    id: "ev-5",
    zoneId: "red-sea",
    date: "2026-03-14T13:30:00Z",
    location: "Bab-el-Mandeb",
    aggressor: "Unidade nao estatal",
    affected: "Rota comercial",
    impact: 77,
    note: "Tentativa de interdicao naval com resposta de escolta.",
  },
  {
    id: "ev-6",
    zoneId: "taiwan",
    date: "2026-03-13T21:20:00Z",
    location: "Setor oriental do estreito",
    aggressor: "Forca aeronaval",
    affected: "Zona de patrulha",
    impact: 69,
    note: "Incursao coordenada em zona de identificacao aerea.",
  },
  {
    id: "ev-7",
    zoneId: "kashmir",
    date: "2026-03-12T16:45:00Z",
    location: "Setor montanhoso norte",
    aggressor: "Artilharia de fronteira",
    affected: "Postos avancados",
    impact: 57,
    note: "Troca de fogo de baixa duracao em linha de contato.",
  },
  {
    id: "ev-8",
    zoneId: "andean",
    date: "2026-03-11T11:30:00Z",
    location: "Fronteira fluvial",
    aggressor: "Grupo irregular",
    affected: "Patrulha local",
    impact: 52,
    note: "Incursao terrestre com retirada rapida para area de selva.",
  },
  {
    id: "ev-9",
    zoneId: "korea-dmz",
    date: "2026-03-09T09:15:00Z",
    location: "Mar do Leste",
    aggressor: "Unidade balistica",
    affected: "Zona de alerta",
    impact: 44,
    note: "Teste de alcance curto com resposta de defesa regional.",
  },
  {
    id: "ev-10",
    zoneId: "baltic",
    date: "2026-03-08T20:25:00Z",
    location: "Corredor baltico",
    aggressor: "Origem nao atribuida",
    affected: "Rede de comunicacao",
    impact: 48,
    note: "Interferencia eletronica com degradacao temporaria de sinal.",
  },
  {
    id: "ev-11",
    zoneId: "eu-east",
    date: "2026-03-04T14:10:00Z",
    location: "Kharkiv",
    aggressor: "Forca A",
    affected: "Infraestrutura ferroviaria",
    impact: 73,
    note: "Ataque de longo alcance em ponto de suprimento.",
  },
  {
    id: "ev-12",
    zoneId: "caucasus",
    date: "2026-02-23T10:50:00Z",
    location: "Setor sul da linha",
    aggressor: "Patrulha local",
    affected: "Posto de observacao",
    impact: 32,
    note: "Violacao pontual registrada por observadores.",
  },
];

const MAIN_MENU = ["Dashboard", "Conflitos", "Mapa Global", "Estatisticas", "Alertas"] as const;
const NAVBAR_ITEMS = [
  "Visao Geral",
  "Mapa Tatico",
  "Inteligencia",
  "Relatorios",
  "Alertas",
] as const;

const TREND_LABELS = ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "Hoje"] as const;

const PERIOD_DAYS: Record<FilterState["period"], number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const PERIOD_SCALE: Record<FilterState["period"], number> = {
  "24h": 0.48,
  "7d": 1,
  "30d": 1.33,
  "90d": 1.84,
};

const RISK_STYLES: Record<ConflictRisk, { badge: string; dot: string; heat: string }> = {
  Baixo: {
    badge: "border-emerald-300/35 bg-emerald-500/16 text-emerald-100",
    dot: "bg-emerald-300",
    heat: "from-emerald-500/35",
  },
  Moderado: {
    badge: "border-sky-300/35 bg-sky-500/16 text-sky-100",
    dot: "bg-sky-300",
    heat: "from-sky-500/38",
  },
  Alto: {
    badge: "border-amber-300/35 bg-amber-500/18 text-amber-100",
    dot: "bg-amber-300",
    heat: "from-amber-500/38",
  },
  Critico: {
    badge: "border-red-300/45 bg-red-500/22 text-red-100",
    dot: "bg-red-300",
    heat: "from-red-500/42",
  },
};

const REFERENCE_NOW = new Date("2026-03-15T12:00:00Z").getTime();

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(dateString));
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function buildLineGeometry(values: number[], width: number, height: number) {
  if (!values.length) {
    return {
      linePath: "",
      areaPath: "",
      points: "",
    };
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const spread = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((value, index) => {
    const x = Number((index * step).toFixed(2));
    const y = Number((height - ((value - min) / spread) * height).toFixed(2));
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? width},${height} L ${
    points[0]?.x ?? 0
  },${height} Z`;

  const pointList = points.map((point) => `${point.x},${point.y}`).join(" ");

  return { linePath, areaPath, points: pointList };
}

export default function ConflictZonePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState(CONFLICT_ZONES[0]?.id ?? "");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    continent: "all",
    country: "all",
    conflictType: "all",
    period: "7d",
    intensity: "all",
    attackType: "all",
    status: "all",
  });

  const continents = useMemo(
    () => ["all", ...new Set(CONFLICT_ZONES.map((zone) => zone.continent))],
    [],
  );
  const countries = useMemo(
    () => ["all", ...new Set(CONFLICT_ZONES.map((zone) => zone.country))],
    [],
  );
  const conflictTypes = useMemo(
    () => ["all", ...new Set(CONFLICT_ZONES.map((zone) => zone.conflictType))],
    [],
  );
  const attackTypes = useMemo(
    () => ["all", ...new Set(CONFLICT_ZONES.map((zone) => zone.attackType))],
    [],
  );

  const filteredZones = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm.trim());

    return CONFLICT_ZONES.filter((zone) => {
      const matchesQuery =
        !normalizedQuery ||
        normalizeText(
          [zone.region, zone.country, zone.conflictType, zone.involvedCountries.join(" ")].join(" "),
        ).includes(normalizedQuery);

      const matchesContinent = filters.continent === "all" || zone.continent === filters.continent;
      const matchesCountry = filters.country === "all" || zone.country === filters.country;
      const matchesType = filters.conflictType === "all" || zone.conflictType === filters.conflictType;
      const matchesAttack = filters.attackType === "all" || zone.attackType === filters.attackType;
      const matchesStatus = filters.status === "all" || zone.status === filters.status;
      const matchesIntensity = filters.intensity === "all" || zone.intensity === Number(filters.intensity);

      return (
        matchesQuery &&
        matchesContinent &&
        matchesCountry &&
        matchesType &&
        matchesAttack &&
        matchesStatus &&
        matchesIntensity
      );
    });
  }, [filters, searchTerm]);

  const selectedZone =
    filteredZones.find((zone) => zone.id === selectedZoneId) ??
    filteredZones[0] ??
    CONFLICT_ZONES.find((zone) => zone.id === selectedZoneId) ??
    CONFLICT_ZONES[0];

  const hoveredZone =
    filteredZones.find((zone) => zone.id === hoveredZoneId) ??
    CONFLICT_ZONES.find((zone) => zone.id === hoveredZoneId) ??
    null;

  const visibleZoneIds = useMemo(() => new Set(filteredZones.map((zone) => zone.id)), [filteredZones]);

  const filteredEvents = useMemo(() => {
    const maxAge = PERIOD_DAYS[filters.period] * 24 * 60 * 60 * 1000;

    return CONFLICT_EVENTS.filter((event) => {
      const age = REFERENCE_NOW - new Date(event.date).getTime();
      return age <= maxAge && visibleZoneIds.has(event.zoneId);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filters.period, visibleZoneIds]);

  const kpi = useMemo(() => {
    const attacks24h = sum(filteredZones.map((zone) => zone.attacks24h));
    const casualties = sum(filteredZones.map((zone) => zone.casualties));
    const civiliansAffected = sum(filteredZones.map((zone) => zone.civiliansAffected));
    const activeConflicts = filteredZones.filter(
      (zone) => zone.status === "Ativo" || zone.status === "Escalada",
    ).length;
    const countriesInvolved = new Set(
      filteredZones.flatMap((zone) => [zone.country, ...zone.involvedCountries]),
    ).size;
    const maxAlertRegions = filteredZones.filter(
      (zone) => zone.risk === "Critico" || zone.risk === "Alto",
    ).length;

    return {
      activeConflicts,
      attacks24h,
      casualties,
      civiliansAffected,
      countriesInvolved,
      maxAlertRegions,
    };
  }, [filteredZones]);

  const conflictEvolution = useMemo(() => {
    const base = TREND_LABELS.map((_, index) =>
      sum(filteredZones.map((zone) => zone.localTrend[index] ?? 0)),
    );

    return base.map((value) => Math.round(value * PERIOD_SCALE[filters.period]));
  }, [filteredZones, filters.period]);

  const casualtiesSeries = useMemo(
    () =>
      conflictEvolution.reduce<number[]>((series, value, index) => {
        const amplified = Math.round(value * 13 + index * 21);
        const previous = index > 0 ? series[index - 1] ?? 0 : 0;
        return [...series, previous + amplified];
      }, []),
    [conflictEvolution],
  );

  const attacksByCountry = useMemo(() => {
    return filteredZones
      .map((zone) => ({
        label: zone.country.split("/")[0].trim(),
        value: zone.attacks24h,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredZones]);

  const regionalComparison = useMemo(() => {
    return MAP_CONTINENTS.map((continent) => {
      const total = sum(
        filteredZones
          .filter((zone) => zone.continent === continent.id)
          .map((zone) => zone.intensity * 18 + zone.attacks24h),
      );

      return {
        label: continent.id,
        value: total,
      };
    }).filter((item) => item.value > 0);
  }, [filteredZones]);

  const intensityRanking = useMemo(() => {
    return [...filteredZones]
      .sort((a, b) => b.intensity * 100 + b.attacks24h - (a.intensity * 100 + a.attacks24h))
      .slice(0, 5);
  }, [filteredZones]);

  const criticalAlerts = useMemo(() => {
    return [...filteredZones]
      .filter((zone) => zone.risk === "Critico" || zone.risk === "Alto")
      .sort((a, b) => b.intensity - a.intensity || b.attacks24h - a.attacks24h)
      .slice(0, 4);
  }, [filteredZones]);

  const selectedZoneEvents = useMemo(() => {
    if (!selectedZone) return [];
    return filteredEvents.filter((event) => event.zoneId === selectedZone.id).slice(0, 4);
  }, [filteredEvents, selectedZone]);

  const lineGeometry = useMemo(() => buildLineGeometry(conflictEvolution, 620, 220), [conflictEvolution]);
  const areaGeometry = useMemo(() => buildLineGeometry(casualtiesSeries, 620, 220), [casualtiesSeries]);
  const localGeometry = useMemo(
    () => buildLineGeometry(selectedZone?.localTrend ?? [], 320, 120),
    [selectedZone],
  );

  const maxAttack = Math.max(...attacksByCountry.map((entry) => entry.value), 1);
  const maxRegion = Math.max(...regionalComparison.map((entry) => entry.value), 1);
  const maxRankingScore = Math.max(
    ...intensityRanking.map((zone) => zone.intensity * 100 + zone.attacks24h),
    1,
  );

  const resetFilters = () => {
    setFilters({
      continent: "all",
      country: "all",
      conflictType: "all",
      period: "7d",
      intensity: "all",
      attackType: "all",
      status: "all",
    });
    setSearchTerm("");
  };

  const selectContinentFromMap = (continent: string) => {
    setFilters((prev) => ({ ...prev, continent: prev.continent === continent ? "all" : continent }));
  };

  const handleMenuItemClick = (item: string) => {
    if (item === "Alertas") {
      setIsAlertsModalOpen(true);
    }
  };

  useEffect(() => {
    if (!isAlertsModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAlertsModalOpen]);

  return (
    <main
      className={`${sora.variable} ${ibmPlexMono.variable} relative min-h-screen overflow-hidden bg-[#050b12] text-slate-100`}
    >
      <div className="pointer-events-none absolute inset-0 -z-50 bg-[radial-gradient(circle_at_16%_8%,rgba(36,122,208,0.26),transparent_32%),radial-gradient(circle_at_82%_0%,rgba(229,78,38,0.2),transparent_36%),radial-gradient(circle_at_68%_74%,rgba(249,138,22,0.16),transparent_36%),linear-gradient(170deg,#050b12,#081422_48%,#060d17)]" />
      <div className="pointer-events-none absolute inset-0 -z-40 opacity-22 bg-[linear-gradient(to_right,rgba(125,157,189,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(125,157,189,0.2)_1px,transparent_1px)] bg-size-[42px_42px]" />

      <div className="mx-auto max-w-420 px-4 py-6 sm:px-6 lg:px-8">
        <nav className="conflict-fade-up mb-4 rounded-3xl border border-slate-200/12 bg-[linear-gradient(132deg,rgba(10,18,30,0.95),rgba(7,14,24,0.97))] px-4 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.38)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/zona-conflito" className="group inline-flex items-center gap-2">
                <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-sky-300/35 bg-[linear-gradient(145deg,rgba(56,189,248,0.24),rgba(59,130,246,0.12))]">
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(186,230,253,0.42),transparent_60%)]" />
                  <MdPublic className="relative h-5 w-5 text-sky-100" />
                </span>
                <span className="font-(family-name:--font-sora) text-sm font-semibold text-white sm:text-base">
                  Conflict<span className="text-sky-300">Zone</span>
                </span>
              </Link>
              <span className="hidden rounded-full border border-slate-200/16 bg-slate-500/10 px-2 py-0.5 font-(family-name:--font-ibm-plex-mono) text-[10px] uppercase tracking-[0.14em] text-slate-300 md:inline-flex">
                Command Center
              </span>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              {NAVBAR_ITEMS.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleMenuItemClick(item)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                    (index === 0 && !isAlertsModalOpen) || (item === "Alertas" && isAlertsModalOpen)
                      ? "border-sky-300/45 bg-sky-500/18 text-sky-100"
                      : "border-slate-200/16 bg-slate-500/8 text-slate-300 hover:border-slate-200/28 hover:bg-slate-500/16"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200/16 bg-slate-500/8 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-200/30 hover:bg-slate-500/16"
              >
                Login
              </button>
              <button
                type="button"
                className="rounded-xl border border-sky-300/40 bg-sky-500/16 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/24"
              >
                Cadastro
              </button>
              <button
                type="button"
                className="hidden rounded-xl border border-amber-300/35 bg-amber-500/14 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/22 md:inline-flex"
              >
                Demo
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {NAVBAR_ITEMS.map((item, index) => (
              <button
                key={`mobile-${item}`}
                type="button"
                onClick={() => handleMenuItemClick(item)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                  (index === 0 && !isAlertsModalOpen) || (item === "Alertas" && isAlertsModalOpen)
                    ? "border-sky-300/45 bg-sky-500/18 text-sky-100"
                    : "border-slate-200/16 bg-slate-500/8 text-slate-300"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </nav>

        <header className="conflict-fade-up relative overflow-hidden rounded-3xl border border-slate-200/12 bg-[linear-gradient(130deg,rgba(15,25,38,0.95),rgba(10,18,30,0.95)_45%,rgba(7,12,22,0.98))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_100%_0%,rgba(249,115,22,0.16),transparent_34%)]" />

          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/35 bg-sky-500/12 text-sky-100">
                  <MdPublic className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-(family-name:--font-ibm-plex-mono) text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100/90">
                    geopolitics intelligence suite
                  </p>
                  <h1 className="font-(family-name:--font-sora) text-2xl font-semibold text-white sm:text-3xl">
                    Conflict Zone - Zonas de Conflito
                  </h1>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300/35 bg-amber-500/12 px-3 py-2 text-xs text-amber-100">
                <MdNotificationsActive className="h-4 w-4" />
                Atualizacao simulada: 15 mar 2026 12:00 UTC
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <label className="group flex items-center gap-3 rounded-2xl border border-slate-200/15 bg-[#0a1523]/92 px-4 py-3 shadow-inner shadow-black/35 transition focus-within:border-sky-300/35">
                <MdOutlineSearch className="h-5 w-5 text-slate-400 transition group-focus-within:text-sky-200" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  type="search"
                  placeholder="Buscar por pais, regiao, conflito ou forca envolvida"
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200/15 bg-slate-500/10 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-200/28 hover:bg-slate-500/18"
                >
                  <MdOutlineFilterAlt className="h-5 w-5 text-sky-200" />
                  Filtros avancados
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200/15 bg-slate-500/10 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-200/28 hover:bg-slate-500/18"
                >
                  Voltar ao hub
                  <MdArrowOutward className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              {MAIN_MENU.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleMenuItemClick(item)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                    (index === 0 && !isAlertsModalOpen) || (item === "Alertas" && isAlertsModalOpen)
                      ? "border-sky-300/45 bg-sky-500/18 text-sky-100"
                      : "border-slate-200/16 bg-slate-500/8 text-slate-300 hover:border-slate-200/28 hover:bg-slate-500/16"
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {showAdvancedFilters && (
          <section className="conflict-fade-up mt-4 rounded-3xl border border-slate-200/12 bg-[linear-gradient(145deg,rgba(11,20,33,0.94),rgba(8,15,26,0.96))] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.38)] delay-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-(family-name:--font-ibm-plex-mono) text-xs uppercase tracking-[0.16em] text-slate-300">
                Parametros operacionais
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-slate-200/15 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-200/30 hover:bg-slate-500/18"
              >
                Resetar filtros
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
              <label className="space-y-1.5 text-xs text-slate-300">
                Continente
                <select
                  value={filters.continent}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, continent: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200/15 bg-[#0b1625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-300/35"
                >
                  {continents.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "Todos" : option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs text-slate-300">
                Pais / Regiao
                <select
                  value={filters.country}
                  onChange={(event) => setFilters((prev) => ({ ...prev, country: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200/15 bg-[#0b1625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-300/35"
                >
                  {countries.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "Todos" : option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs text-slate-300">
                Tipo de conflito
                <select
                  value={filters.conflictType}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, conflictType: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200/15 bg-[#0b1625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-300/35"
                >
                  {conflictTypes.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "Todos" : option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs text-slate-300">
                Periodo
                <select
                  value={filters.period}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      period: event.target.value as FilterState["period"],
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200/15 bg-[#0b1625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-300/35"
                >
                  <option value="24h">Ultimas 24h</option>
                  <option value="7d">Ultimos 7 dias</option>
                  <option value="30d">Ultimos 30 dias</option>
                  <option value="90d">Ultimos 90 dias</option>
                </select>
              </label>

              <label className="space-y-1.5 text-xs text-slate-300">
                Intensidade
                <select
                  value={filters.intensity}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      intensity: event.target.value as FilterState["intensity"],
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200/15 bg-[#0b1625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-300/35"
                >
                  <option value="all">Todas</option>
                  <option value="5">Critica (5)</option>
                  <option value="4">Alta (4)</option>
                  <option value="3">Media (3)</option>
                  <option value="2">Baixa (2)</option>
                  <option value="1">Minima (1)</option>
                </select>
              </label>

              <label className="space-y-1.5 text-xs text-slate-300">
                Tipo de ataque
                <select
                  value={filters.attackType}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, attackType: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200/15 bg-[#0b1625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-300/35"
                >
                  {attackTypes.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "Todos" : option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-xs text-slate-300">
                Status operacional
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: event.target.value as FilterState["status"],
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200/15 bg-[#0b1625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-300/35"
                >
                  <option value="all">Todos</option>
                  <option value="Escalada">Escalada</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Contido">Contido</option>
                  <option value="Cessar-fogo">Cessar-fogo</option>
                </select>
              </label>
            </div>
          </section>
        )}

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_360px]">
          <article className="conflict-fade-up relative overflow-hidden rounded-3xl border border-slate-200/12 bg-[linear-gradient(145deg,rgba(12,23,36,0.94),rgba(9,17,29,0.96))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.42)] delay-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-(family-name:--font-ibm-plex-mono) text-[11px] uppercase tracking-[0.17em] text-slate-300">
                  mapa global de calor geopolitico
                </p>
                <h2 className="font-(family-name:--font-sora) text-xl font-semibold text-white">
                  Zonas de conflito em tempo real (simulado)
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1 rounded-full border border-red-300/35 bg-red-500/12 px-2.5 py-1">
                  <span className="h-2 w-2 rounded-full bg-red-300" /> Critico
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-500/12 px-2.5 py-1">
                  <span className="h-2 w-2 rounded-full bg-amber-300" /> Alto
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/35 bg-sky-500/12 px-2.5 py-1">
                  <span className="h-2 w-2 rounded-full bg-sky-300" /> Moderado
                </span>
              </div>
            </div>

            <div className="map-container relative aspect-[16/8.2] overflow-hidden rounded-2xl border border-slate-200/12 bg-[#061120]">
              <svg
                viewBox="0 0 1200 620"
                className="absolute inset-0 h-full w-full"
                role="img"
                aria-label="Mapa global com continentes interativos"
              >
                <defs>
                  <linearGradient id="continentGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(80,110,148,0.62)" />
                    <stop offset="100%" stopColor="rgba(32,52,78,0.42)" />
                  </linearGradient>
                  <linearGradient id="mapGrid" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(125,157,189,0.25)" />
                    <stop offset="100%" stopColor="rgba(125,157,189,0.06)" />
                  </linearGradient>
                </defs>

                <rect x="0" y="0" width="1200" height="620" fill="url(#mapGrid)" opacity="0.2" />

                {Array.from({ length: 14 }).map((_, index) => {
                  const x = index * 92;
                  return (
                    <line
                      key={`v-${index}`}
                      x1={x}
                      y1="0"
                      x2={x}
                      y2="620"
                      stroke="rgba(140,170,195,0.12)"
                      strokeWidth="1"
                    />
                  );
                })}

                {Array.from({ length: 8 }).map((_, index) => {
                  const y = index * 88;
                  return (
                    <line
                      key={`h-${index}`}
                      x1="0"
                      y1={y}
                      x2="1200"
                      y2={y}
                      stroke="rgba(140,170,195,0.12)"
                      strokeWidth="1"
                    />
                  );
                })}

                {MAP_CONTINENTS.map((continent) => {
                  const active = filters.continent === continent.id;
                  return (
                    <g key={continent.id}>
                      <path
                        d={continent.d}
                        fill="url(#continentGradient)"
                        stroke={active ? "rgba(125,211,252,0.8)" : "rgba(153,174,197,0.38)"}
                        strokeWidth={active ? 3 : 2}
                        className="cursor-pointer transition"
                        onClick={() => selectContinentFromMap(continent.id)}
                      />
                      <text
                        x={continent.labelX}
                        y={continent.labelY}
                        fill={active ? "rgba(186,230,253,0.95)" : "rgba(203,213,225,0.74)"}
                        fontSize="16"
                        fontWeight="600"
                        letterSpacing="0.1em"
                        className="pointer-events-none uppercase"
                      >
                        {continent.id}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="pointer-events-none absolute inset-0 map-scan" />

              {filteredZones.map((zone) => {
                const risk = RISK_STYLES[zone.risk];
                const isSelected = selectedZone?.id === zone.id;
                const markerSize = 13 + zone.intensity * 2;

                return (
                  <button
                    key={zone.id}
                    type="button"
                    aria-label={`Abrir detalhes de ${zone.region}`}
                    onMouseEnter={() => setHoveredZoneId(zone.id)}
                    onMouseLeave={() => setHoveredZoneId((current) => (current === zone.id ? null : current))}
                    onFocus={() => setHoveredZoneId(zone.id)}
                    onBlur={() => setHoveredZoneId((current) => (current === zone.id ? null : current))}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className="group absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${zone.position.x}%`, top: `${zone.position.y}%` }}
                  >
                    <span
                      className={`pointer-events-none absolute -inset-7 rounded-full bg-radial ${risk.heat} to-transparent opacity-65 blur-lg`}
                    />
                    <span
                      className={`relative inline-flex items-center justify-center rounded-full border border-white/60 ${risk.dot} text-[9px] font-bold text-slate-950 shadow-[0_0_0_4px_rgba(8,16,28,0.7)] ${
                        zone.risk === "Critico" ? "marker-pulse" : ""
                      }`}
                      style={{ width: markerSize, height: markerSize }}
                    >
                      {zone.intensity}
                    </span>
                    {isSelected && (
                      <span className="pointer-events-none absolute -inset-2 rounded-full border border-sky-200/70" />
                    )}
                  </button>
                );
              })}

              {!filteredZones.length && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#04101e]/90">
                  <div className="rounded-2xl border border-slate-200/15 bg-[#0b1625] p-5 text-center">
                    <p className="text-sm text-slate-200">Nenhuma zona encontrada com os filtros atuais.</p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-3 rounded-lg border border-sky-300/35 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-100"
                    >
                      Limpar filtros
                    </button>
                  </div>
                </div>
              )}

              {hoveredZone && (
                <div
                  className="pointer-events-none absolute z-20 w-70 max-w-[calc(100%-12px)] rounded-2xl border border-slate-200/20 bg-[#081425]/96 p-3 shadow-2xl backdrop-blur"
                  style={{
                    left: `clamp(12px, calc(${hoveredZone.position.x}% + 18px), calc(100% - 292px))`,
                    top: `clamp(12px, calc(${hoveredZone.position.y}% - 12px), calc(100% - 176px))`,
                  }}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{hoveredZone.country}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${RISK_STYLES[hoveredZone.risk].badge}`}
                    >
                      {hoveredZone.risk}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{hoveredZone.region}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-200">
                    <p className="rounded-lg border border-slate-200/10 bg-slate-500/10 px-2 py-1">
                      Status: <strong>{hoveredZone.status}</strong>
                    </p>
                    <p className="rounded-lg border border-slate-200/10 bg-slate-500/10 px-2 py-1">
                      Baixas: <strong>{formatCompact(hoveredZone.casualties)}</strong>
                    </p>
                    <p className="rounded-lg border border-slate-200/10 bg-slate-500/10 px-2 py-1 col-span-2">
                      Envolvidos: <strong>{hoveredZone.involvedCountries.join(", ")}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {MAP_CONTINENTS.map((continent) => (
                <button
                  key={continent.id}
                  type="button"
                  onClick={() => selectContinentFromMap(continent.id)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                    filters.continent === continent.id
                      ? "border-sky-300/45 bg-sky-500/18 text-sky-100"
                      : "border-slate-200/15 bg-slate-500/8 text-slate-300 hover:border-slate-200/28 hover:bg-slate-500/14"
                  }`}
                >
                  {continent.id}
                </button>
              ))}
            </div>
          </article>

          <aside className="space-y-4">
            <section className="conflict-fade-up rounded-3xl border border-slate-200/12 bg-[linear-gradient(145deg,rgba(12,22,35,0.95),rgba(9,16,27,0.96))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.42)] delay-3">
              <p className="font-(family-name:--font-ibm-plex-mono) text-[11px] uppercase tracking-[0.16em] text-slate-300">
                indicadores principais
              </p>
              <div className="mt-3 grid gap-2">
                <article className="rounded-xl border border-red-300/30 bg-red-500/14 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-red-100">Conflitos ativos</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{kpi.activeConflicts}</p>
                </article>
                <article className="rounded-xl border border-orange-300/30 bg-orange-500/14 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-orange-100">Ataques 24h</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{kpi.attacks24h}</p>
                </article>
                <article className="rounded-xl border border-amber-300/30 bg-amber-500/14 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-amber-100">Baixas estimadas</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatCompact(kpi.casualties)}</p>
                </article>
                <article className="rounded-xl border border-sky-300/30 bg-sky-500/14 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-sky-100">Civis afetados</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatCompact(kpi.civiliansAffected)}</p>
                </article>
                <article className="rounded-xl border border-indigo-300/30 bg-indigo-500/14 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-indigo-100">Paises envolvidos</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{kpi.countriesInvolved}</p>
                </article>
                <article className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/14 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-fuchsia-100">Alerta maximo</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{kpi.maxAlertRegions}</p>
                </article>
              </div>
            </section>

          </aside>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          <article className="conflict-fade-up rounded-3xl border border-slate-200/12 bg-[linear-gradient(145deg,rgba(12,22,35,0.95),rgba(9,16,27,0.96))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.42)] xl:col-span-2 delay-2">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-(family-name:--font-ibm-plex-mono) text-[11px] uppercase tracking-[0.16em] text-slate-300">
                  evolucao de conflitos
                </p>
                <h3 className="text-lg font-semibold text-white">Incidentes por periodo</h3>
              </div>
              <span className="rounded-full border border-sky-300/35 bg-sky-500/12 px-2.5 py-1 text-xs text-sky-100">
                Escala {filters.period}
              </span>
            </div>

            <div className="relative rounded-2xl border border-slate-200/12 bg-[#081323] p-3">
              <svg viewBox="0 0 620 220" className="h-56 w-full">
                {TREND_LABELS.map((_, index) => {
                  const x = (620 / (TREND_LABELS.length - 1)) * index;
                  return (
                    <line
                      key={`line-x-${index}`}
                      x1={x}
                      y1="0"
                      x2={x}
                      y2="220"
                      stroke="rgba(148,163,184,0.16)"
                      strokeWidth="1"
                    />
                  );
                })}
                <path d={areaGeometry.areaPath} fill="rgba(248,113,113,0.18)" />
                <path d={lineGeometry.linePath} fill="none" stroke="rgba(56,189,248,0.96)" strokeWidth="3" />
                <polyline
                  points={lineGeometry.points}
                  fill="none"
                  stroke="rgba(125,211,252,0.42)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div className="mt-2 grid grid-cols-7 gap-2 text-[11px] text-slate-400">
                {TREND_LABELS.map((label) => (
                  <p key={label} className="text-center">
                    {label}
                  </p>
                ))}
              </div>
            </div>
          </article>

          <article className="conflict-fade-up rounded-3xl border border-slate-200/12 bg-[linear-gradient(145deg,rgba(12,22,35,0.95),rgba(9,16,27,0.96))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.42)] delay-3">
            <p className="font-(family-name:--font-ibm-plex-mono) text-[11px] uppercase tracking-[0.16em] text-slate-300">
              ataques por pais
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Top areas monitoradas</h3>
            <div className="mt-3 space-y-2">
              {attacksByCountry.map((entry) => (
                <div key={entry.label} className="rounded-xl border border-slate-200/12 bg-[#0a1524] p-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>{entry.label}</span>
                    <span>{entry.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-orange-400 via-amber-300 to-sky-300"
                      style={{ width: `${(entry.value / maxAttack) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="conflict-fade-up rounded-3xl border border-slate-200/12 bg-[linear-gradient(145deg,rgba(12,22,35,0.95),rgba(9,16,27,0.96))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.42)] delay-4">
            <p className="font-(family-name:--font-ibm-plex-mono) text-[11px] uppercase tracking-[0.16em] text-slate-300">
              baixas acumuladas
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Curva de impacto</h3>
            <div className="mt-3 rounded-2xl border border-slate-200/12 bg-[#0a1524] p-3">
              <svg viewBox="0 0 620 220" className="h-52 w-full">
                <path d={areaGeometry.areaPath} fill="rgba(251,146,60,0.24)" />
                <path
                  d={areaGeometry.linePath}
                  fill="none"
                  stroke="rgba(251,146,60,0.95)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </article>

          <article className="conflict-fade-up rounded-3xl border border-slate-200/12 bg-[linear-gradient(145deg,rgba(12,22,35,0.95),rgba(9,16,27,0.96))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.42)] delay-2">
            <p className="font-(family-name:--font-ibm-plex-mono) text-[11px] uppercase tracking-[0.16em] text-slate-300">
              comparativo regional
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Pressao por continente</h3>
            <div className="mt-3 space-y-2">
              {regionalComparison.map((entry) => (
                <div key={entry.label} className="rounded-xl border border-slate-200/12 bg-[#0a1524] p-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>{entry.label}</span>
                    <span>{entry.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-sky-400 via-blue-300 to-cyan-200"
                      style={{ width: `${(entry.value / maxRegion) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="conflict-fade-up rounded-3xl border border-slate-200/12 bg-[linear-gradient(145deg,rgba(12,22,35,0.95),rgba(9,16,27,0.96))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.42)] delay-3">
            <p className="font-(family-name:--font-ibm-plex-mono) text-[11px] uppercase tracking-[0.16em] text-slate-300">
              ranking de intensidade
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Areas mais criticas</h3>
            <div className="mt-3 space-y-2">
              {intensityRanking.map((zone, index) => {
                const score = zone.intensity * 100 + zone.attacks24h;
                return (
                  <div key={zone.id} className="rounded-xl border border-slate-200/12 bg-[#0a1524] p-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-200">
                        {index + 1}. {zone.region}
                      </span>
                      <span className="text-slate-300">{score}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-red-500 via-orange-400 to-amber-300"
                        style={{ width: `${(score / maxRankingScore) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <article className="conflict-fade-up rounded-3xl border border-slate-200/12 bg-[linear-gradient(145deg,rgba(12,22,35,0.95),rgba(9,16,27,0.96))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.42)] delay-3">
            <div className="mb-3 flex items-center gap-2">
              <MdTrackChanges className="h-5 w-5 text-sky-300" />
              <div>
                <p className="font-(family-name:--font-ibm-plex-mono) text-[11px] uppercase tracking-[0.16em] text-slate-300">
                  linha do tempo
                </p>
                <h3 className="text-lg font-semibold text-white">Eventos recentes de conflito</h3>
              </div>
            </div>

            <div className="space-y-3">
              {filteredEvents.length ? (
                filteredEvents.slice(0, 8).map((event, index) => {
                  const zone = CONFLICT_ZONES.find((item) => item.id === event.zoneId);
                  return (
                    <article
                      key={event.id}
                      className="rounded-2xl border border-slate-200/12 bg-[#0a1524] p-3 transition hover:border-slate-200/25"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-white">
                          {zone?.region ?? "Zona monitorada"}
                        </p>
                        <span className="rounded-full border border-slate-200/14 bg-slate-500/10 px-2 py-0.5 text-[11px] text-slate-300">
                          {formatDate(event.date)}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-300">{event.location}</p>

                      <div className="mt-2 grid gap-2 text-[11px] text-slate-200 md:grid-cols-2">
                        <p className="rounded-lg border border-slate-200/10 bg-slate-500/10 px-2 py-1">
                          Pais agressor: <strong>{event.aggressor}</strong>
                        </p>
                        <p className="rounded-lg border border-slate-200/10 bg-slate-500/10 px-2 py-1">
                          Pais afetado: <strong>{event.affected}</strong>
                        </p>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <p className="text-slate-300">{event.note}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            event.impact >= 80
                              ? "border-red-300/35 bg-red-500/16 text-red-100"
                              : event.impact >= 60
                                ? "border-amber-300/35 bg-amber-500/16 text-amber-100"
                                : "border-sky-300/35 bg-sky-500/16 text-sky-100"
                          }`}
                        >
                          Impacto {event.impact}/100
                        </span>
                      </div>

                      {index !== filteredEvents.length - 1 && (
                        <div className="mt-3 h-px bg-linear-to-r from-sky-300/30 via-slate-300/10 to-transparent" />
                      )}
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-slate-200/12 bg-[#0a1524] p-4 text-sm text-slate-300">
                  Nenhum evento encontrado para o periodo selecionado.
                </div>
              )}
            </div>
          </article>

          <article className="conflict-fade-up rounded-3xl border border-slate-200/12 bg-[linear-gradient(145deg,rgba(12,22,35,0.95),rgba(9,16,27,0.96))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.42)] delay-4">
            {selectedZone ? (
              <>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-(family-name:--font-ibm-plex-mono) text-[11px] uppercase tracking-[0.16em] text-slate-300">
                      painel de detalhes
                    </p>
                    <h3 className="text-lg font-semibold text-white">{selectedZone.region}</h3>
                    <p className="text-xs text-slate-300">{selectedZone.country}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${RISK_STYLES[selectedZone.risk].badge}`}
                  >
                    ameaca {selectedZone.risk}
                  </span>
                </div>

                <p className="rounded-2xl border border-slate-200/12 bg-[#0a1524] p-3 text-sm leading-relaxed text-slate-200">
                  {selectedZone.summary}
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200/12 bg-slate-500/10 p-3">
                    <p className="text-[11px] uppercase tracking-widest text-slate-300">Status</p>
                    <p className="mt-1 text-base font-semibold text-white">{selectedZone.status}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200/12 bg-slate-500/10 p-3">
                    <p className="text-[11px] uppercase tracking-widest text-slate-300">Baixas estimadas</p>
                    <p className="mt-1 text-base font-semibold text-white">
                      {formatCompact(selectedZone.casualties)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200/12 bg-[#0a1524] p-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-300">Grafico local</p>
                  <svg viewBox="0 0 320 120" className="h-28 w-full">
                    <path d={localGeometry.areaPath} fill="rgba(56,189,248,0.2)" />
                    <path
                      d={localGeometry.linePath}
                      fill="none"
                      stroke="rgba(56,189,248,0.95)"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>

                <div className="mt-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-300">Paises envolvidos</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedZone.involvedCountries.map((country) => (
                      <span
                        key={country}
                        className="rounded-full border border-slate-200/14 bg-slate-500/10 px-3 py-1 text-xs text-slate-200"
                      >
                        {country}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-300">Ataques recentes</p>
                  <div className="space-y-2">
                    {selectedZoneEvents.length ? (
                      selectedZoneEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-xl border border-slate-200/12 bg-[#0b1626] px-3 py-2 text-xs text-slate-200"
                        >
                          {formatDate(event.date)} - {event.location} (impacto {event.impact}/100)
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-slate-200/12 bg-[#0b1626] px-3 py-2 text-xs text-slate-300">
                        Sem ataques recentes dentro do periodo filtrado.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200/12 bg-[#0a1524] p-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-300">Historico resumido</p>
                  <ul className="space-y-2 text-xs text-slate-200">
                    {selectedZone.history.map((item) => (
                      <li
                        key={item}
                        className="rounded-lg border border-slate-200/10 bg-slate-500/10 px-2 py-1.5"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200/12 bg-[#0a1524] p-4 text-sm text-slate-300">
                Selecione uma zona no mapa para abrir os detalhes.
              </div>
            )}
          </article>
        </section>

        {isAlertsModalOpen && (
          <div
            className="fixed inset-0 z-80 flex items-center justify-center bg-[#02060d]/80 p-4 backdrop-blur-sm"
            onClick={() => setIsAlertsModalOpen(false)}
            role="presentation"
          >
            <section
              className="w-full max-w-5xl rounded-3xl border border-slate-200/14 bg-[linear-gradient(145deg,rgba(11,20,33,0.96),rgba(7,14,24,0.98))] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.58)] sm:p-6"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Alertas visuais de conflito"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-(family-name:--font-ibm-plex-mono) text-[11px] uppercase tracking-[0.16em] text-slate-300">
                    central de alertas
                  </p>
                  <h3 className="text-xl font-semibold text-white">Alertas visuais em tempo real</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {criticalAlerts.length} regioes criticas monitoradas no periodo {filters.period}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAlertsModalOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/16 bg-slate-500/10 text-slate-200 transition hover:border-slate-200/30 hover:bg-slate-500/18"
                  aria-label="Fechar alertas"
                >
                  <MdClose className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
                <div className="space-y-3">
                  {criticalAlerts.length ? (
                    criticalAlerts.map((zone) => (
                      <article
                        key={`modal-alert-${zone.id}`}
                        className="rounded-2xl border border-slate-200/12 bg-[#0b1626] p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-white">{zone.region}</p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${RISK_STYLES[zone.risk].badge}`}
                          >
                            {zone.risk}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{zone.country}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-200">
                          <span className="rounded-full border border-slate-200/12 bg-slate-500/10 px-2 py-0.5">
                            Intensidade {zone.intensity}/5
                          </span>
                          <span className="rounded-full border border-slate-200/12 bg-slate-500/10 px-2 py-0.5">
                            Ataques 24h: {zone.attacks24h}
                          </span>
                          <span className="rounded-full border border-slate-200/12 bg-slate-500/10 px-2 py-0.5">
                            Baixas: {formatCompact(zone.casualties)}
                          </span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-200/12 bg-[#0b1626] p-4 text-sm text-slate-300">
                      Nenhum alerta critico para os filtros atuais.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200/12 bg-[#0b1626] p-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-300">
                    Escaladas recentes
                  </p>
                  <div className="space-y-2">
                    {filteredEvents.length ? (
                      filteredEvents.slice(0, 6).map((event) => {
                        const zone = CONFLICT_ZONES.find((item) => item.id === event.zoneId);
                        return (
                          <article
                            key={`modal-event-${event.id}`}
                            className="rounded-xl border border-slate-200/10 bg-slate-500/10 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <p className="font-semibold text-slate-100">
                                {zone?.region ?? "Zona monitorada"}
                              </p>
                              <span className="text-slate-300">{formatDate(event.date)}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-300">{event.location}</p>
                            <div className="mt-1 flex items-center justify-between text-[11px]">
                              <p className="text-slate-200">
                                {event.aggressor}
                                {" -> "}
                                {event.affected}
                              </p>
                              <span
                                className={`rounded-full border px-2 py-0.5 font-semibold ${
                                  event.impact >= 80
                                    ? "border-red-300/35 bg-red-500/16 text-red-100"
                                    : event.impact >= 60
                                      ? "border-amber-300/35 bg-amber-500/16 text-amber-100"
                                      : "border-sky-300/35 bg-sky-500/16 text-sky-100"
                                }`}
                              >
                                Impacto {event.impact}/100
                              </span>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-slate-200/10 bg-slate-500/10 px-3 py-2 text-sm text-slate-300">
                        Nenhum evento recente disponivel.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAlertsModalOpen(false)}
                  className="rounded-xl border border-sky-300/40 bg-sky-500/16 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/24"
                >
                  Fechar alertas
                </button>
              </div>
            </section>
          </div>
        )}

        <footer className="conflict-fade-up mt-4 grid gap-3 rounded-3xl border border-slate-200/12 bg-[linear-gradient(145deg,rgba(10,19,31,0.95),rgba(7,14,24,0.97))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.38)] md:grid-cols-3 delay-4">
          <article className="rounded-2xl border border-slate-200/10 bg-slate-500/10 p-3">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
              <MdSecurity className="h-4 w-4 text-sky-300" /> Plataforma estrategica
            </p>
            <p className="mt-2 text-sm text-slate-200">
              Centro de comando visual para analise geopolitica com foco em leitura rapida e decisoes.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200/10 bg-slate-500/10 p-3">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
              <MdAutoGraph className="h-4 w-4 text-amber-300" /> inteligencia analitica
            </p>
            <p className="mt-2 text-sm text-slate-200">
              Graficos de linha, barras, area, comparativo regional e ranking de intensidade em um unico painel.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200/10 bg-slate-500/10 p-3">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
              <MdLanguage className="h-4 w-4 text-red-300" /> operacao em rede
            </p>
            <p className="mt-2 text-sm text-slate-200">
              Dados simulados de conflitos ativos, escaladas e alertas discretos para acompanhamento continuo.
            </p>
          </article>

          <div className="md:col-span-3 mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2">
              <MdAdjust className="h-4 w-4 text-sky-300" />
              Conflict Zone - Zonas de Conflito - simulacao visual para monitoramento geopolitico.
            </span>
            <span>Atualizacao base: 15/03/2026 (UTC)</span>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .conflict-fade-up {
          opacity: 0;
          transform: translate3d(0, 16px, 0);
          animation: conflictFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .delay-1 {
          animation-delay: 120ms;
        }

        .delay-2 {
          animation-delay: 220ms;
        }

        .delay-3 {
          animation-delay: 320ms;
        }

        .delay-4 {
          animation-delay: 420ms;
        }

        .marker-pulse {
          animation: markerPulse 2.2s ease-in-out infinite;
        }

        .map-scan::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            95deg,
            transparent 0%,
            rgba(56, 189, 248, 0.06) 44%,
            rgba(56, 189, 248, 0.16) 50%,
            rgba(56, 189, 248, 0.06) 56%,
            transparent 100%
          );
          transform: translateX(-120%);
          animation: mapSweep 8s linear infinite;
        }

        @keyframes conflictFadeUp {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes markerPulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.45);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(248, 113, 113, 0);
          }
        }

        @keyframes mapSweep {
          from {
            transform: translateX(-120%);
          }
          to {
            transform: translateX(120%);
          }
        }
      `}</style>
    </main>
  );
}

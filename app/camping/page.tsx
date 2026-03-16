"use client";

import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { useMemo, useState } from "react";
import {
  MdArrowOutward,
  MdCheckCircle,
  MdCloud,
  MdFavorite,
  MdLocationOn,
  MdMap,
  MdRoute,
  MdStar,
  MdTravelExplore,
} from "react-icons/md";

type TripFilter =
  | "Todos"
  | "Barraca"
  | "Trailer"
  | "Motorhome"
  | "Familia"
  | "Pet Friendly";

type Destination = {
  id: string;
  title: string;
  city: string;
  state: string;
  region: string;
  price: number;
  rating: number;
  profile: TripFilter[];
  structure: string;
  distance: string;
  image: string;
  highlights: string[];
  mapPosition: {
    x: number;
    y: number;
  };
};

type UserStory = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  cover: string;
  destination: string;
  quote: string;
};

type RouteCard = {
  id: string;
  title: string;
  duration: string;
  distance: string;
  focus: string;
  stops: string[];
};

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const FILTERS: TripFilter[] = [
  "Todos",
  "Barraca",
  "Trailer",
  "Motorhome",
  "Familia",
  "Pet Friendly",
];

const DESTINATIONS: Destination[] = [
  {
    id: "mantiqueira",
    title: "Refugio Serra Mantiqueira",
    city: "Camanducaia",
    state: "MG",
    region: "Sudeste",
    price: 145,
    rating: 4.8,
    profile: ["Barraca", "Trailer", "Motorhome", "Familia", "Pet Friendly"],
    structure: "Estrutura completa com energia, banho e area de fogueira",
    distance: "126 km de Sao Paulo",
    image: "/camping1.jpg",
    highlights: ["Serra", "Trilhas", "Cachoeira"],
    mapPosition: { x: 56, y: 63 },
  },
  {
    id: "rosa",
    title: "Praia do Rosa Camping Club",
    city: "Imbituba",
    state: "SC",
    region: "Sul",
    price: 210,
    rating: 4.9,
    profile: ["Barraca", "Trailer", "Motorhome", "Familia", "Pet Friendly"],
    structure: "Beach camping premium com banheiro, wifi e apoio motorhome",
    distance: "85 km de Florianopolis",
    image: "/camping2.jpg",
    highlights: ["Praia", "Lagoa", "Trilhas"],
    mapPosition: { x: 53, y: 80 },
  },
  {
    id: "chapada",
    title: "Base Chapada Verde",
    city: "Alto Paraiso",
    state: "GO",
    region: "Centro-Oeste",
    price: 118,
    rating: 4.7,
    profile: ["Barraca", "Trailer", "Familia"],
    structure: "Camping de natureza com sombra, rio e area para casais",
    distance: "230 km de Brasilia",
    image: "/camping3.jpg",
    highlights: ["Cachoeiras", "Trilhas", "Mirantes"],
    mapPosition: { x: 53, y: 54 },
  },
  {
    id: "lencois",
    title: "Lençois Route Park",
    city: "Barreirinhas",
    state: "MA",
    region: "Nordeste",
    price: 188,
    rating: 4.6,
    profile: ["Trailer", "Motorhome", "Familia", "Pet Friendly"],
    structure: "Parada para motorhome com descarte, energia e seguranca",
    distance: "265 km de Sao Luis",
    image: "/camping4.jpg",
    highlights: ["Dunas", "Lagoas", "Passeios 4x4"],
    mapPosition: { x: 58, y: 40 },
  },
  {
    id: "jalapao",
    title: "Jalapao Raiz Camp",
    city: "Mateiros",
    state: "TO",
    region: "Norte",
    price: 82,
    rating: 4.5,
    profile: ["Barraca", "Trailer", "Pet Friendly"],
    structure: "Experiencia raiz com agua, banheiro e contato total com natureza",
    distance: "180 km de Palmas",
    image: "/camping1.jpg",
    highlights: ["Fervedouros", "Dunas", "Cachoeiras"],
    mapPosition: { x: 52, y: 49 },
  },
  {
    id: "alter",
    title: "Alter do Chao Eco Spot",
    city: "Santarem",
    state: "PA",
    region: "Norte",
    price: 96,
    rating: 4.6,
    profile: ["Barraca", "Motorhome", "Casal" as TripFilter, "Pet Friendly"],
    structure: "Spot simples para quem busca rio, silencio e camping de natureza",
    distance: "35 km de Santarem",
    image: "/camping2.jpg",
    highlights: ["Praia de rio", "Trilhas", "Passeio de barco"],
    mapPosition: { x: 41, y: 35 },
  },
];

const USER_STORIES: UserStory[] = [
  {
    id: "u1",
    name: "Marina Costa",
    role: "Casal + pet",
    avatar: "/camping1.jpg",
    cover: "/camping2.jpg",
    destination: "Praia do Rosa, SC",
    quote:
      "Conseguimos filtrar rapido por pet friendly e estrutura completa. Foi nosso melhor fim de semana na estrada.",
  },
  {
    id: "u2",
    name: "Rafael Nogueira",
    role: "Motorhome 7m",
    avatar: "/camping2.jpg",
    cover: "/camping3.jpg",
    destination: "Barreirinhas, MA",
    quote:
      "Usei o modo viagem para achar postos e apoio tecnico no caminho. A rota ficou muito mais segura.",
  },
  {
    id: "u3",
    name: "Livia e Bruno",
    role: "Barraca / iniciantes",
    avatar: "/camping3.jpg",
    cover: "/camping4.jpg",
    destination: "Mantiqueira, MG",
    quote:
      "As avaliacoes da comunidade ajudaram muito para escolher um camping tranquilo para primeira viagem.",
  },
  {
    id: "u4",
    name: "Caio Overland",
    role: "Trailer off-road",
    avatar: "/camping4.jpg",
    cover: "/camping1.jpg",
    destination: "Chapada, GO",
    quote:
      "Filtrei por acesso de terra, trilhas e custo diario. Em minutos, ja tinha um roteiro pronto.",
  },
];

const ROUTES: RouteCard[] = [
  {
    id: "sul",
    title: "Motorhome pelo Sul",
    duration: "8 dias",
    distance: "1.350 km",
    focus: "Motorhome / trailer",
    stops: ["Florianopolis", "Serra do Rio do Rastro", "Urubici"],
  },
  {
    id: "sudeste",
    title: "Serras do Sudeste",
    duration: "5 dias",
    distance: "760 km",
    focus: "Barraca / casais",
    stops: ["Mantiqueira", "Brotas", "Capitolio"],
  },
  {
    id: "nordeste",
    title: "Litoral nordestino",
    duration: "10 dias",
    distance: "1.920 km",
    focus: "Familia / trailer",
    stops: ["Jericoacoara", "Parnaiba", "Pipa"],
  },
];

const BRAZIL_SHAPE =
  "M253 50 L308 70 L360 118 L417 136 L469 188 L463 254 L494 320 L468 388 L414 468 L336 524 L247 560 L172 525 L124 468 L107 410 L117 340 L88 284 L104 220 L142 173 L190 132 L214 92 Z";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function anchorId(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

export default function CampingPage() {
  const [activeFilter, setActiveFilter] = useState<TripFilter>("Todos");
  const [hoveredDestinationId, setHoveredDestinationId] = useState<string | null>(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState(DESTINATIONS[0]?.id ?? "");

  const filteredDestinations = useMemo(() => {
    if (activeFilter === "Todos") return DESTINATIONS;

    return DESTINATIONS.filter((destination) => destination.profile.includes(activeFilter));
  }, [activeFilter]);

  const selectedDestination =
    filteredDestinations.find((destination) => destination.id === selectedDestinationId) ??
    filteredDestinations[0] ??
    DESTINATIONS[0];

  const hoveredDestination =
    filteredDestinations.find((destination) => destination.id === hoveredDestinationId) ?? null;

  const avgPrice = Math.round(
    filteredDestinations.reduce((sum, destination) => sum + destination.price, 0) /
      Math.max(filteredDestinations.length, 1),
  );

  return (
    <main
      className={`${manrope.variable} ${cormorant.variable} relative min-h-screen overflow-hidden bg-[#f6f3eb] text-[#173a2f]`}
    >
      <div className="pointer-events-none absolute inset-0 -z-40 bg-[radial-gradient(circle_at_10%_0%,rgba(36,153,123,0.18),transparent_36%),radial-gradient(circle_at_92%_0%,rgba(250,181,67,0.16),transparent_40%),linear-gradient(180deg,#f7f4ee,#f3ece1_45%,#f7f1e6)]" />
      <div className="pointer-events-none absolute inset-0 -z-30 opacity-30 bg-[linear-gradient(to_right,rgba(93,126,117,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(93,126,117,0.12)_1px,transparent_1px)] bg-size-[52px_52px]" />

      <nav className="travel-fade-up relative left-1/2 right-1/2 -mx-[50vw] w-screen border border-[#c4d2ca] bg-white/85 py-3 shadow-[0_14px_38px_rgba(22,49,41,0.12)] backdrop-blur">
        <div className="mx-auto max-w-340 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#3c8f75]/35 bg-[#3c8f75]/14 text-emerald-200">
                <MdTravelExplore className="h-6 w-6" />
              </span>
              <div>
                <p className="font-(family-name:--font-manrope) text-[11px] uppercase tracking-[0.14em] text-[#56796c]">
                  portal de viagens e turismo
                </p>
                <h1 className="font-(family-name:--font-cormorant) text-3xl font-semibold leading-none text-[#173a2f]">
                  Camping Brasil
                </h1>
              </div>
            </div>

            <div className="hidden flex-wrap items-center gap-2 lg:flex">
              {(["Destinos", "Roteiros", "Comunidade", "Mapa"] as const).map((item) => (
                <a
                  key={item}
                  href={`#${anchorId(item)}`}
                  className="rounded-full border border-[#c4d2ca] bg-[#f4f8f6] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#365c50] transition hover:border-[#79a696] hover:text-[#1f5f4e]"
                >
                  {item}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-xl border border-[#c4d2ca] bg-[#f4f8f6] px-3 py-2 text-xs font-semibold text-[#355a50] transition hover:bg-white"
              >
                Login
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#2f7d65]/35 bg-[#2f7d65] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#24624f]"
              >
                Cadastro
              </button>
            </div>
          </div>
        </div>
      </nav>

      <section className="travel-fade-up relative w-full overflow-hidden border-y border-white/15 bg-[linear-gradient(120deg,#081612,#0a1a16_48%,#0c1f1a)] shadow-[0_20px_58px_rgba(0,0,0,0.35)] delay-1">
          <Image
            src="/camping3.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-38"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(5,14,12,0.88),rgba(6,17,14,0.72)_46%,rgba(8,21,17,0.84)),radial-gradient(circle_at_0%_0%,rgba(51,120,102,0.32),transparent_36%),radial-gradient(circle_at_100%_100%,rgba(240,166,53,0.24),transparent_40%)]" />

          <div className="relative z-10 mx-auto max-w-340 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/30 bg-emerald-500/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
                <MdFavorite className="h-4 w-4" />
                Ecossistema outdoor no Brasil
              </p>

              <h2 className="mt-3 max-w-3xl font-(family-name:--font-cormorant) text-4xl font-semibold leading-[1.02] text-zinc-100 sm:text-6xl">
                Descubra onde acampar no Brasil,
                <span className="text-emerald-300"> do jeito que voce viaja.</span>
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                Um portal para barraca, trailer e motorhome com mapa, filtros inteligentes,
                roteiros prontos, avaliacao da comunidade e modo viagem para planejar cada parada.
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <article className="rounded-2xl border border-white/15 bg-[#0b1816]/84 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">Campings ativos</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-100">+2.800</p>
                </article>
                <article className="rounded-2xl border border-white/15 bg-[#0b1816]/84 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">Usuarios em rota</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-100">74 mil</p>
                </article>
                <article className="rounded-2xl border border-white/15 bg-[#0b1816]/84 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">Avaliacao media</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-100">4.8</p>
                </article>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#2f7d65]/35 bg-[#2f7d65] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#24624f]"
                >
                  Explorar destinos
                  <MdArrowOutward className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-white/15 bg-[#0d1b18]/84 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-[#132420]"
                >
                  Criar roteiro
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <article className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0c1a17]/80 p-2 shadow-[0_12px_30px_rgba(22,49,41,0.12)] sm:col-span-2">
                <div className="relative h-56 overflow-hidden rounded-2xl sm:h-64">
                  <Image
                    src="/camping2.jpg"
                    alt="Camping de praia no Brasil"
                    fill
                    sizes="(min-width: 1280px) 520px, 100vw"
                    className="object-cover object-center"
                    priority
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#153429]/58 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-white">
                    <div>
                      <p className="text-lg font-semibold">Praia do Rosa, SC</p>
                      <p className="text-xs text-white/90">Beach camping para barraca, trailer e motorhome</p>
                    </div>
                    <span className="rounded-full border border-white/45 bg-white/20 px-2.5 py-1 text-xs">
                      Destaque da semana
                    </span>
                  </div>
                </div>
              </article>

              <article className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0c1a17]/80 p-2 shadow-[0_12px_30px_rgba(22,49,41,0.12)]">
                <div className="relative h-32 overflow-hidden rounded-2xl sm:h-36">
                  <Image
                    src="/camping3.jpg"
                    alt="Trilha em ambiente natural"
                    fill
                    sizes="(min-width: 1280px) 250px, 100vw"
                    className="object-cover"
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-100">Chapadas e serras</p>
              </article>

              <article className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0c1a17]/80 p-2 shadow-[0_12px_30px_rgba(22,49,41,0.12)]">
                <div className="relative h-32 overflow-hidden rounded-2xl sm:h-36">
                  <Image
                    src="/camping4.jpg"
                    alt="Camping em serra brasileira"
                    fill
                    sizes="(min-width: 1280px) 250px, 100vw"
                    className="object-cover"
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-100">Refugios de montanha</p>
              </article>
            </div>
          </div>
          </div>
      </section>

      <div className="mx-auto max-w-340 px-4 pb-6 pt-5 sm:px-6 lg:px-8 lg:pb-8">
        <section id="destinos" className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_360px]">
          <article className="travel-fade-up rounded-3xl border border-[#c4d2ca] bg-white/86 p-4 shadow-[0_16px_42px_rgba(22,49,41,0.12)] delay-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-(family-name:--font-manrope) text-[11px] uppercase tracking-[0.14em] text-[#56796c]">
                  destinos em destaque
                </p>
                <h3 className="font-(family-name:--font-cormorant) text-3xl font-semibold text-[#173a2f]">
                  Portal para todos os perfis de campista
                </h3>
              </div>
              <span className="rounded-full border border-[#a5beb2] bg-[#edf5f1] px-3 py-1 text-xs font-semibold text-[#365c50]">
                {filteredDestinations.length} locais filtrados
              </span>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                    filter === activeFilter
                      ? "border-[#2f7d65]/45 bg-[#2f7d65] text-white"
                      : "border-[#c4d2ca] bg-[#edf5f1] text-[#365c50] hover:border-[#a5beb2]"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredDestinations.map((destination, index) => (
                <article
                  key={destination.id}
                  className="travel-card group overflow-hidden rounded-2xl border border-[#c4d2ca] bg-white shadow-[0_10px_26px_rgba(22,49,41,0.1)]"
                  style={{ animationDelay: `${160 + index * 70}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDestinationId(destination.id)}
                    onMouseEnter={() => setHoveredDestinationId(destination.id)}
                    onMouseLeave={() =>
                      setHoveredDestinationId((current) => (current === destination.id ? null : current))
                    }
                    className="w-full text-left"
                  >
                    <div className="relative h-36 overflow-hidden">
                      <Image
                        src={destination.image}
                        alt={`Foto de ${destination.title}`}
                        fill
                        sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-[#123226]/55 via-transparent to-transparent" />
                      <span className="absolute right-2 top-2 rounded-full border border-white/40 bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {destination.rating.toFixed(1)}
                      </span>
                    </div>

                    <div className="p-3">
                      <p className="text-sm font-semibold text-[#173a2f]">{destination.title}</p>
                      <p className="mt-0.5 text-xs text-[#56796c]">
                        {destination.city} - {destination.state}
                      </p>

                      <p className="mt-2 text-sm text-[#365c50]">{destination.structure}</p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {destination.highlights.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-[#c4d2ca] bg-[#f4f8f6] px-2 py-0.5 text-[10px] text-[#365c50]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#173a2f]">{money(destination.price)}/diaria</p>
                        <p className="text-xs text-[#56796c]">{destination.distance}</p>
                      </div>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          </article>

          <aside id="mapa" className="travel-fade-up space-y-4 delay-3">
            <section className="rounded-3xl border border-[#c4d2ca] bg-white/86 p-4 shadow-[0_16px_42px_rgba(22,49,41,0.12)]">
              <div className="mb-3 flex items-center gap-2">
                <MdMap className="h-5 w-5 text-emerald-300" />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#56796c]">mapa brasil</p>
                  <h4 className="text-lg font-semibold text-[#173a2f]">Onde acampar agora</h4>
                </div>
              </div>

              <div className="relative aspect-[1/1.03] overflow-hidden rounded-2xl border border-[#c4d2ca] bg-[#edf4ef]">
                <svg viewBox="0 0 620 620" className="absolute inset-0 h-full w-full" role="img" aria-label="Mapa do Brasil com campings em destaque">
                  <defs>
                    <linearGradient id="travelBrazilGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(53,140,114,0.48)" />
                      <stop offset="100%" stopColor="rgba(43,104,86,0.32)" />
                    </linearGradient>
                  </defs>

                  <rect x="0" y="0" width="620" height="620" fill="rgba(12,28,22,0.82)" />
                  <path d={BRAZIL_SHAPE} fill="url(#travelBrazilGradient)" stroke="rgba(24,82,66,0.55)" strokeWidth="2.3" />
                </svg>

                {filteredDestinations.map((destination) => {
                  const selected = destination.id === selectedDestination.id;
                  return (
                    <button
                      key={`map-${destination.id}`}
                      type="button"
                      onClick={() => setSelectedDestinationId(destination.id)}
                      onMouseEnter={() => setHoveredDestinationId(destination.id)}
                      onMouseLeave={() =>
                        setHoveredDestinationId((current) => (current === destination.id ? null : current))
                      }
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${destination.mapPosition.x}%`, top: `${destination.mapPosition.y}%` }}
                      aria-label={`Abrir ${destination.title}`}
                    >
                      <span className="pointer-events-none absolute -inset-5 rounded-full bg-radial from-[#2f7d65]/35 to-transparent blur-md" />
                      <span
                        className={`relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/70 text-[10px] font-semibold text-white shadow-[0_0_0_4px_rgba(31,71,59,0.35)] ${
                          selected ? "bg-[#2f7d65]" : "bg-[#4e9a82]"
                        }`}
                      >
                        {destination.rating.toFixed(0)}
                      </span>
                    </button>
                  );
                })}

                {hoveredDestination && (
                  <div
                    className="pointer-events-none absolute z-20 w-62.5 max-w-[calc(100%-8px)] rounded-xl border border-[#c4d2ca] bg-white/95 p-2.5 shadow-2xl"
                    style={{
                      left: `clamp(8px, calc(${hoveredDestination.mapPosition.x}% + 14px), calc(100% - 258px))`,
                      top: `clamp(8px, calc(${hoveredDestination.mapPosition.y}% - 10px), calc(100% - 124px))`,
                    }}
                  >
                    <p className="text-sm font-semibold text-[#173a2f]">{hoveredDestination.title}</p>
                    <p className="text-xs text-[#56796c]">
                      {hoveredDestination.city} - {hoveredDestination.state}
                    </p>
                    <p className="mt-1 text-xs text-[#365c50]">{money(hoveredDestination.price)}/diaria</p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-[#c4d2ca] bg-white/86 p-4 shadow-[0_16px_42px_rgba(22,49,41,0.12)]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#56796c]">modo viagem</p>
              <h4 className="mt-1 text-lg font-semibold text-[#173a2f]">Painel de rota</h4>

              <article className="mt-3 overflow-hidden rounded-2xl border border-[#c4d2ca] bg-white/92">
                <div className="relative h-32 sm:h-40">
                  <Image
                    src={selectedDestination.image}
                    alt={`Foto de ${selectedDestination.title}`}
                    fill
                    sizes="(min-width: 1280px) 340px, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#081612]/72 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-sm font-semibold text-white">{selectedDestination.title}</p>
                    <p className="text-[11px] text-zinc-200">
                      {selectedDestination.city} - {selectedDestination.state}
                    </p>
                  </div>
                </div>
              </article>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-[#c4d2ca] bg-[#edf5f1] p-3">
                  <p className="inline-flex items-center gap-1 text-xs text-[#365c50]">
                    <MdCloud className="h-4 w-4" /> clima
                  </p>
                  <p className="mt-1 font-semibold text-[#173a2f]">26C estavel</p>
                </div>
                <div className="rounded-xl border border-[#c4d2ca] bg-[#edf5f1] p-3">
                  <p className="inline-flex items-center gap-1 text-xs text-[#365c50]">
                    <MdRoute className="h-4 w-4" /> proxima parada
                  </p>
                  <p className="mt-1 font-semibold text-[#173a2f]">{selectedDestination.distance}</p>
                </div>
                <div className="rounded-xl border border-[#c4d2ca] bg-[#edf5f1] p-3">
                  <p className="inline-flex items-center gap-1 text-xs text-[#365c50]">
                    <MdLocationOn className="h-4 w-4" /> atracoes
                  </p>
                  <p className="mt-1 font-semibold text-[#173a2f]">{selectedDestination.highlights[0]}</p>
                </div>
                <div className="rounded-xl border border-[#c4d2ca] bg-[#edf5f1] p-3">
                  <p className="inline-flex items-center gap-1 text-xs text-[#365c50]">
                    <MdStar className="h-4 w-4" /> avaliacao
                  </p>
                  <p className="mt-1 font-semibold text-[#173a2f]">{selectedDestination.rating.toFixed(1)}</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-[#c4d2ca] bg-[#edf5f1] p-3 text-sm text-[#365c50]">
                Faixa media no filtro atual: <strong>{money(avgPrice)}</strong>
              </div>
            </section>
          </aside>
        </section>

        <section id="roteiros" className="mt-5 grid gap-4 xl:grid-cols-3">
          {ROUTES.map((route, index) => (
            <article
              key={route.id}
              className="travel-fade-up rounded-3xl border border-[#c4d2ca] bg-white/86 p-4 shadow-[0_16px_42px_rgba(22,49,41,0.12)] delay-2"
              style={{ animationDelay: `${180 + index * 90}ms` }}
            >
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#56796c]">roteiro pronto</p>
              <h4 className="mt-1 font-(family-name:--font-cormorant) text-3xl font-semibold text-[#173a2f]">
                {route.title}
              </h4>
              <p className="mt-2 text-sm text-[#365c50]">
                {route.duration} • {route.distance} • {route.focus}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {route.stops.map((stop) => (
                  <span
                    key={stop}
                    className="rounded-full border border-[#c4d2ca] bg-[#f4f8f6] px-2 py-0.5 text-[10px] text-[#365c50]"
                  >
                    {stop}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section id="comunidade" className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <article className="travel-fade-up rounded-3xl border border-[#c4d2ca] bg-white/86 p-4 shadow-[0_16px_42px_rgba(22,49,41,0.12)] delay-3">
            <div className="mb-3 flex items-center gap-2">
              <MdFavorite className="h-5 w-5 text-rose-300" />
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#56796c]">fotos de usuarios</p>
                <h4 className="font-(family-name:--font-cormorant) text-3xl font-semibold text-[#173a2f]">
                  Comunidade em viagem
                </h4>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {USER_STORIES.map((story) => (
                <article key={story.id} className="overflow-hidden rounded-2xl border border-[#c4d2ca] bg-white/92">
                  <div className="relative h-32">
                    <Image
                      src={story.cover}
                      alt={`Foto de local visitado por ${story.name}`}
                      fill
                      sizes="(min-width: 1280px) 25vw, 100vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#163129]/58 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-2">
                      <div className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white/80">
                        <Image
                          src={story.avatar}
                          alt={`Foto de perfil de ${story.name}`}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{story.name}</p>
                        <p className="text-[11px] text-white/85">{story.role}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-[#56796c]">{story.destination}</p>
                    <p className="mt-1 text-sm text-[#365c50]">{story.quote}</p>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="travel-fade-up rounded-3xl border border-[#c4d2ca] bg-white/86 p-4 shadow-[0_16px_42px_rgba(22,49,41,0.12)] delay-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#56796c]">fotos de locais</p>
            <h4 className="mt-1 font-(family-name:--font-cormorant) text-3xl font-semibold text-[#173a2f]">
              Galeria de destinos brasileiros
            </h4>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {DESTINATIONS.slice(0, 4).map((destination) => (
                <article
                  key={`gallery-${destination.id}`}
                  className="overflow-hidden rounded-2xl border border-[#c4d2ca] bg-white"
                >
                  <div className="relative h-32 sm:h-36">
                    <Image
                      src={destination.image}
                      alt={`Foto de ${destination.title}`}
                      fill
                      sizes="(min-width: 1280px) 20vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-[#173a2f]">{destination.title}</p>
                    <p className="text-[11px] text-[#56796c]">
                      {destination.city} - {destination.state}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-[#c4d2ca] bg-[#edf5f1] p-3">
              <p className="text-sm text-[#365c50]">
                O app conecta descoberta, planejamento e confianca com base em fotos reais,
                avaliacao da comunidade e curadoria de roteiros por perfil de viagem.
              </p>
            </div>
          </article>
        </section>

        <footer className="travel-fade-up mt-5 rounded-3xl border border-[#c4d2ca] bg-white/86 p-4 shadow-[0_16px_42px_rgba(22,49,41,0.12)] delay-4">
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-[#c4d2ca] bg-white p-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#56796c]">
                <MdCheckCircle className="h-4 w-4 text-emerald-300" /> filtros inteligentes
              </p>
              <p className="mt-2 text-sm text-[#365c50]">
                Tipo de veiculo, estrutura, faixa de preco, bioma e atracoes em um unico fluxo.
              </p>
            </article>

            <article className="rounded-2xl border border-[#c4d2ca] bg-white p-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#56796c]">
                <MdRoute className="h-4 w-4 text-emerald-300" /> roteiros e diario
              </p>
              <p className="mt-2 text-sm text-[#365c50]">
                Sugestoes prontas para feriados, litoral e serra com check-ins e historico de viagem.
              </p>
            </article>

            <article className="rounded-2xl border border-[#c4d2ca] bg-white p-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#56796c]">
                <MdMap className="h-4 w-4 text-emerald-300" /> mapa nacional
              </p>
              <p className="mt-2 text-sm text-[#365c50]">
                Descubra onde acampar no Brasil, do jeito que voce viaja.
              </p>
            </article>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-[#56796c]">
            <span>Camping Brasil Portal • conceito de produto de turismo outdoor.</span>
            <Link href="/" className="inline-flex items-center gap-1 font-semibold text-[#2f7d65] hover:text-[#24624f]">
              Voltar ao hub
              <MdArrowOutward className="h-3.5 w-3.5" />
            </Link>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .travel-fade-up {
          opacity: 0;
          transform: translate3d(0, 14px, 0);
          animation: travelFade 0.72s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .delay-1 {
          animation-delay: 110ms;
        }

        .delay-2 {
          animation-delay: 210ms;
        }

        .delay-3 {
          animation-delay: 320ms;
        }

        .delay-4 {
          animation-delay: 430ms;
        }

        .travel-card {
          opacity: 0;
          transform: translate3d(0, 14px, 0);
          animation: cardRise 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes travelFade {
          from {
            opacity: 0;
            transform: translate3d(0, 14px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes cardRise {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </main>
  );
}

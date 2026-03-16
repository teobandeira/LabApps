import type { Metadata } from "next";
import Image from "next/image";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import type { IconType } from "react-icons";
import {
  MdArrowOutward,
  MdDeliveryDining,
  MdForest,
  MdGridView,
  MdLocalMall,
  MdRocketLaunch,
  MdSchedule,
  MdSportsEsports,
  MdStackedLineChart,
} from "react-icons/md";

export const metadata: Metadata = {
  title: "Lab Apps Portfolio",
  description: "Hub principal de apresentacao dos apps do projeto.",
};

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

type PortfolioApp = {
  name: string;
  subtitle: string;
  description: string;
  status: "live" | "roadmap";
  href?: string;
  icon: IconType;
  stack: string[];
  image: string;
};

const APPS: PortfolioApp[] = [
  {
    name: "Delivery App",
    subtitle: "Producao",
    description:
      "Marketplace de restaurantes e mercados com vitrine, detalhes do estabelecimento e fluxo focado em conversao.",
    status: "live",
    href: "/delivery/home",
    icon: MdDeliveryDining,
    stack: ["Next.js", "App Router", "Tailwind v4"],
    image: "/entregador.jpg",
  },
  {
    name: "Mini RPG",
    subtitle: "Producao",
    description:
      "RPG narrativo com progressao de personagem, escolhas de historia e batalhas por turnos.",
    status: "live",
    href: "/rpg",
    icon: MdSportsEsports,
    stack: ["Narrative", "Turn-Based", "Cards"],
    image: "/rpg-hero2.jpg",
  },
  {
    name: "Conflict Zone - Zonas de Conflito",
    subtitle: "Producao",
    description:
      "Plataforma de monitoramento geopolítico com mapa global interativo, alertas críticos e analise visual de conflitos.",
    status: "live",
    href: "/zona-conflito",
    icon: MdLocalMall,
    stack: ["Mapa Global", "Heatmap", "Dashboard"],
    image: "/war.jpg",
  },
  {
    name: "Camping Brasil - Portal",
    subtitle: "Producao",
    description:
      "Portal de viagens e turismo para descobrir campings no Brasil com mapa, filtros, roteiros e comunidade.",
    status: "live",
    href: "/camping",
    icon: MdForest,
    stack: ["Turismo", "Mapa Brasil", "Roteiros"],
    image: "/camping1.jpg",
  },
];

const liveCount = APPS.filter((app) => app.status === "live").length;
const roadmapCount = APPS.filter((app) => app.status === "roadmap").length;

const METRICS = [
  {
    label: "Apps no portfolio",
    value: String(APPS.length).padStart(2, "0"),
    detail: `${liveCount} live + ${roadmapCount} em roadmap`,
    icon: MdGridView,
  },
  {
    label: "Apps publicados",
    value: `${String(liveCount).padStart(2, "0")} live`,
    detail: `${liveCount} apps navegaveis no hub`,
    icon: MdStackedLineChart,
  },
  {
    label: "Stack base",
    value: "Next.js 16",
    detail: "Arquitetura unica para escalar novos apps",
    icon: MdRocketLaunch,
  },
];

const displayApps = APPS;

export default function PortfolioPage() {
  return (
    <main
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} relative min-h-screen overflow-hidden bg-[#070412] text-zinc-100`}
    >
      <div className="pointer-events-none absolute inset-0 -z-40 bg-[radial-gradient(circle_at_15%_10%,rgba(168,85,247,0.35),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(99,102,241,0.28),transparent_35%),linear-gradient(165deg,#070412,#100826_45%,#090516)]" />
      <div className="pointer-events-none absolute inset-0 -z-30 opacity-35 bg-[linear-gradient(to_right,rgba(192,132,252,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(192,132,252,0.12)_1px,transparent_1px)] bg-size-[44px_44px]" />
      <div className="portfolio-float pointer-events-none absolute -left-24 top-16 -z-20 h-80 w-80 rounded-full bg-violet-500/30 blur-3xl" />
      <div
        className="portfolio-float pointer-events-none absolute -right-24 bottom-8 -z-20 h-80 w-80 rounded-full bg-indigo-400/30 blur-3xl"
        style={{ animationDelay: "1200ms" }}
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="portfolio-fade-up relative isolate overflow-hidden rounded-3xl border border-violet-300/20 bg-[linear-gradient(145deg,rgba(40,12,86,0.9),rgba(21,7,49,0.95)_52%,rgba(9,3,25,0.98))] p-7 shadow-[0_32px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-10">
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/lab.jpg"
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 1200px, 100vw"
              className="object-cover object-center opacity-65"
              aria-hidden
            />
          </div>
          <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-r from-[#070412]/76 via-[#0b0720]/54 to-[#130a2b]/72" />
          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(168,85,247,0.28),transparent_42%),radial-gradient(circle_at_90%_100%,rgba(99,102,241,0.24),transparent_44%)]" />

          <div className="absolute -right-16 -top-16 z-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 z-20 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />

          <div className="relative z-20">
          <p className="relative inline-flex items-center gap-2 rounded-full border border-violet-200/25 bg-violet-300/10 px-4 py-1.5 font-(family-name:--font-jetbrains-mono) text-[11px] font-semibold tracking-[0.2em] text-violet-100">
            <MdRocketLaunch className="h-4 w-4 text-violet-300" />
            LAB APPS // TIMOTEO BANDEIRA
          </p>

          <h1 className="relative mt-5 max-w-4xl font-(family-name:--font-space-grotesk) text-4xl font-bold leading-tight sm:text-6xl">
            Lab Apps
          </h1>
          <p className="relative mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            A raiz funciona como hub do projeto. Hoje o portfolio ja tem {liveCount} apps em
            producao, todos navegaveis com o mesmo padrao visual.
          </p>

          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link
              href="/delivery/home"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/35 transition hover:bg-violet-400"
            >
              Abrir Delivery
              <MdArrowOutward className="h-4 w-4" />
            </Link>
            <Link
              href="/rpg"
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200/35 bg-black/30 px-5 py-3 text-sm font-semibold text-violet-100 transition hover:bg-white/10 hover:text-white"
            >
              Abrir Jogo RPG
              <MdArrowOutward className="h-4 w-4" />
            </Link>
            <Link
              href="/camping"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/45 bg-emerald-500/20 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/32 hover:text-white"
            >
              Abrir Camping
              <MdArrowOutward className="h-4 w-4" />
            </Link>
          </div>

          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          {METRICS.map((metric, index) => (
            <article
              key={metric.label}
              className="portfolio-fade-up rounded-2xl border border-violet-200/20 bg-[linear-gradient(150deg,rgba(36,10,78,0.9),rgba(20,7,47,0.95)_52%,rgba(9,3,24,0.98))] p-4 shadow-[0_14px_40px_rgba(7,4,18,0.45)] backdrop-blur-md"
              style={{ animationDelay: `${120 + index * 120}ms` }}
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200/25 bg-[linear-gradient(145deg,rgba(74,38,143,0.42),rgba(44,20,93,0.3))]">
                <metric.icon className="h-5 w-5 text-violet-200" />
              </div>
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{metric.label}</p>
              <p className="mt-2 font-(family-name:--font-space-grotesk) text-2xl font-semibold text-zinc-100">
                {metric.value}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayApps.map((app, index) => (
            <article
              key={app.name}
              className="portfolio-fade-up group flex h-full flex-col rounded-2xl border border-violet-200/20 bg-[linear-gradient(150deg,rgba(36,10,78,0.9),rgba(20,7,47,0.95)_52%,rgba(9,3,24,0.98))] p-5 shadow-[0_18px_45px_rgba(7,4,18,0.5)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-violet-200/35"
              style={{ animationDelay: `${360 + index * 120}ms` }}
            >
              <div className="relative mb-4 h-28 overflow-hidden rounded-xl border border-white/15">
                <Image
                  src={app.image}
                  alt={`Imagem do app ${app.name}`}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#0a0518]/64 via-transparent to-transparent" />
              </div>
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
                    app.status === "live"
                      ? "border border-emerald-300/30 bg-emerald-500/12 text-emerald-100"
                      : "border border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-100"
                  }`}
                >
                  {app.status === "live" ? (
                    <MdStackedLineChart className="h-4 w-4" />
                  ) : (
                    <MdSchedule className="h-4 w-4" />
                  )}
                  {app.status === "live" ? "Live" : "Roadmap"}
                </span>
                <app.icon className="h-6 w-6 text-violet-200" />
              </div>

              <h3 className="mt-4 font-(family-name:--font-space-grotesk) text-2xl font-semibold text-zinc-100">
                {app.name}
              </h3>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-400">
                {app.subtitle}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">{app.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {app.stack.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-violet-200/25 bg-[linear-gradient(145deg,rgba(44,16,93,0.8),rgba(18,5,42,0.96))] px-3 py-1 font-(family-name:--font-jetbrains-mono) text-[11px] text-zinc-300"
                  >
                    {item}
                  </span>
                ))}
              </div>

              {app.href ? (
                <Link
                  href={app.href}
                  className="mt-auto pt-5 inline-flex items-center gap-1 text-sm font-semibold text-violet-100 transition hover:gap-2 hover:text-white"
                >
                  Acessar app
                  <MdArrowOutward className="h-4 w-4" />
                </Link>
              ) : (
                <p className="mt-auto pt-5 text-sm font-semibold text-zinc-500">Em breve</p>
              )}
            </article>
          ))}
        </section>

        <footer
          className="portfolio-fade-up mt-6 rounded-2xl border border-violet-200/20 bg-[linear-gradient(145deg,rgba(40,12,86,0.92),rgba(21,7,49,0.96)_52%,rgba(9,3,25,0.99))] px-5 py-4 shadow-[0_16px_44px_rgba(7,4,18,0.5)]"
          style={{ animationDelay: "760ms" }}
        >
          <div className="flex flex-col gap-3 text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-(family-name:--font-space-grotesk) text-lg font-semibold text-zinc-100">
                Lab Apps
              </p>
              <p className="text-xs text-zinc-400">
                © {new Date().getFullYear()} Hub de projetos e produtos digitais.
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-4 text-xs text-zinc-300">
              <Link href="/delivery/home" className="transition hover:text-white">
                Delivery
              </Link>
              <Link href="/rpg" className="transition hover:text-white">
                Mini RPG
              </Link>
              <Link href="/zona-conflito" className="transition hover:text-white">
                Conflict Zone
              </Link>
              <Link href="/camping" className="transition hover:text-white">
                Camping
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </main>
  );
}

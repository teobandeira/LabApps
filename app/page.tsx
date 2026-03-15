import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import type { IconType } from "react-icons";
import {
  MdArrowOutward,
  MdCalendarMonth,
  MdDeliveryDining,
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
};

const APPS: PortfolioApp[] = [
  {
    name: "Delivery",
    subtitle: "Producao",
    description:
      "Marketplace de restaurantes e mercados com vitrine, detalhes do estabelecimento e fluxo focado em conversao.",
    status: "live",
    href: "/delivery/home",
    icon: MdDeliveryDining,
    stack: ["Next.js", "App Router", "Tailwind v4"],
  },
  {
    name: "Catalogo Local",
    subtitle: "Em planejamento",
    description:
      "Hub de vitrines para comercios de bairro com busca inteligente, colecoes e checkout simplificado.",
    status: "roadmap",
    icon: MdLocalMall,
    stack: ["Search", "CMS", "Checkout"],
  },
  {
    name: "Agenda de Servicos",
    subtitle: "Em planejamento",
    description:
      "Aplicativo para agendamentos, pagamentos e gestao de horarios de prestadores independentes.",
    status: "roadmap",
    icon: MdCalendarMonth,
    stack: ["Scheduler", "Payments", "CRM"],
  },
  {
    name: "Jogo RPG",
    subtitle: "Em planejamento",
    description:
      "RPG com progressao de personagem, sistema de classes, missoes e inventario.",
    status: "roadmap",
    icon: MdSportsEsports,
    stack: ["Quests", "Combat", "Inventory"],
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
    label: "Primeiro release",
    value: "App destaque",
    detail: "Fluxo completo ja navegavel",
    icon: MdStackedLineChart,
  },
  {
    label: "Stack base",
    value: "Next.js 16",
    detail: "Arquitetura unica para escalar novos apps",
    icon: MdRocketLaunch,
  },
];

const featuredApp = APPS[0];
const plannedApps = APPS.slice(1);

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
        <header className="portfolio-fade-up relative overflow-hidden rounded-3xl border border-violet-300/20 bg-white/4 p-7 shadow-[0_32px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-10">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />

          <p className="relative inline-flex items-center gap-2 rounded-full border border-violet-200/25 bg-violet-300/10 px-4 py-1.5 font-(family-name:--font-jetbrains-mono) text-[11px] font-semibold tracking-[0.2em] text-violet-100">
            <MdRocketLaunch className="h-4 w-4 text-violet-300" />
            LAB APPS // TIMOTEO BANDEIRA
          </p>

          <h1 className="relative mt-5 max-w-4xl font-(family-name:--font-space-grotesk) text-4xl font-bold leading-tight sm:text-6xl">
            Lab Apps
          </h1>
          <p className="relative mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            A raiz funciona como hub do projeto. O app em destaque ja esta disponivel e os
            proximos entram aqui com o mesmo padrao visual.
          </p>

          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link
              href="/delivery/home"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/35 transition hover:bg-violet-400"
            >
              Abrir app em destaque
              <MdArrowOutward className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          {METRICS.map((metric, index) => (
            <article
              key={metric.label}
              className="portfolio-fade-up rounded-2xl border border-violet-200/15 bg-white/3 p-4 backdrop-blur-md"
              style={{ animationDelay: `${120 + index * 120}ms` }}
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200/20 bg-violet-300/10">
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

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <article className="portfolio-fade-up group relative overflow-hidden rounded-3xl border border-violet-300/30 bg-linear-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent p-6 shadow-[0_20px_65px_rgba(139,92,246,0.22)]">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-violet-400/25 blur-3xl" />
            <div className="relative flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-200">
                <MdStackedLineChart className="h-4 w-4" />
                Live
              </span>
              <featuredApp.icon className="h-7 w-7 text-violet-200" />
            </div>

            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-violet-200/90">
              {featuredApp.subtitle}
            </p>
            <h2 className="mt-2 font-(family-name:--font-space-grotesk) text-3xl font-bold tracking-tight text-white">
              {featuredApp.name}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-200">
              {featuredApp.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {featuredApp.stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-violet-200/20 bg-black/30 px-3 py-1 font-(family-name:--font-jetbrains-mono) text-[11px] text-zinc-200"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/delivery/home"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-100 px-4 py-2.5 text-sm font-semibold text-violet-950 transition hover:bg-white"
              >
                Acessar app
                <MdArrowOutward className="h-4 w-4" />
              </Link>
            </div>
          </article>

          <div className="grid gap-4">
            {plannedApps.map((app, index) => (
              <article
                key={app.name}
                className="portfolio-fade-up group rounded-2xl border border-violet-200/15 bg-white/3 p-5 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-violet-200/30"
                style={{ animationDelay: `${360 + index * 120}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-fuchsia-100">
                    <MdSchedule className="h-4 w-4" />
                    Roadmap
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
                      className="rounded-full border border-violet-200/15 bg-black/30 px-3 py-1 font-(family-name:--font-jetbrains-mono) text-[11px] text-zinc-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

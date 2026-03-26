import type { Metadata } from "next";
import Link from "next/link";
import type { IconType } from "react-icons";
import { MdArrowOutward, MdForum, MdImage, MdRocketLaunch } from "react-icons/md";
import { SiOpenai } from "react-icons/si";

export const metadata: Metadata = {
  title: "ChatGPT Modes",
  description: "Selecione um modo para conversar ou gerar imagens com a API da OpenAI.",
};

type ModeCard = {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon: IconType;
  style: "chat" | "image";
};

const MODE_CARDS: ModeCard[] = [
  {
    title: "ChatGPT 5.2 PRO",
    subtitle: "Texto + anexos",
    description:
      "Converse com a IA, envie arquivos de texto e receba respostas com contexto dos anexos.",
    href: "/chatgpt/chat",
    icon: MdForum,
    style: "chat",
  },
  {
    title: "Image Designer PRO",
    subtitle: "Texto para imagem",
    description:
      "Descreva uma cena e gere imagens na hora com diferentes proporcoes e estilo visual.",
    href: "/chatgpt/imagem",
    icon: MdImage,
    style: "image",
  },
];

export default function ChatGptModesPage() {
  return (
    <main className="font-(family-name:--font-montserrat) min-h-screen bg-gray-900 text-white">
      <section className="mx-auto w-full max-w-7xl px-0 pt-0 pb-8 sm:pt-0">
        <header className="relative mb-6 overflow-hidden rounded-none border-x border-b border-cyan-500/20 bg-linear-to-br from-gray-900 via-slate-900 to-gray-900 p-4 sm:rounded-3xl sm:p-8">
          <div className="absolute -top-16 -right-10 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
            <MdRocketLaunch className="h-4 w-4" />
            OpenAI Family
          </p>

          <div className="mt-5 flex items-center gap-3">
            <SiOpenai className="h-9 w-9 text-purple-300" />
            <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
              OpenAI
            </h1>
          </div>
        </header>

        <section className="grid gap-4 px-4 sm:px-6 lg:px-8 md:grid-cols-2">
          {MODE_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={`group flex h-full cursor-pointer flex-col rounded-2xl border border-gray-700/80 bg-linear-to-br from-gray-900/80 via-slate-900/70 to-gray-950/70 p-6 transition hover:border-purple-400/45 ${
                card.style === "chat" ? "hover:bg-gray-900/95" : "hover:bg-purple-950/20"
              }`}
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${
                  card.style === "chat"
                    ? "border-cyan-400/35 bg-cyan-500/10 text-cyan-300"
                    : "border-purple-400/35 bg-purple-500/15 text-purple-300"
                }`}
              >
                <card.icon className="h-6 w-6" />
              </div>

              <p
                className={`mt-4 text-xs font-semibold uppercase tracking-[0.16em] ${
                  card.style === "chat" ? "text-cyan-300" : "text-purple-300"
                }`}
              >
                {card.subtitle}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-100">{card.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-300">{card.description}</p>

              <span
                className="mt-6 ml-auto inline-flex items-center gap-2 rounded-lg border border-purple-400/35 bg-purple-500/15 px-3 py-1.5 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
              >
                Abrir modo
                <MdArrowOutward className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </section>
      </section>
    </main>
  );
}

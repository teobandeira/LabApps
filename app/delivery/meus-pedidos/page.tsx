import type { Metadata } from "next";
import Image from "next/image";
import {
  MdAccessTime,
  MdCheckCircle,
  MdDeliveryDining,
  MdLocalOffer,
  MdPayments,
  MdReceiptLong,
  MdStorefront,
} from "react-icons/md";
import AppFooter from "../components/layout/AppFooter";
import AppHeader, { type HeaderLink } from "../components/layout/AppHeader";
import LiveOrderWidget from "../home/components/LiveOrderWidget";

export const metadata: Metadata = {
  title: "Meus pedidos • EasyDelivery",
  description:
    "Acompanhe seu pedido ao vivo e visualize o resumo completo da compra no EasyDelivery.",
};

const TOP_LINKS: HeaderLink[] = [
  { label: "Início", href: "/delivery/home" },
  { label: "Meus pedidos", href: "/delivery/meus-pedidos" },
  { label: "Suporte", href: "#" },
];

const MENU_LINKS: HeaderLink[] = [
  { label: "Resumo", href: "#resumo" },
  { label: "Acompanhamento", href: "#acompanhamento" },
  { label: "Detalhes", href: "#detalhes" },
];

export default function MeusPedidosPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AppHeader topLinks={TOP_LINKS} menuLinks={MENU_LINKS} logoHref="/delivery/home" />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section
          id="resumo"
          className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm ring-1 ring-black/5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                <MdDeliveryDining className="h-4 w-4" />
                Pedido em andamento
              </p>
              <h1 className="mt-2 text-2xl font-black text-zinc-900 sm:text-3xl">Meus pedidos</h1>
              <p className="mt-1 text-sm text-zinc-500">Pedido #DA-3812 • realizado hoje às 19:42</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
              <p className="text-xs text-zinc-500">Total pago</p>
              <p className="text-2xl font-black text-zinc-900">R$ 68,70</p>
            </div>
          </div>

          <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <article id="detalhes" className="space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <MdStorefront className="h-4 w-4 text-[#ea1d2c]" />
                    La Vera Pizza
                  </p>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Confirmado
                  </span>
                </div>
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2.5">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200">
                    <Image
                      src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80"
                      alt="Pizza Calabresa GG"
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                      Foto do pedido
                    </p>
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      Pizza Calabresa GG
                    </p>
                    <p className="text-xs text-zinc-500">Borda recheada • tamanho família</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-zinc-700">
                  <li className="flex items-start justify-between gap-3">
                    <span>1x Pizza Calabresa GG</span>
                    <span className="font-semibold">R$ 49,90</span>
                  </li>
                  <li className="flex items-start justify-between gap-3">
                    <span>1x Refrigerante 2L</span>
                    <span className="font-semibold">R$ 10,90</span>
                  </li>
                  <li className="flex items-start justify-between gap-3">
                    <span>Taxa de entrega</span>
                    <span className="font-semibold">R$ 7,90</span>
                  </li>
                </ul>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <MdPayments className="h-4 w-4 text-[#ea1d2c]" />
                    Pagamento
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">Cartão final 3841</p>
                  <p className="text-xs text-zinc-500">Pago em 1x • aprovado</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <MdAccessTime className="h-4 w-4 text-[#ea1d2c]" />
                    Previsão
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">Entrega em 12 min</p>
                  <p className="text-xs text-zinc-500">Janela: 20:10 - 20:20</p>
                </div>
              </div>
            </article>

            <article className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                <MdReceiptLong className="h-4 w-4 text-[#ea1d2c]" />
                Resumo financeiro
              </p>

              <div className="space-y-2 text-sm text-zinc-700">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">R$ 60,80</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1">
                    <MdLocalOffer className="h-4 w-4 text-emerald-600" />
                    Cupom EASY10
                  </span>
                  <span className="font-semibold text-emerald-700">- R$ 5,00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Taxa de entrega</span>
                  <span className="font-semibold">R$ 7,90</span>
                </div>
                <div className="border-t border-zinc-200 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900">Total</span>
                    <span className="text-lg font-black text-zinc-900">R$ 68,70</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
                <p className="inline-flex items-center gap-1 font-semibold">
                  <MdCheckCircle className="h-4 w-4" />
                  Pedido confirmado e em preparo para entrega.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section
          id="acompanhamento"
          className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm ring-1 ring-black/5"
        >
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Acompanhamento ao vivo
            </p>
            <h2 className="mt-1 text-2xl font-black text-zinc-900">
              Entrega em tempo real
            </h2>
          </div>

          <LiveOrderWidget size="large" />
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

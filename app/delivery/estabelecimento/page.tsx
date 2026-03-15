import Image from "next/image";
import {
  MdAccessTime,
  MdDeliveryDining,
  MdLocalOffer,
  MdPayments,
  MdPlace,
  MdRestaurant,
  MdShoppingBag,
  MdStar,
} from "react-icons/md";
import AppFooter from "../components/layout/AppFooter";
import AppHeader, { type HeaderLink } from "../components/layout/AppHeader";
import MenuSectionsWithModal, {
  type EstablishmentMenuSection,
} from "./components/MenuSectionsWithModal";

export const metadata = {
  title: "Cheiro Verde • EasyDelivery",
  description:
    "Visualize cardápio completo, pratos mais pedidos e informações do estabelecimento no EasyDelivery.",
};

const ESTABLISHMENT = {
  name: "Cheiro Verde - Marmitaria e Soparia",
  category: "Marmitaria • Comida brasileira",
  rating: "4,7",
  reviews: "1.243 avaliações",
  eta: "40-55 min",
  fee: "R$ 5,99",
  address: "Av. Celso Ramos, Itapoá/SC",
  cover:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1800&q=80",
};

const MENU_SECTIONS: EstablishmentMenuSection[] = [
  {
    id: "mais-pedidos",
    title: "Mais pedidos",
    subtitle: "Os itens favoritos da galera em Itapoá.",
    items: [
      {
        name: "Parmegiana de Frango",
        description: "Arroz, fritas e salada da casa.",
        price: "R$ 27,90",
        oldPrice: "R$ 33,90",
        discount: "18% OFF",
        image:
          "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Strogonoff de Carne",
        description: "Arroz branco, batata palha e creme especial.",
        price: "R$ 24,90",
        oldPrice: "R$ 29,90",
        discount: "16% OFF",
        image:
          "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Frango Grelhado Fit",
        description: "Arroz integral, legumes salteados e salada.",
        price: "R$ 22,90",
        oldPrice: "R$ 27,90",
        discount: "17% OFF",
        image:
          "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "marmitas",
    title: "Marmitas",
    subtitle: "Refeições completas e com porções generosas.",
    items: [
      {
        name: "Marmita Executiva de Carne",
        description: "Carne acebolada, arroz, feijão e farofa.",
        price: "R$ 25,90",
        image:
          "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Marmita Frango Crocante",
        description: "Frango empanado, purê e arroz.",
        price: "R$ 23,90",
        image:
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Marmita Vegetariana",
        description: "Legumes grelhados, arroz e lentilha.",
        price: "R$ 21,90",
        image:
          "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "sopas",
    title: "Sopas e caldos",
    subtitle: "Perfeito para dias frios.",
    items: [
      {
        name: "Caldo de Feijão",
        description: "500ml com bacon crocante.",
        price: "R$ 17,90",
        image:
          "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Sopa de Legumes",
        description: "500ml com torradas da casa.",
        price: "R$ 16,90",
        image:
          "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Canja de Galinha",
        description: "Caldo cremoso com frango desfiado.",
        price: "R$ 18,90",
        image:
          "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "bebidas",
    title: "Bebidas",
    subtitle: "Para acompanhar seus pratos.",
    items: [
      {
        name: "Refrigerante 2L",
        description: "Coca-Cola, Guaraná ou Pepsi.",
        price: "R$ 10,90",
        image:
          "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Suco Natural 500ml",
        description: "Laranja, limão ou abacaxi.",
        price: "R$ 9,90",
        image:
          "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Água Mineral",
        description: "Sem gás 500ml.",
        price: "R$ 4,50",
        image:
          "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
];

const ESTABLISHMENT_TOP_LINKS: HeaderLink[] = [
  { label: "Início", href: "/delivery/home" },
  { label: "Restaurantes", href: "/delivery/home#restaurantes" },
  { label: "Mercados", href: "/delivery/home#mercados" },
  { label: "Meus pedidos", href: "/delivery/meus-pedidos" },
];

const ESTABLISHMENT_MENU_LINKS: HeaderLink[] = [
  { label: "Mais pedidos", href: "#mais-pedidos" },
  { label: "Marmitas", href: "#marmitas" },
  { label: "Sopas", href: "#sopas" },
  { label: "Bebidas", href: "#bebidas" },
];

export default function EstablishmentPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <AppHeader
        topLinks={ESTABLISHMENT_TOP_LINKS}
        menuLinks={ESTABLISHMENT_MENU_LINKS}
        logoHref="/delivery/home"
      />

      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20">
          <Image
            src={ESTABLISHMENT.cover}
            alt={ESTABLISHMENT.name}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-linear-to-r from-[#3f0308]/90 via-[#7a0911]/78 to-[#a30f1a]/68" />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="w-full rounded-3xl border border-white/20 bg-black/25 p-6 text-white shadow-2xl backdrop-blur-md">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <div>
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/90 ring-1 ring-white/70">
                    <MdRestaurant className="h-9 w-9 text-[#ea1d2c]" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/85">
                      RESTAURANTE
                    </p>
                    <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                      {ESTABLISHMENT.name}
                    </h1>
                    <p className="mt-2 text-sm text-zinc-100">{ESTABLISHMENT.category}</p>

                    <div className="mt-5 flex flex-wrap gap-2 text-xs sm:text-sm">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 font-semibold text-zinc-900">
                        <MdStar className="h-4 w-4 text-yellow-500" />
                        {ESTABLISHMENT.rating} • {ESTABLISHMENT.reviews}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 font-semibold text-zinc-900">
                        <MdAccessTime className="h-4 w-4 text-[#ea1d2c]" />
                        {ESTABLISHMENT.eta}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs sm:flex-nowrap sm:text-sm">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 font-semibold text-zinc-900">
                        <MdDeliveryDining className="h-4 w-4 text-[#ea1d2c]" />
                        Entrega {ESTABLISHMENT.fee}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 font-semibold text-zinc-900">
                        <MdPlace className="h-4 w-4 text-[#ea1d2c]" />
                        {ESTABLISHMENT.address}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                  <p className="text-sm font-semibold tracking-[0.14em] text-zinc-900">
                    Prato do dia
                  </p>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    28% OFF
                  </span>
                </div>

                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-200">
                      <Image
                        src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=80"
                        alt="Parmegiana da casa"
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <h3 className="text-base font-bold text-zinc-900">Parmegiana da casa</h3>
                        <p className="text-xs text-zinc-600">
                          Arroz, batata frita crocante e salada fresca.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-zinc-900">R$ 24,90</span>
                        <span className="text-sm text-zinc-400 line-through">R$ 34,90</span>
                      </div>

                      <button
                        type="button"
                        className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-[#ea1d2c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#c81422]"
                      >
                        Fazer pedido
                      </button>

                      <div className="flex items-center justify-between text-xs text-zinc-600">
                        <span className="inline-flex items-center gap-1 font-semibold text-zinc-800">
                          <MdStar className="h-4 w-4 text-yellow-500" />
                          4,8
                        </span>
                        <span>386 avaliações hoje</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <MenuSectionsWithModal sections={MENU_SECTIONS} storeName={ESTABLISHMENT.name} />

        <aside className="space-y-4 lg:sticky lg:top-32 lg:h-fit">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h3 className="text-lg font-black text-zinc-900">Seu pedido</h3>
            <p className="mt-1 text-xs text-zinc-500">Resumo antes de finalizar.</p>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">Parmegiana de Frango</p>
                  <p className="text-xs text-zinc-500">1x</p>
                </div>
                <span className="font-semibold text-zinc-900">R$ 27,90</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">Refrigerante 2L</p>
                  <p className="text-xs text-zinc-500">1x</p>
                </div>
                <span className="font-semibold text-zinc-900">R$ 10,90</span>
              </div>
            </div>

            <div className="mt-4 space-y-1 border-t border-zinc-100 pt-3 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>R$ 38,80</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Entrega</span>
                <span>{ESTABLISHMENT.fee}</span>
              </div>
              <div className="flex justify-between font-bold text-zinc-900">
                <span>Total</span>
                <span>R$ 44,79</span>
              </div>
            </div>

            <button
              type="button"
              className="mt-5 inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-[#ea1d2c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c81422]"
            >
              Finalizar pedido
            </button>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h3 className="text-lg font-black text-zinc-900">Informações</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600">
              <li className="flex items-center gap-2">
                <MdAccessTime className="h-4 w-4 text-[#ea1d2c]" />
                Hoje: 10:30 às 22:30
              </li>
              <li className="flex items-center gap-2">
                <MdShoppingBag className="h-4 w-4 text-[#ea1d2c]" />
                Pedido mínimo: R$ 20,00
              </li>
              <li className="flex items-center gap-2">
                <MdPayments className="h-4 w-4 text-[#ea1d2c]" />
                PIX, crédito e débito
              </li>
              <li className="flex items-center gap-2">
                <MdLocalOffer className="h-4 w-4 text-[#ea1d2c]" />
                Cupom de 15% no 1º pedido
              </li>
            </ul>
          </div>
        </aside>
      </main>

      <AppFooter />
    </div>
  );
}

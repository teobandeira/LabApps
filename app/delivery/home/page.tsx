import Image from "next/image";
import type { IconType } from "react-icons";
import {
  MdLocalBar,
  MdLocalGroceryStore,
  MdLocalPharmacy,
  MdPets,
  MdRestaurantMenu,
} from "react-icons/md";
import AppFooter from "../components/layout/AppFooter";
import AppHeader, { type HeaderLink } from "../components/layout/AppHeader";
import LiveOrderWidget from "./components/LiveOrderWidget";
import PartnerBanner from "./components/PartnerBanner";
import SectionTitle from "./components/SectionTitle";
import ServiceBoxCard from "./components/ServiceBoxCard";
import StoreSlider from "./components/StoreSlider";

export const metadata = {
  title: "EasyDelivery • Comida, mercado e mais",
  description:
    "Tudo para facilitar seu dia: peça comida, mercado, bebidas e farmácia com entrega rápida.",
};

type ServiceBox = {
  label: string;
  onlineCount: number;
  icon: IconType;
};

type Store = {
  name: string;
  category: string;
  rating: string;
  eta: string;
  fee: string;
  image: string;
  badge?: string;
};

const HERO_SERVICES: ServiceBox[] = [
  {
    label: "Restaurante",
    onlineCount: 148,
    icon: MdRestaurantMenu,
  },
  {
    label: "Mercado",
    onlineCount: 32,
    icon: MdLocalGroceryStore,
  },
  {
    label: "Bebidas",
    onlineCount: 57,
    icon: MdLocalBar,
  },
  {
    label: "Farmácia",
    onlineCount: 89,
    icon: MdLocalPharmacy,
  },
  {
    label: "Pet shop",
    onlineCount: 24,
    icon: MdPets,
  },
];

const HOME_TOP_LINKS: HeaderLink[] = [
  { label: "Entregador", href: "#" },
  { label: "Restaurante e Mercado", href: "#" },
  { label: "Carreiras", href: "#" },
  { label: "Easy Card", href: "#" },
  { label: "Easy Benefícios", href: "#" },
];

const HOME_MENU_LINKS: HeaderLink[] = [
  { label: "Restaurantes", href: "#restaurantes" },
  { label: "Mercados", href: "#mercados" },
  { label: "Parceiros", href: "#parceiros" },
  { label: "Meus pedidos", href: "/delivery/meus-pedidos" },
];

const BEST_RESTAURANTS: Store[] = [
  {
    name: "Cheiro Verde - Marmitaria e Soparia",
    category: "Marmitaria",
    rating: "4.7",
    eta: "40-55 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
    badge: "Itapoá/SC",
  },
  {
    name: "Quintal do Mar - Marmitas e Lanches",
    category: "Restaurante",
    rating: "4.8",
    eta: "35-50 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Varanda Itapoá",
    category: "Restaurante",
    rating: "4.9",
    eta: "30-45 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Necos Restaurante Lanchonete e Pizzaria",
    category: "Restaurante",
    rating: "4.2",
    eta: "35-50 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Maré Alta Grill",
    category: "Restaurante",
    rating: "4.6",
    eta: "30-45 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Cantina da Praia Itapoá",
    category: "Restaurante",
    rating: "4.5",
    eta: "35-50 min",
    fee: "R$ 3,99",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Sabor da Barra",
    category: "Restaurante",
    rating: "4.4",
    eta: "25-40 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
    badge: "Promo",
  },
  {
    name: "Recanto do Peixe Itapoá",
    category: "Restaurante",
    rating: "4.8",
    eta: "35-50 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80",
  },
];

const BEST_PIZZERIAS: Store[] = [
  {
    name: "Pizzaria Bom Sol Itapoá-SC",
    category: "Pizza",
    rating: "4.9",
    eta: "30-45 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    badge: "Mais pedida",
  },
  {
    name: "Bella Roma Pizzeria Itapoá",
    category: "Pizza",
    rating: "4.9",
    eta: "25-35 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Oficina das Pizzas",
    category: "Pizza",
    rating: "4.9",
    eta: "30-40 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=1200&q=80",
    badge: "Top da região",
  },
  {
    name: "Garagem da Pizza Delivery",
    category: "Pizza",
    rating: "4.8",
    eta: "25-35 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Pizzaria Don Margherita",
    category: "Pizza",
    rating: "4.7",
    eta: "30-45 min",
    fee: "R$ 4,99",
    image:
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Pizza Point Itapoá",
    category: "Pizza",
    rating: "4.6",
    eta: "25-40 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
    badge: "Oferta do dia",
  },
  {
    name: "Forno Nobre Pizzas",
    category: "Pizza",
    rating: "4.8",
    eta: "30-40 min",
    fee: "R$ 2,99",
    image:
      "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Napoli Express Itapoá",
    category: "Pizza",
    rating: "4.5",
    eta: "20-35 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80",
  },
];

const BEST_BURGER_HOUSES: Store[] = [
  {
    name: "Chapa Quente Hamburgueria",
    category: "Hambúrguer",
    rating: "5.0",
    eta: "20-30 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
    badge: "Mais pedida",
  },
  {
    name: "Classic Burger Lanches e Pasteis",
    category: "Hambúrguer",
    rating: "4.8",
    eta: "25-35 min",
    fee: "R$ 2,99",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Homer Hamburgueria e Pizzaria",
    category: "Hambúrguer",
    rating: "4.6",
    eta: "20-30 min",
    fee: "R$ 0,99",
    image:
      "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1200&q=80",
    badge: "Entrega rápida",
  },
  {
    name: "Blend Hamburgueria",
    category: "Hambúrguer",
    rating: "4.5",
    eta: "30-40 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Brasa Burger Itapoá",
    category: "Hambúrguer",
    rating: "4.7",
    eta: "25-35 min",
    fee: "R$ 3,99",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Rota 101 Burger",
    category: "Hambúrguer",
    rating: "4.6",
    eta: "20-30 min",
    fee: "R$ 1,99",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
    badge: "Chega rápido",
  },
  {
    name: "Litoral Smash House",
    category: "Hambúrguer",
    rating: "4.8",
    eta: "25-35 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Ponto do Burger",
    category: "Hambúrguer",
    rating: "4.4",
    eta: "30-45 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=1200&q=80",
  },
];

const BEST_MARKETS: Store[] = [
  {
    name: "Meu Vizinho Supermercados Itapoá",
    category: "Supermercado",
    rating: "4.8",
    eta: "35-50 min",
    fee: "R$ 6,99",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    badge: "Entrega Turbo",
  },
  {
    name: "Lami Market",
    category: "Mercado",
    rating: "4.8",
    eta: "30-45 min",
    fee: "R$ 3,99",
    image:
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Empório da Hora",
    category: "Empório",
    rating: "4.7",
    eta: "25-40 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
    badge: "Ofertas",
  },
  {
    name: "Supermercado Sandi",
    category: "Supermercado",
    rating: "4.8",
    eta: "35-55 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Mercado Litoral Norte",
    category: "Mercado",
    rating: "4.6",
    eta: "30-45 min",
    fee: "R$ 4,99",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Super Praia Atacadista",
    category: "Supermercado",
    rating: "4.7",
    eta: "35-50 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80",
    badge: "Atacado",
  },
  {
    name: "Empório Central Itapoá",
    category: "Empório",
    rating: "4.5",
    eta: "25-40 min",
    fee: "R$ 2,99",
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Mini Mercado da Barra",
    category: "Mercado",
    rating: "4.4",
    eta: "20-35 min",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80",
  },
];

const BEST_BEVERAGE_DISTRIBUTORS: Store[] = [
  {
    name: "Fazenda Distribuidora de Bebidas",
    category: "Distribuidora de bebidas",
    rating: "Ativa",
    eta: "Atacado e varejo",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?auto=format&fit=crop&w=1200&q=80",
    badge: "Itapoá/SC",
  },
  {
    name: "Distribuidora de Bebidas Mani",
    category: "Distribuidora de bebidas",
    rating: "Ativa",
    eta: "Entrega local",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Cunha Distribuidora de Bebidas e Alimentos",
    category: "Distribuidora de bebidas",
    rating: "Ativa",
    eta: "Entrega regional",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Distribuidora de Bebidas Santa Clara",
    category: "Distribuidora de bebidas",
    rating: "Ativa",
    eta: "Varejo",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Depósito Litoral Bebidas",
    category: "Distribuidora de bebidas",
    rating: "Ativa",
    eta: "Entrega local",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80",
    badge: "Geladas",
  },
  {
    name: "Ponto Gelado Itapoá",
    category: "Distribuidora de bebidas",
    rating: "Ativa",
    eta: "Varejo e atacado",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Vira Noite Distribuidora",
    category: "Distribuidora de bebidas",
    rating: "Ativa",
    eta: "Aberto até tarde",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Central das Bebidas Itapoá",
    category: "Distribuidora de bebidas",
    rating: "Ativa",
    eta: "Entrega rápida",
    fee: "Consulte",
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AppHeader topLinks={HOME_TOP_LINKS} menuLinks={HOME_MENU_LINKS} logoHref="/delivery/home" />

      <section className="relative isolate overflow-hidden bg-[#7a0911]">
        <div className="pointer-events-none absolute inset-0 -z-20">
          <Image
            src="/hero2.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
            aria-hidden
          />
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-r from-[#4a040a]/84 via-[#7a0911]/76 to-[#a30f1a]/68" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(254,226,226,0.14),transparent_42%),radial-gradient(ellipse_at_bottom_right,rgba(69,10,10,0.45),transparent_52%)]" />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/85">
              Seu delivery de comida, mercado, farmácia e mais!
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-white sm:text-5xl">
              Mate sua fome, peça no EasyDelivery!
            </h1>

            <div className="mt-8 flex w-full max-w-3xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-black/10 sm:flex-row">
              <input
                type="text"
                placeholder="Buscar por restaurante, mercado ou item"
                className="h-12 flex-1 rounded-xl border border-zinc-200 px-4 text-sm text-zinc-900 outline-none transition focus:border-[#ea1d2c]"
              />
              <button className="h-12 cursor-pointer rounded-xl bg-[#ea1d2c] px-6 text-sm font-semibold text-white transition hover:bg-[#c81422]">
                Buscar
              </button>
            </div>
          </div>

          <div className="lg:justify-self-end">
            <LiveOrderWidget />
          </div>
        </div>
      </section>

      <section className="relative -mt-8 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {HERO_SERVICES.map((service) => (
              <ServiceBoxCard key={service.label} service={service} />
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 lg:px-8">
        <section id="restaurantes">
          <SectionTitle title="Os melhores restaurantes" />
          <StoreSlider stores={BEST_RESTAURANTS} label="restaurantes" />
        </section>

        <section id="pizzarias">
          <SectionTitle title="Melhores pizzarias" />
          <StoreSlider stores={BEST_PIZZERIAS} label="pizzarias" />
        </section>

        <section id="hamburguerias">
          <SectionTitle title="Melhores hamburguerias" />
          <StoreSlider stores={BEST_BURGER_HOUSES} label="hamburguerias" />
        </section>

        <section id="mercados">
          <SectionTitle title="Mercados e farmácias" />
          <StoreSlider stores={BEST_MARKETS} label="mercados e farmácias" />
        </section>

        <section id="distribuidoras-bebidas">
          <SectionTitle title="Distribuidoras de bebidas em Itapoá" />
          <StoreSlider stores={BEST_BEVERAGE_DISTRIBUTORS} label="distribuidoras de bebidas" />
        </section>

        <section id="parceiros" className="grid gap-5 lg:grid-cols-2">
          <PartnerBanner
            title="Quer fazer entregas pelo EasyDelivery?"
            description="Faça agora o seu cadastro e comece o quanto antes."
            action="Saiba mais"
            image="/entregador.jpg"
          />
          <PartnerBanner
            title="Cadastre seu restaurante grátis"
            description="Cadastre seu restaurante ou mercado e aumente suas vendas com tecnologia e alcance local."
            action="Saiba mais"
            image="/fome.jpg"
          />
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import DishOrderModal, { type DishItem } from "./DishOrderModal";

type TopItem = {
  name: string;
  price: string;
  oldPrice: string;
  discount: string;
  image: string;
  description?: string;
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

const TOP_ITEMS_BY_GROUP: Record<
  "restaurant" | "pizza" | "burger" | "market" | "beverage",
  TopItem[]
> = {
  restaurant: [
    {
      name: "Parmegiana de Frango",
      price: "R$ 27,90",
      oldPrice: "R$ 33,90",
      discount: "18% OFF",
      description:
        "Filé de frango empanado com molho de tomate artesanal, queijo derretido, arroz branco e batata frita crocante.",
      image:
        "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=320&q=80",
    },
    {
      name: "Strogonoff de Carne",
      price: "R$ 24,90",
      oldPrice: "R$ 29,90",
      discount: "16% OFF",
      description:
        "Strogonoff cremoso de carne com champignon, servido com arroz soltinho e batata palha.",
      image:
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=320&q=80",
    },
    {
      name: "Frango Grelhado com Arroz",
      price: "R$ 18,90",
      oldPrice: "R$ 22,90",
      discount: "17% OFF",
      description:
        "Peito de frango grelhado temperado na casa, acompanhado de arroz, salada e legumes.",
      image:
        "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=320&q=80",
    },
  ],
  pizza: [
    {
      name: "Pizza Calabresa Grande",
      price: "R$ 54,90",
      oldPrice: "R$ 66,90",
      discount: "18% OFF",
      description:
        "Massa de longa fermentação, molho de tomate italiano, calabresa fatiada, cebola e azeitonas.",
      image:
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=320&q=80",
    },
    {
      name: "Pizza 4 Queijos",
      price: "R$ 59,90",
      oldPrice: "R$ 71,90",
      discount: "16% OFF",
      description:
        "Combinação de muçarela, provolone, parmesão e catupiry em massa assada no forno a lenha.",
      image:
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=320&q=80",
    },
    {
      name: "Broto de Frango Catupiry",
      price: "R$ 34,90",
      oldPrice: "R$ 41,90",
      discount: "17% OFF",
      description:
        "Pizza broto com frango desfiado temperado, catupiry cremoso e finalização com orégano.",
      image:
        "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=320&q=80",
    },
  ],
  burger: [
    {
      name: "Smash Burger Duplo",
      price: "R$ 31,90",
      oldPrice: "R$ 39,90",
      discount: "20% OFF",
      description:
        "Dois discos smash, cheddar derretido, bacon crocante e molho especial no pão brioche.",
      image:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=320&q=80",
    },
    {
      name: "X-Bacon Artesanal",
      price: "R$ 28,90",
      oldPrice: "R$ 34,90",
      discount: "17% OFF",
      description:
        "Hambúrguer artesanal com queijo prato, bacon selecionado, alface, tomate e maionese da casa.",
      image:
        "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=320&q=80",
    },
    {
      name: "Combo Burger + Fritas",
      price: "R$ 36,90",
      oldPrice: "R$ 44,90",
      discount: "18% OFF",
      description:
        "Burger artesanal completo acompanhado de porção de fritas douradas e molho barbecue.",
      image:
        "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=320&q=80",
    },
  ],
  market: [
    {
      name: "Cesta Hortifruti da Semana",
      price: "R$ 49,90",
      oldPrice: "R$ 59,90",
      discount: "17% OFF",
      description:
        "Seleção de frutas, verduras e legumes frescos para a semana, direto dos produtores locais.",
      image:
        "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=320&q=80",
    },
    {
      name: "Kit Café da Manhã",
      price: "R$ 32,90",
      oldPrice: "R$ 39,90",
      discount: "18% OFF",
      description:
        "Kit com pães, frios, frutas e suco, ideal para um café da manhã completo em casa.",
      image:
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=320&q=80",
    },
    {
      name: "Água Mineral 12un",
      price: "R$ 21,90",
      oldPrice: "R$ 27,90",
      discount: "21% OFF",
      description:
        "Fardo com 12 unidades de água mineral 500ml, ideal para estoque doméstico.",
      image:
        "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=320&q=80",
    },
  ],
  beverage: [
    {
      name: "Pack Cerveja Lata 12un",
      price: "R$ 42,90",
      oldPrice: "R$ 52,90",
      discount: "19% OFF",
      description:
        "Pack com 12 latas de cerveja gelada, perfeito para churrasco e confraternizações.",
      image:
        "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?auto=format&fit=crop&w=320&q=80",
    },
    {
      name: "Refrigerante 2L",
      price: "R$ 9,90",
      oldPrice: "R$ 12,90",
      discount: "23% OFF",
      description:
        "Refrigerante 2 litros bem gelado, disponível nos sabores cola, guaraná e laranja.",
      image:
        "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=320&q=80",
    },
    {
      name: "Energético 473ml",
      price: "R$ 8,90",
      oldPrice: "R$ 11,90",
      discount: "25% OFF",
      description:
        "Lata de energético 473ml para dar energia extra no dia ou na noite.",
      image:
        "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=320&q=80",
    },
  ],
};

function getTopItemsByCategory(category: string): TopItem[] {
  const normalizedCategory = category.toLowerCase();

  if (normalizedCategory.includes("pizza")) {
    return TOP_ITEMS_BY_GROUP.pizza;
  }
  if (normalizedCategory.includes("hamb")) {
    return TOP_ITEMS_BY_GROUP.burger;
  }
  if (normalizedCategory.includes("distribuidora")) {
    return TOP_ITEMS_BY_GROUP.beverage;
  }
  if (
    normalizedCategory.includes("supermercado") ||
    normalizedCategory.includes("mercado") ||
    normalizedCategory.includes("emporio") ||
    normalizedCategory.includes("empório")
  ) {
    return TOP_ITEMS_BY_GROUP.market;
  }

  return TOP_ITEMS_BY_GROUP.restaurant;
}

type StoreCardProps = {
  store: Store;
};

export default function StoreCard({ store }: StoreCardProps) {
  const topItems = getTopItemsByCategory(store.category);
  const [selectedItem, setSelectedItem] = useState<DishItem | null>(null);

  return (
    <>
      <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
        <Link
          href="/delivery/estabelecimento"
          aria-label={`Abrir estabelecimento ${store.name}`}
          className="block"
        >
          <div className="relative h-44 w-full">
            <Image
              src={store.image}
              alt={store.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
            {store.badge && (
              <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#ea1d2c] ring-1 ring-zinc-200">
                {store.badge}
              </span>
            )}
          </div>
        </Link>

        <div className="space-y-1.5 p-4">
          <Link
            href="/delivery/estabelecimento"
            aria-label={`Abrir estabelecimento ${store.name}`}
            className="block"
          >
            <h3 className="text-base font-semibold text-zinc-900">{store.name}</h3>
            <p className="text-sm text-zinc-500">{store.category}</p>
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-900">{store.rating}</span>
              <span>•</span>
              <span>{store.eta}</span>
              <span>•</span>
              <span>{store.fee}</span>
            </div>
          </Link>

          <div className="mt-3 border-t border-zinc-100 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Mais pedidos
              </p>
              <Link
                href="/delivery/estabelecimento"
                className="text-[11px] font-semibold text-[#ea1d2c] transition hover:text-[#c81422]"
              >
                Ver estabelecimento
              </Link>
            </div>

            <ul className="mt-2 space-y-2">
              {topItems.map((item) => (
                <li key={`${store.name}-${item.name}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-transparent p-1.5 text-left transition hover:border-zinc-200 hover:bg-zinc-50"
                    aria-label={`Abrir detalhes do prato ${item.name}`}
                  >
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-zinc-200">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-zinc-800">{item.name}</p>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-bold text-zinc-900">{item.price}</span>
                        <span className="text-zinc-400 line-through">{item.oldPrice}</span>
                        <span className="rounded-full bg-red-50 px-1.5 py-0.5 font-semibold text-red-700">
                          {item.discount}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </article>

      <DishOrderModal
        key={selectedItem ? `${store.name}-${selectedItem.name}` : `${store.name}-closed`}
        isOpen={Boolean(selectedItem)}
        item={selectedItem}
        storeName={store.name}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}

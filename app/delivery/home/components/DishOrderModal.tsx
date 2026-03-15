"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MdAdd, MdClose, MdRemove } from "react-icons/md";

export type DishItem = {
  name: string;
  price: string;
  oldPrice?: string;
  discount?: string;
  image: string;
  description?: string;
};

type DishOrderModalProps = {
  isOpen: boolean;
  item: DishItem | null;
  storeName: string;
  onClose: () => void;
};

function parseBrl(value: string): number {
  return Number(value.replace("R$", "").replace(/\./g, "").replace(",", ".").trim());
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function DishOrderModal({
  isOpen,
  item,
  storeName,
  onClose,
}: DishOrderModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [extraFries, setExtraFries] = useState(false);
  const [extraDessert, setExtraDessert] = useState(false);
  const [drink, setDrink] = useState<"none" | "refrigerante" | "suco">("none");

  const total = useMemo(() => {
    if (!item) {
      return 0;
    }

    const base = parseBrl(item.price);
    const fries = extraFries ? 8.9 : 0;
    const dessert = extraDessert ? 9.9 : 0;
    const drinkValue =
      drink === "refrigerante" ? 8.9 : drink === "suco" ? 10.9 : 0;

    return (base + fries + dessert + drinkValue) * quantity;
  }, [item, quantity, extraFries, extraDessert, drink]);

  if (!isOpen || !item || typeof document === "undefined") {
    return null;
  }

  const detailsText =
    item.description ??
    `${item.name} preparado na hora com ingredientes selecionados, porção generosa e finalização da casa.`;

  const modalContent = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar modal"
        className="absolute inset-0 cursor-pointer bg-zinc-950/72 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dish-modal-title"
        className="relative w-full max-w-xl rounded-3xl border border-red-200 bg-white p-5 shadow-2xl ring-1 ring-black/5"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 cursor-pointer rounded-full p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        >
          <MdClose className="h-5 w-5" />
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {storeName}
        </p>

        <div className="mt-3 flex items-start gap-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-200">
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <h3 id="dish-modal-title" className="text-xl font-black leading-tight text-zinc-900">
              {item.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-600">{detailsText}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-extrabold text-zinc-900">{item.price}</span>
              {item.oldPrice && (
                <span className="text-sm text-zinc-400 line-through">{item.oldPrice}</span>
              )}
              {item.discount && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                  {item.discount}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-200 p-3">
          <p className="text-sm font-semibold text-zinc-900">Adicionar mais itens</p>
          <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 p-2 text-sm text-zinc-700 transition hover:bg-zinc-50">
            <span className="flex min-w-0 items-center gap-2">
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200">
                <Image
                  src="https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=160&q=80"
                  alt="Porção de fritas"
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-zinc-900">Porção de fritas</span>
                <span className="text-xs font-medium text-zinc-500">+R$ 8,90</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={extraFries}
              onChange={(event) => setExtraFries(event.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[#ea1d2c]"
            />
          </label>
          <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 p-2 text-sm text-zinc-700 transition hover:bg-zinc-50">
            <span className="flex min-w-0 items-center gap-2">
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200">
                <Image
                  src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=160&q=80"
                  alt="Sobremesa do dia"
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-zinc-900">Sobremesa do dia</span>
                <span className="text-xs font-medium text-zinc-500">+R$ 9,90</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={extraDessert}
              onChange={(event) => setExtraDessert(event.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[#ea1d2c]"
            />
          </label>
        </div>

        <div className="mt-3 rounded-2xl border border-zinc-200 p-3">
          <p className="text-sm font-semibold text-zinc-900">Bebida</p>
          <div className="mt-2 space-y-2 text-sm text-zinc-700">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 p-2 transition hover:bg-zinc-50">
              <span className="flex min-w-0 items-center gap-2">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200">
                  <Image
                    src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=160&q=80"
                    alt="Sem bebida"
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </span>
                <span className="block truncate font-medium text-zinc-900">Sem bebida</span>
              </span>
              <input
                type="radio"
                name={`drink-${item.name}`}
                checked={drink === "none"}
                onChange={() => setDrink("none")}
                className="h-4 w-4 cursor-pointer accent-[#ea1d2c]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 p-2 transition hover:bg-zinc-50">
              <span className="flex min-w-0 items-center gap-2">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200">
                  <Image
                    src="https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=160&q=80"
                    alt="Refrigerante 2L"
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-zinc-900">Refrigerante 2L</span>
                  <span className="text-xs font-medium text-zinc-500">+R$ 8,90</span>
                </span>
              </span>
              <input
                type="radio"
                name={`drink-${item.name}`}
                checked={drink === "refrigerante"}
                onChange={() => setDrink("refrigerante")}
                className="h-4 w-4 cursor-pointer accent-[#ea1d2c]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 p-2 transition hover:bg-zinc-50">
              <span className="flex min-w-0 items-center gap-2">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200">
                  <Image
                    src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=160&q=80"
                    alt="Suco natural 500ml"
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-zinc-900">
                    Suco natural 500ml
                  </span>
                  <span className="text-xs font-medium text-zinc-500">+R$ 10,90</span>
                </span>
              </span>
              <input
                type="radio"
                name={`drink-${item.name}`}
                checked={drink === "suco"}
                onChange={() => setDrink("suco")}
                className="h-4 w-4 cursor-pointer accent-[#ea1d2c]"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-2 py-1">
            <button
              type="button"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100"
              aria-label="Diminuir quantidade"
            >
              <MdRemove className="h-4 w-4" />
            </button>
            <span className="min-w-6 text-center text-sm font-semibold text-zinc-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((current) => current + 1)}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100"
              aria-label="Aumentar quantidade"
            >
              <MdAdd className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#ea1d2c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c81422]"
          >
            Adicionar ao pedido • {formatBrl(total)}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

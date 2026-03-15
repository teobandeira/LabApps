"use client";

import Image from "next/image";
import { useState } from "react";
import DishOrderModal, { type DishItem } from "../../home/components/DishOrderModal";

type MenuItem = {
  name: string;
  description: string;
  price: string;
  oldPrice?: string;
  discount?: string;
  image: string;
};

export type EstablishmentMenuSection = {
  id: string;
  title: string;
  subtitle: string;
  items: MenuItem[];
};

type MenuSectionsWithModalProps = {
  sections: EstablishmentMenuSection[];
  storeName: string;
};

function MenuItemCard({
  item,
  onOpen,
}: {
  item: MenuItem;
  onOpen: (dish: DishItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="w-full cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
      aria-label={`Abrir detalhes do prato ${item.name}`}
    >
      <div className="relative h-44 w-full">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="space-y-2 p-4">
        <h3 className="text-base font-bold text-zinc-900">{item.name}</h3>
        <p className="min-h-10 text-sm text-zinc-600">{item.description}</p>
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold text-zinc-900">{item.price}</span>
          {item.oldPrice && <span className="text-sm text-zinc-400 line-through">{item.oldPrice}</span>}
          {item.discount && (
            <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
              {item.discount}
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-zinc-500">Toque para personalizar o pedido</p>
      </div>
    </button>
  );
}

export default function MenuSectionsWithModal({
  sections,
  storeName,
}: MenuSectionsWithModalProps) {
  const [selectedItem, setSelectedItem] = useState<DishItem | null>(null);

  return (
    <>
      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.id} id={section.id}>
            <div className="mb-5">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">{section.subtitle}</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {section.items.map((item) => (
                <MenuItemCard key={`${section.id}-${item.name}`} item={item} onOpen={setSelectedItem} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <DishOrderModal
        key={selectedItem ? `${storeName}-${selectedItem.name}` : `${storeName}-closed`}
        isOpen={Boolean(selectedItem)}
        item={selectedItem}
        storeName={storeName}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}

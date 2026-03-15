"use client";

import { useState } from "react";
import { MdAddShoppingCart, MdCheck } from "react-icons/md";

type AddDishButtonProps = {
  itemName: string;
};

export default function AddDishButton({ itemName }: AddDishButtonProps) {
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = () => {
    setIsAdded(true);
    window.setTimeout(() => {
      setIsAdded(false);
    }, 1400);
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-label={`Adicionar ${itemName} ao pedido`}
      className={`inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition ${
        isAdded
          ? "bg-emerald-100 text-emerald-700"
          : "bg-[#ea1d2c] text-white hover:bg-[#c81422]"
      }`}
    >
      {isAdded ? <MdCheck className="h-3.5 w-3.5" /> : <MdAddShoppingCart className="h-3.5 w-3.5" />}
      {isAdded ? "Adicionado" : "Adicionar"}
    </button>
  );
}

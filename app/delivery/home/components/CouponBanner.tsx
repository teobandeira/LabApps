"use client";

import { useState } from "react";
import CouponModal from "./CouponModal";

type CouponBannerProps = {
  compact?: boolean;
};

export default function CouponBanner({ compact = false }: CouponBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#ea1d2c] text-[10px] font-bold text-white">
            %
          </span>
          Ganhe cupons
        </button>
      ) : (
        <div className="inline-flex items-center gap-3 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/10">
          <div className="h-10 w-10 rounded-xl bg-[#ea1d2c] text-center text-xl leading-10 text-white">
            %
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Ganhe cupons!</p>
            <p className="text-xs text-zinc-500">Pegue seu cupom e aproveite o desconto.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="cursor-pointer rounded-full bg-[#ea1d2c] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#c81422]"
          >
            Pegar cupom
          </button>
        </div>
      )}

      <CouponModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

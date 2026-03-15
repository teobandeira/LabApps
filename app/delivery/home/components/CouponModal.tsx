"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MdClose, MdContentCopy, MdLocalOffer } from "react-icons/md";

const COUPON_CODE = "BEMVINDO50";

type CouponModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CouponModal({ isOpen, onClose }: CouponModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsCopied(false);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isCopied]);

  if (!isOpen) {
    return null;
  }

  const copyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  };

  if (typeof document === "undefined") {
    return null;
  }

  const modalContent = (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar modal"
        className="absolute inset-0 cursor-pointer bg-zinc-950/72 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-title"
        className="relative w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 shadow-2xl ring-1 ring-black/5"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 cursor-pointer rounded-full p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        >
          <MdClose className="h-5 w-5" />
        </button>

        <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
          <MdLocalOffer className="h-4 w-4" />
          Oferta limitada
        </div>

        <h3
          id="coupon-title"
          className="mt-4 text-2xl font-black leading-tight text-zinc-900"
        >
          Cupom de 50% OFF no seu primeiro pedido
        </h3>
        <p className="mt-2 text-sm text-zinc-600">
          Use o cupom abaixo no checkout e aproveite metade do valor no primeiro
          pedido.
        </p>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-lg font-extrabold tracking-wide text-red-700">
            {COUPON_CODE}
          </span>
          <button
            type="button"
            onClick={copyCoupon}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
          >
            <MdContentCopy className="h-4 w-4" />
            {isCopied ? "Copiado" : "Copiar"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a
            href="#restaurantes"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full bg-[#ea1d2c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c81422]"
          >
            Usar cupom agora
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center justify-center rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Talvez depois
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

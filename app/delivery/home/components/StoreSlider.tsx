"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import StoreCard from "./StoreCard";

type Store = {
  name: string;
  category: string;
  rating: string;
  eta: string;
  fee: string;
  image: string;
  badge?: string;
};

type StoreSliderProps = {
  stores: Store[];
  label: string;
};

export default function StoreSlider({ stores, label }: StoreSliderProps) {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = sliderRef.current;
    if (!container) {
      return;
    }

    const overflow = container.scrollWidth > container.clientWidth + 4;
    setHasOverflow(overflow);
    setCanScrollLeft(container.scrollLeft > 4);
    setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);

    return () => {
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, stores.length]);

  function slide(direction: "left" | "right") {
    const container = sliderRef.current;
    if (!container) {
      return;
    }

    const offset = container.clientWidth * (direction === "left" ? -1 : 1);

    container.scrollBy({
      left: offset,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => slide("left")}
          aria-label={`Deslizar ${label} para esquerda`}
          disabled={!hasOverflow || !canScrollLeft}
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MdChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => slide("right")}
          aria-label={`Deslizar ${label} para direita`}
          disabled={!hasOverflow || !canScrollRight}
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MdChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={sliderRef}
        onScroll={updateScrollState}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 pr-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {stores.map((store) => (
          <div
            key={store.name}
            className="min-w-[290px] flex-[0_0_86%] snap-start sm:flex-[0_0_48%] lg:min-w-0 lg:flex-[0_0_calc((100%-3.75rem)/4)]"
          >
            <StoreCard store={store} />
          </div>
        ))}
      </div>
    </div>
  );
}

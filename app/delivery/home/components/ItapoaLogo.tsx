import { MdDeliveryDining } from "react-icons/md";

type ItapoaLogoProps = {
  compact?: boolean;
};

export default function ItapoaLogo({ compact = false }: ItapoaLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center justify-center rounded-full bg-[#ea1d2c] text-white ring-2 ring-red-100 ${
          compact ? "h-9 w-9" : "h-10 w-10"
        }`}
      >
        <MdDeliveryDining className={compact ? "h-5 w-5" : "h-6 w-6"} aria-hidden />
      </span>
      <span className={`font-black leading-none ${compact ? "text-lg" : "text-2xl"}`}>
        <span className="text-zinc-950">Itapoá</span>
        <span className="text-[#ea1d2c]">Delivery</span>
      </span>
    </div>
  );
}

import type { IconType } from "react-icons";
import { MdFiberManualRecord } from "react-icons/md";

type ServiceBox = {
  label: string;
  onlineCount: number;
  icon: IconType;
};

type ServiceBoxCardProps = {
  service: ServiceBox;
};

export default function ServiceBoxCard({ service }: ServiceBoxCardProps) {
  const Icon = service.icon;

  return (
    <a
      href="#"
      className="group flex h-full items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:border-[#ea1d2c]/40 hover:shadow-md"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-[#ea1d2c] transition group-hover:bg-[#ea1d2c] group-hover:text-white">
        <Icon className="h-9 w-9" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-bold text-zinc-900">{service.label}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
          <MdFiberManualRecord className="h-3 w-3 animate-pulse text-red-500" />
          <span>{service.onlineCount.toLocaleString("pt-BR")} online</span>
        </p>
      </div>
    </a>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { MdExpandLess, MdExpandMore } from "react-icons/md";

type Point = {
  x: number;
  y: number;
};

const ROUTE_POINTS: Point[] = [
  { x: 12, y: 82 },
  { x: 24, y: 73 },
  { x: 35, y: 66 },
  { x: 47, y: 56 },
  { x: 58, y: 48 },
  { x: 68, y: 40 },
  { x: 77, y: 32 },
  { x: 86, y: 24 },
];

const ROUTE_POLYLINE = ROUTE_POINTS.map((point) => `${point.x},${point.y}`).join(
  " ",
);

function getPointAtProgress(progress: number): Point {
  const totalSegments = ROUTE_POINTS.length - 1;
  const normalized = Math.max(0, Math.min(100, progress)) / 100;
  const stepped = normalized * totalSegments;
  const index = Math.min(Math.floor(stepped), totalSegments - 1);
  const localProgress = stepped - index;

  const start = ROUTE_POINTS[index];
  const end = ROUTE_POINTS[index + 1];

  return {
    x: start.x + (end.x - start.x) * localProgress,
    y: start.y + (end.y - start.y) * localProgress,
  };
}

function getStatus(progress: number) {
  if (progress < 35) {
    return "Saiu do restaurante";
  }
  if (progress < 80) {
    return "Em rota de entrega";
  }
  return "Quase chegando";
}

export default function LiveOrderWidget() {
  const [progress, setProgress] = useState(16);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) {
          return 14;
        }

        const step = 2 + Math.floor(Math.random() * 4);
        return Math.min(92, current + step);
      });
    }, 1800);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const riderPosition = useMemo(() => getPointAtProgress(progress), [progress]);
  const etaMinutes = Math.max(3, 24 - Math.round(progress * 0.18));
  const distanceKm = (Math.max(0, 100 - progress) * 0.045 + 0.35).toFixed(1);
  const status = getStatus(progress);

  return (
    <aside className="w-full max-w-sm sm:max-w-md">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-zinc-900">Pedido em rota</p>
            <p className="text-xs text-zinc-500">#DA-3812 • Atualizando ao vivo</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              Ao vivo
            </span>
            <button
              type="button"
              onClick={() => setIsCollapsed((current) => !current)}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              aria-label={isCollapsed ? "Expandir acompanhamento" : "Recolher acompanhamento"}
              title={isCollapsed ? "Expandir" : "Recolher"}
            >
              {isCollapsed ? (
                <MdExpandLess className="h-4 w-4" />
              ) : (
                <MdExpandMore className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {isCollapsed ? (
          <div className="space-y-2 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-800">La Vera Pizza</span>
              <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                {status}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-linear-to-r from-[#ea1d2c] to-[#c81422] transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">
              Chega em {etaMinutes} min • {distanceKm} km de distância
            </p>
          </div>
        ) : (
          <div className="p-2.5">
            <div className="relative h-36 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#f5f5f5_0%,#ffffff_45%,#f1f5f9_100%)]" />

              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 h-full w-full"
                aria-hidden
              >
                <line x1="5" y1="20" x2="95" y2="20" stroke="#d4d4d8" strokeWidth="1.4" />
                <line x1="5" y1="40" x2="95" y2="40" stroke="#d4d4d8" strokeWidth="1.2" />
                <line x1="5" y1="62" x2="95" y2="62" stroke="#d4d4d8" strokeWidth="1.2" />
                <line x1="5" y1="84" x2="95" y2="84" stroke="#d4d4d8" strokeWidth="1.1" />
                <line x1="18" y1="5" x2="18" y2="95" stroke="#d4d4d8" strokeWidth="1.1" />
                <line x1="44" y1="5" x2="44" y2="95" stroke="#d4d4d8" strokeWidth="1.2" />
                <line x1="72" y1="5" x2="72" y2="95" stroke="#d4d4d8" strokeWidth="1.1" />

                <polyline
                  points={ROUTE_POLYLINE}
                  fill="none"
                  stroke="#fca5a5"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={ROUTE_POLYLINE}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="4 4"
                />
              </svg>

              <div
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${ROUTE_POINTS[0].x}%`, top: `${ROUTE_POINTS[0].y}%` }}
              >
                <span className="flex h-3.5 w-3.5 rounded-full border-2 border-white bg-zinc-700 shadow-md" />
              </div>

              <div
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${ROUTE_POINTS[ROUTE_POINTS.length - 1].x}%`,
                  top: `${ROUTE_POINTS[ROUTE_POINTS.length - 1].y}%`,
                }}
              >
                <span className="flex h-3.5 w-3.5 rounded-full border-2 border-white bg-red-600 shadow-md" />
              </div>

              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear"
                style={{ left: `${riderPosition.x}%`, top: `${riderPosition.y}%` }}
              >
                <span className="absolute inset-0 h-8 w-8 animate-ping rounded-full bg-red-400/40" />
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#ea1d2c] text-sm shadow-lg ring-2 ring-white">
                  🛵
                </span>
              </div>

              <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-zinc-700 ring-1 ring-zinc-200">
                Restaurante
              </div>
              <div className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-zinc-700 ring-1 ring-zinc-200">
                Sua casa
              </div>
            </div>

            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-linear-to-r from-[#ea1d2c] to-[#c81422] transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-800">La Vera Pizza</span>
                <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                  {status}
                </span>
              </div>

              <p className="text-xs text-zinc-500">
                1x Pizza Calabresa GG • 1x Refrigerante 2L
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                  <p className="text-[11px] text-zinc-500">Previsão</p>
                  <p className="text-sm font-bold text-zinc-900">{etaMinutes} min</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                  <p className="text-[11px] text-zinc-500">Distância</p>
                  <p className="text-sm font-bold text-zinc-900">{distanceKm} km</p>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500">
                Destino: Rua das Palmeiras, 184 • Vila Nova
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

"use client";
import { useEffect, useState } from "react";
import {
  FaDatabase,
  FaPuzzlePiece,
  FaBoxOpen,
} from "react-icons/fa";

export default function MenuLateral() {
  const [settings, setSettings] = useState({
    versao_gpt_image: "",
    versao_nano_banana: "",
  });

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/settings");
        const rawBody = await response.text();
        const data = rawBody ? JSON.parse(rawBody) : null;
        if (!response.ok || !data || data?.error) return;
        setSettings({
          versao_gpt_image: data?.versao_gpt_image || "",
          versao_nano_banana: data?.versao_nano_banana || "",
        });
      } catch {
        // fallback silencioso para não quebrar UI em respostas não JSON
      }
    })();
  }, []);

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start lg:h-max space-y-6">
      {/* Header do App */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-purple-300/25 bg-linear-to-br from-purple-900 via-fuchsia-900 to-purple-700 p-5 text-white shadow-[0_22px_45px_-30px_rgba(0,0,0,0.95)]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-black/25 blur-2xl" />

        <div className="relative space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="rounded-2xl border border-white/20 bg-black/20 p-3 shadow-inner shadow-black/20">
              <FaBoxOpen className="text-2xl text-purple-200" />
            </div>
            <span className="rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/90">
              Nano B. & Veo
            </span>
          </div>

          <div>
            <h3 className="text-xl font-semibold leading-tight">Ambient Studio IA</h3>
            <p className="mt-1 text-sm text-white/90">
              Gere cenários para produtos e vídeos publicitários.
            </p>
          </div>

          {(settings.versao_gpt_image || settings.versao_nano_banana) && (
            <p className="text-[11px] text-purple-100/85">
              GPT-Image {settings.versao_gpt_image || "--"} · {settings.versao_nano_banana || "--"}
            </p>
          )}
        </div>
      </section>

      {/* Menu lateral */}
      <nav className="bg-gray-800 rounded-2xl shadow divide-y divide-gray-700">
        <a
          href="/apps/ambientador-produtos"
          className="flex items-center gap-2 px-4 py-3 hover:bg-gray-700 scroll-smooth"
        >
          <FaPuzzlePiece className="text-purple-400" /> Criar ambientação
        </a>
        <a
          href="/apps/ambientador-produtos/biblioteca"
          className="flex items-center gap-2 px-4 py-3 hover:bg-gray-700 scroll-smooth"
        >
          <FaDatabase className="text-purple-400" /> Biblioteca
        </a>
      </nav>
    </aside>
  );
}

import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import SurvivalNotesApp from "./SurvivalNotesApp";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SurvivalNotes",
  description:
    "Manual de sobrevivencia textual com protocolos por prioridade, checklists e cenarios de risco.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SurvivalNotes",
  },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0e1014" }, { color: "#ececf0" }],
};

export default function SurvivalNotesPage() {
  return (
    <SurvivalNotesApp
      displayFontClass={montserrat.className}
      monoFontClass={montserrat.className}
    />
  );
}

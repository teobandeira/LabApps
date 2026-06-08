import type { Metadata } from "next";
import { Chivo, IBM_Plex_Mono } from "next/font/google";
import SurvivalNotesApp from "./SurvivalNotesApp";

const chivo = Chivo({
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SurvivalNotes",
  description:
    "Manual de sobrevivencia textual com protocolos por prioridade, checklists e cenarios de risco.",
};

export default function SurvivalNotesPage() {
  return <SurvivalNotesApp displayFontClass={chivo.className} monoFontClass={ibmPlexMono.className} />;
}

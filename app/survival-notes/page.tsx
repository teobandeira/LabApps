import type { Metadata } from "next";
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
};

export default function SurvivalNotesPage() {
  return (
    <SurvivalNotesApp
      displayFontClass={montserrat.className}
      monoFontClass={montserrat.className}
    />
  );
}

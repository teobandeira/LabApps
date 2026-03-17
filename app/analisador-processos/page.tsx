import type { Metadata } from "next";
import ProcessAnalyzerPortal from "./ProcessAnalyzerPortal";

export const metadata: Metadata = {
  title: "Analisador de Processos",
  description:
    "Portal de inteligencia juridica para monitorar risco, prazos, gargalos operacionais e produtividade.",
};

export default function ProcessAnalyzerPage() {
  return <ProcessAnalyzerPortal />;
}

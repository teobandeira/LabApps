import type { Metadata } from "next";
import ImageGeneratorScreen from "./ImageGeneratorScreen";

export const metadata: Metadata = {
  title: "Ambientador de Produtos",
  description: "Gere imagens e vídeos de ambientação com Gemini.",
};

export default function ImageModePage() {
  return <ImageGeneratorScreen />;
}

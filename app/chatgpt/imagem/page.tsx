import type { Metadata } from "next";
import ImageGeneratorScreen from "./ImageGeneratorScreen";

export const metadata: Metadata = {
  title: "IA Studio PRO",
  description: "Gere imagens e vídeos de ambientação com Gemini.",
};

export default function ImageModePage() {
  return <ImageGeneratorScreen />;
}

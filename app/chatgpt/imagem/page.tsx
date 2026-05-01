import type { Metadata } from "next";
import ImageGeneratorScreen from "./ImageGeneratorScreen";

export const metadata: Metadata = {
  title: "IA Studio PRO | Ambientador",
  description: "Ambientador IA no layout GPT Imagem.",
};

export default function ImageModePage() {
  return <ImageGeneratorScreen />;
}

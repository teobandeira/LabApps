import type { Metadata } from "next";
import ImageGeneratorScreen from "./ImageGeneratorScreen";

export const metadata: Metadata = {
  title: "IA Studio PRO | Lab Apps",
  description: "App dedicado para geracao de imagens e videos com OpenAI no Lab Apps.",
};

export default function ImageModePage() {
  return <ImageGeneratorScreen />;
}

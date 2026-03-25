import type { Metadata } from "next";
import ChatGptScreen from "../ChatGptScreen";

export const metadata: Metadata = {
  title: "ChatGPT Imagem",
  description: "Crie imagens a partir de prompts usando a API da OpenAI.",
};

export default function ImageModePage() {
  return <ChatGptScreen mode="image" />;
}

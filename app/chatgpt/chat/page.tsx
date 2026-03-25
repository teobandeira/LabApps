import type { Metadata } from "next";
import ChatGptScreen from "../ChatGptScreen";

export const metadata: Metadata = {
  title: "ChatGPT Chat",
  description: "Converse com a API da OpenAI e envie arquivos de texto para contexto.",
};

export default function ChatModePage() {
  return <ChatGptScreen mode="chat" />;
}

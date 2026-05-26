import type { Metadata } from "next";
import StopSmokingScreen from "./StopSmokingScreen";

export const metadata: Metadata = {
  title: "Smoke Control | App",
  description: "Tela de acompanhamento com cronometro e meta diaria de cigarros.",
};

export default function FumarPage() {
  return <StopSmokingScreen />;
}

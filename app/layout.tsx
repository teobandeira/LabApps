import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AppsLab Portfolio",
    template: "%s | AppsLab",
  },
  description:
    "Página principal de apresentação dos apps do projeto, com links para cada aplicação.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "AppsLab Portfolio",
    description:
      "Página principal de apresentação dos apps do projeto, com links para cada aplicação.",
    url: "/",
    siteName: "AppsLab",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AppsLab Portfolio",
    description:
      "Página principal de apresentação dos apps do projeto, com links para cada aplicação.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${montserrat.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

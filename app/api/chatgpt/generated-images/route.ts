import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const images = await prisma.generatedImage.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        prompt: true,
        revisedPrompt: true,
        model: true,
        size: true,
        action: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      images: images.map((image) => ({
        id: image.id,
        prompt: image.prompt,
        revisedPrompt: image.revisedPrompt,
        model: image.model,
        size: image.size,
        action: image.action,
        createdAt: image.createdAt.toISOString(),
        imageUrl: `/api/chatgpt/generated-image/${image.id}`,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel carregar o historico de imagens." },
      { status: 500 }
    );
  }
}


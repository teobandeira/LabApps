import { NextRequest, NextResponse } from "next/server";

import { normalizeDeviceId } from "@/lib/chatgpt-credits";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const deviceId = normalizeDeviceId(request.nextUrl.searchParams.get("deviceId"));
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }
    const images = await prisma.generatedImage.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        deviceId: true,
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
        imageUrl: `/api/chatgpt/generated-image/${image.id}?deviceId=${encodeURIComponent(
          image.deviceId || deviceId,
        )}`,
        thumbnailUrl: `/api/chatgpt/generated-image/${image.id}?deviceId=${encodeURIComponent(
          image.deviceId || deviceId,
        )}&thumb=1&w=480&q=60`,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel carregar o historico de imagens." },
      { status: 500 }
    );
  }
}

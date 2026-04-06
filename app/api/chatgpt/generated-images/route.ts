import { NextRequest, NextResponse } from "next/server";

import { normalizeDeviceId } from "@/lib/chatgpt-credits";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const deviceId = normalizeDeviceId(request.nextUrl.searchParams.get("deviceId"));
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }
    const rawLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "8", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 8;
    const rawCursor = request.nextUrl.searchParams.get("cursor");
    const cursorId = rawCursor ? rawCursor.trim() : "";

    const images = await prisma.generatedImage.findMany({
      where: { deviceId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
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
    const hasMore = images.length > limit;
    const pageItems = hasMore ? images.slice(0, limit) : images;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null;

    return NextResponse.json({
      images: pageItems.map((image) => ({
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
      nextCursor,
    });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel carregar o historico de imagens." },
      { status: 500 }
    );
  }
}

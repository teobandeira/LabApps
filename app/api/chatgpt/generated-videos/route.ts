import { NextRequest, NextResponse } from "next/server";

import { normalizeDeviceId } from "@/lib/chatgpt-credits";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const deviceId = normalizeDeviceId(request.nextUrl.searchParams.get("deviceId"));
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }

    const videos = await prisma.generatedVideo.findMany({
      where: {
        OR: [{ deviceId }, { deviceId: null }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sourceImageId: true,
        model: true,
        aspectRatio: true,
        durationSeconds: true,
        resolution: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      videos: videos.map((video) => ({
        id: video.id,
        sourceImageId: video.sourceImageId,
        sourceImageThumbnailUrl: video.sourceImageId
          ? `/api/chatgpt/generated-image/${video.sourceImageId}?deviceId=${encodeURIComponent(
              deviceId,
            )}&thumb=1&w=480&q=55`
          : null,
        model: video.model,
        aspectRatio: video.aspectRatio,
        durationSeconds: video.durationSeconds,
        resolution: video.resolution,
        createdAt: video.createdAt.toISOString(),
        videoUrl: `/api/chatgpt/generated-video/${video.id}?deviceId=${encodeURIComponent(deviceId)}`,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel carregar o historico de videos." },
      { status: 500 }
    );
  }
}

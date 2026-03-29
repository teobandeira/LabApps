import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const videos = await prisma.generatedVideo.findMany({
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
        model: video.model,
        aspectRatio: video.aspectRatio,
        durationSeconds: video.durationSeconds,
        resolution: video.resolution,
        createdAt: video.createdAt.toISOString(),
        videoUrl: `/api/chatgpt/generated-video/${video.id}`,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel carregar o historico de videos." },
      { status: 500 }
    );
  }
}

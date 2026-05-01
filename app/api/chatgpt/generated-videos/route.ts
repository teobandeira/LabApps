import { NextRequest, NextResponse } from "next/server";

import { normalizeDeviceId } from "@/lib/chatgpt-credits";
import { prisma } from "@/lib/prisma";

type ParsedVideoCursor =
  | {
      createdAt: Date;
      id?: string;
    }
  | null;

async function parseVideoCursor(rawCursor: string): Promise<ParsedVideoCursor> {
  const normalized = rawCursor.trim();
  if (!normalized) return null;

  if (normalized.includes("::")) {
    const [msPart, idPart] = normalized.split("::");
    const ms = Number(msPart);
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return null;
    const id = (idPart || "").trim();
    return id ? { createdAt: date, id } : { createdAt: date };
  }

  const asNumber = Number(normalized);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    const date = new Date(asNumber);
    if (!Number.isNaN(date.getTime())) {
      return { createdAt: date };
    }
  }

  const byId = await prisma.generatedVideo.findUnique({
    where: { id: normalized },
    select: { id: true, createdAt: true },
  });
  if (!byId) return null;
  return {
    createdAt: byId.createdAt,
    id: byId.id,
  };
}

export async function GET(request: NextRequest) {
  try {
    const deviceId = normalizeDeviceId(request.nextUrl.searchParams.get("deviceId"));
    const scope = (request.nextUrl.searchParams.get("scope") || "").trim().toLowerCase();
    const includeAll = scope === "all";
    if (!deviceId && !includeAll) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }

    const rawLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "8", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 8;
    const rawCursor = request.nextUrl.searchParams.get("cursor");
    const parsedCursor = rawCursor ? await parseVideoCursor(rawCursor) : null;
    const baseWhere = includeAll ? {} : { deviceId };
    const where = parsedCursor
      ? parsedCursor.id
        ? {
            ...baseWhere,
            OR: [
              { createdAt: { lt: parsedCursor.createdAt } },
              { createdAt: parsedCursor.createdAt, id: { lt: parsedCursor.id } },
            ],
          }
        : {
            ...baseWhere,
            createdAt: { lt: parsedCursor.createdAt },
          }
      : baseWhere;

    const videos = await prisma.generatedVideo.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        deviceId: true,
        sourceImageId: true,
        model: true,
        aspectRatio: true,
        durationSeconds: true,
        resolution: true,
        createdAt: true,
      },
    });
    const hasMore = videos.length > limit;
    const pageItems = hasMore ? videos.slice(0, limit) : videos;
    const nextCursor = hasMore
      ? (() => {
          const last = pageItems[pageItems.length - 1];
          if (!last) return null;
          return `${new Date(last.createdAt).getTime()}::${last.id}`;
        })()
      : null;
    const sourceImageIds = Array.from(
      new Set(
        pageItems
          .map((video) => video.sourceImageId)
          .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
      ),
    );
    const sourceImages = sourceImageIds.length
      ? await prisma.generatedImage.findMany({
          where: { id: { in: sourceImageIds } },
          select: { id: true, deviceId: true },
        })
      : [];
    const sourceImageDeviceIdById = new Map(
      sourceImages.map((image) => [image.id, image.deviceId || ""]),
    );

    return NextResponse.json({
      videos: pageItems.map((video) => ({
        id: video.id,
        sourceImageId: video.sourceImageId,
        sourceImageThumbnailUrl: video.sourceImageId
          ? `/api/chatgpt/generated-image/${video.sourceImageId}?deviceId=${encodeURIComponent(
              sourceImageDeviceIdById.get(video.sourceImageId) || video.deviceId || deviceId || "public",
            )}&thumb=1&w=480&q=55`
          : null,
        model: video.model,
        aspectRatio: video.aspectRatio,
        durationSeconds: video.durationSeconds,
        resolution: video.resolution,
        createdAt: video.createdAt.toISOString(),
        videoUrl: `/api/chatgpt/generated-video/${video.id}?deviceId=${encodeURIComponent(
          video.deviceId || deviceId || "",
        )}`,
      })),
      nextCursor,
    });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel carregar o historico de videos." },
      { status: 500 }
    );
  }
}

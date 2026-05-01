import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const THUMB_WIDTH = 480;
const THUMB_QUALITY = 60;

type BibliotecaMediaType = "image" | "video";

type BibliotecaItem = {
  id: string;
  url: string;
  pathname: string;
  thumbUrl: string;
  model: string;
  mediaType: BibliotecaMediaType;
  createdAt: string;
  createdBy: null;
};

function parseMediaType(value: string | null): BibliotecaMediaType | null {
  if (value === "image" || value === "video") {
    return value;
  }
  return null;
}

function parseCursorToDate(value: string | null): Date | null {
  if (!value) return null;
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDeviceIdForProxy(deviceId?: string | null) {
  return encodeURIComponent(deviceId || "public");
}

function mapImageItem(item: {
  id: string;
  deviceId: string | null;
  model: string;
  blobPath: string;
  blobUrl: string;
  createdAt: Date;
}): BibliotecaItem {
  const deviceIdQuery = getDeviceIdForProxy(item.deviceId);
  const imageProxyUrl = `/api/chatgpt/generated-image/${item.id}?deviceId=${deviceIdQuery}`;
  return {
    id: item.id,
    url: item.blobUrl || imageProxyUrl,
    pathname: item.blobPath,
    thumbUrl:
      `/api/chatgpt/generated-image/${item.id}?deviceId=${deviceIdQuery}&thumb=1&w=${THUMB_WIDTH}&q=${THUMB_QUALITY}`,
    model: item.model,
    mediaType: "image",
    createdAt: item.createdAt.toISOString(),
    createdBy: null,
  };
}

function mapVideoItem(item: {
  id: string;
  sourceImageId: string | null;
  deviceId: string | null;
  model: string;
  blobPath: string;
  blobUrl: string;
  createdAt: Date;
}): BibliotecaItem {
  const deviceIdQuery = getDeviceIdForProxy(item.deviceId);
  const videoProxyUrl = `/api/chatgpt/generated-video/${item.id}?deviceId=${deviceIdQuery}`;
  const thumbUrl = item.sourceImageId
    ? `/api/chatgpt/generated-image/${item.sourceImageId}?deviceId=${deviceIdQuery}&thumb=1&w=${THUMB_WIDTH}&q=${THUMB_QUALITY}`
    : "";

  return {
    id: item.id,
    url: item.blobUrl || videoProxyUrl,
    pathname: item.blobPath,
    thumbUrl,
    model: item.model,
    mediaType: "video",
    createdAt: item.createdAt.toISOString(),
    createdBy: null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const mediaType = parseMediaType(searchParams.get("mediaType"));
    const limitRaw = Number(searchParams.get("limit") ?? DEFAULT_PAGE_SIZE);
    const pageSize = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw), 1), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
    const cursorDate = parseCursorToDate(searchParams.get("cursor"));

    const whereByCursor = cursorDate ? { createdAt: { lt: cursorDate } } : undefined;

    const [images, videos, totalImage, totalVideo] = await Promise.all([
      mediaType === "video"
        ? Promise.resolve([])
        : prisma.generatedImage.findMany({
            where: whereByCursor,
            orderBy: { createdAt: "desc" },
            take: pageSize + 1,
            select: {
              id: true,
              deviceId: true,
              model: true,
              blobPath: true,
              blobUrl: true,
              createdAt: true,
            },
          }),
      mediaType === "image"
        ? Promise.resolve([])
        : prisma.generatedVideo.findMany({
            where: whereByCursor,
            orderBy: { createdAt: "desc" },
            take: pageSize + 1,
            select: {
              id: true,
              sourceImageId: true,
              deviceId: true,
              model: true,
              blobPath: true,
              blobUrl: true,
              createdAt: true,
            },
          }),
      prisma.generatedImage.count(),
      prisma.generatedVideo.count(),
    ]);

    const combined: BibliotecaItem[] = [
      ...images.map(mapImageItem),
      ...videos.map(mapVideoItem),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const hasMore = combined.length > pageSize;
    const pageItems = hasMore ? combined.slice(0, pageSize) : combined;
    const lastItem = pageItems[pageItems.length - 1];
    const nextCursor = hasMore && lastItem ? new Date(lastItem.createdAt).getTime() : null;

    return NextResponse.json({
      items: pageItems,
      nextCursor,
      counts: {
        image: totalImage,
        video: totalVideo,
      },
    });
  } catch (err) {
    console.error("Erro ao carregar biblioteca de ambientador:", err);
    return NextResponse.json(
      { error: "Nao foi possivel carregar a biblioteca." },
      { status: 500 },
    );
  }
}

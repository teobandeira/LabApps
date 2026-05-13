import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

import { normalizeDeviceId } from "@/lib/chatgpt-credits";
import { prisma } from "@/lib/prisma";

function extensionFromContentType(contentType: string): string {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("webm")) {
    return "webm";
  }
  if (normalized.includes("quicktime")) {
    return "mov";
  }
  if (normalized.includes("mpeg")) {
    return "mpeg";
  }
  return "mp4";
}

type BlobReadResult = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: string | null;
  contentRange: string | null;
  acceptRanges: string | null;
  status: number;
};

type BlobHeadResult = {
  contentType: string;
  contentLength: string | null;
  contentRange: string | null;
  acceptRanges: string | null;
  status: number;
};

async function deleteFromBlob(pathname: string, token: string): Promise<void> {
  try {
    await del(pathname, { token });
  } catch {
    // limpeza de blob em melhor esforço
  }
}

function getStoreIdFromToken(token: string): string {
  const parts = token.split("_");
  return parts[3] || "";
}

function encodeBlobPathname(pathname: string): string {
  return pathname
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildBlobFetchUrls(pathname: string, token: string): string[] {
  const storeId = getStoreIdFromToken(token);
  if (!storeId) return [];

  const encodedPathname = encodeBlobPathname(pathname);
  if (!encodedPathname) return [];

  return [
    `https://${storeId}.private.blob.vercel-storage.com/${encodedPathname}`,
    `https://${storeId}.public.blob.vercel-storage.com/${encodedPathname}`,
  ];
}

async function readFromBlob(
  pathname: string,
  token: string,
  rangeHeader?: string | null
): Promise<BlobReadResult | null> {
  const fetchUrls = buildBlobFetchUrls(pathname, token);
  if (fetchUrls.length === 0) return null;

  for (const url of fetchUrls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
          ...(rangeHeader ? { range: rangeHeader } : {}),
        },
        cache: "no-store",
      });

      if (response.status !== 200 && response.status !== 206) {
        continue;
      }

      const stream = response.body as ReadableStream<Uint8Array> | null;
      if (!stream) continue;

      const contentType =
        response.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4";

      return {
        stream,
        contentType,
        contentLength: response.headers.get("content-length"),
        contentRange: response.headers.get("content-range"),
        acceptRanges: response.headers.get("accept-ranges"),
        status: response.status,
      };
    } catch {
      // tenta próxima url
    }
  }

  return null;
}

async function headFromBlob(pathname: string, token: string): Promise<BlobHeadResult | null> {
  const fetchUrls = buildBlobFetchUrls(pathname, token);
  if (fetchUrls.length === 0) return null;

  for (const url of fetchUrls) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: {
          authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (response.status !== 200 && response.status !== 206) {
        continue;
      }

      return {
        contentType: response.headers.get("content-type")?.split(";")[0]?.trim() || "video/mp4",
        contentLength: response.headers.get("content-length"),
        contentRange: response.headers.get("content-range"),
        acceptRanges: response.headers.get("accept-ranges"),
        status: response.status,
      };
    } catch {
      // tenta próxima url
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Id do video nao informado." }, { status: 400 });
    }
    const deviceId = normalizeDeviceId(request.nextUrl.searchParams.get("deviceId"));
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }

    const videoRecord = await prisma.generatedVideo.findUnique({
      where: { id },
      select: {
        id: true,
        deviceId: true,
        blobPath: true,
        blobUrl: true,
        mimeType: true,
      },
    });

    if (!videoRecord) {
      return NextResponse.json({ error: "Video nao encontrado." }, { status: 404 });
    }
    if (videoRecord.deviceId && videoRecord.deviceId !== deviceId) {
      return NextResponse.json({ error: "Video nao encontrado." }, { status: 404 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const rangeHeader = request.headers.get("range");
    const blobReadResult = blobToken
      ? await readFromBlob(videoRecord.blobPath, blobToken, rangeHeader)
      : null;
    let contentType = videoRecord.mimeType || "video/mp4";
    let stream: ReadableStream<Uint8Array> | null = null;
    let contentLength: string | null = null;
    let contentRange: string | null = null;
    let acceptRanges: string | null = null;
    let responseStatus = 200;

    if (blobReadResult) {
      contentType = blobReadResult.contentType || contentType;
      stream = blobReadResult.stream;
      contentLength = blobReadResult.contentLength;
      contentRange = blobReadResult.contentRange;
      acceptRanges = blobReadResult.acceptRanges;
      responseStatus = blobReadResult.status;
    } else {
      let fallbackUrl: string;
      try {
        fallbackUrl = new URL(videoRecord.blobUrl, request.nextUrl.origin).toString();
      } catch {
        return NextResponse.json(
          { error: "URL de fallback do video e invalida." },
          { status: 500 }
        );
      }

      const upstreamResponse = await fetch(fallbackUrl, {
        cache: "no-store",
        headers: rangeHeader ? { range: rangeHeader } : undefined,
      });

      if (!upstreamResponse.ok) {
        return NextResponse.json(
          { error: "Nao foi possivel carregar video gerado." },
          { status: 502 }
        );
      }

      const contentTypeHeader = upstreamResponse.headers.get("content-type");
      contentType = contentTypeHeader?.split(";")[0]?.trim() || contentType;
      stream = upstreamResponse.body as ReadableStream<Uint8Array> | null;
      contentLength = upstreamResponse.headers.get("content-length");
      contentRange = upstreamResponse.headers.get("content-range");
      acceptRanges = upstreamResponse.headers.get("accept-ranges");
      responseStatus = upstreamResponse.status === 206 ? 206 : 200;
    }

    if (!stream) {
      return NextResponse.json({ error: "Video indisponivel no momento." }, { status: 502 });
    }

    if (!contentType.startsWith("video/")) {
      return NextResponse.json(
        { error: "Arquivo salvo nao e um video valido." },
        { status: 400 }
      );
    }

    const download = request.nextUrl.searchParams.get("download") === "1";
    const extension = extensionFromContentType(contentType);
    const filename = `video-${videoRecord.id}.${extension}`;

    return new NextResponse(stream, {
      status: responseStatus,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": download
          ? `attachment; filename="${filename}"`
          : `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "Accept-Ranges": acceptRanges || "bytes",
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        ...(contentRange ? { "Content-Range": contentRange } : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erro inesperado ao carregar video." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Id do video nao informado." }, { status: 400 });
    }
    const deviceId = normalizeDeviceId(request.nextUrl.searchParams.get("deviceId"));
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }

    const videoRecord = await prisma.generatedVideo.findUnique({
      where: { id },
      select: {
        id: true,
        deviceId: true,
        blobPath: true,
      },
    });

    if (!videoRecord) {
      return NextResponse.json({ error: "Video nao encontrado." }, { status: 404 });
    }
    if (videoRecord.deviceId && videoRecord.deviceId !== deviceId) {
      return NextResponse.json({ error: "Video nao encontrado." }, { status: 404 });
    }

    await prisma.generatedVideo.delete({
      where: { id: videoRecord.id },
    });

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken && videoRecord.blobPath) {
      await deleteFromBlob(videoRecord.blobPath, blobToken);
    }

    return NextResponse.json({ ok: true, id: videoRecord.id });
  } catch {
    return NextResponse.json(
      { error: "Erro inesperado ao excluir video." },
      { status: 500 }
    );
  }
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return new NextResponse(null, { status: 400 });
    }

    const deviceId = normalizeDeviceId(request.nextUrl.searchParams.get("deviceId"));
    if (!deviceId) {
      return new NextResponse(null, { status: 400 });
    }

    const videoRecord = await prisma.generatedVideo.findUnique({
      where: { id },
      select: {
        id: true,
        deviceId: true,
        blobPath: true,
        blobUrl: true,
        mimeType: true,
      },
    });

    if (!videoRecord) {
      return new NextResponse(null, { status: 404 });
    }
    if (videoRecord.deviceId && videoRecord.deviceId !== deviceId) {
      return new NextResponse(null, { status: 404 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const blobHead = blobToken ? await headFromBlob(videoRecord.blobPath, blobToken) : null;

    if (blobHead) {
      return new NextResponse(null, {
        status: blobHead.status,
        headers: {
          "Content-Type": blobHead.contentType,
          "Accept-Ranges": blobHead.acceptRanges || "bytes",
          ...(blobHead.contentLength ? { "Content-Length": blobHead.contentLength } : {}),
          ...(blobHead.contentRange ? { "Content-Range": blobHead.contentRange } : {}),
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
    }

    let fallbackUrl: string;
    try {
      fallbackUrl = new URL(videoRecord.blobUrl, request.nextUrl.origin).toString();
    } catch {
      return new NextResponse(null, { status: 500 });
    }

    const upstreamResponse = await fetch(fallbackUrl, {
      method: "HEAD",
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      return new NextResponse(null, { status: 502 });
    }

    const contentType =
      upstreamResponse.headers.get("content-type")?.split(";")[0]?.trim() ||
      videoRecord.mimeType ||
      "video/mp4";
    const contentLength = upstreamResponse.headers.get("content-length");
    const contentRange = upstreamResponse.headers.get("content-range");
    const acceptRanges = upstreamResponse.headers.get("accept-ranges");

    return new NextResponse(null, {
      status: upstreamResponse.status === 206 ? 206 : 200,
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": acceptRanges || "bytes",
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        ...(contentRange ? { "Content-Range": contentRange } : {}),
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

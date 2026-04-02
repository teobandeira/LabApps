import { del, get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

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
};

async function deleteFromBlob(pathname: string, token: string): Promise<void> {
  try {
    await del(pathname, { token });
  } catch {
    // limpeza de blob em melhor esforço
  }
}

async function readFromBlob(pathname: string, token: string): Promise<BlobReadResult | null> {
  try {
    const privateRead = await get(pathname, {
      access: "private",
      token,
      useCache: false,
    });

    if (privateRead && privateRead.statusCode === 200) {
      return {
        stream: privateRead.stream,
        contentType: privateRead.blob.contentType,
      };
    }
  } catch {
    // fallback below
  }

  try {
    const publicRead = await get(pathname, {
      access: "public",
      token,
      useCache: true,
    });

    if (publicRead && publicRead.statusCode === 200) {
      return {
        stream: publicRead.stream,
        contentType: publicRead.blob.contentType,
      };
    }
  } catch {
    // fallback below
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

    const videoRecord = await prisma.generatedVideo.findUnique({
      where: { id },
      select: {
        id: true,
        blobPath: true,
        blobUrl: true,
        mimeType: true,
      },
    });

    if (!videoRecord) {
      return NextResponse.json({ error: "Video nao encontrado." }, { status: 404 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const blobReadResult = blobToken
      ? await readFromBlob(videoRecord.blobPath, blobToken)
      : null;
    let contentType = videoRecord.mimeType || "video/mp4";
    let stream: ReadableStream<Uint8Array> | null = null;

    if (blobReadResult) {
      contentType = blobReadResult.contentType || contentType;
      stream = blobReadResult.stream;
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

      const upstreamResponse = await fetch(fallbackUrl, { cache: "no-store" });

      if (!upstreamResponse.ok) {
        return NextResponse.json(
          { error: "Nao foi possivel carregar video gerado." },
          { status: 502 }
        );
      }

      const contentTypeHeader = upstreamResponse.headers.get("content-type");
      contentType = contentTypeHeader?.split(";")[0]?.trim() || contentType;
      stream = upstreamResponse.body as ReadableStream<Uint8Array> | null;
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
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": download
          ? `attachment; filename="${filename}"`
          : `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
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
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Id do video nao informado." }, { status: 400 });
    }

    const videoRecord = await prisma.generatedVideo.findUnique({
      where: { id },
      select: {
        id: true,
        blobPath: true,
      },
    });

    if (!videoRecord) {
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

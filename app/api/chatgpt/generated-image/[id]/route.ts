import { del, get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { normalizeDeviceId } from "@/lib/chatgpt-credits";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function extensionFromContentType(contentType: string): string {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("image/jpeg") || normalized.includes("image/jpg")) {
    return "jpg";
  }
  if (normalized.includes("image/webp")) {
    return "webp";
  }
  if (normalized.includes("image/gif")) {
    return "gif";
  }
  if (normalized.includes("image/avif")) {
    return "avif";
  }
  return "png";
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
      return NextResponse.json({ error: "Id da imagem nao informado." }, { status: 400 });
    }
    const deviceId = normalizeDeviceId(request.nextUrl.searchParams.get("deviceId"));
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }

    const imageRecord = await prisma.generatedImage.findUnique({
      where: { id },
      select: {
        id: true,
        deviceId: true,
        blobPath: true,
        blobUrl: true,
        mimeType: true,
      },
    });

    if (!imageRecord) {
      return NextResponse.json({ error: "Imagem nao encontrada." }, { status: 404 });
    }
    if (imageRecord.deviceId && imageRecord.deviceId !== deviceId) {
      return NextResponse.json({ error: "Imagem nao encontrada." }, { status: 404 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN nao configurado." },
        { status: 500 }
      );
    }

    const blobReadResult = await readFromBlob(imageRecord.blobPath, blobToken);
    let contentType = imageRecord.mimeType || "image/png";
    let stream: ReadableStream<Uint8Array> | null = null;

    if (blobReadResult) {
      contentType = blobReadResult.contentType || contentType;
      stream = blobReadResult.stream;
    } else {
      const upstreamResponse = await fetch(imageRecord.blobUrl, { cache: "no-store" });

      if (!upstreamResponse.ok) {
        return NextResponse.json(
          { error: "Nao foi possivel carregar imagem gerada." },
          { status: 502 }
        );
      }

      const contentTypeHeader = upstreamResponse.headers.get("content-type");
      contentType = contentTypeHeader?.split(";")[0]?.trim() || contentType;
      stream = upstreamResponse.body as ReadableStream<Uint8Array> | null;
    }

    if (!stream) {
      return NextResponse.json({ error: "Imagem indisponivel no momento." }, { status: 502 });
    }

    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Arquivo salvo nao e uma imagem valida." },
        { status: 400 }
      );
    }

    const download = request.nextUrl.searchParams.get("download") === "1";
    const wantsThumbnail = request.nextUrl.searchParams.get("thumb") === "1";
    const thumbWidthRaw = Number.parseInt(request.nextUrl.searchParams.get("w") || "", 10);
    const thumbQualityRaw = Number.parseInt(request.nextUrl.searchParams.get("q") || "", 10);
    const thumbWidth = Number.isFinite(thumbWidthRaw)
      ? Math.min(Math.max(thumbWidthRaw, 120), 1024)
      : 480;
    const thumbQuality = Number.isFinite(thumbQualityRaw)
      ? Math.min(Math.max(thumbQualityRaw, 35), 90)
      : 60;
    const extension = extensionFromContentType(contentType);
    const filename = `imagem-${imageRecord.id}.${extension}`;

    if (wantsThumbnail) {
      try {
        const sourceBuffer = Buffer.from(await new Response(stream).arrayBuffer());
        const thumbnailBuffer = await sharp(sourceBuffer)
          .rotate()
          .resize({
            width: thumbWidth,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: thumbQuality })
          .toBuffer();

        return new NextResponse(thumbnailBuffer, {
          status: 200,
          headers: {
            "Content-Type": "image/webp",
            "Content-Disposition": `inline; filename="imagem-${imageRecord.id}-thumb.webp"`,
            "Cache-Control": "private, max-age=86400",
          },
        });
      } catch {
        // se falhar a miniatura, retorna imagem original em seguida
      }
    }

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
      { error: "Erro inesperado ao carregar imagem." },
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
      return NextResponse.json({ error: "Id da imagem nao informado." }, { status: 400 });
    }
    const deviceId = normalizeDeviceId(request.nextUrl.searchParams.get("deviceId"));
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }

    const imageRecord = await prisma.generatedImage.findUnique({
      where: { id },
      select: {
        id: true,
        deviceId: true,
        blobPath: true,
      },
    });

    if (!imageRecord) {
      return NextResponse.json({ error: "Imagem nao encontrada." }, { status: 404 });
    }
    if (imageRecord.deviceId && imageRecord.deviceId !== deviceId) {
      return NextResponse.json({ error: "Imagem nao encontrada." }, { status: 404 });
    }

    await prisma.generatedImage.delete({
      where: { id: imageRecord.id },
    });

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken && imageRecord.blobPath) {
      await deleteFromBlob(imageRecord.blobPath, blobToken);
    }

    return NextResponse.json({ ok: true, id: imageRecord.id });
  } catch {
    return NextResponse.json(
      { error: "Erro inesperado ao excluir imagem." },
      { status: 500 }
    );
  }
}

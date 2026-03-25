import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

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

    const imageRecord = await prisma.generatedImage.findUnique({
      where: { id },
      select: {
        id: true,
        blobPath: true,
        blobUrl: true,
        mimeType: true,
      },
    });

    if (!imageRecord) {
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
    const extension = extensionFromContentType(contentType);
    const filename = `imagem-${imageRecord.id}.${extension}`;

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

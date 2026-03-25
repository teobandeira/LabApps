import { NextRequest, NextResponse } from "next/server";

type DownloadRequestBody = {
  imageUrl?: string;
};

function normalizeImageUrl(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

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
  return "png";
}

function parseDataUrl(
  dataUrl: string
): { bytes: Uint8Array; contentType: string } | null {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/);
  if (!match) {
    return null;
  }

  const contentType = match[1] || "image/png";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || "";

  try {
    if (isBase64) {
      return {
        bytes: Uint8Array.from(Buffer.from(payload, "base64")),
        contentType,
      };
    }

    return {
      bytes: Uint8Array.from(Buffer.from(decodeURIComponent(payload), "utf8")),
      contentType,
    };
  } catch {
    return null;
  }
}

function buildAttachmentResponse(
  bytes: ArrayBuffer | Uint8Array,
  contentType: string
): NextResponse {
  const filename = `imagem-${Date.now()}.${extensionFromContentType(contentType)}`;
  const normalizedBytes =
    bytes instanceof Uint8Array ? Uint8Array.from(bytes) : new Uint8Array(bytes);
  const body = new Blob([normalizedBytes], { type: contentType });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DownloadRequestBody;
    const imageUrl = normalizeImageUrl(body.imageUrl);

    if (!imageUrl) {
      return NextResponse.json(
        { error: "URL da imagem nao informada." },
        { status: 400 }
      );
    }

    if (imageUrl.startsWith("data:")) {
      const parsedDataUrl = parseDataUrl(imageUrl);
      if (!parsedDataUrl) {
        return NextResponse.json(
          { error: "Imagem em data URL invalida." },
          { status: 400 }
        );
      }

      if (!parsedDataUrl.contentType.startsWith("image/")) {
        return NextResponse.json(
          { error: "Conteudo informado nao e uma imagem valida." },
          { status: 400 }
        );
      }

      return buildAttachmentResponse(
        parsedDataUrl.bytes,
        parsedDataUrl.contentType
      );
    }

    const isRelativePath = imageUrl.startsWith("/");
    let parsedUrl: URL;
    try {
      parsedUrl = isRelativePath ? new URL(imageUrl, request.nextUrl.origin) : new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: "URL da imagem invalida." },
        { status: 400 }
      );
    }

    if (
      parsedUrl.protocol !== "https:" &&
      parsedUrl.protocol !== "http:"
    ) {
      return NextResponse.json(
        { error: "Protocolo da URL nao suportado." },
        { status: 400 }
      );
    }

    const isSameOrigin = parsedUrl.origin === request.nextUrl.origin;
    if (!isSameOrigin && (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1")) {
      return NextResponse.json(
        { error: "Hostname nao permitido para download." },
        { status: 400 }
      );
    }

    const upstreamResponse = await fetch(parsedUrl.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: "Nao foi possivel obter a imagem para download." },
        { status: 502 }
      );
    }

    const contentType =
      upstreamResponse.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";

    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "A URL nao retornou um arquivo de imagem." },
        { status: 400 }
      );
    }

    const bytes = await upstreamResponse.arrayBuffer();
    return buildAttachmentResponse(bytes, contentType);
  } catch {
    return NextResponse.json(
      { error: "Erro inesperado ao preparar download da imagem." },
      { status: 500 }
    );
  }
}

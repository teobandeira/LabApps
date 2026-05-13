import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

      return {
        stream,
        contentType:
          response.headers.get("content-type")?.split(";")[0]?.trim() ||
          "application/octet-stream",
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
        contentType:
          response.headers.get("content-type")?.split(";")[0]?.trim() ||
          "application/octet-stream",
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

function normalizePathname(value: string | null): string {
  return typeof value === "string" ? value.trim().replace(/^\/+/, "") : "";
}

export async function GET(request: NextRequest) {
  try {
    const pathname = normalizePathname(request.nextUrl.searchParams.get("pathname"));
    if (!pathname) {
      return NextResponse.json({ error: "pathname obrigatorio." }, { status: 400 });
    }

    const rangeHeader = request.headers.get("range");
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!blobToken) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN nao configurado no ambiente." },
        { status: 500 },
      );
    }

    const blobRead = await readFromBlob(pathname, blobToken, rangeHeader);
    if (!blobRead) {
      return NextResponse.json({ error: "Arquivo nao encontrado no Blob." }, { status: 404 });
    }

    const download = request.nextUrl.searchParams.get("download") === "1";
    const filename = pathname.split("/").pop() || "arquivo";
    const responseStatus = blobRead.status;

    return new NextResponse(blobRead.stream, {
      status: responseStatus,
      headers: {
        "Content-Type": blobRead.contentType,
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "Accept-Ranges": blobRead.acceptRanges || "bytes",
        ...(blobRead.contentLength ? { "Content-Length": blobRead.contentLength } : {}),
        ...(blobRead.contentRange ? { "Content-Range": blobRead.contentRange } : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erro inesperado ao carregar arquivo da Vercel Library." },
      { status: 500 },
    );
  }
}

export async function HEAD(request: NextRequest) {
  try {
    const pathname = normalizePathname(request.nextUrl.searchParams.get("pathname"));
    if (!pathname) {
      return new NextResponse(null, { status: 400 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!blobToken) {
      return new NextResponse(null, { status: 500 });
    }

    const blobHead = await headFromBlob(pathname, blobToken);
    if (!blobHead) {
      return new NextResponse(null, { status: 404 });
    }

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
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

import { del, list, type ListBlobResultBlob } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type VercelLibraryMediaKind = "image" | "video";

type VercelLibraryItem = {
  kind: VercelLibraryMediaKind;
  pathname: string;
  url: string;
  downloadUrl: string;
  proxyUrl: string;
  size: number;
  uploadedAt: string;
};

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "avif",
  "bmp",
  "svg",
  "tif",
  "tiff",
  "heic",
  "heif",
]);
const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "webm",
  "mkv",
  "avi",
  "m4v",
  "3gp",
  "ts",
  "m2ts",
  "m3u8",
]);
const LIST_PAGE_LIMIT = 1000;
const MAX_LIST_PAGES = 200;

function normalizePathname(value: string): string {
  return value.trim().replace(/^\/+/, "");
}

function normalizeOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractExtension(pathname: string): string {
  const normalized = normalizePathname(pathname).toLowerCase();
  const lastDot = normalized.lastIndexOf(".");
  if (lastDot < 0 || lastDot === normalized.length - 1) return "";
  return normalized.slice(lastDot + 1);
}

function resolveMediaKind(pathname: string): VercelLibraryMediaKind | null {
  const extension = extractExtension(pathname);
  if (!extension) return null;
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  return null;
}

function toIsoDate(value: Date): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  return new Date().toISOString();
}

function mapBlobToLibraryItem(blob: ListBlobResultBlob): VercelLibraryItem | null {
  const pathname = normalizePathname(blob.pathname || "");
  if (!pathname) return null;

  const kind = resolveMediaKind(pathname);
  if (!kind) return null;

  return {
    kind,
    pathname,
    url: blob.url,
    downloadUrl: blob.downloadUrl,
    proxyUrl: `/api/chatgpt/vercel-library/file?pathname=${encodeURIComponent(pathname)}`,
    size: Number.isFinite(blob.size) ? blob.size : 0,
    uploadedAt: toIsoDate(blob.uploadedAt),
  };
}

export async function GET() {
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!blobToken) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN nao configurado no ambiente." },
        { status: 500 },
      );
    }

    const items: VercelLibraryItem[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    let pages = 0;

    while (hasMore && pages < MAX_LIST_PAGES) {
      const page = await list({
        token: blobToken,
        cursor,
        limit: LIST_PAGE_LIMIT,
      });

      for (const blob of page.blobs) {
        const mapped = mapBlobToLibraryItem(blob);
        if (mapped) {
          items.push(mapped);
        }
      }

      cursor = page.cursor;
      hasMore = Boolean(page.hasMore && cursor);
      pages += 1;
    }

    items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json(
      {
        items,
        total: items.length,
        truncated: hasMore,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel listar as midias da Vercel Library.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!blobToken) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN nao configurado no ambiente." },
        { status: 500 },
      );
    }

    const payload = (await request.json().catch(() => null)) as
      | {
          pathname?: unknown;
          url?: unknown;
        }
      | null;

    const pathname = normalizePathname(normalizeOptionalString(payload?.pathname));
    const url = normalizeOptionalString(payload?.url);
    const deleteTarget = url || pathname;

    if (!deleteTarget) {
      return NextResponse.json({ error: "pathname ou url obrigatorio." }, { status: 400 });
    }

    await del(deleteTarget, { token: blobToken });

    return NextResponse.json({
      ok: true,
      pathname: pathname || null,
      url: url || null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel excluir a midia da Vercel Library.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

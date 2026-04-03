import crypto from "node:crypto";

import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { normalizeDeviceId } from "@/lib/chatgpt-credits";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_SOURCE_IMAGE_SIZE_BYTES = 50 * 1024 * 1024;
const SUPPORTED_SOURCE_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const SAVED_IMAGE_MAX_DIMENSION = 1280;
const SAVED_IMAGE_WEBP_QUALITY = 82;

type BlobAccessMode = "public" | "private";

function getFileExtension(filename: string): string {
  const lower = filename.toLowerCase();
  const lastDot = lower.lastIndexOf(".");
  return lastDot === -1 ? "" : lower.slice(lastDot);
}

function extensionFromImageContentType(contentType: string): string {
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

function getBlobAccessCandidates(): BlobAccessMode[] {
  const accessFromEnv = process.env.BLOB_ACCESS?.trim().toLowerCase();
  if (accessFromEnv === "private") {
    return ["private", "public"];
  }
  if (accessFromEnv === "public") {
    return ["public", "private"];
  }
  return ["public", "private"];
}

function isBlobAccessCompatibilityError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("cannot use public access on a private store") ||
    message.includes("cannot use private access on a public store")
  );
}

function buildReferenceImageBlobPath(extension: string): string {
  const datePath = new Date().toISOString().slice(0, 10);
  return `chatgpt/reference/${datePath}/${crypto.randomUUID()}.${extension}`;
}

function isSupportedSourceImage(file: File): boolean {
  const extension = getFileExtension(file.name);
  if (SUPPORTED_SOURCE_IMAGE_EXTENSIONS.has(extension)) {
    return true;
  }

  const mimeType = file.type.toLowerCase();
  return mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sourceImage = formData.get("sourceImage");
    const deviceId = normalizeDeviceId(formData.get("deviceId"));

    if (!(sourceImage instanceof File)) {
      return NextResponse.json({ error: "Envie uma imagem de referencia." }, { status: 400 });
    }
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }
    if (sourceImage.size <= 0) {
      return NextResponse.json({ error: "A imagem enviada esta vazia." }, { status: 400 });
    }
    if (sourceImage.size > MAX_SOURCE_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "A imagem enviada excede o limite de 50MB." },
        { status: 400 },
      );
    }
    if (!isSupportedSourceImage(sourceImage)) {
      return NextResponse.json(
        { error: "Formato da imagem nao suportado. Use PNG, JPG/JPEG ou WEBP." },
        { status: 400 },
      );
    }

    const sourceBuffer = Buffer.from(await sourceImage.arrayBuffer());
    const sourceMetadata = await sharp(sourceBuffer, { failOn: "none" }).metadata();
    const originalContentType = (sourceImage.type || "image/png").toLowerCase();
    const originalExtension = extensionFromImageContentType(originalContentType);

    let bytes = new Uint8Array(sourceBuffer);
    let contentType = originalContentType;
    let extension = originalExtension;

    try {
      const optimizedBuffer = await sharp(sourceBuffer, { failOn: "none" })
        .rotate()
        .resize({
          width: SAVED_IMAGE_MAX_DIMENSION,
          height: SAVED_IMAGE_MAX_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: SAVED_IMAGE_WEBP_QUALITY, effort: 6 })
        .toBuffer();

      if (optimizedBuffer.byteLength > 0 && optimizedBuffer.byteLength < sourceBuffer.byteLength) {
        bytes = new Uint8Array(optimizedBuffer);
        contentType = "image/webp";
        extension = "webp";
      }
    } catch {
      // fallback seguro para manter upload mesmo se optimization falhar
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN nao configurado no ambiente." },
        { status: 500 },
      );
    }

    const blobPath = buildReferenceImageBlobPath(extension);
    const blobBody = new Blob([Uint8Array.from(bytes)], { type: contentType });
    const accessCandidates = getBlobAccessCandidates();
    let blob: Awaited<ReturnType<typeof put>> | null = null;
    let lastError: unknown = null;

    for (const accessMode of accessCandidates) {
      try {
        blob = await put(blobPath, blobBody, {
          access: accessMode,
          contentType,
          token: blobToken,
          addRandomSuffix: false,
        });
        break;
      } catch (uploadError) {
        lastError = uploadError;
        if (!isBlobAccessCompatibilityError(uploadError)) {
          throw uploadError;
        }
      }
    }

    if (!blob) {
      if (lastError instanceof Error) {
        throw lastError;
      }
      throw new Error("Falha ao salvar imagem no Blob.");
    }

    const imageSize =
      Number.isFinite(sourceMetadata.width) &&
      Number.isFinite(sourceMetadata.height) &&
      sourceMetadata.width &&
      sourceMetadata.height
        ? `${sourceMetadata.width}x${sourceMetadata.height}`
        : "1024x1024";

    const savedImage = await prisma.generatedImage.create({
      data: {
        deviceId,
        prompt: "Imagem de referencia enviada pelo usuario.",
        revisedPrompt: null,
        model: "upload-referencia",
        size: imageSize,
        action: "edit",
        sourceImageName: sourceImage.name || null,
        openaiImageUrl: null,
        blobUrl: blob.url,
        blobPath: blob.pathname,
        mimeType: contentType,
        bytes: bytes.byteLength,
      },
    });

    return NextResponse.json({
      ok: true,
      storedImageId: savedImage.id,
      imageUrl: `/api/chatgpt/generated-image/${savedImage.id}?deviceId=${encodeURIComponent(deviceId)}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel salvar imagem de referencia na biblioteca." },
      { status: 500 },
    );
  }
}

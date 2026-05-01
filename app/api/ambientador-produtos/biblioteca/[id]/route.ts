import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function deleteBlobPathIfAny(pathname?: string | null) {
  if (!pathname) return;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;

  try {
    await del(pathname, { token });
  } catch {
    // limpeza em melhor esforço
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const itemId = (id || "").trim();
    if (!itemId) {
      return NextResponse.json({ error: "ID invalido." }, { status: 400 });
    }

    const [image, video] = await Promise.all([
      prisma.generatedImage.findUnique({
        where: { id: itemId },
        select: { id: true, blobPath: true },
      }),
      prisma.generatedVideo.findUnique({
        where: { id: itemId },
        select: { id: true, blobPath: true },
      }),
    ]);

    if (!image && !video) {
      return NextResponse.json(
        { error: "Item nao encontrado." },
        { status: 404 },
      );
    }

    if (image) {
      await prisma.generatedImage.delete({ where: { id: image.id } });
      await deleteBlobPathIfAny(image.blobPath);
      return NextResponse.json({ ok: true, id: image.id, mediaType: "image" });
    }

    if (video) {
      await prisma.generatedVideo.delete({ where: { id: video.id } });
      await deleteBlobPathIfAny(video.blobPath);
      return NextResponse.json({ ok: true, id: video.id, mediaType: "video" });
    }

    return NextResponse.json({ error: "Item nao encontrado." }, { status: 404 });
  } catch (error) {
    console.error("Erro ao excluir item da biblioteca:", error);
    return NextResponse.json(
      { error: "Erro interno ao excluir item." },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const MAX_DEVICE_ID_LENGTH = 120;
const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGES_PER_CHAT = 300;
const MAX_MESSAGE_CONTENT_LENGTH = 24_000;
const MAX_IMAGE_URL_LENGTH = 2_048;
const MAX_IMAGE_ID_LENGTH = 120;

type IncomingChatMessage = {
  role?: unknown;
  content?: unknown;
  imageUrl?: unknown;
  imageId?: unknown;
};

function normalizeDeviceId(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  return normalized.slice(0, MAX_DEVICE_ID_LENGTH);
}

function normalizeTitle(value: unknown): string {
  if (typeof value !== "string") {
    return "Novo chat";
  }

  const normalized = value.trim();
  if (!normalized) {
    return "Novo chat";
  }

  return normalized.slice(0, MAX_TITLE_LENGTH);
}

function normalizeMessages(value: unknown): Array<{
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  imageId?: string;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: Array<{
    role: "user" | "assistant";
    content: string;
    imageUrl?: string;
    imageId?: string;
  }> = [];

  for (const rawMessage of value) {
    if (!rawMessage || typeof rawMessage !== "object") {
      continue;
    }

    const message = rawMessage as IncomingChatMessage;
    if (message.role !== "user" && message.role !== "assistant") {
      continue;
    }

    const content =
      typeof message.content === "string"
        ? message.content.slice(0, MAX_MESSAGE_CONTENT_LENGTH)
        : "";
    const imageUrl =
      typeof message.imageUrl === "string" && message.imageUrl.trim().length > 0
        ? message.imageUrl.trim().slice(0, MAX_IMAGE_URL_LENGTH)
        : undefined;
    const imageId =
      typeof message.imageId === "string" && message.imageId.trim().length > 0
        ? message.imageId.trim().slice(0, MAX_IMAGE_ID_LENGTH)
        : undefined;

    if (!content.trim() && !imageUrl) {
      continue;
    }

    normalized.push({
      role: message.role,
      content,
      imageUrl,
      imageId,
    });

    if (normalized.length >= MAX_MESSAGES_PER_CHAT) {
      break;
    }
  }

  return normalized;
}

function mapSessionRecord(session: {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    imageUrl: string | null;
    imageId: string | null;
    createdAt: Date;
  }>;
}) {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    messages: session.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      imageUrl: message.imageUrl ?? undefined,
      imageId: message.imageId ?? undefined,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Id do chat obrigatorio." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as {
      deviceId?: unknown;
      title?: unknown;
      messages?: unknown;
    } | null;

    const deviceId = normalizeDeviceId(body?.deviceId);
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }

    const existingSession = await prisma.chatSession.findFirst({
      where: { id, deviceId },
      select: { id: true },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Chat nao encontrado." }, { status: 404 });
    }

    const title = normalizeTitle(body?.title);
    const messages = normalizeMessages(body?.messages);

    await prisma.$transaction(async (tx) => {
      await tx.chatSession.update({
        where: { id },
        data: { title },
      });

      await tx.chatSessionMessage.deleteMany({
        where: { sessionId: id },
      });

      if (messages.length > 0) {
        const baseTimestamp = Date.now();
        await tx.chatSessionMessage.createMany({
          data: messages.map((message, index) => ({
            sessionId: id,
            role: message.role,
            content: message.content,
            imageUrl: message.imageUrl,
            imageId: message.imageId,
            createdAt: new Date(baseTimestamp + index),
          })),
        });
      }
    });

    const updatedSession = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!updatedSession) {
      return NextResponse.json({ error: "Chat nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      session: mapSessionRecord(updatedSession),
    });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel salvar o chat." },
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
      return NextResponse.json({ error: "Id do chat obrigatorio." }, { status: 400 });
    }

    const deviceId = normalizeDeviceId(request.nextUrl.searchParams.get("deviceId"));
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }

    const result = await prisma.chatSession.deleteMany({
      where: {
        id,
        deviceId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Chat nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel excluir o chat." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const MAX_DEVICE_ID_LENGTH = 120;
const MAX_TITLE_LENGTH = 120;

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

function mapSessionRecord(session: {
  id: string;
  title: string;
  updatedAt: Date;
  createdAt: Date;
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

export async function GET(request: NextRequest) {
  try {
    const deviceId = normalizeDeviceId(request.nextUrl.searchParams.get("deviceId"));
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { deviceId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      sessions: sessions.map(mapSessionRecord),
    });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel carregar os chats." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { deviceId?: unknown; title?: unknown } | null;
    const deviceId = normalizeDeviceId(body?.deviceId);

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }

    const session = await prisma.chatSession.create({
      data: {
        deviceId,
        title: normalizeTitle(body?.title),
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      session: mapSessionRecord(session),
    });
  } catch {
    return NextResponse.json({ error: "Nao foi possivel criar o chat." }, { status: 500 });
  }
}

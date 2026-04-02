import { NextRequest, NextResponse } from "next/server";

import { getCreditSummary, normalizeDeviceId } from "@/lib/chatgpt-credits";

export async function GET(request: NextRequest) {
  try {
    const deviceId = normalizeDeviceId(request.nextUrl.searchParams.get("deviceId"));
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId obrigatorio." }, { status: 400 });
    }

    const summary = await getCreditSummary(deviceId);
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel carregar o saldo de creditos." },
      { status: 500 }
    );
  }
}

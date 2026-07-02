import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bans } from "@/db/schema";
import { requireAdmin } from "@/lib/adminAuth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { deviceId, reason } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: "deviceId is required" },
        { status: 400 }
      );
    }

    await db
      .insert(bans)
      .values({ deviceId, banned: true, reason: reason || null })
      .onConflictDoUpdate({
        target: bans.deviceId,
        set: { banned: true, reason: reason || null },
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Ban error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: "deviceId is required" },
        { status: 400 }
      );
    }

    await db
      .update(bans)
      .set({ banned: false })
      .where(eq(bans.deviceId, deviceId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unban error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

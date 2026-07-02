import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deviceLimits, bans } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json(
        { error: "deviceId is required" },
        { status: 400 }
      );
    }

    // Check ban
    const banResult = await db
      .select()
      .from(bans)
      .where(eq(bans.deviceId, deviceId))
      .limit(1);
    if (banResult.length > 0 && banResult[0].banned) {
      return NextResponse.json({ canSubmit: false, reason: "banned" });
    }

    // Check 24h limit
    const limitResult = await db
      .select()
      .from(deviceLimits)
      .where(eq(deviceLimits.deviceId, deviceId))
      .limit(1);

    if (limitResult.length === 0) {
      return NextResponse.json({ canSubmit: true });
    }

    const lastSubmit = limitResult[0].lastSubmitAt;
    const diff = Date.now() - lastSubmit.getTime();
    const hours24 = 24 * 60 * 60 * 1000;

    if (diff < hours24) {
      const remaining = Math.ceil((hours24 - diff) / (60 * 60 * 1000));
      return NextResponse.json({
        canSubmit: false,
        reason: "limit",
        remainingHours: remaining,
      });
    }

    return NextResponse.json({ canSubmit: true });
  } catch (err) {
    console.error("Check limit error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

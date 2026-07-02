import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tiles, deviceLimits, bans, meta } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { spiralCoord, chunkCoord } from "@/lib/spiral";
import { renderPixelsToPngBase64 } from "@/lib/renderTile";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, deviceId, pixels } = body;

    // Validate name
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const trimmedName = name.trim().slice(0, 20);
    if (trimmedName.length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate deviceId
    if (!deviceId || typeof deviceId !== "string" || deviceId.length > 64) {
      return NextResponse.json(
        { error: "Invalid device ID" },
        { status: 400 }
      );
    }

    // Validate pixels - should be 32x32 array of hex color strings
    if (!Array.isArray(pixels) || pixels.length !== 32) {
      return NextResponse.json(
        { error: "Invalid pixel data" },
        { status: 400 }
      );
    }
    for (const row of pixels) {
      if (!Array.isArray(row) || row.length !== 32) {
        return NextResponse.json(
          { error: "Invalid pixel data" },
          { status: 400 }
        );
      }
    }

    // Check ban
    const banResult = await db
      .select()
      .from(bans)
      .where(eq(bans.deviceId, deviceId))
      .limit(1);
    if (banResult.length > 0 && banResult[0].banned) {
      return NextResponse.json(
        { error: "This device has been banned" },
        { status: 403 }
      );
    }

    // Check 24h limit
    const limitResult = await db
      .select()
      .from(deviceLimits)
      .where(eq(deviceLimits.deviceId, deviceId))
      .limit(1);
    if (limitResult.length > 0) {
      const lastSubmit = limitResult[0].lastSubmitAt;
      const diff = Date.now() - lastSubmit.getTime();
      const hours24 = 24 * 60 * 60 * 1000;
      if (diff < hours24) {
        const remaining = Math.ceil((hours24 - diff) / (60 * 60 * 1000));
        return NextResponse.json(
          {
            error: `Daily limit reached. Try again in ~${remaining} hour(s).`,
          },
          { status: 429 }
        );
      }
    }

    // Render PNG
    const imageData = renderPixelsToPngBase64(pixels);

    // Allocate next index atomically
    const updateResult = await db
      .update(meta)
      .set({ value: sql`${meta.value} + 1` })
      .where(eq(meta.key, "nextIndex"))
      .returning({ value: meta.value });

    let n: number;
    if (updateResult.length === 0) {
      // Initialize meta
      await db.insert(meta).values({ key: "nextIndex", value: 1 }).onConflictDoNothing();
      n = 0;
    } else {
      n = updateResult[0].value - 1; // We incremented, so current is value-1
    }

    const { x, y } = spiralCoord(n);
    const { cx, cy } = chunkCoord(x, y);

    // Insert tile
    const inserted = await db
      .insert(tiles)
      .values({
        n,
        x,
        y,
        cx,
        cy,
        name: trimmedName,
        deviceId,
        imageData,
        status: "active",
      })
      .returning();

    // Update device limits
    await db
      .insert(deviceLimits)
      .values({ deviceId, lastSubmitAt: new Date() })
      .onConflictDoUpdate({
        target: deviceLimits.deviceId,
        set: { lastSubmitAt: new Date() },
      });

    return NextResponse.json({
      success: true,
      tile: {
        id: inserted[0].id,
        n,
        x,
        y,
        cx,
        cy,
        name: trimmedName,
      },
    });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

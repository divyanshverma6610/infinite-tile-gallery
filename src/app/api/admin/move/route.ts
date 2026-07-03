import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tiles } from "@/db/schema";
import { requireAdmin } from "@/lib/adminAuth";
import { eq } from "drizzle-orm";
import { chunkCoord } from "@/lib/spiral";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tileId, x, y } = body;

    if (tileId === undefined || x === undefined || y === undefined) {
      return NextResponse.json(
        { error: "tileId, x, and y are required" },
        { status: 400 }
      );
    }

    const newX = parseInt(x, 10);
    const newY = parseInt(y, 10);

    if (isNaN(newX) || isNaN(newY)) {
      return NextResponse.json(
        { error: "x and y must be numbers" },
        { status: 400 }
      );
    }

    // Check tile exists
    const existing = await db
      .select()
      .from(tiles)
      .where(eq(tiles.id, tileId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Tile not found" },
        { status: 404 }
      );
    }

    // Calculate new chunk coords
    const { cx, cy } = chunkCoord(newX, newY);

    // Update position
    await db
      .update(tiles)
      .set({ x: newX, y: newY, cx, cy })
      .where(eq(tiles.id, tileId));

    return NextResponse.json({
      success: true,
      tile: { id: tileId, x: newX, y: newY, cx, cy },
    });
  } catch (err) {
    console.error("Move error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

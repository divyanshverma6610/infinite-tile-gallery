import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tiles, meta } from "@/db/schema";
import { requireAdmin } from "@/lib/adminAuth";
import { eq, asc } from "drizzle-orm";
import { spiralCoord, chunkCoord } from "@/lib/spiral";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all active tiles ordered by creation date
    const allTiles = await db
      .select({ id: tiles.id, createdAt: tiles.createdAt })
      .from(tiles)
      .where(eq(tiles.status, "active"))
      .orderBy(asc(tiles.createdAt));

    // Reassign spiral positions: 0, 1, 2, 3...
    for (let i = 0; i < allTiles.length; i++) {
      const { x, y } = spiralCoord(i);
      const { cx, cy } = chunkCoord(x, y);

      await db
        .update(tiles)
        .set({ n: i, x, y, cx, cy })
        .where(eq(tiles.id, allTiles[i].id));
    }

    // Update nextIndex to the count of active tiles
    await db
      .update(meta)
      .set({ value: allTiles.length })
      .where(eq(meta.key, "nextIndex"));

    return NextResponse.json({
      success: true,
      message: `Repacked ${allTiles.length} tiles`,
      totalTiles: allTiles.length,
    });
  } catch (err) {
    console.error("Repack error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

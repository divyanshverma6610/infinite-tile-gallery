import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tileId: string }> }
) {
  try {
    const { tileId } = await params;
    const body = await request.json();
    const { deviceId } = body;

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json(
        { error: "deviceId is required" },
        { status: 400 }
      );
    }

    const tileIdNum = parseInt(tileId, 10);
    if (isNaN(tileIdNum)) {
      return NextResponse.json(
        { error: "Invalid tile ID" },
        { status: 400 }
      );
    }

    const tileResults = await db
      .select()
      .from(tiles)
      .where(eq(tiles.id, tileIdNum))
      .limit(1);

    if (tileResults.length === 0) {
      return NextResponse.json(
        { error: "Tile not found" },
        { status: 404 }
      );
    }

    const tile = tileResults[0];
    if (tile.deviceId !== deviceId) {
      return NextResponse.json(
        { error: "Not authorized to delete this tile" },
        { status: 403 }
      );
    }

    // Soft delete by setting status to hidden
    await db
      .update(tiles)
      .set({ status: "hidden" })
      .where(eq(tiles.id, tileIdNum));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

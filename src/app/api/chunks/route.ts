import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tiles } from "@/db/schema";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cxParam = searchParams.get("cx");
    const cyParam = searchParams.get("cy");
    const radiusParam = searchParams.get("radius");

    if (cxParam === null || cyParam === null) {
      return NextResponse.json(
        { error: "cx and cy are required" },
        { status: 400 }
      );
    }

    const cx = parseInt(cxParam, 10);
    const cy = parseInt(cyParam, 10);
    const radius = Math.min(parseInt(radiusParam || "0", 10), 3);

    if (isNaN(cx) || isNaN(cy)) {
      return NextResponse.json(
        { error: "Invalid cx or cy" },
        { status: 400 }
      );
    }

    const result = await db
      .select({
        id: tiles.id,
        n: tiles.n,
        x: tiles.x,
        y: tiles.y,
        cx: tiles.cx,
        cy: tiles.cy,
        name: tiles.name,
        deviceId: tiles.deviceId,
        createdAt: tiles.createdAt,
        imageData: tiles.imageData,
      })
      .from(tiles)
      .where(
        and(
          gte(tiles.cx, cx - radius),
          lte(tiles.cx, cx + radius),
          gte(tiles.cy, cy - radius),
          lte(tiles.cy, cy + radius),
          eq(tiles.status, "active")
        )
      );

    return NextResponse.json({ tiles: result });
  } catch (err) {
    console.error("Chunks error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

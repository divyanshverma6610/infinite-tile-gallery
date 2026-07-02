import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tiles } from "@/db/schema";
import { requireAdmin } from "@/lib/adminAuth";
import { desc, like, eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const isAdmin = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: tiles.id,
        n: tiles.n,
        x: tiles.x,
        y: tiles.y,
        name: tiles.name,
        deviceId: tiles.deviceId,
        createdAt: tiles.createdAt,
        status: tiles.status,
        imageData: tiles.imageData,
      })
      .from(tiles)
      .orderBy(desc(tiles.createdAt))
      .limit(limit)
      .offset(offset);

    let results;
    if (search) {
      results = await db
        .select({
          id: tiles.id,
          n: tiles.n,
          x: tiles.x,
          y: tiles.y,
          name: tiles.name,
          deviceId: tiles.deviceId,
          createdAt: tiles.createdAt,
          status: tiles.status,
          imageData: tiles.imageData,
        })
        .from(tiles)
        .where(
          or(
            like(tiles.name, `%${search}%`),
            like(tiles.deviceId, `%${search}%`)
          )
        )
        .orderBy(desc(tiles.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      results = await query;
    }

    return NextResponse.json({ tiles: results });
  } catch (err) {
    console.error("Admin tiles error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

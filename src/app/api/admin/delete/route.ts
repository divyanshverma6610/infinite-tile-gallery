import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tiles } from "@/db/schema";
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
    const { tileId } = body;

    if (!tileId) {
      return NextResponse.json(
        { error: "tileId is required" },
        { status: 400 }
      );
    }

    await db.delete(tiles).where(eq(tiles.id, tileId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

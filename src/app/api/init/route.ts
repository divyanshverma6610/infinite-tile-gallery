import { NextResponse } from "next/server";
import { db } from "@/db";
import { meta } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureDefaultAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Ensure meta nextIndex exists
    const existing = await db
      .select()
      .from(meta)
      .where(eq(meta.key, "nextIndex"))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(meta).values({ key: "nextIndex", value: 0 });
    }

    await ensureDefaultAdmin();

    return NextResponse.json({ success: true, message: "Database initialized" });
  } catch (err) {
    console.error("Init error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

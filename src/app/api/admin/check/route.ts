import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const isAdmin = await requireAdmin(request);
  return NextResponse.json({ authenticated: isAdmin });
}

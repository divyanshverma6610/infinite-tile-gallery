import { NextResponse } from "next/server";
import { pool } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meta (
        key VARCHAR(32) PRIMARY KEY,
        value INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS tiles (
        id SERIAL PRIMARY KEY,
        n INTEGER NOT NULL UNIQUE,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        cx INTEGER NOT NULL,
        cy INTEGER NOT NULL,
        name VARCHAR(20) NOT NULL,
        device_id VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'active',
        image_data TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS device_limits (
        device_id VARCHAR(64) PRIMARY KEY,
        last_submit_at TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bans (
        device_id VARCHAR(64) PRIMARY KEY,
        banned BOOLEAN NOT NULL DEFAULT true,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_sessions (
        token VARCHAR(64) PRIMARY KEY,
        admin_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tiles_chunk ON tiles (cx, cy, status);
      CREATE INDEX IF NOT EXISTS idx_tiles_device ON tiles (device_id);
      CREATE INDEX IF NOT EXISTS idx_tiles_created ON tiles (created_at DESC);

      INSERT INTO meta (key, value) VALUES ('nextIndex', 0) ON CONFLICT DO NOTHING;
    `);

    const existing = await pool.query("SELECT id FROM admins LIMIT 1");
    if (existing.rows.length === 0) {
      const crypto = await import("crypto");
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync("divyanshverma6610", salt, 64).toString("hex");
      const passwordHash = salt + ":" + hash;
      await pool.query(
        "INSERT INTO admins (email, password_hash) VALUES ($1, $2)",
        ["admin@tiles.app", passwordHash]
      );
    }

    return NextResponse.json({ success: true, message: "Database initialized" });
  } catch (err) {
    console.error("Init error:", err);
    return NextResponse.json(
      { error: "Init failed", detail: String(err) },
      { status: 500 }
    );
  }
}

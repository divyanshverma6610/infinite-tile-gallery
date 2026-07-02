"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Ensure deviceId exists
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem("deviceId", deviceId);
    }

    // Check if name already saved
    const stored = localStorage.getItem("userName");
    if (stored) {
      setSavedName(stored);
    }
    setLoading(false);

    // Init DB on first load (fire and forget)
    fetch("/api/init").catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim().slice(0, 20);
    if (trimmed.length === 0) return;
    localStorage.setItem("userName", trimmed);
    setSavedName(trimmed);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#888]">Loading…</div>
      </div>
    );
  }

  if (!savedName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center mb-1 tracking-tight">
            Infinite Tile Gallery
          </h1>
          <p className="text-sm text-[#888] text-center mb-8">
            Draw a tile. Join the grid.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#888] mb-1 uppercase tracking-wider">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="Enter your name"
                className="w-full border border-[#e0e0e0] px-3 py-2.5 text-sm focus:outline-none focus:border-[#111] transition-colors bg-white"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={name.trim().length === 0}
              className="w-full bg-[#111] text-white py-2.5 text-sm font-medium disabled:opacity-30 hover:bg-black transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-1 tracking-tight">
          Infinite Tile Gallery
        </h1>
        <p className="text-sm text-[#888] mb-8">
          Welcome back, <span className="text-[#111] font-medium">{savedName}</span>
        </p>
        <div className="space-y-3">
          <button
            onClick={() => router.push("/gallery")}
            className="w-full border border-[#111] bg-white text-[#111] py-3 text-sm font-medium hover:bg-[#f5f5f5] transition-colors"
          >
            Browse Gallery
          </button>
          <button
            onClick={() => router.push("/draw")}
            className="w-full bg-[#111] text-white py-3 text-sm font-medium hover:bg-black transition-colors"
          >
            Draw a Tile
          </button>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("userName");
            setSavedName(null);
            setName("");
          }}
          className="mt-6 text-xs text-[#888] hover:text-[#111] transition-colors"
        >
          Change name
        </button>
      </div>
    </div>
  );
}

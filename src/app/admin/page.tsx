"use client";

import { useState, useEffect, useCallback } from "react";

interface AdminTile {
  id: number;
  n: number;
  x: number;
  y: number;
  name: string;
  deviceId: string;
  createdAt: string;
  status: string;
  imageData: string;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [tiles, setTiles] = useState<AdminTile[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tilesLoading, setTilesLoading] = useState(false);

  const [banDeviceId, setBanDeviceId] = useState("");
  const [banReason, setBanReason] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/check");
      const data = await res.json();
      setAuthenticated(data.authenticated);
      if (data.authenticated) {
        loadTiles();
      }
    } catch {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthenticated(true);
        loadTiles();
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch {
      setLoginError("Network error");
    } finally {
      setLoginLoading(false);
    }
  };

  const loadTiles = useCallback(
    async (p?: number, s?: string) => {
      setTilesLoading(true);
      try {
        const currentPage = p ?? page;
        const currentSearch = s ?? search;
        const params = new URLSearchParams({
          page: String(currentPage),
          ...(currentSearch ? { search: currentSearch } : {}),
        });
        const res = await fetch(`/api/admin/tiles?${params}`);
        const data = await res.json();
        if (data.tiles) {
          setTiles(data.tiles);
        }
      } catch {
        // Handle error
      } finally {
        setTilesLoading(false);
      }
    },
    [page, search]
  );

  const handleAction = async (
    endpoint: string,
    body: Record<string, unknown>
  ) => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg("Action completed");
        loadTiles();
      } else {
        setActionMsg(data.error || "Action failed");
      }
    } catch {
      setActionMsg("Network error");
    }
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handleBan = async () => {
    if (!banDeviceId.trim()) return;
    await handleAction("/api/admin/ban", {
      deviceId: banDeviceId.trim(),
      reason: banReason.trim() || undefined,
    });
    setBanDeviceId("");
    setBanReason("");
  };

  const handleUnban = async (deviceId: string) => {
    await handleAction("/api/admin/unban", { deviceId });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTiles(1, search);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#888]">Loading…</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-bold text-center mb-6">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full border border-[#e0e0e0] px-3 py-2.5 text-sm focus:outline-none focus:border-[#111] bg-white"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border border-[#e0e0e0] px-3 py-2.5 text-sm focus:outline-none focus:border-[#111] bg-white"
            />
            {loginError && (
              <div className="text-xs text-[#111] bg-[#f5f5f5] p-2 border border-[#e0e0e0]">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#111] text-white py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loginLoading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <p className="text-xs text-[#888] text-center mt-4">
            Default: admin@tiles.app / admin123
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-[#e0e0e0] px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Admin Panel</h1>
        <a href="/" className="text-xs text-[#888] hover:text-[#111]">
          ← Back to site
        </a>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Status message */}
        {actionMsg && (
          <div className="text-xs bg-[#f5f5f5] border border-[#e0e0e0] p-2">
            {actionMsg}
          </div>
        )}

        {/* Ban section */}
        <div className="border border-[#e0e0e0] p-4">
          <h2 className="text-sm font-bold mb-3">Ban / Unban Device</h2>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={banDeviceId}
              onChange={(e) => setBanDeviceId(e.target.value)}
              placeholder="Device ID"
              className="flex-1 min-w-[200px] border border-[#e0e0e0] px-3 py-2 text-xs focus:outline-none focus:border-[#111]"
            />
            <input
              type="text"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Reason (optional)"
              className="flex-1 min-w-[150px] border border-[#e0e0e0] px-3 py-2 text-xs focus:outline-none focus:border-[#111]"
            />
            <button
              onClick={handleBan}
              className="bg-[#111] text-white px-4 py-2 text-xs font-medium hover:bg-black"
            >
              Ban
            </button>
            <button
              onClick={() => banDeviceId.trim() && handleUnban(banDeviceId.trim())}
              className="border border-[#e0e0e0] px-4 py-2 text-xs font-medium hover:border-[#111]"
            >
              Unban
            </button>
          </div>
        </div>

        {/* Search */}
        <div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or device ID…"
              className="flex-1 border border-[#e0e0e0] px-3 py-2 text-xs focus:outline-none focus:border-[#111]"
            />
            <button
              type="submit"
              className="border border-[#e0e0e0] px-4 py-2 text-xs font-medium hover:border-[#111]"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                  loadTiles(1, "");
                }}
                className="text-xs text-[#888] hover:text-[#111] px-2"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Tiles list */}
        <div className="border border-[#e0e0e0]">
          <div className="border-b border-[#e0e0e0] px-4 py-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">Tiles</h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const p = Math.max(1, page - 1);
                  setPage(p);
                  loadTiles(p);
                }}
                disabled={page <= 1}
                className="text-xs border border-[#e0e0e0] px-2 py-1 disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="text-xs text-[#888] py-1">Page {page}</span>
              <button
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  loadTiles(p);
                }}
                disabled={tiles.length < 20}
                className="text-xs border border-[#e0e0e0] px-2 py-1 disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>

          {tilesLoading ? (
            <div className="p-4 text-center text-xs text-[#888]">
              Loading…
            </div>
          ) : tiles.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#888]">
              No tiles found
            </div>
          ) : (
            <div className="divide-y divide-[#e0e0e0]">
              {tiles.map((tile) => (
                <div
                  key={tile.id}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 border border-[#e0e0e0] shrink-0">
                    {tile.imageData && (
                      <img
                        src={`data:image/png;base64,${tile.imageData}`}
                        alt=""
                        className="w-full h-full"
                        style={{ imageRendering: "pixelated" }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">
                      {tile.name}
                      <span
                        className={`ml-2 text-[10px] px-1.5 py-0.5 border ${
                          tile.status === "active"
                            ? "text-[#111] border-[#e0e0e0]"
                            : "text-[#888] border-[#e0e0e0] bg-[#f5f5f5]"
                        }`}
                      >
                        {tile.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#888] mt-0.5 truncate">
                      ({tile.x},{tile.y}) · #{tile.n} ·{" "}
                      {new Date(tile.createdAt).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-[#888] truncate">
                      Device: {tile.deviceId}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {tile.status === "active" ? (
                      <button
                        onClick={() =>
                          handleAction("/api/admin/hide", { tileId: tile.id })
                        }
                        className="text-[10px] border border-[#e0e0e0] px-2 py-1 hover:border-[#111]"
                      >
                        Hide
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleAction("/api/admin/unhide", { tileId: tile.id })
                        }
                        className="text-[10px] border border-[#e0e0e0] px-2 py-1 hover:border-[#111]"
                      >
                        Unhide
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("Permanently delete this tile?")) {
                          handleAction("/api/admin/delete", { tileId: tile.id });
                        }
                      }}
                      className="text-[10px] border border-[#111] bg-[#111] text-white px-2 py-1 hover:bg-black"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => {
                        setBanDeviceId(tile.deviceId);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="text-[10px] border border-[#e0e0e0] px-2 py-1 hover:border-[#111]"
                    >
                      Ban
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

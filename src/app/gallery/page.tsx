"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface TileData {
  id: number;
  n: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
  name: string;
  deviceId: string;
  createdAt: string;
  imageData: string;
}

const TILE_RENDER_SIZE = 32; // pixels per tile at zoom=1
const CHUNK_SIZE = 32; // tiles per chunk dimension

function GalleryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Camera state
  const cameraRef = useRef({ x: 0, y: 0, zoom: 4 }); // zoom=4 means each tile is 4*32=128px
  const tilesRef = useRef<Map<string, TileData>>(new Map());
  const loadedChunksRef = useRef<Set<string>>(new Set());
  const loadingChunksRef = useRef<Set<string>>(new Set());
  const tileImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const rafRef = useRef<number>(0);

  // Interaction state
  const interactionRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startCamX: number;
    startCamY: number;
    pinching: boolean;
    pinchStartDist: number;
    pinchStartZoom: number;
    pinchCenterX: number;
    pinchCenterY: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startCamX: 0,
    startCamY: 0,
    pinching: false,
    pinchStartDist: 0,
    pinchStartZoom: 4,
    pinchCenterX: 0,
    pinchCenterY: 0,
  });

  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deviceIdRef = useRef<string>("");

  useEffect(() => {
    deviceIdRef.current = localStorage.getItem("deviceId") || "";
    const name = localStorage.getItem("userName");
    if (!name) {
      router.push("/");
      return;
    }

    // Check for focus param
    const focus = searchParams.get("focus");
    if (focus) {
      const [fx, fy] = focus.split(",").map(Number);
      if (!isNaN(fx) && !isNaN(fy)) {
        cameraRef.current.x = -fx * TILE_RENDER_SIZE;
        cameraRef.current.y = -fy * TILE_RENDER_SIZE;
      }
    }

    render();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChunk = useCallback(async (cx: number, cy: number) => {
    const key = `${cx},${cy}`;
    if (loadedChunksRef.current.has(key) || loadingChunksRef.current.has(key))
      return;
    loadingChunksRef.current.add(key);

    try {
      const res = await fetch(
        `/api/chunks?cx=${cx}&cy=${cy}&radius=0`
      );
      const data = await res.json();
      if (data.tiles) {
        for (const tile of data.tiles) {
          const tileKey = `${tile.x},${tile.y}`;
          tilesRef.current.set(tileKey, tile);

          // Preload image
          if (tile.imageData && !tileImagesRef.current.has(tileKey)) {
            const img = new Image();
            img.src = `data:image/png;base64,${tile.imageData}`;
            img.onload = () => {
              tileImagesRef.current.set(tileKey, img);
              render();
            };
          }
        }
      }
      loadedChunksRef.current.add(key);
    } catch {
      // Retry later
    } finally {
      loadingChunksRef.current.delete(key);
    }
  }, []);

  const render = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      const cam = cameraRef.current;
      const tileSize = TILE_RENDER_SIZE * cam.zoom;

      // Clear
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      // Calculate visible range (in tile coords)
      const centerX = w / 2 + cam.x * cam.zoom;
      const centerY = h / 2 + cam.y * cam.zoom;

      const minTileX = Math.floor((0 - centerX) / tileSize) - 1;
      const maxTileX = Math.ceil((w - centerX) / tileSize) + 1;
      const minTileY = Math.floor((0 - centerY) / tileSize) - 1;
      const maxTileY = Math.ceil((h - centerY) / tileSize) + 1;

      // Determine needed chunks
      const minChunkX = Math.floor(minTileX / CHUNK_SIZE);
      const maxChunkX = Math.floor(maxTileX / CHUNK_SIZE);
      const minChunkY = Math.floor(minTileY / CHUNK_SIZE);
      const maxChunkY = Math.floor(maxTileY / CHUNK_SIZE);

      for (let ccx = minChunkX; ccx <= maxChunkX; ccx++) {
        for (let ccy = minChunkY; ccy <= maxChunkY; ccy++) {
          loadChunk(ccx, ccy);
        }
      }

      // Draw grid lines
      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 1;

      // Vertical lines
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const screenX = centerX + tx * tileSize;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, h);
        ctx.stroke();
      }

      // Horizontal lines
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const screenY = centerY + ty * tileSize;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(w, screenY);
        ctx.stroke();
      }

      // Draw tiles
      ctx.imageSmoothingEnabled = false;
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        for (let ty = minTileY; ty <= maxTileY; ty++) {
          const key = `${tx},${ty}`;
          const img = tileImagesRef.current.get(key);
          if (img && img.complete) {
            const screenX = centerX + tx * tileSize;
            const screenY = centerY + ty * tileSize;
            ctx.drawImage(img, screenX, screenY, tileSize, tileSize);
          }
        }
      }

      // Draw origin marker (subtle)
      if (cam.zoom > 1) {
        const originX = centerX;
        const originY = centerY;
        ctx.strokeStyle = "#ccc";
        ctx.lineWidth = 1;
        ctx.strokeRect(originX, originY, tileSize, tileSize);
      }
    });
  }, [loadChunk]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => render();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [render]);

  // Periodic render to catch loaded images
  useEffect(() => {
    const interval = setInterval(render, 500);
    return () => clearInterval(interval);
  }, [render]);

  // Mouse/touch handlers
  const handlePointerDown = useCallback(
    (e: React.MouseEvent) => {
      const inter = interactionRef.current;
      inter.dragging = true;
      inter.startX = e.clientX;
      inter.startY = e.clientY;
      inter.startCamX = cameraRef.current.x;
      inter.startCamY = cameraRef.current.y;
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent) => {
      const inter = interactionRef.current;
      if (!inter.dragging) return;
      const dx = e.clientX - inter.startX;
      const dy = e.clientY - inter.startY;
      cameraRef.current.x = inter.startCamX + dx / cameraRef.current.zoom;
      cameraRef.current.y = inter.startCamY + dy / cameraRef.current.zoom;
      render();
    },
    [render]
  );

  const handlePointerUp = useCallback(
    (e: React.MouseEvent) => {
      const inter = interactionRef.current;
      const dx = Math.abs(e.clientX - inter.startX);
      const dy = Math.abs(e.clientY - inter.startY);
      inter.dragging = false;

      // Detect tap (small movement)
      if (dx < 5 && dy < 5) {
        handleTap(e.clientX, e.clientY);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const inter = interactionRef.current;

      if (e.touches.length === 2) {
        inter.pinching = true;
        inter.dragging = false;
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        inter.pinchStartDist = Math.sqrt(dx * dx + dy * dy);
        inter.pinchStartZoom = cameraRef.current.zoom;
        inter.pinchCenterX =
          (e.touches[0].clientX + e.touches[1].clientX) / 2;
        inter.pinchCenterY =
          (e.touches[0].clientY + e.touches[1].clientY) / 2;
        return;
      }

      inter.dragging = true;
      inter.pinching = false;
      inter.startX = e.touches[0].clientX;
      inter.startY = e.touches[0].clientY;
      inter.startCamX = cameraRef.current.x;
      inter.startCamY = cameraRef.current.y;
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const inter = interactionRef.current;

      if (inter.pinching && e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = dist / inter.pinchStartDist;
        cameraRef.current.zoom = Math.max(
          0.5,
          Math.min(16, inter.pinchStartZoom * scale)
        );
        render();
        return;
      }

      if (!inter.dragging || e.touches.length !== 1) return;
      const ddx = e.touches[0].clientX - inter.startX;
      const ddy = e.touches[0].clientY - inter.startY;
      cameraRef.current.x = inter.startCamX + ddx / cameraRef.current.zoom;
      cameraRef.current.y = inter.startCamY + ddy / cameraRef.current.zoom;
      render();
    },
    [render]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const inter = interactionRef.current;

      if (e.touches.length === 0 && !inter.pinching) {
        const ct = e.changedTouches[0];
        const dx = Math.abs(ct.clientX - inter.startX);
        const dy = Math.abs(ct.clientY - inter.startY);
        if (dx < 10 && dy < 10) {
          handleTap(ct.clientX, ct.clientY);
        }
      }

      if (e.touches.length < 2) {
        inter.pinching = false;
      }
      if (e.touches.length === 0) {
        inter.dragging = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      cameraRef.current.zoom = Math.max(
        0.5,
        Math.min(16, cameraRef.current.zoom * delta)
      );
      render();
    },
    [render]
  );

  const handleTap = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    const tileSize = TILE_RENDER_SIZE * cam.zoom;
    const centerX = rect.width / 2 + cam.x * cam.zoom;
    const centerY = rect.height / 2 + cam.y * cam.zoom;

    const tileX = Math.floor((clientX - rect.left - centerX) / tileSize);
    const tileY = Math.floor((clientY - rect.top - centerY) / tileSize);

    const key = `${tileX},${tileY}`;
    const tile = tilesRef.current.get(key);
    if (tile) {
      setSelectedTile(tile);
    } else {
      setSelectedTile(null);
    }
  }, []);

  const handleDelete = async () => {
    if (!selectedTile || deleting) return;
    if (!confirm("Delete this tile?")) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/tiles/${selectedTile.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: deviceIdRef.current }),
      });
      const data = await res.json();
      if (res.ok) {
        // Remove from local cache
        const key = `${selectedTile.x},${selectedTile.y}`;
        tilesRef.current.delete(key);
        tileImagesRef.current.delete(key);
        setSelectedTile(null);
        render();
      } else {
        alert(data.error || "Failed to delete");
      }
    } catch {
      alert("Network error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden relative no-overscroll">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-white/90 border-b border-[#e0e0e0]">
        <button
          onClick={() => router.push("/")}
          className="text-xs border border-[#e0e0e0] px-3 py-1.5 hover:border-[#111] transition-colors bg-white"
        >
          ← Home
        </button>
        <span className="text-xs text-[#888] font-medium">
          Infinite Tile Gallery
        </span>
        <button
          onClick={() => router.push("/draw")}
          className="text-xs bg-[#111] text-white px-3 py-1.5 hover:bg-black transition-colors"
        >
          + Draw
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-draw cursor-grab active:cursor-grabbing"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={() => {
          interactionRef.current.dragging = false;
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
        <button
          onClick={() => {
            cameraRef.current.zoom = Math.min(16, cameraRef.current.zoom * 1.3);
            render();
          }}
          className="w-9 h-9 bg-white border border-[#e0e0e0] flex items-center justify-center text-lg hover:border-[#111] transition-colors"
        >
          +
        </button>
        <button
          onClick={() => {
            cameraRef.current.zoom = Math.max(
              0.5,
              cameraRef.current.zoom * 0.7
            );
            render();
          }}
          className="w-9 h-9 bg-white border border-[#e0e0e0] flex items-center justify-center text-lg hover:border-[#111] transition-colors"
        >
          −
        </button>
        <button
          onClick={() => {
            cameraRef.current = { x: 0, y: 0, zoom: 4 };
            render();
          }}
          className="w-9 h-9 bg-white border border-[#e0e0e0] flex items-center justify-center text-xs hover:border-[#111] transition-colors"
          title="Reset view"
        >
          ⌂
        </button>
      </div>

      {/* Selected tile popover */}
      {selectedTile && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-[#e0e0e0] p-4 animate-slide-up">
          <div className="max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 border border-[#e0e0e0] shrink-0">
                {selectedTile.imageData && (
                  <img
                    src={`data:image/png;base64,${selectedTile.imageData}`}
                    alt="Tile"
                    className="w-full h-full"
                    style={{ imageRendering: "pixelated" }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{selectedTile.name}</div>
                <div className="text-xs text-[#888] mt-0.5">
                  Position: ({selectedTile.x}, {selectedTile.y})
                </div>
                <div className="text-xs text-[#888]">
                  {new Date(selectedTile.createdAt).toLocaleDateString()} at{" "}
                  {new Date(selectedTile.createdAt).toLocaleTimeString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedTile(null)}
                className="text-[#888] hover:text-[#111] text-lg shrink-0"
              >
                ✕
              </button>
            </div>
            {selectedTile.deviceId === deviceIdRef.current && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="mt-3 w-full border border-[#111] text-[#111] py-2 text-xs font-medium hover:bg-[#111] hover:text-white transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete My Tile"}
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center text-[#888]">
          Loading gallery…
        </div>
      }
    >
      <GalleryContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const GRID_SIZE = 32;

const PALETTE = [
  "#000000",
  "#333333",
  "#555555",
  "#777777",
  "#999999",
  "#bbbbbb",
  "#dddddd",
  "#ffffff",
  "#cc0000",
  "#ee6600",
  "#ddaa00",
  "#228822",
  "#2266cc",
  "#6633aa",
  "#cc4488",
  "#886644",
];

type Tool = "pen" | "eraser" | "fill";

function createEmptyGrid(): string[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => "#ffffff")
  );
}

function floodFill(
  grid: string[][],
  startX: number,
  startY: number,
  newColor: string
): string[][] {
  const newGrid = grid.map((row) => [...row]);
  const targetColor = newGrid[startY][startX];
  if (targetColor === newColor) return newGrid;

  const stack: [number, number][] = [[startX, startY]];
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
    if (newGrid[y][x] !== targetColor) continue;
    newGrid[y][x] = newColor;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return newGrid;
}

export default function DrawPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [grid, setGrid] = useState<string[][]>(createEmptyGrid);
  const [history, setHistory] = useState<string[][][]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [canSubmit, setCanSubmit] = useState(true);
  const [limitMsg, setLimitMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cellSize, setCellSize] = useState(10);
  const isDrawingRef = useRef(false);
  const lastCellRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (!name) {
      router.push("/");
      return;
    }

    const deviceId = localStorage.getItem("deviceId");
    if (deviceId) {
      fetch(`/api/check-limit?deviceId=${encodeURIComponent(deviceId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.canSubmit) {
            setCanSubmit(false);
            if (data.reason === "banned") {
              setLimitMsg("This device has been banned.");
            } else {
              setLimitMsg(
                `Daily limit reached. Try again in ~${data.remainingHours} hour(s).`
              );
            }
          }
        })
        .catch(() => {});
    }
  }, [router]);

  // Calculate cell size based on viewport
  useEffect(() => {
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth - 32, 480);
      const size = Math.floor(maxWidth / GRID_SIZE);
      setCellSize(Math.max(size, 8));
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const totalSize = cellSize * GRID_SIZE;
    canvas.width = totalSize;
    canvas.height = totalSize;

    // Draw pixels
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        ctx.fillStyle = grid[y][x];
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Draw grid lines
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, totalSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(totalSize, i * cellSize);
      ctx.stroke();
    }
  }, [grid, cellSize]);

  const getCellFromEvent = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = Math.floor((clientX - rect.left) / cellSize);
      const y = Math.floor((clientY - rect.top) / cellSize);

      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
      return { x, y };
    },
    [cellSize]
  );

  const applyTool = useCallback(
    (x: number, y: number) => {
      if (tool === "fill") {
        setGrid((prev) => {
          const fillColor = color;
          return floodFill(prev, x, y, fillColor);
        });
      } else {
        const drawColor = tool === "eraser" ? "#ffffff" : color;
        setGrid((prev) => {
          const newGrid = prev.map((row) => [...row]);
          newGrid[y][x] = drawColor;
          return newGrid;
        });
      }
    },
    [tool, color]
  );

  const handlePointerDown = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      const cell = getCellFromEvent(e);
      if (!cell) return;

      // Save history for undo
      setHistory((prev) => [...prev.slice(-20), grid.map((r) => [...r])]);
      isDrawingRef.current = true;
      lastCellRef.current = cell;
      applyTool(cell.x, cell.y);
    },
    [getCellFromEvent, applyTool, grid]
  );

  const handlePointerMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      if (tool === "fill") return; // fill only on tap
      const cell = getCellFromEvent(e);
      if (!cell) return;
      if (
        lastCellRef.current &&
        lastCellRef.current.x === cell.x &&
        lastCellRef.current.y === cell.y
      )
        return;
      lastCellRef.current = cell;
      applyTool(cell.x, cell.y);
    },
    [getCellFromEvent, applyTool, tool]
  );

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
    lastCellRef.current = null;
  }, []);

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGrid(prev);
  };

  const handleClear = () => {
    setHistory((prev) => [...prev.slice(-20), grid.map((r) => [...r])]);
    setGrid(createEmptyGrid());
  };

  const handleSubmit = async () => {
    if (submitting || !canSubmit) return;
    setSubmitting(true);

    const name = localStorage.getItem("userName") || "Anonymous";
    const deviceId = localStorage.getItem("deviceId") || "";

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, deviceId, pixels: grid }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to submit");
        setSubmitting(false);
        return;
      }

      // Navigate to gallery
      router.push(`/gallery?focus=${data.tile.x},${data.tile.y}`);
    } catch {
      alert("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const totalSize = cellSize * GRID_SIZE;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e0e0e0] px-3 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => router.push("/")}
          className="text-xs border border-[#e0e0e0] px-3 py-1.5 hover:border-[#111] transition-colors shrink-0"
        >
          ← Back
        </button>
        <div className="w-px h-6 bg-[#e0e0e0]" />
        <button
          onClick={() => setTool("pen")}
          className={`text-xs px-3 py-1.5 border transition-colors shrink-0 ${
            tool === "pen"
              ? "bg-[#111] text-white border-[#111]"
              : "border-[#e0e0e0] hover:border-[#111]"
          }`}
        >
          Pen
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`text-xs px-3 py-1.5 border transition-colors shrink-0 ${
            tool === "eraser"
              ? "bg-[#111] text-white border-[#111]"
              : "border-[#e0e0e0] hover:border-[#111]"
          }`}
        >
          Eraser
        </button>
        <button
          onClick={() => setTool("fill")}
          className={`text-xs px-3 py-1.5 border transition-colors shrink-0 ${
            tool === "fill"
              ? "bg-[#111] text-white border-[#111]"
              : "border-[#e0e0e0] hover:border-[#111]"
          }`}
        >
          Fill
        </button>
        <div className="w-px h-6 bg-[#e0e0e0]" />
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="text-xs border border-[#e0e0e0] px-3 py-1.5 hover:border-[#111] transition-colors disabled:opacity-30 shrink-0"
        >
          Undo
        </button>
        <button
          onClick={handleClear}
          className="text-xs border border-[#e0e0e0] px-3 py-1.5 hover:border-[#111] transition-colors shrink-0"
        >
          Clear
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={totalSize}
          height={totalSize}
          className="touch-draw border border-[#e0e0e0]"
          style={{ width: totalSize, height: totalSize, imageRendering: "pixelated" }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      {/* Palette */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-1 justify-center">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                if (tool === "eraser") setTool("pen");
              }}
              className={`w-8 h-8 border-2 transition-all ${
                color === c && tool !== "eraser"
                  ? "border-[#111] scale-110"
                  : "border-[#e0e0e0]"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Submit area */}
      <div className="sticky bottom-0 bg-white border-t border-[#e0e0e0] p-3">
        {!canSubmit ? (
          <div className="text-center text-xs text-[#888] py-2">{limitMsg}</div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#111] text-white py-3 text-sm font-medium disabled:opacity-50 hover:bg-black transition-colors"
          >
            {submitting ? "Submitting…" : "Submit Tile"}
          </button>
        )}
      </div>
    </div>
  );
}

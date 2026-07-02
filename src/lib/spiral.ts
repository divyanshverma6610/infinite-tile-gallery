/**
 * Maps a linear index n (starting at 0) to (x, y) coordinates
 * following a square spiral pattern:
 *
 * n=0 -> (0,0)
 * n=1 -> (1,0)
 * n=2 -> (1,1)
 * n=3 -> (0,1)
 * n=4 -> (-1,1)
 * n=5 -> (-1,0)
 * n=6 -> (-1,-1)
 * n=7 -> (0,-1)
 * n=8 -> (1,-1)
 * n=9 -> (2,-1)
 * ...
 *
 * The spiral goes: right, up, left, down (in screen coords where y increases upward)
 * But we use y increasing downward for grid display.
 *
 * Direction order: East, South, West, North
 * At layer k, side length = 2k
 */
export function spiralCoord(n: number): { x: number; y: number } {
  if (n === 0) return { x: 0, y: 0 };

  // Find which layer (ring) we're in
  // Layer k contains indices from (2k-1)^2 to (2k+1)^2 - 1
  // That's 8k elements per layer
  const k = Math.ceil((Math.sqrt(n + 1) - 1) / 2);
  // first index of layer k
  const layerStart = (2 * k - 1) * (2 * k - 1);
  const posInLayer = n - layerStart;
  const sideLen = 2 * k;

  // Side 0: East side, moving south (x=k, y goes from -(k-1) to k)
  // Side 1: South side, moving west (y=k, x goes from k-1 to -k)
  // Side 2: West side, moving north (x=-k, y goes from k-1 to -k)
  // Side 3: North side, moving east (y=-k, x goes from -(k-1) to k)
  const side = Math.floor(posInLayer / sideLen);
  const posOnSide = posInLayer % sideLen;

  switch (side) {
    case 0: // right column going down
      return { x: k, y: -(k - 1) + posOnSide };
    case 1: // bottom row going left
      return { x: k - 1 - posOnSide, y: k };
    case 2: // left column going up
      return { x: -k, y: k - 1 - posOnSide };
    case 3: // top row going right
      return { x: -(k - 1) + posOnSide, y: -k };
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Compute chunk coordinates from tile coordinates.
 * Chunk size is 32x32 tiles.
 */
export function chunkCoord(x: number, y: number): { cx: number; cy: number } {
  return {
    cx: Math.floor(x / 32),
    cy: Math.floor(y / 32),
  };
}

// Quick verification of first 25 spiral values
export function verifySpiralFirst25(): Array<{ n: number; x: number; y: number }> {
  const results = [];
  for (let i = 0; i < 25; i++) {
    const { x, y } = spiralCoord(i);
    results.push({ n: i, x, y });
  }
  return results;
}

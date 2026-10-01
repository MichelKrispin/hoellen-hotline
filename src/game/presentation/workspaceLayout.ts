// Coordinates in the 1920 × 1080 design space, shared by art and live controls.
export const AGENT_LAYOUT = {
  choice: (index: number) => ({ x: 541, y: 587 + index * 68, w: 825, h: 64 }),
  hint: (index: number) => ({ x: 1440, y: 300 + index * 112, w: 340, h: 96 }),
  privateHint: (index: number) => ({
    x: 548 + index * 264,
    y: 961,
    w: 254,
    h: 69,
  }),
} as const;

export const ARCHIVE_LAYOUT = {
  result: (index: number) => ({ x: 145, y: 345 + index * 101, w: 348, h: 93 }),
  stamp: (index: number) => ({ x: 585 + index * 218, y: 825, w: 192, h: 169 }),
  tab: (index: number) => ({ x: 1847, y: 265 + index * 67, w: 46, h: 53 }),
} as const;

export const DISPATCH_LAYOUT = {
  target: (index: number) => ({ x: 1563, y: 237 + index * 38, w: 261, h: 35 }),
  control: (index: number) => ({
    x: 155 + (index % 3) * 305,
    y: 320 + Math.floor(index / 3) * 287,
    w: 294,
    h: 276,
  }),
} as const;

// Coordinates in the 1920 × 1080 design space, shared by art and live controls.
export const AGENT_LAYOUT = {
  choice: (index: number) => ({ x: 541, y: 602 + index * 64, w: 790, h: 58 }),
  hint: (index: number) => ({ x: 1440, y: 304 + index * 112, w: 340, h: 96 }),
} as const;

export const ARCHIVE_LAYOUT = {
  result: (index: number) => ({ x: 116, y: 376 + index * 121, w: 350, h: 110 }),
  stamp: (index: number) => ({ x: 550 + index * 220, y: 839, w: 204, h: 152 }),
  tab: (index: number) => ({ x: 1265 + index * 128, y: 292, w: 124, h: 38 }),
} as const;

export const DISPATCH_LAYOUT = {
  target: (index: number) => ({ x: 1530, y: 237 + index * 38, w: 292, h: 35 }),
  control: (index: number) => ({
    x: 120 + (index % 3) * 310,
    y: 370 + Math.floor(index / 3) * 236,
    w: 296,
    h: 222,
  }),
} as const;

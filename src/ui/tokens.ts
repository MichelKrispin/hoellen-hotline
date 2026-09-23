export const DESIGN = {
  width: 1920,
  height: 1080,
  safeX: 96,
  safeY: 72,
} as const;

export const TOKENS = {
  color: {
    background: 0x1b111b,
    panel: 0x2c1b29,
    paper: 0xf1d7a3,
    text: "#f4e1bd",
    muted: "#b69b90",
    agent: 0xd34b49,
    archivist: 0x9d70c8,
    dispatcher: 0xe9a84c,
    cyan: 0x68d8dc,
  },
  spacing: { small: 12, medium: 24, large: 48 },
  typography: { title: 86, heading: 44, body: 29, small: 23 },
  motion: { quickMs: 120, normalMs: 250, slowMs: 500 },
  depth: { background: 0, scenery: 10, panel: 20, control: 30, overlay: 100 },
} as const;

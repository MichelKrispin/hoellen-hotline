export const PRNG_VERSION = 1 as const;
export const SEED_NORMALIZATION_VERSION = 1 as const;

// A displayed 32-digit hexadecimal seed is already normalized. Other manual
// inputs use UTF-8 and two independent FNV-1a 64-bit lanes (modulo 2^64).
const MASK = (1n << 64n) - 1n;
const PRIME = 0x100000001b3n;
const HEX_SEED = /^[0-9a-f]{32}$/i;

export function normalizeSeed(input: string): string {
  const value = input.normalize("NFC");
  if (HEX_SEED.test(value)) return value.toLowerCase();
  const bytes = new TextEncoder().encode(value);
  let a = 0xcbf29ce484222325n;
  let b = 0x84222325cbf29ce4n;
  for (const byte of bytes) {
    a = ((a ^ BigInt(byte)) * PRIME) & MASK;
    b = ((b ^ BigInt(byte)) * PRIME) & MASK;
  }
  return a.toString(16).padStart(16, "0") + b.toString(16).padStart(16, "0");
}

export function createRandomSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

// xorshift128+, with the pair of 64-bit words serialized as 32 hex digits.
// A zero pair is replaced by a fixed nonzero state.
export class Random {
  private a: bigint;
  private b: bigint;

  constructor(state: string) {
    if (!HEX_SEED.test(state))
      throw new Error("PRNG state must be 128-bit hex");
    this.a = BigInt(`0x${state.slice(0, 16)}`);
    this.b = BigInt(`0x${state.slice(16)}`);
    if (this.a === 0n && this.b === 0n) this.b = 1n;
  }

  get state(): string {
    return (
      this.a.toString(16).padStart(16, "0") +
      this.b.toString(16).padStart(16, "0")
    );
  }

  next64(): bigint {
    let x = this.a;
    const y = this.b;
    this.a = y;
    x ^= (x << 23n) & MASK;
    this.b = (x ^ y ^ (x >> 17n) ^ (y >> 26n)) & MASK;
    return (this.b + y) & MASK;
  }

  int(exclusiveMax: number): number {
    if (!Number.isSafeInteger(exclusiveMax) || exclusiveMax < 1)
      throw new Error("PRNG bound must be a positive safe integer");
    const bound = BigInt(exclusiveMax);
    const range = 1n << 64n;
    const limit = range - (range % bound);
    let value: bigint;
    do value = this.next64();
    while (value >= limit);
    return Number(value % bound);
  }
}

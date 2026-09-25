import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rate = 22050;
const output = resolve("src/audio/generated");
const tunes: Record<string, number[]> = {
  queue: [60, 64, 67, 72, 67, 64, 60, 55],
  carbon: [62, 65, 69, 74, 69, 65, 62, 57],
  audit: [60, 63, 66, 69, 66, 63, 60, 54],
  night: [57, 60, 64, 67, 64, 60, 57, 52],
};

function jingle(notes: number[]): Buffer {
  const beat = 0.34;
  const duration = notes.length * beat + 0.25;
  const samples = Math.ceil(duration * rate);
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const time = i / rate;
    const index = Math.floor(time / beat);
    const local = time - index * beat;
    const note = notes[index];
    const frequency = note === undefined ? 0 : 440 * 2 ** ((note - 69) / 12);
    const envelope = Math.max(0, Math.min(1, local * 24, (beat - local) * 9));
    const tone = frequency
      ? Math.sin(2 * Math.PI * frequency * time) * 0.6 +
        Math.sin(2 * Math.PI * frequency * 2 * time) * 0.16
      : 0;
    wav.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, tone * envelope * 0.26)) * 32767),
      44 + i * 2,
    );
  }
  return wav;
}

mkdirSync(output, { recursive: true });
for (const [name, notes] of Object.entries(tunes)) {
  writeFileSync(resolve(output, `${name}.wav`), jingle(notes));
  console.log(`${name}.wav: ${notes.length} notes`);
}

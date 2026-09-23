import { describe, expect, it } from "vitest";
import {
  createActionId,
  createClientId,
  createConnectionId,
  createNonce,
  createSessionId,
  sessionCode,
} from "./ids";

describe("session and transport identifiers", () => {
  it("uses separate 128-bit random identifiers and a six-digit display code", () => {
    const ids = [
      createSessionId(),
      createClientId(),
      createConnectionId(),
      createActionId(),
      createNonce(),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^[0-9a-f]{32}$/));
    expect(sessionCode(ids[0] as ReturnType<typeof createSessionId>)).toMatch(
      /^\d{6}$/,
    );
  });
});

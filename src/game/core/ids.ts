export type SessionId = string & { readonly __kind: "SessionId" };
export type ClientId = string & { readonly __kind: "ClientId" };
export type ConnectionId = string & { readonly __kind: "ConnectionId" };
export type ActionId = string & { readonly __kind: "ActionId" };
export type Nonce = string & { readonly __kind: "Nonce" };
export type PlayerId = string & { readonly __kind: "PlayerId" };
export type CaseId = string & { readonly __kind: "CaseId" };
export type RuleId = string & { readonly __kind: "RuleId" };
export type DestinationId = string & { readonly __kind: "DestinationId" };

function random128(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export const createSessionId = (): SessionId => random128() as SessionId;
export const createClientId = (): ClientId => random128() as ClientId;
export const createConnectionId = (): ConnectionId =>
  random128() as ConnectionId;
export const createActionId = (): ActionId => random128() as ActionId;
export const createNonce = (): Nonce => random128() as Nonce;

// Human comparison only. It conveys no authentication or entropy guarantee.
export function sessionCode(id: SessionId): string {
  return String(BigInt(`0x${id}`) % 1_000_000n).padStart(6, "0");
}

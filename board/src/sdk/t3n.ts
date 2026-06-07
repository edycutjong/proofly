import {
  T3nClient,
  loadWasmComponent,
  metamask_sign,
  eth_get_address,
  createEthAuthInput,
} from '@terminal3/t3n-sdk';

export interface ClaimReq {
  claim: string;
  op?: string;
  value?: unknown;
}

export interface Policy {
  id: string;
  require: ClaimReq[];
}

export interface Presentation {
  vp: string;
  disclosed: Record<string, unknown>;
  ts: number;
}

export interface AuditEntry {
  verifier: string;
  userDid: string;
  policyId: string;
  disclosed: string[];
  ts: number;
}

let _client: T3nClient | null = null;

export async function getT3nClient(): Promise<T3nClient> {
  if (_client) return _client;

  const wasmComponent = await loadWasmComponent();

  // T3N auth is a signed handshake challenge via the EthSign handler — not a
  // bearer token. The agent key is server-side only (never NEXT_PUBLIC_*).
  const agentKey = process.env.AGENT_KEY;
  const agentAddress = agentKey ? eth_get_address(agentKey) : undefined;

  _client = new T3nClient({
    baseUrl: process.env.T3N_BASE_URL || "https://api.terminal3.io",
    wasmComponent,
    handlers: agentAddress
      ? { EthSign: metamask_sign(agentAddress, undefined, agentKey) }
      : {},
  });

  // Open the encrypted channel and authenticate before any contract call.
  // Only when a key is configured — without one we return an unauthenticated
  // client for demo/test transports (the seed/verify routes mock the SDK).
  if (agentAddress) {
    await _client.handshake();
    await _client.authenticate(createEthAuthInput(agentAddress));
  }

  return _client;
}

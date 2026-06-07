import { T3nClient, loadWasmComponent } from '@terminal3/t3n-sdk';

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

  _client = new T3nClient({
    baseUrl: "https://api.terminal3.io",
    wasmComponent,
    headers: {
      "Authorization": `Bearer ${process.env.NEXT_PUBLIC_T3N_BEARER_TOKEN || "0xREDACTED_TESTNET_KEY"}`
    }
  });

  return _client;
}

export type ClaimReq = {
  claim: string;
  op?: ">=" | "in" | "==" | "not" | "!=";
  value?: unknown;
};

export type Policy = {
  id: string;
  require: ClaimReq[];
};

export type Presentation = {
  vp: string;
  disclosed: Record<string, unknown>;
  ts: number;
};

export type AuditEntry = {
  verifier: string;
  userDid: string;
  policyId: string;
  disclosed: string[];
  ts: number;
};

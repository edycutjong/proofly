export type ClaimReq = {
  claim: string;
  op?: ">=" | "in" | "==" | "not" | "!=";
  value?: any;
};

export type Policy = {
  id: string;
  require: ClaimReq[];
};

export type Presentation = {
  vp: string;
  disclosed: Record<string, any>;
  ts: number;
};

export type AuditEntry = {
  verifier: string;
  userDid: string;
  policyId: string;
  disclosed: string[];
  ts: number;
};

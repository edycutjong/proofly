import { describe, it, expect } from "vitest";
import { verifyProoflyPresentation } from "./proofly-verify";
import { Policy } from "./t3n";

describe("verifyProoflyPresentation", () => {
  const dummyPolicy = { id: "test", require: [] } as unknown as Policy;

  it("fails if presentation is empty or null", () => {
    const res = verifyProoflyPresentation("", dummyPolicy);
    expect(res.verified).toBe(false);
    expect(res.error).toContain("Invalid presentation format");
  });

  it("fails if SD-JWT is missing from envelope", () => {
    const envelope = Buffer.from(JSON.stringify({ 
      presentation_definition_id: "test", 
      ts: 123 
    })).toString("base64");
    const res = verifyProoflyPresentation(`vp.proofly.${envelope}`, dummyPolicy);
    expect(res.verified).toBe(false);
    expect(res.error).toContain("missing sdJwt");
  });

  it("fails if SD-JWT is malformed (insufficient parts)", () => {
    const envelope = Buffer.from(JSON.stringify({ 
      sdJwt: "header_only_no_dots", 
      presentation_definition_id: "test", 
      ts: 123 
    })).toString("base64");
    const res = verifyProoflyPresentation(`vp.proofly.${envelope}`, dummyPolicy);
    expect(res.verified).toBe(false);
    expect(res.error).toContain("insufficient parts");
  });

  it("fails if policy check result is false", () => {
    const claimsStr = JSON.stringify({ result: false, reason: "underage" });
    const claimsBase64 = Buffer.from(claimsStr).toString("base64");
    
    const envelope = Buffer.from(JSON.stringify({ 
      sdJwt: `header.${claimsBase64}.signature`, 
      presentation_definition_id: "test", 
      ts: 123 
    })).toString("base64");
    
    const res = verifyProoflyPresentation(`vp.proofly.${envelope}`, dummyPolicy);
    expect(res.verified).toBe(false);
    expect(res.error).toContain("Policy check failed: underage");
  });

  it("returns unspecified error if reason missing", () => {
    const claimsStr = JSON.stringify({ result: false });
    const claimsBase64 = Buffer.from(claimsStr).toString("base64");
    
    const envelope = Buffer.from(JSON.stringify({ 
      sdJwt: `header.${claimsBase64}.signature`, 
      presentation_definition_id: "test", 
      ts: 123 
    })).toString("base64");
    
    const res = verifyProoflyPresentation(`vp.proofly.${envelope}`, dummyPolicy);
    expect(res.verified).toBe(false);
    expect(res.error).toContain("unspecified criteria mismatch");
  });

  it("succeeds if everything is valid (standard JWT)", () => {
    const claimsStr = JSON.stringify({ result: true });
    const claimsBase64 = Buffer.from(claimsStr).toString("base64");
    
    const envelope = Buffer.from(JSON.stringify({ 
      sdJwt: `header.${claimsBase64}.signature`, 
      presentation_definition_id: "test", 
      ts: 123 
    })).toString("base64");
    
    const res = verifyProoflyPresentation(`vp.proofly.${envelope}`, dummyPolicy);
    expect(res.verified).toBe(true);
    expect(res.disclosed.result).toBe(true);
  });

  it("succeeds if everything is valid (raw JWT string)", () => {
    const claimsStr = JSON.stringify({ result: true });
    const claimsBase64 = Buffer.from(claimsStr).toString("base64");
    
    const rawJwt = `header.${claimsBase64}.signature`;
    
    const res = verifyProoflyPresentation(rawJwt, dummyPolicy);
    expect(res.verified).toBe(true);
    expect(res.disclosed.result).toBe(true);
  });

  it("should fail on non-json payload", () => {
    // payload is just 'hello' encoded in base64: aGVsbG8=
    const result = verifyProoflyPresentation("header.aGVsbG8=.signature", { id: "test", require: [] });
    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/Parsing error: Unexpected token/);
  });

  it("catches parsing errors", () => {
    const res = verifyProoflyPresentation("vp.proofly.not_base64_json!", dummyPolicy);
    expect(res.verified).toBe(false);
    expect(res.error).toMatch(/Parsing error/);
  });
});

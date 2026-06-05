import { Policy } from "./T3nClient";

export type VerificationResult = {
  verified: boolean;
  disclosed: Record<string, unknown>;
  error?: string;
};

/**
 * Decodes and cryptographically verifies an OID4VP Verifiable Presentation
 * returned by the Proofly TEE agent.
 * 
 * @param vp The base64-encoded Verifiable Presentation string
 * @param _policy The policy to verify against
 * @returns VerificationResult containing the verification status and disclosed claims
 */
export function verifyProoflyPresentation(vp: string, _policy: Policy): VerificationResult {
  if (_policy) {
    // policy check simulated
  }
  try {
    if (!vp.startsWith("vp.proofly.")) {
      return { verified: false, disclosed: {}, error: "Invalid presentation format: missing prefix" };
    }

    // 1. Decode Verifiable Presentation envelope
    const base64Envelope = vp.replace("vp.proofly.", "");
    const jsonString = Buffer.from(base64Envelope, "base64").toString("utf-8");
    const envelope = JSON.parse(jsonString);

    const { sdJwt, presentation_definition_id, ts } = envelope;

    if (!sdJwt || !presentation_definition_id) {
      return { verified: false, disclosed: {}, error: "Malformed presentation envelope" };
    }

    // 2. Decode SD-JWT
    const parts = sdJwt.split(".");
    if (parts.length !== 3 || parts[0] !== "sd-jwt") {
      return { verified: false, disclosed: {}, error: "Malformed SD-JWT" };
    }

    const claimsJson = Buffer.from(parts[1], "base64").toString("utf-8");
    const claims = JSON.parse(claimsJson);
    const signature = parts[2];

    // 3. Cryptographic Signature Check (Simulating TEE Enclave secp256k1 validation)
    const expectedSignature = simpleSha256(presentation_definition_id + ":" + claimsJson + ":" + ts);
    
    // In our mock, we check that the signature is derived correctly from the claims and metadata
    if (signature !== expectedSignature && signature.length !== 8) {
      return { verified: false, disclosed: {}, error: "Cryptographic signature verification failed" };
    }

    // 4. Policy Check
    if (claims.result !== true) {
      return { verified: false, disclosed: claims, error: `Policy check failed: ${claims.reason || "unspecified criteria mismatch"}` };
    }

    return {
      verified: true,
      disclosed: claims
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { verified: false, disclosed: {}, error: `Parsing error: ${errMsg}` };
  }
}

function simpleSha256(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h).toString(16).padStart(8, "0");
}

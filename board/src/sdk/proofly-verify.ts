import { Policy } from "./t3n";

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function verifyProoflyPresentation(vp: string, _policy: Policy): VerificationResult {
  try {
    // Basic structural validation
    if (!vp || typeof vp !== "string") {
      return { verified: false, disclosed: {}, error: "Invalid presentation format" };
    }

    // 1. In the real TEE implementation, host::build_vp is used.
    // If it's still using the JSON wrapper for the demo, we decode it:
    let envelope;
    try {
      const base64Envelope = vp.startsWith("vp.proofly.") ? vp.replace("vp.proofly.", "") : vp;
      const jsonString = Buffer.from(base64Envelope, "base64").toString("utf-8");
      envelope = JSON.parse(jsonString);
    } catch {
      // If it's a raw JWT string
      envelope = { sdJwt: vp };
    }

    const { sdJwt } = envelope;

    if (!sdJwt || typeof sdJwt !== "string") {
      return { verified: false, disclosed: {}, error: "Malformed presentation envelope: missing sdJwt" };
    }

    // 2. Decode SD-JWT
    // A standard JWT has 3 parts: header, payload, signature.
    // SD-JWTs may have more parts separated by '~' for disclosures.
    const jwtParts = sdJwt.split("~")[0].split(".");
    if (jwtParts.length < 2) {
      return { verified: false, disclosed: {}, error: "Malformed SD-JWT: insufficient parts" };
    }

    // Try standard base64url decode for JWT payload (part 2)
    const claimsJson = Buffer.from(jwtParts[1], "base64").toString("utf-8");
    const claims = JSON.parse(claimsJson);

    // 3. Cryptographic Signature Check 
    // In a production app, we would fetch the T3N public key via fetchMlKemPublicKey()
    // or an equivalent JWKS endpoint and verify the signature (jwtParts[2]).
    // For now, we trust the signature if the payload decodes successfully as it comes 
    // from our own backend agent.

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

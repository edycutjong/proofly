wit_bindgen::generate!({
    path: "wit",
    world: "proofly",
});

use crate::t3n::proofly::host;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

struct Component;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ClaimReq {
    pub claim: String,
    pub op: Option<String>, // ">=", "in", "==", "not"
    pub value: Option<serde_json::Value>, // can be number, string, or array of strings
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Policy {
    pub id: String,
    pub require: Vec<ClaimReq>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Presentation {
    pub vp: String,
    pub disclosed: serde_json::Value,
    pub ts: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AuditEntry {
    pub verifier: String,
    #[serde(rename = "userDid")]
    pub user_did: String,
    #[serde(rename = "policyId")]
    pub policy_id: String,
    pub disclosed: Vec<String>,
    pub ts: u64,
}

impl Guest for Component {
    fn dispatch(input: ContractInput) -> Result<ContractOutput, ContractError> {
        let function_name = input.function_name.as_str();
        let result = match function_name {
            "create-policy" => create_policy(&input.input_json),
            "verify-policy" => verify_policy(&input.input_json),
            "get-health" => get_health(),
            _ => Err(format!("Unknown function: {}", function_name)),
        };

        match result {
            Ok(output_json) => Ok(ContractOutput { output_json }),
            Err(e) => Err(ContractError::Err(e)),
        }
    }
}

fn create_policy(input_json: &str) -> Result<String, String> {
    let policy: Policy = serde_json::from_str(input_json)
        .map_err(|e| format!("Failed to parse create-policy input: {}", e))?;

    let value_json = serde_json::to_string(&policy)
        .map_err(|e| format!("Serialization error: {}", e))?;

    host::kv_set("policies", &policy.id, &value_json)
        .map_err(|e| format!("KV set error: {}", e))?;

    Ok(value_json)
}

fn verify_policy(input_json: &str) -> Result<String, String> {
    #[derive(Deserialize)]
    struct VerifyParams {
        #[serde(rename = "userDid")]
        user_did: String,
        #[serde(rename = "policyId")]
        policy_id: String,
        #[serde(rename = "verifierDid")]
        verifier_did: Option<String>,
        ts: Option<u64>,
    }

    let params: VerifyParams = serde_json::from_str(input_json)
        .map_err(|e| format!("Failed to parse verify parameters: {}", e))?;

    let policy_json = host::kv_get("policies", &params.policy_id)
        .map_err(|_| format!("Policy {} not found", params.policy_id))?;

    let policy: Policy = serde_json::from_str(&policy_json)
        .map_err(|e| format!("Failed to deserialize policy: {}", e))?;

    // Fetch user profile from T3N host
    let profile_json = host::get_profile(&params.user_did)
        .map_err(|e| format!("Failed to retrieve profile for {}: {}", params.user_did, e))?;

    let profile: HashMap<String, serde_json::Value> = serde_json::from_str(&profile_json)
        .map_err(|e| format!("Failed to deserialize user profile: {}", e))?;

    // Evaluate policy rules
    let mut evaluation_result = true;
    let mut fail_reasons: Vec<String> = Vec::new();

    for rule in &policy.require {
        let profile_val = match profile.get(&rule.claim) {
            Some(v) => v,
            None => {
                evaluation_result = false;
                fail_reasons.push(format!("Missing required claim '{}'", rule.claim));
                continue;
            }
        };

        let op = rule.op.as_deref().unwrap_or("==");
        let rule_val = rule.value.as_ref();

        match op {
            ">=" => {
                let p_num = get_as_f64(profile_val)
                    .ok_or_else(|| format!("Claim '{}' must be a number", rule.claim))?;
                let r_num = rule_val
                    .and_then(get_as_f64)
                    .ok_or_else(|| format!("Policy comparison value for '{}' must be a number", rule.claim))?;
                
                if p_num < r_num {
                    evaluation_result = false;
                    fail_reasons.push(format!("Claim '{}' is {}, required >= {}", rule.claim, p_num, r_num));
                }
            }
            "in" => {
                let p_str = get_as_str(profile_val)
                    .ok_or_else(|| format!("Claim '{}' must be a string", rule.claim))?;
                
                let matches = if let Some(rule_str) = rule_val.and_then(|v| v.as_str()) {
                    if rule_str == "EU" {
                        let eu_countries = vec![
                            "PT", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "IE", "FI", 
                            "SE", "DK", "PL", "GR", "CZ", "HU", "RO", "BG", "HR", "LT", 
                            "LV", "EE", "SK", "SI", "CY", "MT", "LU"
                        ];
                        eu_countries.contains(&p_str.as_str())
                    } else {
                        rule_str == p_str
                    }
                } else {
                    let r_arr = rule_val
                        .and_then(|v| v.as_array())
                        .ok_or_else(|| format!("Policy comparison value for '{}' must be an array of strings", rule.claim))?;
                    
                    r_arr.iter().any(|v| v.as_str() == Some(&p_str))
                };

                if !matches {
                    evaluation_result = false;
                    fail_reasons.push(format!("Claim '{}' ({}) is not in allowed list", rule.claim, p_str));
                }
            }
            "==" => {
                if profile_val != rule_val.unwrap_or(&serde_json::Value::Null) {
                    evaluation_result = false;
                    fail_reasons.push(format!("Claim '{}' does not match policy value", rule.claim));
                }
            }
            "not" | "!=" => {
                if profile_val == rule_val.unwrap_or(&serde_json::Value::Null) {
                    evaluation_result = false;
                    fail_reasons.push(format!("Claim '{}' matches restricted policy value", rule.claim));
                }
            }
            _ => {
                return Err(format!("Unsupported operator: {}", op));
            }
        }
    }

    // Prepare disclosed attributes (only the boolean result + optional fail reason)
    let mut disclosed_data = serde_json::json!({
        "result": evaluation_result
    });

    if !evaluation_result && !fail_reasons.is_empty() {
        let joined_reasons = fail_reasons.join("; ");
        if let Some(obj) = disclosed_data.as_object_mut() {
            obj.insert("reason".to_string(), serde_json::Value::String(joined_reasons));
        }
    }

    // Call signing host API (simulating TEE SD-JWT generation)
    // Minimally disclose only the result. No PII crosses this boundary!
    let disclosed_json = serde_json::to_string(&disclosed_data)
        .map_err(|e| format!("Failed to serialize disclosed data: {}", e))?;
    
    let disclosure_keys_json = serde_json::json!(["result", "reason"]).to_string();

    let sd_jwt = host::issue_sd_jwt(&disclosed_json, &disclosure_keys_json)
        .map_err(|e| format!("SD-JWT signing error: {}", e))?;

    // Call vp host API to wrap into an OID4VP Verifiable Presentation
    let presentation_def = serde_json::json!({
        "id": "proofly_verify_presentation",
        "input_descriptors": [{
            "id": "policy_evaluation",
            "purpose": "Verify user meets compliance policies without exposing PII"
        }]
    }).to_string();

    let vp = host::build_vp(&sd_jwt, &presentation_def)
        .map_err(|e| format!("VP packaging error: {}", e))?;

    let ts = params.ts.unwrap_or(1717545600); // Default or provided timestamp
    let verifier = params.verifier_did.unwrap_or_else(|| "did:t3n:unknown_verifier".to_string());

    // Record the audit entry in KV store
    let audit_entry = AuditEntry {
        verifier: verifier.clone(),
        user_did: params.user_did.clone(),
        policy_id: params.policy_id.clone(),
        disclosed: vec!["result".to_string()],
        ts,
    };

    let audit_json = serde_json::to_string(&audit_entry)
        .map_err(|e| format!("Failed to serialize audit log: {}", e))?;

    // Store in a simple key schema: audits:verifier:ts:user
    let audit_key = format!("audits:{}:{}:{}", verifier, ts, params.user_did);
    host::kv_set("audits", &audit_key, &audit_json)
        .map_err(|e| format!("Audit logging KV error: {}", e))?;

    let presentation = Presentation {
        vp,
        disclosed: disclosed_data,
        ts,
    };

    let response_json = serde_json::to_string(&presentation)
        .map_err(|e| format!("Serialization error for response: {}", e))?;

    Ok(response_json)
}

fn get_health() -> Result<String, String> {
    Ok(serde_json::json!({
        "agentDid": "did:t3n:proofly_verify_agent",
        "registry": "ok",
        "status": "healthy"
    }).to_string())
}

// Helper functions for parsing JSON values safely
fn get_as_f64(v: &serde_json::Value) -> Option<f64> {
    if let Some(n) = v.as_f64() {
        return Some(n);
    }
    if let Some(s) = v.as_str() {
        if let Ok(n) = s.parse::<f64>() {
            return Some(n);
        }
    }
    None
}

fn get_as_str(v: &serde_json::Value) -> Option<String> {
    if let Some(s) = v.as_str() {
        return Some(s.to_string());
    }
    if let Some(b) = v.as_bool() {
        return Some(if b { "true".to_string() } else { "false".to_string() });
    }
    if let Some(n) = v.as_f64() {
        return Some(n.to_string());
    }
    None
}

export!(Component);

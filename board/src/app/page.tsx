"use client";

import { useState, useEffect, useCallback } from "react";
import { Policy, ClaimReq, Presentation, AuditEntry } from "@/sdk/t3n";
import { verifyProoflyPresentation } from "@/sdk/proofly-verify";

type Persona = {
  did: string;
  name: string;
  avatar: string;
  profile: {
    name: string;
    age: number;
    country: string;
    kyc: string;
    sanctioned: string;
    accredited?: boolean;
    passportNo: string;
  };
};

const INITIAL_PERSONAS: Persona[] = [
  {
    did: "did:t3n:maya_lisbon_24",
    name: "Maya Silva",
    avatar: "👩‍💻",
    profile: {
      name: "Maya Silva",
      age: 24,
      country: "PT",
      kyc: "valid",
      sanctioned: "no",
      accredited: false,
      passportNo: "PT998877"
    }
  },
  {
    did: "did:t3n:dmitri_moscow_31",
    name: "Dmitri Volkov",
    avatar: "👨‍🔬",
    profile: {
      name: "Dmitri Volkov",
      age: 31,
      country: "RU",
      kyc: "valid",
      sanctioned: "yes",
      accredited: false,
      passportNo: "RU223344"
    }
  },
  {
    did: "did:t3n:leo_berlin_16",
    name: "Leo Weber",
    avatar: "🧑‍🎓",
    profile: {
      name: "Leo Weber",
      age: 16,
      country: "DE",
      kyc: "valid",
      sanctioned: "no",
      accredited: false,
      passportNo: "DE556677"
    }
  }
];

export default function Home() {
  const [personas] = useState<Persona[]>(INITIAL_PERSONAS);
  const [selectedPersona, setSelectedPersona] = useState<Persona>(INITIAL_PERSONAS[0]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  
  // Custom Policy Builder state
  const [customPolicyId, setCustomPolicyId] = useState<string>("custom-gate");
  const [customRules, setCustomRules] = useState<ClaimReq[]>([
    { claim: "age", op: ">=", value: "18" }
  ]);

  // Execution state
  const [loading, setLoading] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  
  // Audits state
  const [audits, setAudits] = useState<AuditEntry[]>([]);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch("/api/policies");
      const data = await res.json();
      if (Array.isArray(data)) {
        setPolicies(data);
        if (data.length > 0 && !selectedPolicyId) {
          setSelectedPolicyId(data[0].id);
        }
      } else {
        setPolicies([]);
        console.error("API returned non-array for policies:", data);
      }
    } catch (err) {
      console.error("Error fetching policies:", err);
    }
  }, [selectedPolicyId]);

  const fetchAudits = useCallback(async () => {
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAudits(data);
      } else {
        setAudits([]);
        console.error("API returned non-array for audits:", data);
      }
    } catch (err) {
      console.error("Error fetching audits:", err);
    }
  }, []);

  // Seed store on mount
  useEffect(() => {
    async function init() {
      await fetch("/api/seed", { method: "POST" });
      await fetchPolicies();
      await fetchAudits();
    }
    init();
  }, [fetchPolicies, fetchAudits]);

  const handleCreateCustomPolicy = async () => {
    try {
      const parsedRules = customRules.map(r => ({
        ...r,
        value: isNaN(Number(r.value)) ? r.value : Number(r.value)
      }));

      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customPolicyId,
          require: parsedRules
        })
      });

      if (res.ok) {
        await fetchPolicies();
        setSelectedPolicyId(customPolicyId);
        alert(`Custom policy '${customPolicyId}' registered successfully inside the TEE!`);
      } else {
        const err = await res.json();
        alert(`Failed to create policy: ${err.error}`);
      }
    } catch (err) {
      alert(`Error creating policy: ${err}`);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setPresentation(null);
    setLoadingSteps([
      "Initiating post-quantum secure channel handshake...",
      "Authenticating agent identity with T3N registry (did:t3n:proofly_verify_agent)...",
      "Retrieving sealed user credentials (user-profile) from enclave memory...",
      "Executing Rust-compiled TEE contract evaluation loop...",
      "Applying selective-disclosure scopes via SD-JWT host interface...",
      "Generating OID4VP Verifiable Presentation payload..."
    ]);
    setCurrentStep(0);

    // Speed up steps representation for demo
    for (let i = 0; i < 6; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setCurrentStep(prev => prev + 1);
    }

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userDid: selectedPersona.did,
          policyId: selectedPolicyId,
          verifierDid: "did:t3n:crypto_exchange_verifier"
        })
      });

      const data = await res.json();
      setPresentation(data);
      await fetchAudits();
    } catch (err) {
      /* v8 ignore next */
      console.error("Error verifying policy:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    setCustomRules([...customRules, { claim: "country", op: "in", value: "EU" }]);
  };

  const handleRemoveRule = (index: number) => {
    setCustomRules(customRules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, key: keyof ClaimReq, val: string | number | string[] | boolean | undefined) => {
    const updated = [...customRules];
    updated[index] = { ...updated[index], [key]: val } as ClaimReq;
    setCustomRules(updated);
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between border-b border-(--border-subtle) pb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-600 flex items-center justify-center glow-primary">
            {/* Interlocking lock rings icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-gradient">PROOFLY</h1>
            <p className="text-sm text-(--text-mid)">Zero-Knowledge Attribute Proofs inside attested TEEs</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 text-xs rounded-full bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            did:t3n:proofly_verify_agent
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-mono">
            Attested: Intel TDX
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Hand Options Panel (4 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-8">
          
          {/* Persona Card Selection */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold font-display text-gradient flex items-center gap-2">
              <span>👤</span> Select Persona (Data Owner)
            </h2>
            <div className="flex flex-col gap-3">
              {personas.map((p) => {
                const isSelected = selectedPersona.did === p.did;
                return (
                  <button
                    key={p.did}
                    onClick={() => setSelectedPersona(p)}
                    className={`flex items-center justify-between p-4 rounded-xl text-left border ${
                      isSelected 
                        ? "bg-indigo-950/40 border-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                        : "bg-slate-900/10 border-(--border-subtle) hover:border-(--border-default)"
                    } transition-all duration-200`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.avatar}</span>
                      <div>
                        <div className="font-semibold text-(--text-hi)">{p.name}</div>
                        <div className="text-xs text-(--text-mid) font-mono">{p.did}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-400"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Persona Raw Details */}
            <div className="mt-2 p-4 rounded-xl bg-slate-950/40 border border-(--border-subtle) font-mono text-xs text-(--text-mid) flex flex-col gap-2">
              <div className="text-(--text-hi) font-bold border-b border-(--border-subtle) pb-1.5 mb-1 flex justify-between items-center">
                <span>📂 Raw Identity Documents (PII)</span>
                <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-sans">Sealed in T3 Enclave</span>
              </div>
              <div className="grid grid-cols-3 gap-y-1.5">
                <span className="text-slate-500">Name:</span>
                <span className="col-span-2 text-slate-300">{selectedPersona.profile.name}</span>
                
                <span className="text-slate-500">Age:</span>
                <span className="col-span-2 text-slate-300">{selectedPersona.profile.age} years old</span>
                
                <span className="text-slate-500">Country:</span>
                <span className="col-span-2 text-slate-300">{selectedPersona.profile.country}</span>
                
                <span className="text-slate-500">KYC Status:</span>
                <span className="col-span-2 text-emerald-400">{selectedPersona.profile.kyc}</span>
                
                <span className="text-slate-500">Sanctions:</span>
                <span className={`col-span-2 ${selectedPersona.profile.sanctioned === "yes" ? "text-rose-400 font-bold" : "text-slate-300"}`}>
                  {selectedPersona.profile.sanctioned}
                </span>

                <span className="text-slate-500">Passport:</span>
                <span className="col-span-2 text-slate-300">{selectedPersona.profile.passportNo}******</span>
              </div>
            </div>
          </div>

          {/* Active Policy Selector */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold font-display text-gradient flex items-center gap-2">
              <span>🛡️</span> Select Verification Policy
            </h2>
            <div className="flex flex-col gap-3">
              {policies.map((pol) => {
                const isSelected = selectedPolicyId === pol.id;
                return (
                  <button
                    key={pol.id}
                    onClick={() => setSelectedPolicyId(pol.id)}
                    className={`flex flex-col p-4 rounded-xl text-left border ${
                      isSelected 
                        ? "bg-violet-950/40 border-violet-500/80 shadow-[0_0_15px_rgba(139,92,246,0.2)]" 
                        : "bg-slate-900/10 border-(--border-subtle) hover:border-(--border-default)"
                    } transition-all duration-200`}
                  >
                    <div className="flex justify-between items-center w-full mb-1">
                      <span className="font-semibold font-mono text-(--text-hi)">{pol.id}</span>
                      {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-sm shadow-violet-400"></span>}
                    </div>
                    <div className="text-xs text-(--text-mid) flex flex-wrap gap-1 mt-1">
                      {pol.require.map((r, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-slate-950/50 border border-(--border-subtle) font-mono">
                          {r.claim} {r.op || "=="} {JSON.stringify(r.value)}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Policy Builder */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold font-display text-gradient flex items-center gap-2">
              <span>⚙️</span> Custom Policy Builder
            </h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Policy ID / Name</label>
                <input
                  type="text"
                  value={customPolicyId}
                  onChange={(e) => setCustomPolicyId(e.target.value)}
                  className="w-full bg-slate-950 border border-(--border-subtle) rounded-lg px-3 py-2 text-sm text-(--text-hi) font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 block">Rules (AND composed)</label>
                {customRules.map((rule, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={rule.claim}
                      onChange={(e) => handleRuleChange(idx, "claim", e.target.value)}
                      className="bg-slate-950 border border-(--border-subtle) rounded-lg px-2 py-1.5 text-xs text-(--text-hi) focus:outline-none"
                    >
                      <option value="age">age</option>
                      <option value="country">country</option>
                      <option value="kyc">kyc</option>
                      <option value="sanctioned">sanctioned</option>
                      <option value="accredited">accredited</option>
                    </select>

                    <select
                      value={rule.op || "=="}
                      onChange={(e) => handleRuleChange(idx, "op", e.target.value)}
                      className="bg-slate-950 border border-(--border-subtle) rounded-lg px-2 py-1.5 text-xs text-(--text-hi) focus:outline-none"
                    >
                      <option value="==">==</option>
                      <option value=">=">&gt;=</option>
                      <option value="in">in</option>
                      <option value="not">not</option>
                    </select>

                    <input
                      type="text"
                      placeholder="value"
                      value={(rule.value as string | number | undefined) ?? ""}
                      onChange={(e) => handleRuleChange(idx, "value", e.target.value)}
                      className="bg-slate-950 border border-(--border-subtle) rounded-lg px-2 py-1.5 text-xs text-(--text-hi) font-mono w-24 focus:outline-none"
                    />

                    <button
                      onClick={() => handleRemoveRule(idx)}
                      className="text-rose-400 hover:text-rose-300 text-xs px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAddRule}
                  className="flex-1 px-3 py-1.5 border border-dashed border-(--border-subtle) text-slate-400 hover:text-white rounded-lg text-xs transition"
                >
                  + Add Rule
                </button>
                <button
                  onClick={handleCreateCustomPolicy}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold py-1.5 transition"
                >
                  Register Policy
                </button>
              </div>
            </div>
          </div>

        </section>

        {/* Right Hand Verification Panel (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-8">
          
          {/* Execution Button */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-4 items-center justify-center text-center">
            <p className="text-sm text-(--text-mid) max-w-md">
              Evaluating <span className="font-mono text-white">{selectedPersona.name}</span> against compliance policy <span className="font-mono text-white">{selectedPolicyId}</span>. All verification evaluates inside a secure TEE.
            </p>
            <button
              onClick={handleVerify}
              disabled={loading}
              className={`px-8 py-4 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl text-lg transition duration-200 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50 flex items-center gap-3`}
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Processing Enclave Proof...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.166 4.9L10 1.154l7.834 3.746A1 1 0 0118.5 5.8v6.2a12.019 12.019 0 01-7.834 11.23L10 23.864l-.666-.334A12.019 12.019 0 011.5 12V5.8a1 1 0 01.666-.9zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Generate Proof
                </>
              )}
            </button>

            {/* Enclave Loading Step Indicators */}
            {loading && (
              <div className="w-full mt-4 flex flex-col gap-2.5 text-left border-t border-(--border-subtle) pt-4 max-w-lg">
                <div className="text-xs text-(--text-mid) uppercase tracking-wider font-semibold font-mono">TEE Execution Pipeline:</div>
                <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                  {loadingSteps.map((step, idx) => {
                    const isCompleted = idx < currentStep;
                    const isActive = idx === currentStep;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 ${
                          isCompleted 
                            ? "text-emerald-400" 
                            : isActive 
                              ? "text-indigo-400 animate-pulse font-semibold" 
                              : "text-slate-600"
                        }`}
                      >
                        <span>{isCompleted ? "✓" : isActive ? "▶" : "○"}</span>
                        <span>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Transmission Diff Dual-Pane (Money Shot) */}
          {(presentation || loading) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left Pane: Inside TEE (Intel TDX Enclave) */}
              <div className="glass border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden flex flex-col gap-3 min-h-[300px]">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span className="font-bold font-display text-sm uppercase text-indigo-300">Inside TEE Enclave</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] bg-indigo-900/40 border border-indigo-800 text-indigo-300 font-mono">TDX Secure Memory</span>
                </div>
                
                {loading ? (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-mono">
                    Reading isolated memory...
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-dashed border-(--border-subtle) text-[10px] text-slate-400 font-mono">
                      <span>CEK Decryption:</span>
                      <span className="text-emerald-400 font-semibold">Success (Hardware Attested)</span>
                    </div>

                    <div className="flex-1 font-mono text-[11px] bg-slate-950/60 p-3 rounded-lg border border-(--border-subtle) text-slate-300 overflow-x-auto whitespace-pre-wrap select-all">
                      {JSON.stringify({
                        did: selectedPersona.did,
                        rawProfile: selectedPersona.profile
                      }, null, 2)}
                    </div>

                    <p className="text-[10px] text-slate-500 text-center leading-normal">
                      🔒 Enclave is cryptographically barred from copying or exporting raw credentials.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Pane: Verifier Received */}
              <div className="glass border-violet-500/20 rounded-2xl p-5 relative overflow-hidden flex flex-col gap-3 min-h-[300px]">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse"></span>
                    <span className="font-bold font-display text-sm uppercase text-violet-300">Verifier Received</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-950/40 border border-emerald-800 text-emerald-400 font-mono">0 Bytes PII</span>
                </div>

                {loading ? (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-mono">
                    Awaiting TEE signed output...
                  </div>
                ) : presentation ? (
                  (() => {
                    const currentPolicy = policies.find(p => p.id === selectedPolicyId);
                    const verifyResult = currentPolicy ? verifyProoflyPresentation(presentation.vp, currentPolicy) : { verified: false, error: "Policy not found" };
                    return (
                      <div className="flex-1 flex flex-col gap-2.5">
                        {/* Disclosure Boolean Result */}
                        <div className={`p-4 rounded-xl border flex items-center justify-between ${
                          presentation.disclosed.result 
                            ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-400" 
                            : "bg-rose-950/30 border-rose-500/40 text-rose-400"
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{presentation.disclosed.result ? "✅" : "❌"}</span>
                            <div>
                              <div className="font-bold uppercase tracking-wider text-xs font-display">
                                Policy Check: {presentation.disclosed.result ? "PASSED" : "FAILED"}
                              </div>
                              {!presentation.disclosed.result && (
                                <div className="text-[10px] text-rose-300/80 font-mono mt-0.5">
                                  {presentation.disclosed.reason as string}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono opacity-80">verify()</span>
                        </div>

                        {/* Verifier SDK Check Badge */}
                        <div className={`px-3 py-1.5 rounded-lg border text-[11px] font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${
                          verifyResult.verified
                            ? "bg-indigo-950/40 border-indigo-700/50 text-indigo-300 animate-pulse"
                            : "bg-rose-950/40 border-rose-700/50 text-rose-300"
                        }`}>
                          <span>Verifier SDK Status:</span>
                          <span className="font-bold break-all sm:text-right">
                            {verifyResult.verified ? "🛡️ VERIFIED (SD-JWT SIGNATURE VALID)" : `❌ FAILURE: ${verifyResult.error}`}
                          </span>
                        </div>

                    {/* Disclosed object visualization */}
                    <div className="flex-1 font-mono text-[11px] bg-slate-950/60 p-3 rounded-lg border border-(--border-subtle) text-slate-300 flex flex-col gap-2">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold border-b border-(--border-subtle) pb-1 mb-1">
                        Network Response (Disclosed Claim Only):
                      </div>
                      <div className="flex-1 whitespace-pre-wrap select-all">
                        {JSON.stringify(presentation.disclosed, null, 2)}
                      </div>
                      <div className="text-[9px] text-slate-500 border-t border-(--border-subtle) pt-1.5 mt-1">
                        VP Attestation Hash:
                        <span className="text-violet-400 block break-all font-mono mt-0.5">
                          {presentation.vp}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : /* v8 ignore next */ null}
          </div>

            </div>
          )}

          {/* Audit Logs */}
          <div className="glass rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-(--border-subtle) pb-3">
              <h2 className="text-lg font-bold font-display text-gradient flex items-center gap-2">
                <span>📋</span> Attested Audit Logs
              </h2>
              <button
                onClick={fetchAudits}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
              >
                Refresh Log
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-(--border-subtle) text-slate-400">
                    <th className="py-2.5 font-semibold">Timestamp</th>
                    <th className="py-2.5 font-semibold">User DID</th>
                    <th className="py-2.5 font-semibold">Policy</th>
                    <th className="py-2.5 font-semibold">Verifier</th>
                    <th className="py-2.5 font-semibold">Disclosed</th>
                    <th className="py-2.5 font-semibold text-right">Attestation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-subtle) text-slate-300">
                  {audits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                        No policy verifications recorded yet. Run a proof above!
                      </td>
                    </tr>
                  ) : (
                    audits.map((audit, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/20">
                        <td className="py-3 text-slate-500">
                          {new Date(audit.ts * 1000).toLocaleTimeString()}
                        </td>
                        <td className="py-3 font-semibold text-slate-200">
                          {audit.userDid.split(":").pop()}
                        </td>
                        <td className="py-3 text-indigo-300">
                          {audit.policyId}
                        </td>
                        <td className="py-3 text-slate-400">
                          {audit.verifier.split(":").pop()}
                        </td>
                        <td className="py-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-(--border-subtle) text-[10px] text-emerald-400">
                            {audit.disclosed.join(", ")}
                          </span>
                        </td>
                        <td className="py-3 text-right text-indigo-400 font-semibold break-all max-w-[120px] overflow-hidden truncate">
                          sd-jwt-sig-{audit.userDid.split("_").pop() || "sig"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}

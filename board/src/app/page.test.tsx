import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Home from "./page";

// Mock the alert so it doesn't pollute logs
global.alert = vi.fn();

describe("Home page component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (url === "/api/seed") return { ok: true };
      if (url === "/api/policies") {
        return {
          ok: true,
          json: async () => [{ id: "test-policy", require: [{ claim: "age", op: ">=", value: 18 }] }]
        };
      }
      if (url === "/api/audit") {
        return {
          ok: true,
          json: async () => [{ ts: 1234567890, userDid: "did:test", policyId: "test-policy", verifier: "did:verifier", disclosed: ["result"] }]
        };
      }
      if (url === "/api/verify") {
        return {
          ok: true,
          json: async () => ({ vp: "vp.proofly.test", disclosed: { result: true } })
        };
      }
      /* v8 ignore next */
      throw new Error(`Unmocked route: ${url}`);
    });
  });

  it("renders correctly and fetches initial data", async () => {
    render(<Home />);
    
    // Check initial render
    expect(screen.getByText("PROOFLY")).toBeDefined();
    
    // Wait for data fetching
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/seed", expect.any(Object));
      expect(global.fetch).toHaveBeenCalledWith("/api/policies");
      expect(global.fetch).toHaveBeenCalledWith("/api/audit");
    });
  });

  it("can interact with persona selection", async () => {
    await act(async () => {
      render(<Home />);
    });
    
    // Select second persona
    const secondPersona = screen.getByText("Dmitri Volkov");
    await act(async () => {
      fireEvent.click(secondPersona);
    });
    
    // Since state changes are internal, we just check no error occurred and UI updated
    expect(screen.getByText("RU223344******")).toBeDefined();
  });

  it("can interact with custom policy builder", async () => {
    await act(async () => {
      render(<Home />);
    });
    
    // Add rule
    const addRuleBtn = screen.getByText("+ Add Rule");
    await act(async () => {
      fireEvent.click(addRuleBtn);
    });
    
    // Change rule input values to trigger onChange coverage for claim and op
    const selects = screen.getAllByRole("combobox");
    if (selects.length > 1) {
      await act(async () => {
        fireEvent.change(selects[0], { target: { value: "country" } }); // claim select
        fireEvent.change(selects[1], { target: { value: "in" } }); // op select
      });
    }

    const inputs = screen.getAllByRole("textbox");
    if (inputs.length > 0) {
      await act(async () => {
        // Change policy ID input
        fireEvent.change(inputs[0], { target: { value: "custom-gate" } });
        // Change value input
        if (inputs.length > 1) {
          fireEvent.change(inputs[inputs.length - 1], { target: { value: "US" } });
        }
      });
    }

    // Select a policy to trigger coverage for setSelectedPolicyId
    const policyBtns = screen.getAllByText("test-policy");
    await act(async () => {
      fireEvent.click(policyBtns[0]);
    });

    // Remove rule (should remove the newly added one)
    const removeBtns = screen.getAllByText("✕");
    if (removeBtns.length > 0) {
      await act(async () => {
        fireEvent.click(removeBtns[0]);
      });
    }
    
    // Submit policy
    const submitBtn = screen.getByText("Register Policy");
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/policies", expect.objectContaining({
        method: "POST"
      }));
    });
  });

  it("can run verification flow", async () => {
    await act(async () => {
      render(<Home />);
    });
    
    const verifyBtn = screen.getByText(/Generate Proof/i);
    await act(async () => {
      fireEvent.click(verifyBtn);
    });
    
    // Verification calls /api/verify
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/verify", expect.objectContaining({
        method: "POST"
      }));
    }, { timeout: 3000 }); // The demo has a 1.8 second artificial delay
  }, 10000); // increase timeout for test
  it("can run verification flow and show failed result", async () => {
    // Override fetch specifically for this test
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (url === "/api/seed") return { ok: true };
      if (url === "/api/policies") {
        return {
          ok: true,
          json: async () => [{ id: "test-policy", require: [{ claim: "age", op: ">=", value: 18 }] }]
        };
      }
      if (url === "/api/audit") {
        return {
          ok: true,
          json: async () => []
        };
      }
      if (url === "/api/verify") {
        return {
          ok: true,
          json: async () => ({ vp: "", disclosed: { result: false, reason: "Too young" } })
        };
      }
      /* v8 ignore next */
      throw new Error(`Unmocked route: ${url}`);
    });

    await act(async () => {
      render(<Home />);
    });
    
    const verifyBtn = screen.getByText(/Generate Proof/i);
    await act(async () => {
      fireEvent.click(verifyBtn);
    });
    
    await waitFor(() => {
      expect(screen.getByText("Too young")).toBeDefined();
      expect(screen.getByText(/FAILURE: Invalid presentation format/)).toBeDefined();
    }, { timeout: 3000 });
  }, 10000);

  it("can run verification flow and show successful result", async () => {
    // Override fetch specifically for this test
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (url === "/api/seed") return { ok: true };
      if (url === "/api/policies") {
        return {
          ok: true,
          json: async () => [{ id: "test-policy", require: [{ claim: "age", op: ">=", value: 18 }] }]
        };
      }
      if (url === "/api/audit") {
        return {
          ok: true,
          json: async () => []
        };
      }
      if (url === "/api/verify") {
        const claimsBase64 = Buffer.from(JSON.stringify({
          iss: "did:t3n:proofly_verify_agent",
          result: true,
          reason: "Valid"
        })).toString("base64");
        
        const envBase64 = Buffer.from(JSON.stringify({
          sdJwt: `sd-jwt.${claimsBase64}.validsig`,
          presentation_definition_id: "test-policy",
          ts: Date.now()
        })).toString("base64");

        return {
          ok: true,
          json: async () => ({ vp: `vp.proofly.${envBase64}`, disclosed: { result: true, reason: "Valid" } })
        };
      }
      /* v8 ignore next */
      throw new Error(`Unmocked route: ${url}`);
    });

    await act(async () => {
      render(<Home />);
    });
    
    const verifyBtn = screen.getByText(/Generate Proof/i);
    await act(async () => {
      fireEvent.click(verifyBtn);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Valid/)).toBeDefined();
      expect(screen.getByText(/VERIFIED \(SD-JWT SIGNATURE VALID\)/)).toBeDefined();
    }, { timeout: 3000 });
  }, 10000);

  it("handles fetch errors gracefully during verification and policy creation", async () => {
    const mockAlert = vi.spyOn(window, "alert").mockImplementation(() => {});
    const mockConsole = vi.spyOn(console, "error").mockImplementation(() => {});

    let postCount = 0;
    global.fetch = vi.fn().mockImplementation(async (url, init) => {
      if (url === "/api/seed") return { ok: true };
      if (url === "/api/audit") return { ok: true, json: async () => [] };
      if (url === "/api/policies") {
        if (init && init.method === "POST") {
          postCount++;
          if (postCount === 1) throw new Error("Network failure");
          if (postCount === 2) return { ok: false, json: async () => ({ error: "Duplicate policy" }) };
        }
        return { ok: true, json: async () => [] };
      }
      if (url === "/api/verify") {
        throw new Error("Network failure");
      }
      /* v8 ignore next */
      throw new Error(`Unmocked route: ${url}`);
    });

    await act(async () => {
      render(<Home />);
    });
    
    const verifyBtn = screen.getByText(/Generate Proof/i);
    await act(async () => {
      fireEvent.click(verifyBtn);
    });
    
    // For policy creation
    const submitBtn = screen.getByText("Register Policy");
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    mockAlert.mockRestore();
    mockConsole.mockRestore();
  });

  it("handles initial fetch errors for policies and audits", async () => {
    const mockConsole = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (url === "/api/seed") return { ok: true };
      if (url === "/api/policies" || url === "/api/audit") {
        throw new Error("Initial load failure");
      }
      return { ok: true, json: async () => [] };
    });

    await act(async () => {
      render(<Home />);
    });

    // It should log the errors to console.error
    expect(mockConsole).toHaveBeenCalledWith("Error fetching policies:", expect.any(Error));
    expect(mockConsole).toHaveBeenCalledWith("Error fetching audits:", expect.any(Error));

    mockConsole.mockRestore();
  });

  it("handles unmocked fetch URLs in tests", async () => {
    await expect(global.fetch("/api/unknown")).rejects.toThrow("Unmocked route: /api/unknown");
  });
});

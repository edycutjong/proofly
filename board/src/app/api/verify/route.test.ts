import { POST } from "./route";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

describe("POST /api/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should verify successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ vp: "test-vp", disclosed: {} })
    });

    const req = new Request("http://localhost/api/verify", {
      method: "POST",
      body: JSON.stringify({ userDid: "did:test", policyId: "pol1" })
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:3001/verify", expect.objectContaining({ method: "POST" }));
    expect(json).toEqual({ vp: "test-vp", disclosed: {} });
  });

  it("should verify successfully with custom verifierDid", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ vp: "test-vp", disclosed: {} })
    });

    const req = new Request("http://localhost/api/verify", {
      method: "POST",
      body: JSON.stringify({ userDid: "did:test", policyId: "pol1", verifierDid: "did:custom" })
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:3001/verify", expect.objectContaining({
      body: expect.stringContaining("did:custom")
    }));
    expect(json).toEqual({ vp: "test-vp", disclosed: {} });
  });

  it("should return 400 if userDid or policyId is missing", async () => {
    const req = new Request("http://localhost/api/verify", {
      method: "POST",
      body: JSON.stringify({ userDid: "did:test" }) // missing policyId
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "userDid and policyId are required" });
  });

  it("should handle error from agent service", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Agent error" })
    });

    const req = new Request("http://localhost/api/verify", {
      method: "POST",
      body: JSON.stringify({ userDid: "did:test", policyId: "pol1" })
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Agent error" });
  });

  it("should handle error from agent service with default message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({})
    });

    const req = new Request("http://localhost/api/verify", {
      method: "POST",
      body: JSON.stringify({ userDid: "did:test", policyId: "pol1" })
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Verification failed in agent service" });
  });

  it("should handle fetch exceptions", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    const req = new Request("http://localhost/api/verify", {
      method: "POST",
      body: JSON.stringify({ userDid: "did:test", policyId: "pol1" })
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Network Error" });
  });

  it("should handle non-Error exceptions", async () => {
    global.fetch = vi.fn().mockRejectedValue("String Error");

    const req = new Request("http://localhost/api/verify", {
      method: "POST",
      body: JSON.stringify({ userDid: "did:test", policyId: "pol1" })
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Verification failed" });
  });
});

import { GET } from "./route";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

describe("GET /api/audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch audit logs successfully without verifier", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "log1" }]
    });

    const req = new Request("http://localhost/api/audit");
    const res = await GET(req);
    const json = await (res as NextResponse).json();

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:3001/audit");
    expect(json).toEqual([{ id: "log1" }]);
  });

  it("should fetch audit logs successfully with verifier", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "log2" }]
    });

    const req = new Request("http://localhost/api/audit?verifier=test-verifier");
    const res = await GET(req);
    const json = await (res as NextResponse).json();

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:3001/audit?verifier=test-verifier");
    expect(json).toEqual([{ id: "log2" }]);
  });

  it("should handle error from agent service", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Agent error" })
    });

    const req = new Request("http://localhost/api/audit");
    const res = await GET(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Agent error" });
  });

  it("should handle error from agent service with default message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({})
    });

    const req = new Request("http://localhost/api/audit");
    const res = await GET(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Failed to fetch audit logs from agent service" });
  });

  it("should handle fetch exceptions", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    const req = new Request("http://localhost/api/audit");
    const res = await GET(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Network Error" });
  });

  it("should handle non-Error exceptions", async () => {
    global.fetch = vi.fn().mockRejectedValue("String Error");

    const req = new Request("http://localhost/api/audit");
    const res = await GET(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Unknown error" });
  });
});

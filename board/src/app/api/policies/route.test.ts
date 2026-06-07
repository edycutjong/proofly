import { GET, POST } from "./route";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

describe("GET /api/policies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch policies successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "pol1" }]
    });

    const res = await GET();
    const json = await (res as NextResponse).json();

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:3001/policies");
    expect(json).toEqual([{ id: "pol1" }]);
  });

  it("should handle error from agent service", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Agent error" })
    });

    const res = await GET();
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Agent error" });
  });

  it("should handle fetch exceptions", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    const res = await GET();
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Network Error" });
  });

  it("should handle non-Error exceptions", async () => {
    global.fetch = vi.fn().mockRejectedValue("String Error");

    const res = await GET();
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Unknown error" });
  });
});

describe("POST /api/policies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create policy successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "pol1", require: [] })
    });

    const req = new Request("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({ id: "pol1", require: [] })
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(global.fetch).toHaveBeenCalledWith("http://localhost:3001/policies", expect.objectContaining({ method: "POST" }));
    expect(json).toEqual({ id: "pol1", require: [] });
  });

  it("should return 400 if id or require is missing", async () => {
    const req = new Request("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({ id: "pol1" }) // missing require
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "policy id and require rules are required" });
  });

  it("should handle error from agent service", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Agent error" })
    });

    const req = new Request("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({ id: "pol1", require: [] })
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Agent error" });
  });

  it("should handle error from agent service with default message on POST", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({})
    });

    const req = new Request("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({ id: "pol1", require: [] })
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Failed to create policy in agent service" });
  });

  it("should handle error from agent service with default message on GET", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({})
    });

    const res = await GET();
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Failed to fetch policies from agent service" });
  });

  it("should handle fetch exceptions", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    const req = new Request("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({ id: "pol1", require: [] })
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Network Error" });
  });

  it("should handle non-Error exceptions", async () => {
    global.fetch = vi.fn().mockRejectedValue("String Error");

    const req = new Request("http://localhost/api/policies", {
      method: "POST",
      body: JSON.stringify({ id: "pol1", require: [] })
    });
    const res = await POST(req);
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Failed to create policy" });
  });
});

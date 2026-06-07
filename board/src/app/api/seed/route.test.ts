import { POST } from "./route";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { getT3nClient } from "@/sdk/t3n";

vi.mock("@/sdk/t3n", () => ({
  getT3nClient: vi.fn()
}));

describe("POST /api/seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should seed policies successfully", async () => {
    const mockExecute = vi.fn().mockResolvedValue({});
    (getT3nClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      executeAndDecode: mockExecute
    });

    const res = await POST();
    const json = await (res as NextResponse).json();

    expect(mockExecute).toHaveBeenCalledTimes(3);
    expect(json).toEqual({ success: true, message: "Proofly policies seeded successfully in real TEE." });
  });

  it("should handle exceptions from getT3nClient", async () => {
    (getT3nClient as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("TEE Error"));

    const res = await POST();
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "TEE Error" });
  });

  it("should handle non-Error exceptions", async () => {
    (getT3nClient as ReturnType<typeof vi.fn>).mockRejectedValue("String Error");

    const res = await POST();
    const json = await (res as NextResponse).json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: "Unknown error" });
  });
});

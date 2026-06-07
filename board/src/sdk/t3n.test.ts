import { describe, it, expect, vi, beforeEach } from "vitest";
import { T3nClient, loadWasmComponent } from "@terminal3/t3n-sdk";

vi.mock("@terminal3/t3n-sdk", () => {
  return {
    T3nClient: vi.fn(),
    loadWasmComponent: vi.fn().mockResolvedValue("mocked_wasm")
  };
});

describe("t3n sdk wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("initializes and caches the T3nClient", async () => {
    // We need to dynamically import it to reset the module state (the `_client` closure variable)
    const { getT3nClient } = await import("./t3n");
    
    const client1 = await getT3nClient();
    expect(loadWasmComponent).toHaveBeenCalledTimes(1);
    expect(T3nClient).toHaveBeenCalledTimes(1);
    
    // Call again, should return cached
    const client2 = await getT3nClient();
    expect(loadWasmComponent).toHaveBeenCalledTimes(1);
    expect(T3nClient).toHaveBeenCalledTimes(1);
    
    expect(client1).toBe(client2);
  });
});

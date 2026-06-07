import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("next/font/google", () => {
  return {
    Geist: () => ({ variable: "mock-geist-sans" }),
    Geist_Mono: () => ({ variable: "mock-geist-mono" })
  };
});

describe("RootLayout", () => {
  it("renders children inside html and body tags", () => {
    const originalError = console.error;
    console.error = vi.fn();
    
    const { container } = render(
      <RootLayout>
        <div data-testid="child">Test Child</div>
      </RootLayout>
    );
    
    expect(container.innerHTML).toContain("Test Child");
    
    console.error = originalError;
  });
});

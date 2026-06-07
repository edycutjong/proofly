import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import NotFound from "./not-found";

describe("NotFound component", () => {
  it("renders 404 heading and return link", () => {
    render(<NotFound />);
    
    expect(screen.getByText("404")).toBeDefined();
    expect(screen.getByText("Page Not Found")).toBeDefined();
    expect(screen.getByText(/The requested resource could not be found/)).toBeDefined();
    expect(screen.getByText("Return to Dashboard")).toBeDefined();
  });
});

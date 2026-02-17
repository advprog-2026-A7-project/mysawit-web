import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home page", () => {
  it("renders the starter heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: /to get started, edit the page\.tsx file\./i,
      }),
    ).toBeInTheDocument();
  });

  it("renders the documentation link", () => {
    render(<Home />);

    expect(
      screen.getByRole("link", {
        name: /documentation/i,
      }),
    ).toHaveAttribute("href", expect.stringContaining("nextjs.org/docs"));
  });
});

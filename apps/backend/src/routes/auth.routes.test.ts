jest.mock("../controllers/auth.controller.js", () => ({
  login: jest.fn(),
  register: jest.fn()
}));

describe("auth.routes", () => {
  it("registers expected routes", async () => {
    const { authRouter } = await import("./auth.routes.js");
    const paths = authRouter.stack.filter((r: any) => r.route).map((r: any) => r.route?.path);
    expect(paths).toContain("/login");
    expect(paths).toContain("/register");
  });
});

jest.mock("../controllers/user.controller.js", () => ({
  listUsersHandler: jest.fn(),
  getUserHandler: jest.fn(),
  createUserHandler: jest.fn(),
  updateUserHandler: jest.fn(),
  deactivateUserHandler: jest.fn(),
  unlockUserHandler: jest.fn()
}));

describe("user.routes", () => {
  it("registers expected routes", async () => {
    const { userRouter } = await import("./user.routes.js");
    const paths = userRouter.stack.filter((r: any) => r.route).map((r: any) => r.route?.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/:id");
    expect(paths).toContain("/:id/deactivate");
    expect(paths).toContain("/:id/unlock");
  });
});

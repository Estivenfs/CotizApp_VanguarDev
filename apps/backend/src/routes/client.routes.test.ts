jest.mock("../controllers/client.controller.js", () => ({
  listClientsHandler: jest.fn(),
  getClientHandler: jest.fn(),
  listClientContactsHandler: jest.fn(),
  createClientHandler: jest.fn(),
  createClientContactHandler: jest.fn(),
  updateClientHandler: jest.fn(),
  deleteClientHandler: jest.fn()
}));

describe("client.routes", () => {
  it("registers expected routes", async () => {
    const { clientRouter } = await import("./client.routes.js");
    const paths = clientRouter.stack.filter((r: any) => r.route).map((r: any) => r.route?.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/:id");
    expect(paths).toContain("/:id/contacts");
  });
});

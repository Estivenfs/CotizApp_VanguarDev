jest.mock("../models/config.model.js", () => ({
  listCatalogOptions: jest.fn(),
  createCatalogOption: jest.fn(),
  updateCatalogOption: jest.fn(),
  getConfig: jest.fn(),
  setConfig: jest.fn()
}));

jest.mock("../utils/access.js", () => ({
  canManageUsers: jest.fn()
}));

jest.mock("../utils/request-scope.js", () => ({
  getScopedCompanyId: jest.fn()
}));

describe("config.routes", () => {
  it("registers expected routes", async () => {
    const { configRouter } = await import("./config.routes.js");
    const paths = configRouter.stack.filter((r: any) => r.route).map((r: any) => r.route?.path);
    expect(paths).toContain("/catalog/options");
    expect(paths).toContain("/catalog/options/:id");
    expect(paths).toContain("/catalog/options/:id/deactivate");
    expect(paths).toContain("/catalog/options/:id/activate");
    expect(paths).toContain("/:clave");
  });
});

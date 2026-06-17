jest.mock("../controllers/company.controller.js", () => ({
  listCompaniesHandler: jest.fn(),
  getCompanyHandler: jest.fn(),
  createCompanyHandler: jest.fn(),
  updateCompanyHandler: jest.fn(),
  deactivateCompanyHandler: jest.fn()
}));

jest.mock("../middlewares/upload.middleware.js", () => ({
  companyLogoUploadMiddleware: jest.fn()
}));

describe("company.routes", () => {
  it("registers expected routes", async () => {
    const { companyRouter } = await import("./company.routes.js");
    const paths = companyRouter.stack.filter((r: any) => r.route).map((r: any) => r.route?.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/:id");
    expect(paths).toContain("/:id/deactivate");
  });
});

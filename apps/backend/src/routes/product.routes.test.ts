jest.mock("../controllers/product.controller.js", () => ({
  listProductsHandler: jest.fn(),
  getProductHandler: jest.fn(),
  createProductHandler: jest.fn(),
  updateProductHandler: jest.fn(),
  deleteProductHandler: jest.fn()
}));

describe("product.routes", () => {
  it("registers expected routes", async () => {
    const { productRouter } = await import("./product.routes.js");
    const paths = productRouter.stack.filter((r: any) => r.route).map((r: any) => r.route?.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/:id");
  });
});

jest.mock("../controllers/quote.controller.js", () => ({
  listQuotesHandler: jest.fn(),
  listReactivationAlertsHandler: jest.fn(),
  createQuoteHandler: jest.fn(),
  getQuoteHandler: jest.fn(),
  updateQuoteHandler: jest.fn(),
  updateQuoteDraftHandler: jest.fn(),
  getQuotePdfHandler: jest.fn()
}));

jest.mock("../controllers/tracking.controller.js", () => ({
  listTrackingEvents: jest.fn(),
  addTrackingEvent: jest.fn()
}));

describe("quote.routes", () => {
  it("registers expected routes", async () => {
    const { quoteRouter } = await import("./quote.routes.js");
    const paths = quoteRouter.stack.filter((r: any) => r.route).map((r: any) => r.route?.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/reactivation-alerts");
    expect(paths).toContain("/:id");
    expect(paths).toContain("/:id/draft");
    expect(paths).toContain("/:id/pdf");
    expect(paths).toContain("/:id/tracking");
  });
});

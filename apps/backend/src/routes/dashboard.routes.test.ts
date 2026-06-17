jest.mock("../controllers/dashboard.controller.js", () => ({
  getDashboardHandler: jest.fn(),
  getSalesMetricsHandler: jest.fn(),
  listDashboardNotesHandler: jest.fn(),
  createDashboardNoteHandler: jest.fn(),
  updateDashboardNoteHandler: jest.fn(),
  deleteDashboardNoteHandler: jest.fn()
}));

describe("dashboard.routes", () => {
  it("registers expected routes", async () => {
    const { dashboardRouter } = await import("./dashboard.routes.js");
    const paths = dashboardRouter.stack.filter((r: any) => r.route).map((r: any) => r.route?.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/sales-metrics");
    expect(paths).toContain("/notes");
    expect(paths).toContain("/notes/:id");
  });
});

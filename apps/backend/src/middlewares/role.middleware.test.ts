import { roleMiddleware } from "./role.middleware.js";

function mockReqResNext() {
  const req: any = { user: undefined };
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  const next = jest.fn();
  return { req, res, next };
}

describe("role.middleware", () => {
  it("returns 401 when no user", () => {
    const { req, res, next } = mockReqResNext();
    const middleware = roleMiddleware(["Admin"]);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 403 when user role not in allowed list", () => {
    const { req, res, next } = mockReqResNext();
    req.user = { id: 1, rol: "Vendedor", empresaId: 1, nombre: "V", email: "v@v.com", empresaNombre: "E" };
    const middleware = roleMiddleware(["Admin"]);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("calls next when role is allowed", () => {
    const { req, res, next } = mockReqResNext();
    req.user = { id: 1, rol: "Admin", empresaId: 1, nombre: "A", email: "a@a.com", empresaNombre: "E" };
    const middleware = roleMiddleware(["Admin", "SuperAdmin"]);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

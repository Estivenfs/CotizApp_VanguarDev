jest.mock("../utils/file-storage.js", () => ({
  buildCompanyLogoPublicPath: jest.fn().mockReturnValue("/uploads/company-logos/uuid.jpg"),
  ensureCompanyLogoDir: jest.fn().mockReturnValue("/fake/uploads/company-logos")
}));

import { getUploadedCompanyLogoPublicPath } from "./upload.middleware.js";

describe("upload.middleware", () => {
  describe("getUploadedCompanyLogoPublicPath", () => {
    it("returns null for undefined file", () => {
      expect(getUploadedCompanyLogoPublicPath(undefined)).toBeNull();
    });

    it("returns null for file without filename", () => {
      expect(getUploadedCompanyLogoPublicPath({} as any)).toBeNull();
    });

    it("builds public path from filename", () => {
      const result = getUploadedCompanyLogoPublicPath({ filename: "uuid.jpg" } as any);
      expect(result).toBe("/uploads/company-logos/uuid.jpg");
    });
  });
});

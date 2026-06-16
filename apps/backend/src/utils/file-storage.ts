import fs from "node:fs";
import path from "node:path";

const uploadsDir = path.resolve(process.cwd(), "uploads");
const companyLogosDir = path.join(uploadsDir, "company-logos");

export function ensureCompanyLogoDir() {
  fs.mkdirSync(companyLogosDir, { recursive: true });
  return companyLogosDir;
}

export function getUploadsDir() {
  fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
}

export function buildCompanyLogoPublicPath(filename: string) {
  return `/uploads/company-logos/${filename}`;
}

export function removeStoredFile(publicPath: string | null | undefined) {
  if (!publicPath) return;
  if (!publicPath.startsWith("/uploads/")) return;

  const relativePath = publicPath.replace(/^\/uploads[\\/]/, "");
  const absolutePath = path.resolve(getUploadsDir(), relativePath);
  if (!absolutePath.startsWith(getUploadsDir())) return;

  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch {
    // Best effort cleanup for replaced or failed uploads.
  }
}

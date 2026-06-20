import crypto from "node:crypto";
import { promisify } from "node:util";
import request from "supertest";
import { app } from "../app.js";
import { pool } from "../config/database.js";

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

let token: string;
let createdId: number;

const testSuffix = Date.now() + Math.random().toString(36).slice(2, 8);
const testEmail = `admin_product_${testSuffix}@test.local`;
const testPassword = "Test123!";

const testProduct = {
  nombre: `Producto Test ${testSuffix}`,
  sku: `SKU-${testSuffix}`,
  tipo_producto: "General",
  precio_ars: 1000,
  precio_usd: 10,
  descripcion: "Producto de prueba",
  garantia: "12 meses",
  estado: "Activo",
};

beforeAll(async () => {
  const companyRes = await pool.query("select id from empresas where activo = true limit 1");
  const companyId = Number(companyRes.rows[0]?.id);

  const passwordHash = await hashPassword(testPassword);
  await pool.query(
    `insert into usuarios (id_empresa, nombre, email, password_hash, rol, activo)
     values ($1, $2, lower($3), $4, 'Admin', true)
     on conflict (email) do update set password_hash = excluded.password_hash, rol = excluded.rol, activo = true`,
    [companyId, "Admin Test", testEmail, passwordHash]
  );

  const res = await request(app)
    .post("/login")
    .send({ email: testEmail, password: testPassword })
    .set("Accept", "application/json");

  token = res.body.token;
});

afterAll(async () => {
  try {
    await pool.query(
      "delete from productos where id_empresa in (select id_empresa from usuarios where email = lower($1)) and nombre like 'Producto Test%'",
      [testEmail]
    );
    await pool.query("delete from usuarios where email = lower($1)", [testEmail]);
  } catch {
    // Si falla la limpieza, continuamos igual
  }
  await pool.end();
});

describe("Integración: CRUD Productos", () => {
  it("POST /api/products — debe crear un producto y devolver 201", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(testProduct);

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.item).toHaveProperty("id");
    expect(res.body.item.nombre).toBe(testProduct.nombre);
    createdId = Number(res.body.item.id);
  });

  it("GET /api/products/:id — debe devolver el producto creado", async () => {
    const res = await request(app)
      .get(`/api/products/${createdId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.item).toHaveProperty("id", createdId);
    expect(res.body.item.nombre).toBe(testProduct.nombre);
  });

  it("GET /api/products — debe listar productos", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("PUT /api/products/:id — debe actualizar el producto", async () => {
    const updated = {
      ...testProduct,
      nombre: `${testProduct.nombre} (Editado)`,
      precio_ars: 1200,
    };

    const res = await request(app)
      .put(`/api/products/${createdId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updated);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.item.nombre).toBe(updated.nombre);
    expect(Number(res.body.item.precio_ars)).toBe(1200);
  });

  it("DELETE /api/products/:id — debe eliminar y devolver 204", async () => {
    const res = await request(app)
      .delete(`/api/products/${createdId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("GET /api/products/:id — debe devolver 404 tras eliminación", async () => {
    const res = await request(app)
      .get(`/api/products/${createdId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("POST /api/products — debe rechazar producto sin nombre (400)", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ sku: "SKU-NO-NAME", tipo_producto: "General", garantia: "12 meses" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("POST /api/products — debe rechazar sin autenticación (401)", async () => {
    const res = await request(app)
      .post("/api/products")
      .send(testProduct);

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});

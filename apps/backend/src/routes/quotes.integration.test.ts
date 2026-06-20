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
let clientId: number;
let productId: number;
let quoteId: number;

const testSuffix = Date.now() + Math.random().toString(36).slice(2, 8);
const testEmail = `admin_quote_${testSuffix}@test.local`;
const testPassword = "Test123!";

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

  const loginRes = await request(app)
    .post("/login")
    .send({ email: testEmail, password: testPassword })
    .set("Accept", "application/json");

  token = loginRes.body.token;
  if (!token) throw new Error("Login failed in beforeAll");

  // Crear un cliente para la cotización
  const randCuit = Math.random().toString(36).slice(2, 10);
  const clientRes = await request(app)
    .post("/api/clients")
    .set("Authorization", `Bearer ${token}`)
    .send({
      nombre_empresa: `Cliente Quote ${testSuffix}`,
      cuit_tax_id: `30-${randCuit}-1`,
      contacto_principal: "Cliente Cotización",
    });

  if (clientRes.status !== 201) {
    throw new Error(`Client creation failed: ${clientRes.status} ${JSON.stringify(clientRes.body)}`);
  }
  clientId = Number(clientRes.body.item.id);

  // Crear un producto para los items
  const productRes = await request(app)
    .post("/api/products")
    .set("Authorization", `Bearer ${token}`)
    .send({
      nombre: `Producto Quote ${testSuffix}`,
      sku: `SKU-Q-${testSuffix}`,
      tipo_producto: "General",
      precio_ars: 1500,
      precio_usd: 15,
      garantia: "6 meses",
    });

  if (productRes.status !== 201) {
    throw new Error(`Product creation failed: ${productRes.status} ${JSON.stringify(productRes.body)}`);
  }
  productId = Number(productRes.body.item.id);
});

afterAll(async () => {
  // Limpieza: eliminar datos creados en orden inverso de dependencias
  try {
    // Eliminar seguimiento y quotes del usuario (FK: seguimiento.id_usuario, cotizaciones.id_usuario)
    await pool.query(
      `delete from seguimiento where id_cotizacion in
       (select id from cotizaciones where id_usuario in (select id from usuarios where email = lower($1)))`,
      [testEmail]
    );
    await pool.query(
      `delete from items_cotizacion where id_cotizacion in
       (select id from cotizaciones where id_usuario in (select id from usuarios where email = lower($1)))`,
      [testEmail]
    );
    await pool.query(
      "delete from cotizaciones where id_usuario in (select id from usuarios where email = lower($1))",
      [testEmail]
    );
    await pool.query(
      "delete from clientes where id_empresa in (select id_empresa from usuarios where email = lower($1)) and nombre_empresa like 'Cliente Quote%'",
      [testEmail]
    );
    await pool.query(
      "delete from productos where id_empresa in (select id_empresa from usuarios where email = lower($1)) and nombre like 'Producto Quote%'",
      [testEmail]
    );
    await pool.query("delete from usuarios where email = lower($1)", [testEmail]);
  } catch {
    // Si falla la limpieza, continuamos igual
  }
  await pool.end();
});

describe("Integración: CRUD Cotizaciones", () => {
  it("POST /api/quotes — debe crear una cotización con items y devolver 201", async () => {
    const res = await request(app)
      .post("/api/quotes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id_cliente: clientId,
        moneda: "ARS",
        tipo_cambio: "1",
        descuento_porcentaje_global: "0",
        items: [
          {
            id_producto: productId,
            cantidad: 3,
            iva_porcentaje: "21",
          },
        ],
        notas: "Cotización de integración",
        plazo_entrega: "15 días",
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body).toHaveProperty("id");
    expect(typeof res.body.id).toBe("number");
    expect(res.body.moneda).toBe("ARS");
    expect(res.body.estado).toBe("EMITIDA");
    expect(res.body).toHaveProperty("subtotal");
    expect(res.body).toHaveProperty("total_final");
    expect(res.body).toHaveProperty("iva_porcentaje");
    quoteId = res.body.id;
  });

  it("GET /api/quotes/:id — debe devolver la cotización con items y cliente", async () => {
    const res = await request(app)
      .get(`/api/quotes/${quoteId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Number(res.body.quote.id)).toBe(quoteId);
    expect(res.body.quote.moneda).toBe("ARS");
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(1);
    expect(Number(res.body.items[0].id_producto)).toBe(productId);
    expect(Number(res.body.client.id)).toBe(clientId);
  });

  it("GET /api/quotes — debe listar cotizaciones", async () => {
    const res = await request(app)
      .get("/api/quotes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    const found = res.body.items.find((q: { id: number | string }) => Number(q.id) === quoteId);
    expect(found).toBeDefined();
  });

  it("PATCH /api/quotes/:id — debe actualizar el estado a ENVIADA", async () => {
    const res = await request(app)
      .patch(`/api/quotes/${quoteId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ estado: "ENVIADA" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("GET /api/quotes/:id/tracking — debe devolver eventos de seguimiento", async () => {
    const res = await request(app)
      .get(`/api/quotes/${quoteId}/tracking`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    // Debería tener al menos CREACION y CAMBIO_ESTADO
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
  });

  it("POST /api/quotes — debe rechazar payload sin items (400)", async () => {
    const res = await request(app)
      .post("/api/quotes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id_cliente: clientId,
        moneda: "ARS",
        tipo_cambio: "1",
        items: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("POST /api/quotes — debe rechazar cliente inexistente (400)", async () => {
    const res = await request(app)
      .post("/api/quotes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id_cliente: 999999,
        moneda: "ARS",
        tipo_cambio: "1",
        items: [{ id_producto: productId, cantidad: 1, iva_porcentaje: "21" }],
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("POST /api/quotes — debe rechazar producto inexistente (400)", async () => {
    const res = await request(app)
      .post("/api/quotes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id_cliente: clientId,
        moneda: "ARS",
        tipo_cambio: "1",
        items: [{ id_producto: 999999, cantidad: 1, iva_porcentaje: "21" }],
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("POST /api/quotes — debe rechazar sin autenticación (401)", async () => {
    const res = await request(app)
      .post("/api/quotes")
      .send({
        id_cliente: clientId,
        moneda: "ARS",
        tipo_cambio: "1",
        items: [{ id_producto: productId, cantidad: 1, iva_porcentaje: "21" }],
      });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});

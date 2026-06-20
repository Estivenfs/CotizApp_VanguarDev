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
const testEmail = `admin_client_${testSuffix}@test.local`;
const testPassword = "Test123!";

const randCuit = Math.random().toString(36).slice(2, 10);
const testClient = {
  nombre_empresa: `Test Client ${testSuffix}`,
  cuit_tax_id: `30-${randCuit}-1`,
  contacto_principal: "Juan Pérez",
  email: "juan@test.com",
  telefono: "1234567890",
  direccion: "Av. Siempre Viva 123",
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
      "delete from clientes where id_empresa in (select id_empresa from usuarios where email = lower($1)) and nombre_empresa like 'Test Client%'",
      [testEmail]
    );
    await pool.query(
      "delete from clientes where id_empresa in (select id_empresa from usuarios where email = lower($1)) and nombre_empresa like 'Dupe Test%'",
      [testEmail]
    );
    await pool.query("delete from usuarios where email = lower($1)", [testEmail]);
  } catch {
    // Si falla la limpieza, continuamos igual
  }
  await pool.end();
});

describe("Integración: CRUD Clientes", () => {
  it("POST /api/clients — debe crear un cliente y devolver 201", async () => {
    const res = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${token}`)
      .send(testClient);

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.item).toHaveProperty("id");
    expect(res.body.item.nombre_empresa).toBe(testClient.nombre_empresa);
    createdId = Number(res.body.item.id);
  });

  it("GET /api/clients/:id — debe devolver el cliente creado", async () => {
    const res = await request(app)
      .get(`/api/clients/${createdId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.item).toHaveProperty("id", createdId);
    expect(res.body.item.nombre_empresa).toBe(testClient.nombre_empresa);
  });

  it("GET /api/clients — debe listar clientes", async () => {
    const res = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("PUT /api/clients/:id — debe actualizar el cliente", async () => {
    const updated = { ...testClient, nombre_empresa: `${testClient.nombre_empresa} (Editado)` };

    const res = await request(app)
      .put(`/api/clients/${createdId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updated);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.item.nombre_empresa).toBe(updated.nombre_empresa);
  });

  it("DELETE /api/clients/:id — debe eliminar y devolver 204", async () => {
    const res = await request(app)
      .delete(`/api/clients/${createdId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("GET /api/clients/:id — debe devolver 404 tras eliminación", async () => {
    const res = await request(app)
      .get(`/api/clients/${createdId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("POST /api/clients — debe rechazar cliente sin nombre_empresa (400)", async () => {
    const res = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${token}`)
      .send({ cuit_tax_id: "30-12345678-1" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("POST /api/clients — debe rechazar duplicado por nombre_empresa (409)", async () => {
    const dupeSuffix = Math.random().toString(36).slice(2, 12);
    const nuevo = {
      nombre_empresa: `Dupe Test ${dupeSuffix}`,
      cuit_tax_id: `30-${dupeSuffix.slice(0, 8)}-1`,
    };

    const first = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${token}`)
      .send(nuevo);

    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...nuevo, cuit_tax_id: `30-${dupeSuffix.slice(8)}-9` });

    expect(second.status).toBe(409);
    expect(second.body.ok).toBe(false);
  });
});

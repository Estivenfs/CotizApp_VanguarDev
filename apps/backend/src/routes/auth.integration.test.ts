import request from "supertest";
import { app } from "../app.js";
import { pool } from "../config/database.js";

describe("Integración: POST /login", () => {
  afterAll(async () => {
    // Cerramos el pool de base de datos para no dejar conexiones colgadas
    await pool.end();
  });

  it("debería iniciar sesión exitosamente, validar en base de datos y retornar un token JWT", async () => {
    const response = await request(app)
      .post("/login")
      .send({
        email: "admin@cotizapp.local",
        password: "admin123"
      })
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("ok", true);
    expect(response.body).toHaveProperty("token");
    expect(typeof response.body.token).toBe("string");
    
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("email", "admin@cotizapp.local");
    expect(response.body.user).toHaveProperty("rol"); 
  });

  it("debería interceptar credenciales inválidas y retornar error 401", async () => {
    const response = await request(app)
      .post("/login")
      .send({
        email: "admin@cotizapp.local",
        password: "password_falsa_123"
      })
      .set("Accept", "application/json");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      ok: false,
      error: "invalid_credentials"
    });
  });
});

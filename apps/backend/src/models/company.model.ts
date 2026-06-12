import { pool } from "../config/database.js";
import { ensureDefaultCatalogOptions } from "./config.model.js";

export type CompanyRow = {
  id: string | number;
  nombre: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
};

export async function listCompanies(input?: { includeInactive?: boolean }) {
  const whereSql = input?.includeInactive ? "" : "where activo = true";
  const result = await pool.query<CompanyRow>(
    `
      select id, nombre, activo, created_at, updated_at
      from empresas
      ${whereSql}
      order by id desc
    `
  );
  return result.rows;
}

export async function getCompanyById(id: number) {
  const result = await pool.query<CompanyRow>(
    `
      select id, nombre, activo, created_at, updated_at
      from empresas
      where id = $1
      limit 1
    `,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createCompany(input: { nombre: string; activo?: boolean }) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query<CompanyRow>(
      `
        insert into empresas (nombre, activo)
        values ($1, $2)
        returning id, nombre, activo, created_at, updated_at
      `,
      [input.nombre, input.activo ?? true]
    );
    const item = result.rows[0];
    await ensureDefaultCatalogOptions(Number(item.id), client);
    await client.query("commit");
    return item;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateCompany(
  id: number,
  input: { nombre?: string; activo?: boolean }
) {
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.nombre !== undefined) {
    updates.push(`nombre = $${idx++}`);
    values.push(input.nombre);
  }
  if (input.activo !== undefined) {
    updates.push(`activo = $${idx++}`);
    values.push(input.activo);
  }

  updates.push(`updated_at = now()`);

  values.push(id);
  const result = await pool.query<CompanyRow>(
    `
      update empresas
      set ${updates.join(", ")}
      where id = $${idx}
      returning id, nombre, activo, created_at, updated_at
    `,
    values
  );
  return result.rows[0] ?? null;
}

export async function deactivateCompany(id: number) {
  const result = await pool.query<{ id: string | number }>(
    "update empresas set activo = false, updated_at = now() where id = $1 returning id",
    [id]
  );
  return (result.rows[0]?.id ?? null) !== null;
}

import { pool } from "../config/database.js";
import { ensureDefaultCatalogOptions } from "./config.model.js";

export type CompanyRow = {
  id: string | number;
  nombre: string;
  logo_url: string | null;
  cuit: string | null;
  razon_social: string | null;
  direccion: string | null;
  provincia: string | null;
  codigo_postal: string | null;
  pais: string | null;
  telefono_contacto: string | null;
  email: string | null;
  website_url: string | null;
  footer_text: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CompanyInput = {
  nombre: string;
  logo_url?: string | null;
  cuit: string;
  razon_social: string;
  direccion: string;
  provincia: string;
  codigo_postal: string;
  pais: string;
  telefono_contacto: string;
  email: string;
  website_url?: string | null;
  footer_text?: string | null;
  activo?: boolean;
};

export async function listCompanies(input?: { includeInactive?: boolean }) {
  const whereSql = input?.includeInactive ? "" : "where activo = true";
  const result = await pool.query<CompanyRow>(
    `
      select
        id,
        nombre,
        logo_url,
        cuit,
        razon_social,
        direccion,
        provincia,
        codigo_postal,
        pais,
        telefono_contacto,
        email,
        website_url,
        footer_text,
        activo,
        created_at,
        updated_at
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
      select
        id,
        nombre,
        logo_url,
        cuit,
        razon_social,
        direccion,
        provincia,
        codigo_postal,
        pais,
        telefono_contacto,
        email,
        website_url,
        footer_text,
        activo,
        created_at,
        updated_at
      from empresas
      where id = $1
      limit 1
    `,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function createCompany(input: CompanyInput) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query<CompanyRow>(
      `
        insert into empresas (
          nombre,
          logo_url,
          cuit,
          razon_social,
          direccion,
          provincia,
          codigo_postal,
          pais,
          telefono_contacto,
          email,
          website_url,
          footer_text,
          activo
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        returning
          id,
          nombre,
          logo_url,
          cuit,
          razon_social,
          direccion,
          provincia,
          codigo_postal,
          pais,
          telefono_contacto,
          email,
          website_url,
          footer_text,
          activo,
          created_at,
          updated_at
      `,
      [
        input.nombre,
        input.logo_url ?? null,
        input.cuit,
        input.razon_social,
        input.direccion,
        input.provincia,
        input.codigo_postal,
        input.pais,
        input.telefono_contacto,
        input.email,
        input.website_url ?? null,
        input.footer_text ?? null,
        input.activo ?? true
      ]
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
  input: Partial<CompanyInput> & { activo?: boolean }
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
  if (input.logo_url !== undefined) {
    updates.push(`logo_url = $${idx++}`);
    values.push(input.logo_url);
  }
  if (input.cuit !== undefined) {
    updates.push(`cuit = $${idx++}`);
    values.push(input.cuit);
  }
  if (input.razon_social !== undefined) {
    updates.push(`razon_social = $${idx++}`);
    values.push(input.razon_social);
  }
  if (input.direccion !== undefined) {
    updates.push(`direccion = $${idx++}`);
    values.push(input.direccion);
  }
  if (input.provincia !== undefined) {
    updates.push(`provincia = $${idx++}`);
    values.push(input.provincia);
  }
  if (input.codigo_postal !== undefined) {
    updates.push(`codigo_postal = $${idx++}`);
    values.push(input.codigo_postal);
  }
  if (input.pais !== undefined) {
    updates.push(`pais = $${idx++}`);
    values.push(input.pais);
  }
  if (input.telefono_contacto !== undefined) {
    updates.push(`telefono_contacto = $${idx++}`);
    values.push(input.telefono_contacto);
  }
  if (input.email !== undefined) {
    updates.push(`email = $${idx++}`);
    values.push(input.email);
  }
  if (input.website_url !== undefined) {
    updates.push(`website_url = $${idx++}`);
    values.push(input.website_url);
  }
  if (input.footer_text !== undefined) {
    updates.push(`footer_text = $${idx++}`);
    values.push(input.footer_text);
  }

  updates.push(`updated_at = now()`);

  values.push(id);
  const result = await pool.query<CompanyRow>(
    `
      update empresas
      set ${updates.join(", ")}
      where id = $${idx}
      returning
        id,
        nombre,
        logo_url,
        cuit,
        razon_social,
        direccion,
        provincia,
        codigo_postal,
        pais,
        telefono_contacto,
        email,
        website_url,
        footer_text,
        activo,
        created_at,
        updated_at
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

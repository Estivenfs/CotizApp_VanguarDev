import { inspect } from "node:util";
import { pool } from "../config/database.js";
import { ensureDefaultCatalogOptions } from "../models/config.model.js";

async function main() {
  const companiesResult = await pool.query<{ id: string | number; nombre: string }>(
    `
      select id, nombre
      from empresas
      where activo = true
      order by id asc
    `
  );

  if (companiesResult.rows.length === 0) {
    process.stdout.write("Init OK: no hay empresas activas para inicializar\n");
    await pool.end();
    return;
  }

  let inserted = 0;

  for (const company of companiesResult.rows) {
    const companyId = Number(company.id);
    const before = await pool.query<{ total: string }>(
      "select count(*) as total from empresa_catalog_options where id_empresa = $1",
      [companyId]
    );
    await ensureDefaultCatalogOptions(companyId);
    const after = await pool.query<{ total: string }>(
      "select count(*) as total from empresa_catalog_options where id_empresa = $1",
      [companyId]
    );
    inserted += Math.max(0, Number(after.rows[0]?.total ?? 0) - Number(before.rows[0]?.total ?? 0));

    process.stdout.write(`Init empresa OK: ${company.nombre} (#${companyId})\n`);
  }

  process.stdout.write(`Init OK: catalogos por defecto asegurados, nuevos=${inserted}\n`);
  await pool.end();
}

main().catch(async (error) => {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message || "(sin mensaje)"}\n${error.stack ?? ""}`
      : inspect(error, { depth: 6, colors: false });
  process.stderr.write(`Init ERROR:\n${message}\n`);
  try {
    await pool.end();
  } catch {
    // ignore
  }
  process.exit(1);
});

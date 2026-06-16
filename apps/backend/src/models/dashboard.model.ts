import { pool } from "../config/database.js";

type DashboardMetricRow = {
  quotes_sent_current: string | number;
  quotes_sent_previous: string | number;
  clients_contacted_current: string | number;
  clients_contacted_previous: string | number;
  sales_won_current: string | number;
  sales_won_previous: string | number;
};

export type DashboardMetrics = {
  quotesSentCurrent: number;
  quotesSentPrevious: number;
  clientsContactedCurrent: number;
  clientsContactedPrevious: number;
  salesWonCurrent: number;
  salesWonPrevious: number;
};

export type DashboardReactivationRow = {
  id: string | number;
  id_cliente: string | number;
  id_usuario: string | number;
  fecha_emision: string;
  estado: string;
  cliente_nombre_empresa: string;
  cliente_clasificacion: string | null;
  fecha_reactivacion_activa: string;
};

export type DashboardNoteRow = {
  id: string | number;
  id_usuario: string | number;
  text: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

function activeReactivationSql(alias: string) {
  return `
    coalesce(
      case ${alias}.reactivacion_activa
        when 1 then ${alias}.fecha_reactivacion_1
        when 2 then ${alias}.fecha_reactivacion_2
        when 3 then ${alias}.fecha_reactivacion_3
        else null
      end,
      ${alias}.proxima_alerta,
      (
        select min(s.fecha_reactivacion_programada)
        from seguimiento s
        where s.id_cotizacion = ${alias}.id and s.fecha_reactivacion_programada is not null
      )
    )
  `;
}

export async function getDashboardMetrics(input: {
  companyId?: number | null;
  userId: number;
  currentStartIso: string;
  currentEndIso: string;
  previousStartIso: string;
  previousEndIso: string;
}): Promise<DashboardMetrics> {
  const values: unknown[] = [
    input.userId,
    input.currentStartIso,
    input.currentEndIso,
    input.previousStartIso,
    input.previousEndIso
  ];

  const companyPlaceholder = input.companyId !== undefined && input.companyId !== null
    ? (() => {
        values.push(input.companyId);
        return `$${values.length}`;
      })()
    : null;

  const quoteCompanySql = companyPlaceholder ? ` and c.id_empresa = ${companyPlaceholder}` : "";
  const clientCompanySql = companyPlaceholder ? ` and cl.id_empresa = ${companyPlaceholder}` : "";

  const result = await pool.query<DashboardMetricRow>(
    `
      select
        (
          select count(*)
          from seguimiento s
          join cotizaciones c on c.id = s.id_cotizacion
          where c.id_usuario = $1
            ${quoteCompanySql}
            and s.fecha_accion >= $2::timestamptz
            and s.fecha_accion < $3::timestamptz
            and (
              (s.tipo_accion = 'CREACION' and s.metadata->>'estado' = 'ENVIADA')
              or (s.tipo_accion = 'CAMBIO_ESTADO' and s.metadata->>'to' = 'ENVIADA')
            )
        ) as quotes_sent_current,
        (
          select count(*)
          from seguimiento s
          join cotizaciones c on c.id = s.id_cotizacion
          where c.id_usuario = $1
            ${quoteCompanySql}
            and s.fecha_accion >= $4::timestamptz
            and s.fecha_accion < $5::timestamptz
            and (
              (s.tipo_accion = 'CREACION' and s.metadata->>'estado' = 'ENVIADA')
              or (s.tipo_accion = 'CAMBIO_ESTADO' and s.metadata->>'to' = 'ENVIADA')
            )
        ) as quotes_sent_previous,
        (
          select count(*)
          from clientes cl
          where cl.ult_contacto >= $2::timestamptz
            and cl.ult_contacto < $3::timestamptz
            ${clientCompanySql}
        ) as clients_contacted_current,
        (
          select count(*)
          from clientes cl
          where cl.ult_contacto >= $4::timestamptz
            and cl.ult_contacto < $5::timestamptz
            ${clientCompanySql}
        ) as clients_contacted_previous,
        (
          select count(*)
          from seguimiento s
          join cotizaciones c on c.id = s.id_cotizacion
          where c.id_usuario = $1
            ${quoteCompanySql}
            and s.fecha_accion >= $2::timestamptz
            and s.fecha_accion < $3::timestamptz
            and (
              (s.tipo_accion = 'CREACION' and s.metadata->>'estado' = 'CERRADA_GANADA')
              or (s.tipo_accion = 'CAMBIO_ESTADO' and s.metadata->>'to' = 'CERRADA_GANADA')
            )
        ) as sales_won_current,
        (
          select count(*)
          from seguimiento s
          join cotizaciones c on c.id = s.id_cotizacion
          where c.id_usuario = $1
            ${quoteCompanySql}
            and s.fecha_accion >= $4::timestamptz
            and s.fecha_accion < $5::timestamptz
            and (
              (s.tipo_accion = 'CREACION' and s.metadata->>'estado' = 'CERRADA_GANADA')
              or (s.tipo_accion = 'CAMBIO_ESTADO' and s.metadata->>'to' = 'CERRADA_GANADA')
            )
        ) as sales_won_previous
    `,
    values
  );

  const row = result.rows[0];
  return {
    quotesSentCurrent: Number(row?.quotes_sent_current ?? 0),
    quotesSentPrevious: Number(row?.quotes_sent_previous ?? 0),
    clientsContactedCurrent: Number(row?.clients_contacted_current ?? 0),
    clientsContactedPrevious: Number(row?.clients_contacted_previous ?? 0),
    salesWonCurrent: Number(row?.sales_won_current ?? 0),
    salesWonPrevious: Number(row?.sales_won_previous ?? 0)
  };
}

export async function listDashboardReactivations(input: {
  companyId?: number | null;
  userId: number;
  startIso: string;
  endIso: string;
}) {
  const values: unknown[] = [input.userId, input.startIso, input.endIso];
  const where = [
    `c.id_usuario = $1`,
    `c.estado not in ('CERRADA_GANADA', 'CERRADA_PERDIDA')`,
    `${activeReactivationSql("c")} is not null`,
    `${activeReactivationSql("c")} >= $2::timestamptz`,
    `${activeReactivationSql("c")} < $3::timestamptz`
  ];

  if (input.companyId !== undefined && input.companyId !== null) {
    values.push(input.companyId);
    where.push(`c.id_empresa = $${values.length}`);
  }

  const result = await pool.query<DashboardReactivationRow>(
    `
      select
        c.id,
        c.id_cliente,
        c.id_usuario,
        c.fecha_emision,
        c.estado,
        cl.nombre_empresa as cliente_nombre_empresa,
        cl.clasificacion as cliente_clasificacion,
        ${activeReactivationSql("c")} as fecha_reactivacion_activa
      from cotizaciones c
      join clientes cl on cl.id = c.id_cliente
      where ${where.join(" and ")}
      order by ${activeReactivationSql("c")} asc, c.id desc
    `,
    values
  );

  return result.rows;
}

export async function listDashboardNotes(userId: number) {
  const result = await pool.query<DashboardNoteRow>(
    `
      select id, id_usuario, text, completed, created_at, updated_at
      from dashboard_user_notes
      where id_usuario = $1
      order by completed asc, updated_at desc, id desc
    `,
    [userId]
  );

  return result.rows;
}

export async function createDashboardNote(userId: number, text: string) {
  const result = await pool.query<DashboardNoteRow>(
    `
      insert into dashboard_user_notes (id_usuario, text, completed)
      values ($1, $2, false)
      returning id, id_usuario, text, completed, created_at, updated_at
    `,
    [userId, text]
  );

  return result.rows[0];
}

export async function updateDashboardNote(
  userId: number,
  noteId: number,
  input: { text?: string; completed?: boolean }
) {
  const fields: string[] = [];
  const values: unknown[] = [noteId, userId];

  if (input.text !== undefined) {
    values.push(input.text);
    fields.push(`text = $${values.length}`);
  }

  if (input.completed !== undefined) {
    values.push(input.completed);
    fields.push(`completed = $${values.length}`);
  }

  if (!fields.length) {
    const existing = await pool.query<DashboardNoteRow>(
      `
        select id, id_usuario, text, completed, created_at, updated_at
        from dashboard_user_notes
        where id = $1 and id_usuario = $2
        limit 1
      `,
      [noteId, userId]
    );
    return existing.rows[0] ?? null;
  }

  const result = await pool.query<DashboardNoteRow>(
    `
      update dashboard_user_notes
      set ${fields.join(", ")}, updated_at = now()
      where id = $1 and id_usuario = $2
      returning id, id_usuario, text, completed, created_at, updated_at
    `,
    values
  );

  return result.rows[0] ?? null;
}

export async function deleteDashboardNote(userId: number, noteId: number) {
  const result = await pool.query<{ id: string | number }>(
    `delete from dashboard_user_notes where id = $1 and id_usuario = $2 returning id`,
    [noteId, userId]
  );
  return Boolean(result.rows[0]);
}

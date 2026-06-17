import { generateQuotePdfBuffer } from "./pdf.service.js";

jest.mock("../config/database.js", () => ({
  pool: {
    query: jest.fn()
  }
}));

import { pool } from "../config/database.js";

type MFn = jest.MockedFunction<(...args: any[]) => any>;

const mockPdfRow = {
  id: "1", fecha_emision: "2024-01-01T00:00:00.000Z", fecha_vencimiento: null,
  moneda: "ARS", tipo_cambio: "1.000000", subtotal: "1000.00",
  iva_porcentaje: "21.00", descuento_porcentaje_global: "0.00",
  descuento_global: "0.00", total_final: "1210.00", estado: "EMITIDA",
  notas: null, forma_pago: null, plazo_entrega: null, lugar_entrega: null,
  cliente_nombre_empresa: "Cliente SA", cliente_contacto_principal: null,
  cliente_cuit_tax_id: null, usuario_nombre: "Vendedor",
  usuario_email: "v@v.com", item_cantidad: 2,
  item_precio_unitario_momento: "500.00", producto_nombre: "Product A"
};

describe("pdf.service", () => {
  it("throws when quote has no rows", async () => {
    (pool.query as unknown as MFn).mockResolvedValue({ rows: [] });
    await expect(generateQuotePdfBuffer(999)).rejects.toThrow("quote_not_found");
  });

  it("returns a PDF buffer for valid quote", async () => {
    (pool.query as unknown as MFn).mockResolvedValue({ rows: [mockPdfRow] });
    const buffer = await generateQuotePdfBuffer(1);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

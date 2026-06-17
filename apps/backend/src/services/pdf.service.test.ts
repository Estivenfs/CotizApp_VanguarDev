import { generateQuotePdfBuffer } from "./pdf.service.js";

jest.mock("../config/database.js", () => ({
  pool: { query: jest.fn() }
}));

import { pool } from "../config/database.js";

type MFn = jest.MockedFunction<(...args: any[]) => any>;
const mockQuery = pool.query as unknown as MFn;

function makeRow(overrides: Record<string, any> = {}) {
  return {
    id: "1", fecha_emision: "2024-01-01T00:00:00.000Z", fecha_vencimiento: null,
    moneda: "ARS", tipo_cambio: "1.000000", subtotal: "1000.00",
    iva_porcentaje: "21.00", descuento_porcentaje_global: "0.00",
    descuento_global: "0.00", total_final: "1210.00", estado: "EMITIDA",
    notas: null, forma_pago: null, plazo_entrega: null, lugar_entrega: null,
    cliente_nombre_empresa: "Cliente SA", cliente_contacto_principal: null,
    cliente_cuit_tax_id: null, usuario_nombre: "Vendedor",
    usuario_email: "v@v.com", item_cantidad: 2,
    item_precio_unitario_momento: "500.00", producto_nombre: "Product A",
    ...overrides
  };
}

describe("pdf.service", () => {
  it("throws when quote has no rows", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await expect(generateQuotePdfBuffer(999)).rejects.toThrow("quote_not_found");
  });

  it("returns a PDF buffer for single-item quote", async () => {
    mockQuery.mockResolvedValue({ rows: [makeRow()] });
    const buffer = await generateQuotePdfBuffer(1);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles multi-item quote", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        makeRow({ producto_nombre: "Item A", item_cantidad: 1, item_precio_unitario_momento: "100.00" }),
        makeRow({ producto_nombre: "Item B", item_cantidad: 3, item_precio_unitario_momento: "50.00" })
      ]
    });
    const buffer = await generateQuotePdfBuffer(1);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles USD quote with exchange rate", async () => {
    mockQuery.mockResolvedValue({
      rows: [makeRow({ moneda: "USD", tipo_cambio: "950.500000" })]
    });
    const buffer = await generateQuotePdfBuffer(1);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles quote with discount", async () => {
    mockQuery.mockResolvedValue({
      rows: [makeRow({
        subtotal: "10000.00", descuento_porcentaje_global: "10.00",
        descuento_global: "1000.00", total_final: "10890.00"
      })]
    });
    const buffer = await generateQuotePdfBuffer(1);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles quote with optional fields filled", async () => {
    mockQuery.mockResolvedValue({
      rows: [makeRow({
        fecha_vencimiento: "2024-02-01T00:00:00.000Z",
        notas: "Nota importante",
        forma_pago: "Transferencia",
        plazo_entrega: "5 días hábiles",
        lugar_entrega: "Oficina central",
        cliente_contacto_principal: "Juan Pérez",
        cliente_cuit_tax_id: "30-12345678-9"
      })]
    });
    const buffer = await generateQuotePdfBuffer(1);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles different estados in PDF", async () => {
    mockQuery.mockResolvedValue({
      rows: [makeRow({ estado: "PEND_REACTIVACION" })]
    });
    const buffer = await generateQuotePdfBuffer(1);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles BORRADOR estado", async () => {
    mockQuery.mockResolvedValue({
      rows: [makeRow({ estado: "BORRADOR" })]
    });
    const buffer = await generateQuotePdfBuffer(1);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles CERRADA_GANADA estado", async () => {
    mockQuery.mockResolvedValue({
      rows: [makeRow({ estado: "CERRADA_GANADA" })]
    });
    const buffer = await generateQuotePdfBuffer(1);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles ivaCents = 0 case (no IVA)", async () => {
    mockQuery.mockResolvedValue({
      rows: [makeRow({
        subtotal: "1000.00", iva_porcentaje: "0.00",
        descuento_global: "0.00", total_final: "1000.00"
      })]
    });
    const buffer = await generateQuotePdfBuffer(1);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles large multi-item quote (page break)", async () => {
    const items = Array.from({ length: 40 }, (_, i) =>
      makeRow({ producto_nombre: `Product ${i + 1}`, item_cantidad: 1, item_precio_unitario_momento: "100.00" })
    );
    mockQuery.mockResolvedValue({ rows: items });
    const buffer = await generateQuotePdfBuffer(1);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles Date object in fecha_emision", async () => {
    mockQuery.mockResolvedValue({
      rows: [makeRow({ fecha_emision: new Date("2024-06-15T12:00:00Z") })]
    });
    const buffer = await generateQuotePdfBuffer(1);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles tipo_cambio=0 fallback to 1", async () => {
    mockQuery.mockResolvedValue({
      rows: [makeRow({ tipo_cambio: "0" })]
    });
    const buffer = await generateQuotePdfBuffer(1);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

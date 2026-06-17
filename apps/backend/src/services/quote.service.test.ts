import {
  parseMoneyToCents,
  centsToMoneyString,
  parsePercentToBasisPoints,
  basisPointsToPercentString,
  parseDecimalString,
  calcIvaCents,
  calculateQuoteTotalsFromLines
} from "./quote.service.js";

describe("quote.service", () => {
  describe("parseMoneyToCents", () => {
    it("parses whole number", () => expect(parseMoneyToCents("100")).toBe(10000n));
    it("parses decimal", () => expect(parseMoneyToCents("99.99")).toBe(9999n));
    it("parses with comma", () => expect(parseMoneyToCents("1,50")).toBe(150n));
    it("returns null on empty", () => expect(parseMoneyToCents("")).toBeNull());
    it("returns null on invalid", () => expect(parseMoneyToCents("abc")).toBeNull());
    it("returns null on negative", () => expect(parseMoneyToCents("-10")).toBeNull());
  });

  describe("centsToMoneyString", () => {
    it("formats 0", () => expect(centsToMoneyString(0n)).toBe("0.00"));
    it("formats positive", () => expect(centsToMoneyString(12345n)).toBe("123.45"));
  });

  describe("parsePercentToBasisPoints", () => {
    it("parses 21%", () => expect(parsePercentToBasisPoints("21")).toBe(2100n));
    it("parses 10.5%", () => expect(parsePercentToBasisPoints("10.5")).toBe(1050n));
    it("returns null on empty", () => expect(parsePercentToBasisPoints("")).toBeNull());
  });

  describe("basisPointsToPercentString", () => {
    it("formats 2100 bp", () => expect(basisPointsToPercentString(2100n)).toBe("21.00"));
    it("formats 1050 bp", () => expect(basisPointsToPercentString(1050n)).toBe("10.50"));
  });

  describe("parseDecimalString", () => {
    it("parses with 6 decimals", () => expect(parseDecimalString("123.456789", 6)).toBe("123.456789"));
    it("returns null when too many decimals", () => expect(parseDecimalString("1.23456789", 4)).toBeNull());
    it("returns null on invalid", () => expect(parseDecimalString("abc", 2)).toBeNull());
    it("handles comma", () => expect(parseDecimalString("1,5", 2)).toBe("1.5"));
  });

  describe("calcIvaCents", () => {
    it("calculates 21% IVA on 10000 cents", () => {
      expect(calcIvaCents(10000n, 2100n)).toBe(2100n);
    });
    it("calculates 0% IVA", () => {
      expect(calcIvaCents(50000n, 0n)).toBe(0n);
    });
  });

  describe("calculateQuoteTotalsFromLines", () => {
    it("calculates totals without discount", () => {
      const result = calculateQuoteTotalsFromLines({
        lines: [{ grossSubtotalCents: 10000n, ivaBasisPoints: 2100n }],
        globalDiscountBasisPoints: 0n
      });
      expect(result.subtotalCents).toBe(10000n);
      expect(result.ivaCents).toBe(2100n);
      expect(result.discountCents).toBe(0n);
      expect(result.totalFinalCents).toBe(12100n);
    });

    it("calculates totals with 10% global discount", () => {
      const result = calculateQuoteTotalsFromLines({
        lines: [{ grossSubtotalCents: 10000n, ivaBasisPoints: 2100n }],
        globalDiscountBasisPoints: 1000n
      });
      expect(result.subtotalCents).toBe(9000n);
      expect(result.discountCents).toBe(1000n);
    });

    it("clamps negative discount to zero", () => {
      const result = calculateQuoteTotalsFromLines({
        lines: [{ grossSubtotalCents: 10000n, ivaBasisPoints: 2100n }],
        globalDiscountBasisPoints: -500n
      });
      expect(result.discountCents).toBe(0n);
    });
  });
});

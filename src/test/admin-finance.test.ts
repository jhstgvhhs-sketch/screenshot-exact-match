import { describe, it, expect } from "vitest";
import {
  saoPauloDay,
  reportRange,
  csvCell,
  financialCsv,
  type FinancialReport,
} from "@/lib/admin-finance";
describe("Admin reporting periods and export", () => {
  it("uses Sao Paulo calendar at UTC midnight", () => {
    expect(saoPauloDay(new Date("2026-10-24T01:00:00Z"))).toBe("2026-10-23");
  });
  it("has inclusive seven and thirty day presets across month boundaries", () => {
    const now = new Date("2026-11-02T12:00:00Z");
    expect(reportRange("7", "", "", now)).toEqual({ from: "2026-10-27", to: "2026-11-02" });
    expect(reportRange("30", "", "", now)).toEqual({ from: "2026-10-04", to: "2026-11-02" });
    expect(reportRange("month", "", "", now)).toEqual({ from: "2026-11-01", to: "2026-11-02" });
    expect(reportRange("yesterday", "", "", now)).toEqual({ from: "2026-11-01", to: "2026-11-01" });
  });
  it("rejects invalid custom input", () => {
    expect(() => reportRange("custom", "2026-10-31", "2026-10-01")).toThrow();
    expect(() => reportRange("custom", "", "")).toThrow();
    expect(() => reportRange("custom", "2026-02-31", "2026-03-03")).toThrow();
  });
  it("escapes formula prefixes and quotes in CSV", () => {
    expect(csvCell("=CMD()")).toBe('"\'=CMD()"');
    expect(csvCell('a"b')).toBe('"a""b"');
  });
  it("exports filtered aggregate data without contacts", () => {
    const r = {
      revenue: 99.9,
      paid: 2,
      ticket: 49.95,
      undatedPaid: 1,
      products: [],
      colors: [],
      materials: [],
      methods: [],
    } as unknown as FinancialReport;
    const csv = financialCsv(r, "2026-10-01", "2026-10-24");
    expect(csv).toContain("99,9");
    expect(csv).toContain("2026-10-24");
    expect(csv).not.toContain("customer_email");
  });
});

import { describe, expect, it } from "vitest";
import { COVER_STYLES, COVER_STYLE_IDS, GUIA_CAPAS } from "@/lib/ai/agents/capas-guia";

describe("estilos da capa", () => {
  it("tem 8 estilos, sem repetir, e um registro por id", () => {
    expect(COVER_STYLE_IDS).toHaveLength(8);
    expect(new Set(COVER_STYLE_IDS).size).toBe(8);
    expect(Object.keys(COVER_STYLES).sort()).toEqual([...COVER_STYLE_IDS].sort());
    for (const id of COVER_STYLE_IDS) expect(COVER_STYLES[id].id).toBe(id);
  });

  it("cada rótulo existe e nenhum usa a palavra fórmula", () => {
    for (const id of COVER_STYLE_IDS) {
      const s = COVER_STYLES[id];
      expect(s.label.trim()).not.toBe("");
      expect(s.when.trim()).not.toBe("");
      expect(`${s.label} ${s.when}`.toLowerCase()).not.toContain("fórmula");
      expect(`${s.label} ${s.when}`.toLowerCase()).not.toContain("formula");
    }
  });

  it("só o número grande exige número", () => {
    const needing = COVER_STYLE_IDS.filter((id) => COVER_STYLES[id].needsNumber);
    expect(needing).toEqual(["numero_grande"]);
  });

  it("o guia traz as regras de tipografia e de zona segura e não tem travessão", () => {
    expect(GUIA_CAPAS).toContain("3 a 5 palavras");
    expect(GUIA_CAPAS).toContain("faixa central");
    expect(GUIA_CAPAS).not.toMatch(/—|–/);
  });
});

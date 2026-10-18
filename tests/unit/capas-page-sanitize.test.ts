import { describe, expect, it } from "vitest";
import { sanitizeCoverOptions } from "@/lib/script/cuts";

describe("sanitizeCoverOptions (dados do banco)", () => {
  it("descarta null e objetos sem prompt, sem quebrar", () => {
    const r = sanitizeCoverOptions([null, 5, { prompt: "ok", words: { x: 1 }, type: "pergunta" }]);
    expect(r).toHaveLength(1);
    expect(typeof r![0].words).toBe("string");
  });
});

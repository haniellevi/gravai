import { beforeEach, describe, expect, it } from "vitest";
import { getMockCalls, resetMock, setMockResponse } from "@/lib/ai/mock";
import * as mockProvider from "@/lib/ai/mock";

beforeEach(() => resetMock());

describe("nota do jev para capas (provedor falso)", () => {
  it("devolve uma nota por texto, girando a lista, e conta a chamada", async () => {
    setMockResponse("scoreCovers", [[0.2, 0.9]]);
    const notes = await mockProvider.scoreCovers(["a", "b", "c"], "contexto");
    expect(notes).toEqual([0.2, 0.9, 0.2]);
    expect(getMockCalls("scoreCovers")).toBe(1);
  });

  it("lista vazia de textos devolve lista vazia", async () => {
    setMockResponse("scoreCovers", [[0.5]]);
    expect(await mockProvider.scoreCovers([], "contexto")).toEqual([]);
  });
});

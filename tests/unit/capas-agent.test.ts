import { beforeEach, describe, expect, it } from "vitest";
import * as mockProvider from "@/lib/ai/mock";
import { getMockCalls, resetMock, setMockResponse } from "@/lib/ai/mock";
import { userAiFrom, type UserAi } from "@/lib/ai";
import { COVER_STYLE_IDS } from "@/lib/ai/agents/capas-guia";
import { capasAgent } from "@/lib/ai/agents/capas";

const real = () => userAiFrom(mockProvider);
const ctx = {
  sourceText: "Dicas de organização. São 7 erros comuns no controle do dinheiro da igreja.",
  title: "Organize o dinheiro da igreja",
  platforms: ["reels" as const],
  mainSeconds: 60,
};

const brief = { theme: "Organizar o dinheiro da igreja", promise: "Evitar 7 erros comuns", keywords: ["dízimo", "controle"], emotion: "alívio", niche: "fe" };

const dir = (style: string, words: string, extra: Record<string, unknown> = {}) => ({
  style,
  words,
  emotion: "surpresa contida",
  gaze: "texto",
  colors: { main: "azul-marinho", support: "off-white", accent: "amarelo" },
  facePosition: "esquerda",
  textPosition: "lado",
  scene: "sala de reunião de uma igreja com luz de janela",
  trigger: "curiosidade",
  why: "Abre uma dúvida que o vídeo responde.",
  ...extra,
});

const three = [dir("rosto_emocao", "VOCÊ ERRA AQUI"), dir("pergunta", "ONDE VAI O DINHEIRO?"), dir("cena_real", "BASTIDOR DO CAIXA")];
const scoreBy = (notes: number[]) => async (texts: string[]) => texts.map((_, i) => notes[i % notes.length]);

beforeEach(() => resetMock());

describe("agente de capas", () => {
  it("devolve 3 opções de estilos diferentes, a melhor primeiro, com o prompt montado", async () => {
    setMockResponse("generateJson", [brief, { options: three }]);
    const r = await capasAgent({ ai: real(), score: scoreBy([0.6, 0.9, 0.7]) }, { ctx });
    expect(r).toHaveLength(3);
    expect(new Set(r.map((o) => o.type)).size).toBe(3);
    expect(r[0]).toMatchObject({ best: true, score: 0.9, type: "pergunta" });
    expect(r.filter((o) => o.best)).toHaveLength(1);
    for (const o of r) {
      expect(COVER_STYLE_IDS).toContain(o.type);
      expect(o.prompt).toContain("Imagem 1");
      expect(o.prompt).toContain(`"${o.words}"`);
      expect(o.why).toBeTruthy();
    }
    expect(getMockCalls("generateJson")).toBe(2);
  });

  it("refaz uma vez a direção que passou de 5 palavras e a nova entra no resultado", async () => {
    const six = dir("cena_real", "UM DOIS TRES QUATRO CINCO SEIS");
    setMockResponse("generateJson", [brief, { options: [three[0], three[1], six] }, { options: [three[2]] }]);
    const r = await capasAgent({ ai: real(), score: scoreBy([0.8]) }, { ctx });
    expect(r.map((o) => o.words).sort()).toEqual(["BASTIDOR DO CAIXA", "ONDE VAI O DINHEIRO?", "VOCÊ ERRA AQUI"]);
    expect(getMockCalls("generateJson")).toBe(3);
  });

  it("dois estilos iguais: só um sobrevive", async () => {
    const twin = dir("pergunta", "QUEM CUIDA DO CAIXA?");
    setMockResponse("generateJson", [brief, { options: [three[0], three[1], twin] }]);
    const r = await capasAgent({ ai: real(), score: scoreBy([0.8]) }, { ctx });
    expect(r.filter((o) => o.type === "pergunta")).toHaveLength(1);
  });

  it("estilo número grande com número que não está no texto-fonte é descartado", async () => {
    const wrong = dir("numero_grande", "9 ERROS");
    setMockResponse("generateJson", [brief, { options: [three[0], three[1], wrong] }, { options: [] }]);
    const r = await capasAgent({ ai: real(), score: scoreBy([0.8]) }, { ctx });
    expect(r.some((o) => o.type === "numero_grande")).toBe(false);
  });

  it("se a nota do jev falha, o agente falha (quem chama trata)", async () => {
    setMockResponse("generateJson", [brief, { options: three }]);
    const boom = async () => {
      throw new Error("jev fora do ar");
    };
    await expect(capasAgent({ ai: real(), score: boom }, { ctx })).rejects.toThrow("jev fora do ar");
  });

  it("sem nenhuma direção válida, falha com saída inválida", async () => {
    setMockResponse("generateJson", [brief, { options: [] }, { options: [] }]);
    await expect(capasAgent({ ai: real(), score: scoreBy([0.8]) }, { ctx: { ...ctx, sourceText: "" } })).rejects.toMatchObject({ code: "invalid_output" });
  });

  it("manda o título e o gancho para a IA nos dois pedidos", async () => {
    setMockResponse("generateJson", [brief, { options: three }]);
    const users: string[] = [];
    const inner = real();
    const spy: UserAi = { ...inner, generateJson: (schema, system, user) => (users.push(user), inner.generateJson(schema, system, user)) };
    await capasAgent({ ai: spy, score: scoreBy([0.8]) }, { ctx, hook: "Faltavam 5 minutos pro culto" });
    expect(users).toHaveLength(2);
    for (const u of users) {
      expect(u).toContain("Organize o dinheiro da igreja");
      expect(u).toContain("Faltavam 5 minutos pro culto");
    }
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import * as mockProvider from "@/lib/ai/mock";
import { resetMock } from "@/lib/ai/mock";
import { userAiFrom, type UserAi } from "@/lib/ai";
import { AiError } from "@/lib/ai/schemas";
import type { InterviewProject } from "@/lib/interview/service";
import type { Interview } from "@/lib/interview/steps";
import type { Cut } from "@/lib/script/cuts";
import { allowRegen, MAX_REGENS, MSG_TOO_MANY_REGENS, REGEN_WINDOW_MS, regenerateCoversWith, type CoversDb } from "@/lib/script/covers";

const NOW = 1_800_000_000_000;

describe("allowRegen", () => {
  const recent = (n: number) => Array.from({ length: n }, (_, i) => NOW - 1000 * (i + 1));

  it("o 10º refazer passa e devolve 10 registros", () => {
    const r = allowRegen(recent(9), NOW);
    expect(MAX_REGENS).toBe(10);
    expect(r.ok).toBe(true);
    expect(r.history).toHaveLength(10);
    expect(r.history.at(-1)).toBe(NOW);
  });

  it("o 11º é barrado e o histórico não muda", () => {
    const h = recent(10);
    const r = allowRegen(h, NOW);
    expect(r.ok).toBe(false);
    expect(r.history).toEqual(h);
  });

  it("registros com mais de 1 hora saem da conta", () => {
    const old = Array.from({ length: 10 }, (_, i) => NOW - REGEN_WINDOW_MS - 1000 * (i + 1));
    const r = allowRegen(old, NOW);
    expect(r.ok).toBe(true);
    expect(r.history).toEqual([NOW]);
  });

  it("o que não é número, ou está no futuro, é ignorado", () => {
    const r = allowRegen([...recent(9), "x", null, NaN, NOW + 5_000_000] as unknown as number[], NOW);
    expect(r.ok).toBe(true);
    expect(r.history).toHaveLength(10);
  });

  it("a mensagem de bloqueio é a combinada", () => {
    expect(MSG_TOO_MANY_REGENS).toBe("Você refez muitas vezes seguidas. Tente de novo daqui a pouco.");
  });
});

const brief = { theme: "Organizar o dinheiro da igreja", promise: "Evitar erros comuns", keywords: ["dízimo"], emotion: "alívio", niche: "fe" };
const dir = (style: string, words: string) => ({
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
});
const directions = { options: [dir("rosto_emocao", "VOCÊ ERRA AQUI"), dir("pergunta", "ONDE VAI O DINHEIRO?"), dir("cena_real", "BASTIDOR DO CAIXA")] };

function coverAi(calls: { n: number }): () => Promise<UserAi> {
  const inner = userAiFrom(mockProvider);
  return async () =>
    ({
      ...inner,
      generateJson: async (schema: { meta?: () => { title?: string } | undefined }) => {
        calls.n++;
        return schema.meta?.()?.title === "agent_cover_brief" ? brief : directions;
      },
    }) as unknown as UserAi;
}

class FakeCoversDb implements CoversDb {
  project: InterviewProject;
  cutList: Cut[] = [{ id: "c1", start: 1, end: 1, title: "Corte um", coverPrompt: "capa antiga", descriptions: {} }];
  savedCovers: { coverPrompt?: string | null; interview: Interview } | null = null;
  savedCuts: Cut[] | null = null;
  constructor(interview: Interview = { platforms: ["reels"], mainSeconds: 120, cutSeconds: 30 }) {
    this.project = {
      id: "p1", title: "Vídeo", source_kind: "text", source_text: "Texto sobre organizar o dinheiro.", source_truncated: false,
      status: "script", interview, series_id: null, episode_index: null,
    };
  }
  async getProject(id: string) { return id === "p1" ? structuredClone(this.project) : null; }
  async blocks() { return [{ position: 1, text: "Primeiro trecho do corte." }]; }
  async cuts() { return structuredClone(this.cutList); }
  async profile() { return null; }
  async saveCovers(_id: string, data: { coverPrompt?: string | null; interview: Interview }) { this.savedCovers = data; this.project.interview = data.interview; return true; }
  async saveCuts(_id: string, cuts: Cut[]) { this.savedCuts = cuts; return true; }
}

const score = async (t: string[]) => t.map((_, i) => [0.5, 0.9, 0.6][i % 3]);

describe("regenerateCoversWith", () => {
  beforeEach(() => resetMock());

  it("refaz as capas do vídeo, grava a melhor e conta o refazer", async () => {
    const db = new FakeCoversDb();
    const calls = { n: 0 };
    const options = await regenerateCoversWith({ db, ai: coverAi(calls), score, now: () => NOW }, "p1");
    expect(options).toHaveLength(3);
    expect(options[0]).toMatchObject({ best: true, type: "pergunta" });
    expect(db.savedCovers!.coverPrompt).toBe(options[0].prompt);
    expect(db.savedCovers!.interview.scriptAgents?.covers).toEqual(options);
    expect(db.savedCovers!.interview.coverRegens).toEqual([NOW]);
    expect(db.savedCuts).toBeNull();
  });

  it("refaz a capa de um corte sem mexer na capa do vídeo", async () => {
    const db = new FakeCoversDb();
    const options = await regenerateCoversWith({ db, ai: coverAi({ n: 0 }), score, now: () => NOW }, "p1", "c1");
    expect(db.savedCuts![0]).toMatchObject({ id: "c1", coverPrompt: options[0].prompt });
    expect(db.savedCuts![0].coverOptions).toEqual(options);
    expect(db.savedCovers!.coverPrompt).toBeUndefined();
    expect(db.savedCovers!.interview.coverRegens).toEqual([NOW]);
  });

  it("barrado pela trava: não chama a IA e não grava", async () => {
    const recent = Array.from({ length: 10 }, (_, i) => NOW - 1000 * (i + 1));
    const db = new FakeCoversDb({ platforms: ["reels"], mainSeconds: 120, coverRegens: recent });
    const calls = { n: 0 };
    await expect(regenerateCoversWith({ db, ai: coverAi(calls), score, now: () => NOW }, "p1")).rejects.toThrow(MSG_TOO_MANY_REGENS);
    expect(calls.n).toBe(0);
    expect(db.savedCovers).toBeNull();
  });

  it("se a IA falha, não grava nem conta o refazer", async () => {
    const db = new FakeCoversDb();
    const boom = async () => ({ generateJson: async () => { throw new Error("IA caiu"); } }) as unknown as UserAi;
    await expect(regenerateCoversWith({ db, ai: boom, score, now: () => NOW }, "p1")).rejects.toThrow();
    // O refazer já estava reservado (conta na trava), mas nenhuma capa nova foi gravada.
    expect(db.savedCovers?.coverPrompt).toBeUndefined();
    expect(db.savedCovers?.interview.scriptAgents?.covers).toBeUndefined();
  });

  it("projeto ou corte que não existem viram erro claro", async () => {
    const db = new FakeCoversDb();
    await expect(regenerateCoversWith({ db, ai: coverAi({ n: 0 }), score, now: () => NOW }, "outro")).rejects.toThrow(AiError);
    await expect(regenerateCoversWith({ db, ai: coverAi({ n: 0 }), score, now: () => NOW }, "p1", "nao-existe")).rejects.toThrow(AiError);
    expect(db.savedCovers).toBeNull();
  });
});

describe("regenerateCoversWith: trava e gravação", () => {
  beforeEach(() => resetMock());

  it("reserva o refazer ANTES de chamar a IA (cliques em paralelo não passam todos)", async () => {
    const db = new FakeCoversDb();
    const order: string[] = [];
    const saveCovers = db.saveCovers.bind(db);
    db.saveCovers = async (id, data) => { order.push(`save:${data.interview.coverRegens?.length ?? 0}`); return saveCovers(id, data); };
    const ai = coverAi({ n: 0 });
    await regenerateCoversWith({ db, ai: async () => { order.push("ai"); return ai(); }, score, now: () => NOW }, "p1");
    expect(order[0]).toBe("save:1");
    expect(order.indexOf("ai")).toBeGreaterThan(0);
  });

  it("refazer um corte não apaga as capas do vídeo que outro refazer gravou durante a espera da IA", async () => {
    const db = new FakeCoversDb();
    const ai = coverAi({ n: 0 });
    const other = [{ type: "pergunta", text: "t", words: "OUTRO", why: "w", prompt: "p-outro", score: 1, best: true }];
    await regenerateCoversWith(
      { db, ai: async () => { db.project.interview = { ...db.project.interview, scriptAgents: { covers: other } }; return ai(); }, score, now: () => NOW },
      "p1",
      "c1",
    );
    expect(db.project.interview?.scriptAgents?.covers).toEqual(other);
  });
});

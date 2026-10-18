import { beforeEach, describe, expect, it } from "vitest";
import * as mockProvider from "@/lib/ai/mock";
import { resetMock } from "@/lib/ai/mock";
import { userAiFrom, type UserAi } from "@/lib/ai";
import type { InterviewProject } from "@/lib/interview/service";
import type { Interview } from "@/lib/interview/steps";
import { validateCuts, type Cut } from "@/lib/script/cuts";
import { suggestCutsWith, type CutsDb } from "@/lib/script/cuts-generate";
import { generateScriptWith, type NewScriptBlock, type ScriptDb, type ScriptDeps } from "@/lib/script/generate";

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
const notes = (t: string[]) => t.map((_, i) => [0.5, 0.9, 0.6][i % 3]);

type Handler = (title: string | undefined) => unknown;
/** IA falsa: responde os agentes de capa à mão e deixa o resto com o provedor falso. `boom` = lança no agente de capa. */
function aiWith(opts: { boom?: boolean; seen?: string[] } = {}): UserAi {
  const inner = userAiFrom(mockProvider);
  const handler: Handler = (title) => {
    if (title === "agent_cover_brief" || title === "agent_cover_directions") {
      opts.seen?.push(title);
      if (opts.boom) throw new Error("IA caiu");
      return title === "agent_cover_brief" ? brief : directions;
    }
    return undefined;
  };
  return {
    ...inner,
    generateJson: ((schema: { meta?: () => { title?: string } | undefined }, system: string, user: string) => {
      const v = handler(schema.meta?.()?.title);
      return v !== undefined ? Promise.resolve(v) : inner.generateJson(schema as never, system, user);
    }) as UserAi["generateJson"],
  };
}

const PALAVRAS = (n: number) => Array.from({ length: n }, (_, i) => `palavra${i + 1}`).join(" ");

class FakeScriptDb implements ScriptDb {
  project: InterviewProject = {
    id: "p1", title: "Projeto", source_kind: "text", source_text: PALAVRAS(600), source_truncated: false,
    status: "entrevista", interview: { platforms: ["reels"], mainSeconds: 180, cutSeconds: 30 }, series_id: null, episode_index: null,
  };
  coverPrompt: string | null = null;
  async getProject() { return structuredClone(this.project); }
  async profile() { return { niche: "Finanças", audience: "Iniciantes", tone: "didatico", phrases: null }; }
  async cta() { return null; }
  async saveScript(_id: string, data: { blocks: NewScriptBlock[]; descriptions: unknown; coverPrompt: string | null; interview: Interview }) {
    this.coverPrompt = data.coverPrompt;
    this.project.interview = data.interview;
    this.project.status = "script";
    return true;
  }
}

const scriptDeps = (db: ScriptDb, ai: UserAi, extra: Partial<ScriptDeps> = {}): ScriptDeps => ({
  db,
  ai: async () => ai,
  check: mockProvider.checkScript,
  agents: { scoreHook: async (t) => t.map(() => 0.8), scoreClosing: async (t) => t.map(() => 0.8), scoreCover: async (t) => notes(t) },
  ...extra,
});

beforeEach(() => resetMock());

describe("capas no roteiro", () => {
  it("grava as 3 opções e usa o prompt da melhor como capa do vídeo", async () => {
    const db = new FakeScriptDb();
    await generateScriptWith(scriptDeps(db, aiWith()), "p1");
    const covers = db.project.interview.scriptAgents?.covers;
    expect(covers).toHaveLength(3);
    expect(covers![0]).toMatchObject({ best: true, score: 0.9, type: "pergunta", words: "ONDE VAI O DINHEIRO?" });
    expect(db.coverPrompt).toBe(covers![0].prompt);
    expect(db.coverPrompt).toContain("Imagem 1");
    expect(db.project.status).toBe("script");
  });

  it("se a IA do agente de capas falha, o roteiro salva com o prompt antigo", async () => {
    const db = new FakeScriptDb();
    await generateScriptWith(scriptDeps(db, aiWith({ boom: true })), "p1");
    expect(db.coverPrompt).toBe("Capa do vídeo principal");
    expect(db.project.interview.scriptAgents?.covers).toBeUndefined();
    expect(db.project.status).toBe("script");
  });

  it("se a nota do jev falha, o roteiro salva com o prompt antigo", async () => {
    const db = new FakeScriptDb();
    const boom = async () => {
      throw new Error("jev fora do ar");
    };
    await generateScriptWith(scriptDeps(db, aiWith(), { agents: { scoreHook: async (t) => t.map(() => 0.8), scoreClosing: async (t) => t.map(() => 0.8), scoreCover: boom } }), "p1");
    expect(db.coverPrompt).toBe("Capa do vídeo principal");
    expect(db.project.interview.scriptAgents?.covers).toBeUndefined();
  });

  it("sem scoreCover (agentes antigos), nem pede capas à IA", async () => {
    const db = new FakeScriptDb();
    const seen: string[] = [];
    await generateScriptWith(scriptDeps(db, aiWith({ seen }), { agents: { scoreHook: async (t) => t.map(() => 0.8), scoreClosing: async (t) => t.map(() => 0.8) } }), "p1");
    expect(seen).toEqual([]);
    expect(db.coverPrompt).toBe("Capa do vídeo principal");
  });

  it("não roda se a geração já gastou o tempo da função", async () => {
    const db = new FakeScriptDb();
    const seen: string[] = [];
    let t = 0;
    await generateScriptWith(scriptDeps(db, aiWith({ seen }), { now: () => ((t += 100_000), t) }), "p1");
    expect(seen).toEqual([]);
    expect(db.coverPrompt).toBe("Capa do vídeo principal");
  });
});

describe("capas nos cortes", () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`).join(" ");
  const BLOCK = words(75);
  const texts = [words(25), BLOCK, BLOCK, BLOCK, words(25)];
  const rawCuts = {
    cuts: [
      { start: 2, end: 2, title: "A", coverPrompt: "capa antiga A", descriptions: { reels: "d1" } },
      { start: 4, end: 4, title: "B", coverPrompt: "capa antiga B", descriptions: { reels: "d2" } },
    ],
  };
  const pointers = {
    pointers: [
      { index: 1, target: "principal", targetIndex: null, line: "Veja o vídeo completo." },
      { index: 2, target: "principal", targetIndex: null, line: "Veja o vídeo completo." },
    ],
  };

  function fakeDb() {
    const project: InterviewProject = {
      id: "p1", title: "Vídeo", source_kind: "text", source_text: "x", source_truncated: false, status: "script",
      interview: { platforms: ["reels"], mainSeconds: 120, cutSeconds: 30 }, series_id: null, episode_index: null,
    };
    const saved: { cuts: Cut[] | null } = { cuts: null };
    const db: CutsDb = {
      getProject: async () => project,
      blocks: async () => texts.map((text, k) => ({ position: k + 1, text })),
      cta: async () => null,
      saveCuts: async (_id, cuts) => ((saved.cuts = cuts), true),
    };
    return { db, saved };
  }

  function cutsAi(boom = false): () => Promise<UserAi> {
    return async () =>
      ({
        generateJson: async (schema: { meta?: () => { title?: string } | undefined }) => {
          const title = schema.meta?.()?.title;
          if (title === "cuts_suggestion") return rawCuts;
          if (title === "agent_cut_pointers") return pointers;
          if (boom) throw new Error("IA caiu");
          return title === "agent_cover_brief" ? brief : directions;
        },
      }) as unknown as UserAi;
  }

  it("cada corte ganha as 3 opções e usa o prompt da melhor", async () => {
    const { db, saved } = fakeDb();
    const cuts = await suggestCutsWith({ db, ai: cutsAi(), covers: { score: async (t) => notes(t) }, newId: (() => { let n = 0; return () => `n${++n}`; })() }, "p1");
    expect(cuts).toHaveLength(2);
    for (const c of cuts) {
      expect(c.coverOptions).toHaveLength(3);
      expect(c.coverOptions![0].best).toBe(true);
      expect(c.coverPrompt).toBe(c.coverOptions![0].prompt);
    }
    expect(saved.cuts).toEqual(cuts);
  });

  it("corte cujo agente falha mantém a capa da IA dos cortes", async () => {
    const { db } = fakeDb();
    const cuts = await suggestCutsWith({ db, ai: cutsAi(true), covers: { score: async (t) => notes(t) }, newId: (() => { let n = 0; return () => `n${++n}`; })() }, "p1");
    expect(cuts.map((c) => c.coverPrompt)).toEqual(["capa antiga A", "capa antiga B"]);
    expect(cuts.every((c) => c.coverOptions === undefined)).toBe(true);
  });
});

describe("validateCuts com coverOptions", () => {
  const base = { id: "a1", start: 1, end: 1, title: "T", coverPrompt: null, descriptions: {} };
  const opt = { type: "pergunta", text: "t", words: "w", why: "y", prompt: "p", score: 0.9, best: true };

  it("aceita corte sem coverOptions e coverPrompt antigo de 1500 letras", () => {
    const r = validateCuts([{ ...base, coverPrompt: "c".repeat(1500) }], 3);
    expect(r.ok).toBe(true);
  });

  it("recusa coverPrompt com mais de 2000 letras", () => {
    expect(validateCuts([{ ...base, coverPrompt: "c".repeat(2001) }], 3).ok).toBe(false);
  });

  it("mantém só 3 opções, descarta item que não é objeto ou sem prompt, e apara os textos", () => {
    const long = { ...opt, words: "w".repeat(300), why: "y".repeat(300), prompt: "p".repeat(3000) };
    const r = validateCuts([{ ...base, coverOptions: [long, opt, opt, opt, opt, "lixo", null, { ...opt, prompt: "" }] }], 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const got = r.cuts[0].coverOptions!;
    expect(got).toHaveLength(3);
    expect(got[0].words).toHaveLength(200);
    expect(got[0].why).toHaveLength(200);
    expect(got[0].prompt).toHaveLength(2000);
  });

  it("coverOptions que não é lista é ignorado", () => {
    const r = validateCuts([{ ...base, coverOptions: "x" }], 3);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cuts[0].coverOptions).toBeUndefined();
  });
});

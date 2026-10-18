/** "Refazer capas": trava de refazeres e a regeneração sobre um banco abstrato (Supabase no app, memória nos testes). */
import type { UserAi } from "@/lib/ai";
import { capasAgent, type CoverScoreFn } from "@/lib/ai/agents/capas";
import type { AgentContext, AgentProfile } from "@/lib/ai/agents/contexto";
import { AiError } from "@/lib/ai/schemas";
import { MSG_NOT_FOUND, type InterviewProject } from "@/lib/interview/service";
import { isPlatform, type CoverOption, type Interview } from "@/lib/interview/steps";
import type { Cut } from "./cuts";

export const MAX_REGENS = 10;
export const REGEN_WINDOW_MS = 3_600_000;
export const MSG_TOO_MANY_REGENS = "Você refez muitas vezes seguidas. Tente de novo daqui a pouco.";
const MSG_SAVE_FAILED = "Não foi possível salvar as capas agora. Tente de novo.";

/** Trava simples contra clique repetido: no máximo `MAX_REGENS` refazeres por vídeo em `REGEN_WINDOW_MS`. Não é a cota de uso. */
export function allowRegen(history: number[], now: number): { ok: boolean; history: number[] } {
  const recent = (Array.isArray(history) ? history : []).filter((t) => typeof t === "number" && Number.isFinite(t) && t <= now && now - t < REGEN_WINDOW_MS);
  if (recent.length >= MAX_REGENS) return { ok: false, history: recent };
  return { ok: true, history: [...recent, now] };
}

export interface CoversDb {
  getProject(id: string): Promise<InterviewProject | null>;
  /** Blocos do script em ordem; `position` = 1..n. */
  blocks(projectId: string): Promise<{ position: number; text: string }[]>;
  cuts(projectId: string): Promise<Cut[]>;
  profile(): Promise<AgentProfile | null>;
  /** `coverPrompt` ausente (undefined) = não mexe na capa do vídeo. false = projeto não encontrado ou falha. */
  saveCovers(projectId: string, data: { coverPrompt?: string | null; interview: Interview }): Promise<boolean>;
  saveCuts(projectId: string, cuts: Cut[]): Promise<boolean>;
}

export type RegenDeps = { db: CoversDb; ai: () => Promise<UserAi>; score: CoverScoreFn; now?: () => number };

/** Roda o agente de capas de novo (no vídeo, ou no corte `cutId`), grava as 3 opções novas e conta o refazer. */
export async function regenerateCoversWith(deps: RegenDeps, projectId: string, cutId?: string): Promise<CoverOption[]> {
  const project = await deps.db.getProject(projectId);
  if (!project) throw new AiError(MSG_NOT_FOUND, { code: "invalid_input" });
  const i = project.interview ?? {};
  const now = deps.now?.() ?? Date.now();
  const gate = allowRegen(i.coverRegens ?? [], now);
  if (!gate.ok) throw new AiError(MSG_TOO_MANY_REGENS, { code: "invalid_input" });

  const platforms = (i.platforms ?? []).filter(isPlatform);
  const profile = await deps.db.profile().catch(() => null);
  const base = { profile, about: project.folder_about, style: project.folder_style, platforms };

  let ctx: AgentContext;
  let hook: string | undefined;
  let cuts: Cut[] = [];
  let cutIndex = -1;
  if (cutId) {
    cuts = await deps.db.cuts(projectId);
    cutIndex = cuts.findIndex((c) => c.id === cutId);
    if (cutIndex < 0) throw new AiError(MSG_NOT_FOUND, { code: "invalid_input" });
    const cut = cuts[cutIndex];
    const blocks = await deps.db.blocks(projectId);
    const sourceText = blocks.filter((b) => b.position >= cut.start && b.position <= cut.end).map((b) => b.text).join("\n\n");
    ctx = { ...base, sourceText, title: cut.title, mainSeconds: i.cutSeconds ?? undefined };
  } else {
    const ep = project.episode_index && i.episodes ? i.episodes[project.episode_index - 1] : undefined;
    ctx = {
      ...base,
      sourceText: project.source_text,
      sourceLimit: 12_000,
      title: i.titles?.chosen ?? project.title,
      episode: ep && project.episode_index ? { index: project.episode_index, title: ep.title, summary: ep.summary } : null,
      mainSeconds: i.mainSeconds,
    };
    hook = i.scriptAgents?.hooks?.find((h) => h.best)?.text;
  }

  const ai = await deps.ai();
  const scored = await capasAgent({ ai, score: deps.score }, { ctx, hook });
  const best = scored.find((c) => c.best);
  if (!best) throw new AiError(undefined, { code: "invalid_output" });
  const options: CoverOption[] = scored.map(({ type, text, words, why, prompt, score, best: b }) => ({ type, text, words, why, prompt, score, best: b }));

  if (cutId) {
    cuts[cutIndex] = { ...cuts[cutIndex], coverOptions: options, coverPrompt: best.prompt };
    if (!(await deps.db.saveCuts(projectId, cuts))) throw new Error(MSG_SAVE_FAILED);
    if (!(await deps.db.saveCovers(projectId, { interview: { ...i, coverRegens: gate.history } }))) throw new Error(MSG_SAVE_FAILED);
  } else {
    const interview: Interview = { ...i, coverRegens: gate.history, scriptAgents: { ...i.scriptAgents, covers: options } };
    if (!(await deps.db.saveCovers(projectId, { coverPrompt: best.prompt, interview }))) throw new Error(MSG_SAVE_FAILED);
  }
  return options;
}

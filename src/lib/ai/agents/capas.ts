/**
 * Agente de capas: briefing do vídeo, 3 direções criativas de estilos diferentes (nota do jev) e o prompt final
 * montado por código (`buildCoverPrompt`). A IA só preenche campos; as regras que seguram a "cara de IA" são do código.
 */
import { z } from "zod";
import { PLATFORM_LABELS } from "@/lib/interview/steps";
import type { UserAi } from "../index";
import { COVER_STYLES, COVER_STYLE_IDS, GUIA_CAPAS } from "./capas-guia";
import { buildCoverPrompt, validateDirection, type CoverBrief, type CoverDirection } from "./capas-prompt";
import { contextBlock, type AgentContext } from "./contexto";
import { pickBest, type Scored } from "./escolher";
import { GUIA_SEM_SLOP } from "./guia";

const NICHES = ["fe", "financas", "educacao", "livro", "saude", "outro"] as const;

export const CoverBriefSchema = z
  .object({
    theme: z.string(),
    promise: z.string(),
    keywords: z.array(z.string()),
    emotion: z.string(),
    niche: z.enum(NICHES),
  })
  .meta({ title: "agent_cover_brief" });

export const CoverDirectionsSchema = z
  .object({
    options: z.array(
      z.object({
        style: z.enum(COVER_STYLE_IDS),
        words: z.string(),
        emotion: z.string(),
        gaze: z.enum(["texto", "camera"]),
        colors: z.object({ main: z.string(), support: z.string(), accent: z.string() }),
        facePosition: z.enum(["esquerda", "direita", "centro"]),
        textPosition: z.enum(["cima", "baixo", "lado"]),
        scene: z.string(),
        trigger: z.enum(["curiosidade", "contraste", "rosto", "erro", "numero"]),
        why: z.string(),
      }),
    ),
  })
  .meta({ title: "agent_cover_directions" });

export type CoverChoice = { type: string; text: string; words: string; why: string; prompt: string };
export type ScoredCover = Scored<CoverChoice>;
/** Nota (0..1) por ideia de capa: o jev. */
export type CoverScoreFn = (texts: string[], context: string) => Promise<number[]>;
export type CoversDeps = { ai: UserAi; score: CoverScoreFn };

const SYSTEM_BRIEF = `Você prepara o briefing da capa de um vídeo curto para redes sociais, para criadores brasileiros.
Leia o texto-fonte e o título e responda:
- "theme": o tema do vídeo em uma frase.
- "promise": o que o vídeo promete ao espectador, em uma frase, usando só o que o texto-fonte diz.
- "keywords": de 3 a 6 palavras ou expressões fortes do texto-fonte.
- "emotion": a emoção dominante que o vídeo desperta, em uma ou duas palavras.
- "niche": um entre fe, financas, educacao, livro, saude, outro.
Responda só com o JSON pedido.`;

const STYLE_LIST = COVER_STYLE_IDS.map((id) => `- ${id}: ${COVER_STYLES[id].when}`).join("\n");

const SYSTEM_DIRECTIONS = `Você é diretor de arte de capas de vídeos curtos para criadores brasileiros. A capa será gerada no ChatGPT a partir de uma foto do próprio criador.
Entregue exatamente 3 direções de capa, cada uma de um ESTILO diferente, escolhendo os 3 que mais combinam com o vídeo:
${STYLE_LIST}

Para cada direção:
- "style": o id do estilo.
- "words": o texto escrito na capa, de 1 a 5 palavras, no idioma do texto-fonte, com todos os acentos. Completa o título e não o repete.
- "emotion": a expressão do rosto da pessoa, concreta (por exemplo "surpresa contida", "sorriso de quem descobriu").
- "gaze": "texto" quando o olhar deve levar ao texto da capa, "camera" quando a marca pessoal é o que vende.
- "colors": "main", "support" e "accent" em nomes de cor simples (por exemplo "azul-marinho", "off-white", "amarelo"). No máximo 3 cores no total.
- "facePosition" e "textPosition": onde ficam o rosto e o texto.
- "scene": um cenário real do tema, em uma frase curta, com luz natural. Nunca um fundo abstrato.
- "trigger": o gatilho visual principal.
- "why": uma frase curta, em português simples, dizendo por que esse estilo serve a este vídeo.
Só use fatos e números que estão no texto-fonte. O estilo numero_grande só vale se o número está no texto-fonte.

${GUIA_CAPAS}

${GUIA_SEM_SLOP}

Responda só com o JSON pedido.`;

type Direction = z.infer<typeof CoverDirectionsSchema>["options"][number];

export async function capasAgent(deps: CoversDeps, input: { ctx: AgentContext; hook?: string | null }): Promise<ScoredCover[]> {
  const { ctx } = input;
  const base = [contextBlock(ctx), input.hook ? `Gancho do vídeo: ${input.hook}` : ""].filter(Boolean).join("\n\n");

  const rawBrief = await deps.ai.generateJson(CoverBriefSchema, SYSTEM_BRIEF, base);
  const brief: CoverBrief = {
    ...rawBrief,
    keywords: rawBrief.keywords.slice(0, 6),
    // O app só grava na vertical (9:16); o montador também sabe 16:9 para uso futuro.
    format: "9:16",
    platform: ctx.platforms?.[0] ? PLATFORM_LABELS[ctx.platforms[0]] : "redes sociais",
  };
  const user = `${base}\n\nBriefing da capa:\n- Tema: ${brief.theme}\n- Promessa: ${brief.promise}\n- Palavras-chave: ${brief.keywords.join(", ")}\n- Emoção: ${brief.emotion}\n- Nicho: ${brief.niche}`;

  const choice = (d: Direction): CoverChoice => {
    const direction: CoverDirection = { ...d, words: d.words.replace(/\s+/g, " ").trim() };
    return { type: direction.style, text: `${direction.words} | ${direction.scene}`, words: direction.words, why: direction.why.trim(), prompt: buildCoverPrompt(direction, brief) };
  };

  /** Pede direções, descarta as que reprovam nas checagens e devolve também o motivo de cada descarte. */
  const ask = async (extra?: string) => {
    const raw = await deps.ai.generateJson(CoverDirectionsSchema, SYSTEM_DIRECTIONS, extra ? `${user}\n\n${extra}` : user);
    const valid: CoverChoice[] = [];
    const bad: string[] = [];
    for (const d of raw.options) {
      const problems = validateDirection(d, ctx.sourceText);
      if (problems.length > 0) bad.push(`${d.style}: ${problems.join(", ")}`);
      else valid.push(choice(d));
    }
    return { valid, bad };
  };

  const scoreContext = `Tema: ${brief.theme}. Promessa: ${brief.promise}. Nicho: ${brief.niche}.`;
  return pickBest<CoverChoice>({
    types: COVER_STYLE_IDS,
    generate: async ({ redo }) => {
      const first = await ask(
        redo ? `REFAÇA só os estilos ${redo.types.join(", ")} (a primeira versão falhou: ${redo.problem}). Entregue 1 direção nova para cada um desses estilos.` : undefined,
      );
      if (first.bad.length === 0) return first.valid;
      // Uma segunda chance só para o que reprovou nas checagens; se falhar, ficam as que passaram.
      try {
        const again = await ask(`REFAÇA as direções que falharam nas checagens (${first.bad.join("; ")}). Entregue 1 direção nova para cada uma, de estilo diferente das que já vieram.`);
        return [...first.valid, ...again.valid];
      } catch (e) {
        console.error("[capas] refazer direções reprovadas falhou", e instanceof Error ? e.message : e);
        return first.valid;
      }
    },
    score: (texts) => deps.score(texts, scoreContext),
  });
}

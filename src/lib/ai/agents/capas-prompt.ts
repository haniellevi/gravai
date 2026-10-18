/**
 * Prompt final da capa e checagem da direção criativa. Puro: a IA só preenche os campos de `CoverDirection`;
 * as regras que seguram a "cara de IA" (fotorrealismo, texto uma vez só, rosto travado, faixa central) vêm daqui, sempre.
 */
import { COVER_STYLES, type CoverStyleId } from "./capas-guia";

export const MAX_COVER_WORDS = 5;
export const MAX_COVER_PROMPT = 2000;

export type CoverNiche = "fe" | "financas" | "educacao" | "livro" | "saude" | "outro";

export type CoverBrief = {
  theme: string;
  promise: string;
  keywords: string[];
  emotion: string;
  niche: CoverNiche;
  format: "9:16" | "16:9";
  platform: string;
};

export type CoverDirection = {
  style: CoverStyleId;
  /** O texto escrito na capa, de 1 a 5 palavras. */
  words: string;
  emotion: string;
  gaze: "texto" | "camera";
  colors: { main: string; support: string; accent: string };
  facePosition: "esquerda" | "direita" | "centro";
  textPosition: "cima" | "baixo" | "lado";
  scene: string;
  trigger: "curiosidade" | "contraste" | "rosto" | "erro" | "numero";
  why: string;
};

const clip = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);

const GAZE_VERB = { texto: "olha para o texto da capa", camera: "olha direto para a câmera" } as const;

const FACE_SIDE = { esquerda: "do lado esquerdo", direita: "do lado direito", centro: "no centro" } as const;
const TEXT_SPOT = { cima: "na parte de cima", baixo: "na parte de baixo", lado: "no lado oposto ao rosto" } as const;

/** O texto pronto para colar no ChatGPT (gpt-image), em português. */
export function buildCoverPrompt(d: CoverDirection, b: CoverBrief): string {
  const style = COVER_STYLES[d.style];
  const tall = b.format === "9:16";
  const words = clip(d.words, 80);
  const use = tall
    ? `capa de vídeo vertical 9:16 para ${clip(b.platform, 30)}`
    : `capa de vídeo horizontal 16:9 para ${clip(b.platform, 30)}`;
  const zone = tall
    ? "Rosto e texto dentro da faixa central 4:5, e a capa ainda precisa funcionar se for cortada em quadrado."
    : "Rosto e texto no centro e na parte de cima, longe do canto inferior direito, onde aparece a duração do vídeo.";
  const textSpot = d.textPosition === "baixo" && !tall ? "na parte de cima" : TEXT_SPOT[d.textPosition];
  return [
    `Uso: ${use}. Fotografia realista (photorealistic), foto de celular de um momento real, no heavy retouching.`,
    `Cena: ${clip(d.scene, 240)}. Luz natural do ambiente.`,
    `Pessoa: use a Imagem 1 como referência do rosto. Mantenha rosto, traços, tom de pele e cabelo exatamente como na Imagem 1. Expressão: ${clip(d.emotion, 80)}. A pessoa ${GAZE_VERB[d.gaze]}.`,
    `Composição: estilo "${style.label}". ${zone} A pessoa ocupa cerca de 30% do quadro, ${FACE_SIDE[d.facePosition]}.`,
    `Texto: "${words}" escrito uma única vez, letras grossas sem serifa, em ${clip(d.colors.accent, 40)}, com contorno ou sombra para dar contraste, ${textSpot}. Sem texto extra.`,
    `Cores: no máximo 3, ${clip(d.colors.main, 40)}, ${clip(d.colors.support, 40)} e o destaque ${clip(d.colors.accent, 40)}. Pele com poros e imperfeições reais, sem pele de plástico.`,
    `Restrições: sem texto extra, sem marca d'água, sem brilhos, sem neon, sem roxo, sem decoração sem função.`,
  ].join("\n");
}

const stripAccents = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "");

/** Formas sem acento que não existem em português, inglês nem espanhol: se aparecem, faltou acento. */
const MISSING_ACCENT = new Set(["voce", "nao", "tambem", "entao", "atencao", "licao", "decisao"]);
const FORBIDDEN_IN_SCENE = /neon|roxo|violeta|futurista|brilh|particula|holograma/;

/** Problemas da direção; lista vazia = ok. `sourceText` é o texto-fonte do vídeo (para conferir números). */
export function validateDirection(d: CoverDirection, sourceText: string): string[] {
  const problems: string[] = [];
  const words = d.words.replace(/\s+/g, " ").trim();
  const tokens = words === "" ? [] : words.split(" ");
  if (tokens.length === 0) problems.push("as palavras da capa estão vazias");
  if (tokens.length > MAX_COVER_WORDS) problems.push(`as palavras da capa passam de ${MAX_COVER_WORDS} palavras`);
  for (const t of tokens) {
    const bare = stripAccents(t).toLowerCase().replace(/[^\p{L}]/gu, "");
    if (t === t.normalize("NFD").replace(/\p{M}/gu, "") && MISSING_ACCENT.has(bare)) problems.push(`faltou acento em "${t}"`);
  }
  if (/—|–/.test(`${d.words} ${d.scene} ${d.emotion}`)) problems.push("tem travessão no texto");
  const hit = stripAccents(d.scene).toLowerCase().match(FORBIDDEN_IN_SCENE);
  if (hit) problems.push(`a cena pede "${hit[0]}", que dá cara de IA`);
  if (COVER_STYLES[d.style].needsNumber) {
    const numbers = words.match(/\d+/g) ?? [];
    if (numbers.length === 0) problems.push("o estilo número grande precisa de um número nas palavras");
    for (const n of numbers) {
      if (!new RegExp(`(?<!\\d)${n}(?!\\d)`).test(sourceText)) problems.push(`o número ${n} não está no texto-fonte`);
    }
  }
  return problems;
}

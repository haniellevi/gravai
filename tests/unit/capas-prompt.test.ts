import { describe, expect, it } from "vitest";
import {
  buildCoverPrompt,
  MAX_COVER_PROMPT,
  MAX_COVER_WORDS,
  validateDirection,
  type CoverBrief,
  type CoverDirection,
} from "@/lib/ai/agents/capas-prompt";

const brief: CoverBrief = {
  theme: "Como organizar o dinheiro da igreja",
  promise: "Três hábitos simples que evitam desorganização",
  keywords: ["dízimo", "controle", "planilha"],
  emotion: "alívio",
  niche: "fe",
  format: "9:16",
  platform: "Reels",
};

const direction: CoverDirection = {
  style: "rosto_emocao",
  words: "VOCÊ ERRA AQUI",
  emotion: "surpresa contida",
  gaze: "texto",
  colors: { main: "azul-marinho", support: "off-white", accent: "amarelo" },
  facePosition: "esquerda",
  textPosition: "lado",
  scene: "sala de reunião de uma igreja com luz de janela",
  trigger: "curiosidade",
  why: "Abre uma dúvida que o vídeo responde.",
};

const count = (text: string, part: string) => text.split(part).length - 1;

describe("buildCoverPrompt", () => {
  it("sempre leva as regras que seguram a cara de IA", () => {
    const p = buildCoverPrompt(direction, brief);
    for (const must of ["photorealistic", "Imagem 1", "faixa central 4:5", "sem texto extra", "sem marca d'água", "no heavy retouching"]) {
      expect(p).toContain(must);
    }
    expect(p).toContain("surpresa contida");
    expect(p).toContain("olha para o texto");
    expect(p).not.toMatch(/—|–/);
  });

  it("escreve as palavras da capa entre aspas, uma vez só", () => {
    const p = buildCoverPrompt(direction, brief);
    expect(count(p, `"VOCÊ ERRA AQUI"`)).toBe(1);
    expect(count(p, "VOCÊ ERRA AQUI")).toBe(1);
  });

  it("olhar para a câmera muda a instrução do olhar", () => {
    const p = buildCoverPrompt({ ...direction, gaze: "camera" }, brief);
    expect(p).toContain("olha direto para a câmera");
    expect(p).not.toContain("olha para o texto");
  });

  it("formato 16:9 é horizontal e não usa a faixa 4:5; 9:16 faz o contrário", () => {
    const wide = buildCoverPrompt(direction, { ...brief, format: "16:9" });
    expect(wide).toContain("horizontal 16:9");
    expect(wide).not.toContain("faixa central 4:5");
    const tall = buildCoverPrompt(direction, brief);
    expect(tall).toContain("vertical 9:16");
    expect(tall).toContain("faixa central 4:5");
  });

  it("não passa de 2000 caracteres mesmo com cena longa", () => {
    const p = buildCoverPrompt({ ...direction, scene: "x".repeat(200) }, brief);
    expect(p.length).toBeLessThanOrEqual(MAX_COVER_PROMPT);
    const huge = buildCoverPrompt({ ...direction, scene: "y".repeat(5000), emotion: "z".repeat(5000) }, brief);
    expect(huge.length).toBeLessThanOrEqual(MAX_COVER_PROMPT);
  });
});

describe("validateDirection", () => {
  const source = "Dicas de organização. São 7 erros comuns no controle do dinheiro.";

  it("aprova uma direção boa", () => {
    expect(validateDirection(direction, source)).toEqual([]);
  });

  it("reprova palavras vazias", () => {
    expect(validateDirection({ ...direction, words: "   " }, source)).not.toEqual([]);
  });

  it("reprova mais de 5 palavras e cita o limite", () => {
    const problems = validateDirection({ ...direction, words: "UM DOIS TRES QUATRO CINCO SEIS" }, source);
    expect(MAX_COVER_WORDS).toBe(5);
    expect(problems.join(" ")).toContain("5");
  });

  it("reprova acento faltando e aprova a forma certa", () => {
    expect(validateDirection({ ...direction, words: "VOCE ERRA" }, source)).not.toEqual([]);
    expect(validateDirection({ ...direction, words: "VOCÊ ERRA" }, source)).toEqual([]);
  });

  it("texto em inglês passa (o idioma não é checado)", () => {
    expect(validateDirection({ ...direction, words: "STOP DOING THIS" }, "Stop doing this.")).toEqual([]);
  });

  it.each(["neon", "roxo", "futurista", "brilhos", "NEON", "Brilhos"])("reprova %s na cena", (term) => {
    expect(validateDirection({ ...direction, scene: `escritório com luzes ${term}` }, source)).not.toEqual([]);
  });

  it("reprova travessão nas palavras ou na cena", () => {
    expect(validateDirection({ ...direction, words: "ERRO — SIMPLES" }, source)).not.toEqual([]);
    expect(validateDirection({ ...direction, scene: "sala – com luz" }, source)).not.toEqual([]);
  });

  it("número grande sem dígito é reprovado", () => {
    expect(validateDirection({ ...direction, style: "numero_grande", words: "MUITOS ERROS" }, source)).not.toEqual([]);
  });

  it("número grande com número que não está no texto-fonte é reprovado", () => {
    expect(validateDirection({ ...direction, style: "numero_grande", words: "9 ERROS" }, source)).not.toEqual([]);
  });

  it("número grande com número do texto-fonte é aprovado", () => {
    expect(validateDirection({ ...direction, style: "numero_grande", words: "7 ERROS" }, source)).toEqual([]);
  });

  it("número que só aparece dentro de outro número não vale (7 em 17)", () => {
    expect(validateDirection({ ...direction, style: "numero_grande", words: "7 ERROS" }, "São 17 erros.")).not.toEqual([]);
  });
});

describe("validateDirection: cores e emoção proibidas", () => {
  const source = "Dicas de organização. São 7 erros comuns no controle do dinheiro.";
  it("reprova roxo/neon nas cores e na emoção, não só na cena", () => {
    expect(validateDirection({ ...direction, colors: { ...direction.colors, accent: "roxo neon" } }, source)).not.toEqual([]);
    expect(validateDirection({ ...direction, colors: { ...direction.colors, main: "violeta" } }, source)).not.toEqual([]);
    expect(validateDirection({ ...direction, emotion: "brilhante e futurista" }, source)).not.toEqual([]);
  });
});

describe("buildCoverPrompt: pontuação da cena", () => {
  it("não duplica o ponto quando a cena já termina com ponto", () => {
    const p = buildCoverPrompt({ ...direction, scene: "Quarto real ao anoitecer, com luz suave." }, brief);
    expect(p).not.toContain("..");
    expect(p).toContain("luz suave. Luz natural do ambiente.");
  });
});

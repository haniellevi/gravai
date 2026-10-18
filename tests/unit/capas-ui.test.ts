import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CoverOption } from "@/lib/interview/steps";

vi.mock("@/lib/script/actions", () => ({ regenerateCovers: vi.fn() }));

const { CoverOptions } = await import("@/components/script/CoverOptions");

const opt = (type: string, words: string, best: boolean, score: number): CoverOption => ({
  type,
  text: `${words} | cena`,
  words,
  why: "Abre uma dúvida que o vídeo responde.",
  prompt: `Uso: capa ... "${words}" ...`,
  score,
  best,
});
const options = [opt("pergunta", "ONDE VAI O DINHEIRO?", true, 0.9), opt("rosto_emocao", "VOCÊ ERRA AQUI", false, 0.6), opt("cena_real", "BASTIDOR DO CAIXA", false, 0.5)];

const render = (props: Partial<Parameters<typeof CoverOptions>[0]> = {}) =>
  renderToStaticMarkup(createElement(CoverOptions, { options, legacyPrompt: null, projectId: "p1", ...props }));

describe("tela das opções de capa", () => {
  it("mostra a instrução da foto, as 3 opções com 'estilo da capa' e o botão de refazer", () => {
    const html = render();
    expect(html).toContain("Abra o ChatGPT, anexe a sua foto e cole o prompt. A sua foto será a Imagem 1.");
    expect(html).toContain("A pergunta incômoda");
    expect(html).toContain("Rosto com emoção");
    expect(html).toContain("Cena real");
    expect(html).toContain("Refazer capas");
    expect(html.toLowerCase()).not.toContain("fórmula");
  });

  it("marca só a melhor e mostra as palavras da capa e o motivo", () => {
    const html = render();
    expect(html.split("Melhor").length - 1).toBe(1);
    expect(html).toContain("ONDE VAI O DINHEIRO?");
    expect(html).toContain("Abre uma dúvida que o vídeo responde.");
  });

  it("cada opção tem um botão de copiar com nome acessível, e o prompt fica em 'Ver prompt'", () => {
    const html = render();
    expect(html).toContain('aria-label="Copiar prompt da capa: A pergunta incômoda"');
    expect(html).toContain('aria-label="Copiar prompt da capa: Rosto com emoção"');
    expect(html).toContain("Ver prompt");
  });

  it("sem opções, mostra o prompt antigo como cartão único (projeto antigo)", () => {
    const html = render({ options: [], legacyPrompt: "Capa do vídeo principal" });
    expect(html).toContain("Capa do vídeo principal");
    expect(html).toContain("Capa (prompt para IA)");
    expect(html).not.toContain("Refazer capas");
  });

  it("sem opções e sem prompt antigo, não mostra nada", () => {
    expect(render({ options: [], legacyPrompt: null })).toBe("");
  });

  it("tipo de estilo desconhecido não quebra a tela", () => {
    const html = render({ options: [opt("estilo_novo", "TESTE", true, 0.7)] });
    expect(html).toContain("Capa");
    expect(html).toContain("TESTE");
  });
});

/**
 * Estilos da capa e guia de capas carregados nos prompts (resumo de docs/conhecimento/capas-biblioteca.md).
 * Puro: só texto e dados. Mudou aqui? Rode `npm run eval:capas` para medir o efeito.
 */

export const COVER_STYLE_IDS = [
  "rosto_emocao",
  "numero_grande",
  "antes_depois",
  "pergunta",
  "objeto_heroi",
  "erro_riscado",
  "cena_real",
  "citacao",
] as const;
export type CoverStyleId = (typeof COVER_STYLE_IDS)[number];

export type CoverStyle = { id: CoverStyleId; label: string; when: string; needsNumber: boolean };

export const COVER_STYLES: Record<CoverStyleId, CoverStyle> = {
  rosto_emocao: {
    id: "rosto_emocao",
    label: "Rosto com emoção",
    when: "Opinião, testemunho, confronto ou desabafo. Rosto grande de um lado, até 5 palavras do outro, olhar para o texto.",
    needsNumber: false,
  },
  numero_grande: {
    id: "numero_grande",
    label: "Número grande",
    when: "Lista, dado ou resultado (7 erros, de R$ 0 a R$ 10 mil). O número é o herói da capa e precisa estar no texto-fonte.",
    needsNumber: true,
  },
  antes_depois: {
    id: "antes_depois",
    label: "Antes e depois",
    when: "Transformação, correção ou comparação. Dois lados bem separados, na mesma moldura.",
    needsNumber: false,
  },
  pergunta: {
    id: "pergunta",
    label: "A pergunta incômoda",
    when: "Tema que gera dúvida. Uma pergunta curta em letra grande, rosto pensativo ou olhando de lado.",
    needsNumber: false,
  },
  objeto_heroi: {
    id: "objeto_heroi",
    label: "Objeto em destaque",
    when: "Livro, produto, ferramenta ou versículo. Um objeto grande, bem iluminado, fundo limpo e uma frase.",
    needsNumber: false,
  },
  erro_riscado: {
    id: "erro_riscado",
    label: "O erro riscado",
    when: "Vídeo do tipo pare de fazer isso. A palavra errada riscada e a certa ao lado.",
    needsNumber: false,
  },
  cena_real: {
    id: "cena_real",
    label: "Cena real",
    when: "Bastidor, rotina, viagem ou culto. Foto com cara de celular, texto mínimo, sem encenação.",
    needsNumber: false,
  },
  citacao: {
    id: "citacao",
    label: "Citação",
    when: "Frase forte, trecho de livro ou versículo. A tipografia é a estrela, o rosto fica pequeno ou some.",
    needsNumber: false,
  },
};

export const GUIA_CAPAS = `COMO PENSAR A CAPA
- Uma ideia só e um ponto focal só. A capa precisa ser entendida em cerca de 3 segundos, no celular.
- Contraste vale mais que a cor em si: forma clara sobre fundo escuro, ou o contrário. No máximo 3 cores, uma delas de destaque.
- Rosto com emoção legível chama mais que rosto neutro. O olhar guia o olhar: se o texto é o que vende, o rosto olha para o texto; se a marca pessoal é o que vende, olha direto para a câmera.
- Texto: 3 a 5 palavras no máximo, que completam o título do vídeo e não o repetem. Fonte grossa, sem serifa, com contraste forte (faixa, sombra ou contorno se o fundo for foto).
- Curiosidade sem mentira: a capa abre uma pergunta que o vídeo responde. Nunca prometa o que o texto-fonte não diz.
- Rosto e palavras ficam na faixa central (4:5), e a capa ainda precisa funcionar se for cortada em quadrado.
- Escolha o estilo da capa pelo tipo de vídeo, e dê 3 opções de estilos diferentes.

COMO NÃO PARECER FEITA POR IA
- Peça pele com poros e imperfeições, luz natural de ambiente real e foto de celular, nunca estúdio de catálogo.
- Evite brilhos, partículas, neon, roxo e gradiente genérico, rosto simétrico demais e mãos em destaque.
- Cada elemento da imagem precisa ter um motivo. Sem estrelas, raios ou ícones soltos.
- Cenário real do tema (um escritório de verdade, uma sala de verdade), nunca um fundo abstrato.`;

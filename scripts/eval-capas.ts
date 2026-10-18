// Teste de aceite das capas: 5 temas, o prompt ANTIGO (campo de capa do roteiro) contra os 3 prompts NOVOS (agente de capas).
// Rodar:   NODE_USE_ENV_PROXY=1 node --conditions=react-server --import tsx scripts/eval-capas.ts [--dry]
// (a condição react-server neutraliza o pacote "server-only" fora do Next)
// Precisa de TYPESAFE_API_KEY (jev) e OPENROUTER_API_KEY ou OPENROUTER_DEV_KEY (IA). Sem elas, só mostra o comando.
// Custa dinheiro de IA de verdade (cerca de 4 chamadas por tema). --dry só lista os temas e não chama nada. Nenhuma chave é impressa.
// Saída: docs/avaliacoes/capas-AAAA-MM-DD.md, com os prompts lado a lado e uma linha "Escolha" por tema para o Raniel preencher.
import fs from "node:fs";
import path from "node:path";

try {
  process.loadEnvFile(".env.local");
} catch {
  // sem .env.local: usa só o ambiente
}
delete process.env.AI_MOCK;

const COMMAND = "NODE_USE_ENV_PROXY=1 node --conditions=react-server --import tsx scripts/eval-capas.ts";

type Theme = { id: string; label: string; title: string; text: string };

/** Textos de exemplo escritos só para esta bateria (não são de nenhum cliente). */
const THEMES: Theme[] = [
  {
    id: "fe",
    label: "Fé e devocional",
    title: "Quando a ansiedade aperta",
    text: "A ansiedade costuma chegar à noite, quando a casa silencia e a cabeça começa a repassar tudo o que pode dar errado. A Bíblia não ignora esse cansaço: pede que a gente entregue a preocupação a Deus, uma de cada vez. Hoje vou mostrar um hábito simples de três minutos antes de dormir: escrever a preocupação num papel, orar por ela com uma frase curta e deixar o papel fora do quarto. Não resolve tudo, mas devolve o sono e a calma para o dia seguinte.",
  },
  {
    id: "financas",
    label: "Finanças",
    title: "Organize o dinheiro da casa",
    text: "A maioria das famílias não perde dinheiro por ganhar pouco, e sim por não saber para onde ele vai. Existem 7 erros comuns no controle do orçamento: misturar contas pessoais com as da casa, não separar um valor para imprevistos, parcelar sem somar as parcelas, esquecer as despesas anuais, não revisar assinaturas, gastar antes de anotar e nunca conversar sobre dinheiro em família. Corrigir só os três primeiros já deixa o mês mais leve.",
  },
  {
    id: "educacao",
    label: "Educação",
    title: "Como estudar sem se cansar",
    text: "Estudar muitas horas seguidas parece produtivo, mas a memória funciona melhor em blocos curtos com pausas. O método dos 25 minutos de foco e 5 de descanso ajuda a manter a atenção. Revisar o conteúdo no dia seguinte, em voz alta, fixa mais do que reler três vezes no mesmo dia. E dormir bem na véspera da prova vale mais do que virar a noite estudando.",
  },
  {
    id: "livro",
    label: "Livro e leitura",
    title: "O livro que mudou minha rotina",
    text: "Li um livro sobre hábitos pequenos que me fez rever a minha manhã. A ideia central é que mudar a identidade vale mais do que perseguir metas: em vez de querer correr uma maratona, a pessoa decide ser alguém que se movimenta todo dia. Comecei com cinco minutos de caminhada e deixei o tênis ao lado da cama. O que mais me marcou foi perceber que o ambiente decide muito mais do que a força de vontade.",
  },
  {
    id: "bastidor",
    label: "Bastidor e rotina",
    title: "Meu bastidor de gravação",
    text: "Gravar em casa parece simples, mas tem uma rotina por trás. Eu escolho o horário em que a janela dá luz suave, apoio o celular numa pilha de livros na altura dos olhos e leio o roteiro uma vez antes de apertar o botão. Quando erro, não paro: respiro, repito a frase e sigo. No final, assisto ao primeiro minuto para conferir som e rosto antes de guardar o material.",
  },
];

function box(text: string): string {
  return ["```", text.trim(), "```"].join("\n");
}

async function main() {
  if (process.argv.includes("--dry")) {
    console.log(`Ensaio: ${THEMES.length} temas, nenhuma chamada de IA.`);
    for (const t of THEMES) console.log(`  - ${t.id}: ${t.label} (${t.text.length} caracteres)`);
    console.log(`\nPara valer, rode:\n  ${COMMAND}`);
    return;
  }
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_DEV_KEY;
  if (!process.env.TYPESAFE_API_KEY || !key) {
    console.log("Bateria pulada: faltam chaves (TYPESAFE_API_KEY e OPENROUTER_API_KEY ou OPENROUTER_DEV_KEY) no .env.local.");
    console.log(`Quando tiver, rode:\n  ${COMMAND}`);
    return;
  }
  const { userAiFrom } = await import("../src/lib/ai");
  const { createOpenRouterAi } = await import("../src/lib/ai/openrouter");
  const { scoreCovers } = await import("../src/lib/ai/typesafe");
  const { capasAgent } = await import("../src/lib/ai/agents/capas");
  const { COVER_STYLES } = await import("../src/lib/ai/agents/capas-guia");
  const { buildScriptUser, SCRIPT_SYSTEM } = await import("../src/lib/script/prompts");
  const { ScriptSchema } = await import("../src/lib/script/generate");

  const ai = userAiFrom(createOpenRouterAi(key));
  const today = new Date().toISOString().slice(0, 10);
  const out: string[] = [
    `# Avaliação das capas: antigo contra novo (${today})`,
    "",
    "Para cada tema há o prompt ANTIGO (o campo de capa do roteiro) e as 3 opções NOVAS do agente de capas.",
    "Como avaliar: cole o prompt no ChatGPT, anexe a sua foto (ela é a Imagem 1) e compare as imagens.",
    "Preencha a linha **Escolha** de cada tema. Critério de sucesso: o novo vence em pelo menos 4 dos 5 temas, sem apontar cara de IA.",
    "",
  ];

  for (const t of THEMES) {
    console.log(`Tema ${t.id}...`);
    const interview = { platforms: ["reels" as const], mainSeconds: 60 };
    // ANTIGO: o mesmo pedido de roteiro de hoje, de onde vinha o `mainCoverPrompt`.
    const script = await ai.generateJson(ScriptSchema, SCRIPT_SYSTEM, buildScriptUser({ sourceText: t.text, interview, profile: null, episode: null, platforms: interview.platforms, mainSeconds: 60 }));
    // NOVO: o agente de capas.
    const covers = await capasAgent({ ai, score: scoreCovers }, { ctx: { sourceText: t.text, title: t.title, platforms: interview.platforms, mainSeconds: 60 } });

    out.push(`## ${t.label}: ${t.title}`, "", "### Antigo", box(script.mainCoverPrompt), "");
    covers.forEach((c, k) => {
      const label = COVER_STYLES[c.type as keyof typeof COVER_STYLES]?.label ?? c.type;
      out.push(`### Novo ${k + 1}${c.best ? " (a melhor, pela nota do jev)" : ""}: ${label}`, `Texto na capa: **${c.words}** | nota ${c.score.toFixed(2)}`, `Por que: ${c.why}`, box(c.prompt), "");
    });
    out.push("**Escolha:** antigo | novo", "", "---", "");
  }

  const dir = path.join("docs", "avaliacoes");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `capas-${today}.md`);
  fs.writeFileSync(file, out.join("\n"));
  console.log(`\nResultado salvo em ${file}`);
}

main().catch((e) => {
  const err = e as { userMessage?: string; code?: string };
  // Só a mensagem segura; nunca o objeto de erro inteiro (pode carregar cabeçalhos).
  console.error("Bateria falhou:", err.userMessage ?? (e as Error).name, err.code ?? "");
  process.exitCode = 1;
});

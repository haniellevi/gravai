# Agente de capas: plano de implementação

> **Para quem for executar:** use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans. Os passos usam caixas `- [ ]`.

**Objetivo:** trocar a linha "descrição da capa" do prompt do roteiro por um agente que entrega 3 opções de capa (3 "estilos da capa"), com a melhor marcada, prontas para colar no ChatGPT (gpt-image).

**Arquitetura:** agente no mesmo padrão de `hooks.ts` e `titulos.ts` (`pickBest`, nota do jev, `contextBlock`). A IA preenche campos de uma "direção criativa"; o prompt final é montado por **código** a partir de um modelo fixo. As 3 opções ficam em `interview.scriptAgents.covers` (vídeo principal) e em `cut.coverOptions` (cortes). Se algo falhar, vale o `coverPrompt` antigo.

**Stack:** TypeScript, Next.js (server actions), Zod, vitest (`tests/unit/**/*.test.ts`), provedor falso em `src/lib/ai/mock.ts`, jev via `@typesafe-ai/sdk`.

**Spec:** `docs/superpowers/specs/2026-10-18-agente-capas-design.md`. Conhecimento: `docs/conhecimento/capas-biblioteca.md`.

## Desvio do desenho (aviso ao Raniel)

O desenho previa a migração `0018_capas.sql` com a coluna `cover_options`. O código já guarda as saídas dos agentes dentro do JSON da entrevista (`interview.scriptAgents`, que guarda ganchos e fechos) e dos cortes (`projects.cuts`). Este plano segue esse padrão: **não há migração nova** e portanto nada para aplicar no Supabase antes do deploy. O restante do desenho vale como está.

## Restrições globais

- Texto da tela em português simples. A palavra "fórmula" **não aparece** na tela; aparece **"estilo da capa"**.
- **3 opções** por rodada, a melhor marcada e primeira (como nos títulos).
- Palavras escritas na capa: **de 1 a 5**. Prompt final: **no máximo 2000 caracteres** (`MAX_COVER` sobe de 1000 para 2000).
- Nenhum travessão ("—" ou "–") em texto gerado (o detector `findSlop` já proíbe).
- "Refazer capas" **não conta** na cota de projetos nem de minutos; trava de **10 refazeres por vídeo por hora**.
- Falha do agente, da nota do jev ou timeout **nunca** impede salvar o roteiro ou os cortes: vale o `coverPrompt` antigo.
- Tempos dentro dos 300 s da função: o agente de capas só começa se `elapsed < 190_000 ms` e tem teto de `70_000 ms`.
- Commits terminam com `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Nada é enviado ao GitHub nem ao Vercel sem o "sim" do Raniel.

## Review Focus (entradas que o desenho não cobre)

1. Texto-fonte vazio ou muito curto: o agente falha ou devolve pouco; o roteiro ainda salva com o `coverPrompt` antigo (teste na Tarefa 4).
2. Texto em inglês ou espanhol: as palavras da capa ficam no idioma do texto, e a checagem de acentos só reprova formas sem acento que não existem em nenhuma dessas línguas (teste na Tarefa 2).
3. Estilo "número grande" com um número que não está no texto-fonte: reprovado, pois seria prometer o que o vídeo não diz (teste na Tarefa 2).
4. O jev fora do ar (a função de nota lança erro): o roteiro salva do mesmo jeito (teste na Tarefa 4).
5. Dados antigos: projeto sem `covers`, corte sem `coverOptions`, `coverPrompt` antigo de até 2000 letras, e `coverOptions` adulterado vindo do navegador (testes nas Tarefas 5 e 6).
6. Limite de refazeres: o 10º passa, o 11º é barrado, e registros com mais de 1 hora saem da conta (teste na Tarefa 6).

---

## Mapa de arquivos

| Arquivo | O que faz |
|---|---|
| `src/lib/ai/agents/capas-guia.ts` (novo) | Os 8 estilos da capa e os textos de orientação para a IA, tirados da biblioteca. |
| `src/lib/ai/agents/capas-prompt.ts` (novo) | Puro: monta o prompt final e valida a direção criativa. |
| `src/lib/ai/agents/capas.ts` (novo) | O agente: briefing, 3 direções, nota do jev, checagens. |
| `src/lib/ai/typesafe.ts`, `index.ts`, `mock.ts` | Nota do jev para capas (`scoreCovers`). |
| `src/lib/interview/steps.ts` | Tipos `CoverOption`, `scriptAgents.covers`, `coverRegens`. |
| `src/lib/script/generate.ts`, `db.ts` | Roda o agente ao gerar o roteiro e salva as opções. |
| `src/lib/script/cuts.ts`, `cuts-generate.ts` | `coverOptions` no corte, `MAX_COVER = 2000`, agente por corte. |
| `src/lib/script/covers.ts` (novo) | Puro: trava de refazeres. |
| `src/lib/script/actions.ts` | Ação `regenerateCovers`. |
| `src/components/script/CoverOptions.tsx` (novo), `VideoInfo.tsx`, `CutsPanel.tsx`, `script.module.css` | Tela. |
| `scripts/eval-capas.ts` (novo), `package.json` | Teste de aceite: 5 temas, antigo contra novo. |
| `tests/unit/capas-*.test.ts` (novos) | Testes. |

---

### Tarefa 0: Branch

- [ ] **Passo 1:** `git fetch origin && git switch -c feat/agente-capas origin/main` (o `fetch` precisa de rede fora do sandbox). Esperado: branch nova a partir da `main` com a lixeira.
- [ ] **Passo 2:** `npm test` roda tudo verde antes de mexer em qualquer coisa. Anote quantos testes passam.

### Tarefa 1: Os estilos da capa

**Arquivos:** criar `src/lib/ai/agents/capas-guia.ts`; testar em `tests/unit/capas-guia.test.ts`.

**Interfaces — produz:**
```ts
export const COVER_STYLE_IDS = ["rosto_emocao","numero_grande","antes_depois","pergunta","objeto_heroi","erro_riscado","cena_real","citacao"] as const;
export type CoverStyleId = (typeof COVER_STYLE_IDS)[number];
export type CoverStyle = { id: CoverStyleId; label: string; when: string; needsNumber: boolean };
export const COVER_STYLES: Record<CoverStyleId, CoverStyle>;
export const GUIA_CAPAS: string;   // texto para o prompt de sistema
```

- [ ] **Passo 1: teste que falha.** `capas-guia.test.ts`: (a) `COVER_STYLE_IDS` tem 8 ids sem repetir e `COVER_STYLES` tem uma entrada por id; (b) cada `label` não vazio e **nenhum contém a palavra "fórmula"**; (c) só `numero_grande` tem `needsNumber: true`; (d) `GUIA_CAPAS` contém "3 a 5 palavras" e "faixa central" e não contém "—".
- [ ] **Passo 2:** rodar `npx vitest run tests/unit/capas-guia.test.ts`. Esperado: falha (módulo não existe).
- [ ] **Passo 3: implementar** `capas-guia.ts`. Os `label` em português simples ("Rosto com emoção", "Número grande", "Antes e depois", "A pergunta incômoda", "Objeto em destaque", "O erro riscado", "Cena real", "Citação"); `when` copia a seção 5 da biblioteca. `GUIA_CAPAS` resume as seções 1 a 4 e 8 da biblioteca (atenção, tipografia, cor, zonas seguras, anti "cara de IA") em frases curtas.
- [ ] **Passo 4:** o teste passa.
- [ ] **Passo 5:** commit `feat(capas): estilos da capa e guia para a IA`.

### Tarefa 2: Montar o prompt e validar a direção

**Arquivos:** criar `src/lib/ai/agents/capas-prompt.ts`; testar em `tests/unit/capas-prompt.test.ts`.

**Interfaces — consome:** `CoverStyleId`, `COVER_STYLES`. **Produz:**
```ts
export type CoverBrief = { theme: string; promise: string; keywords: string[]; emotion: string; niche: "fe"|"financas"|"educacao"|"livro"|"saude"|"outro"; format: "9:16"|"16:9"; platform: string };
export type CoverDirection = { style: CoverStyleId; words: string; emotion: string; gaze: "texto"|"camera"; colors: { main: string; support: string; accent: string }; facePosition: "esquerda"|"direita"|"centro"; textPosition: "cima"|"baixo"|"lado"; scene: string; trigger: "curiosidade"|"contraste"|"rosto"|"erro"|"numero"; why: string };
export const MAX_COVER_WORDS = 5;
export const MAX_COVER_PROMPT = 2000;
export function buildCoverPrompt(d: CoverDirection, b: CoverBrief): string;
export function validateDirection(d: CoverDirection, sourceText: string): string[]; // lista de problemas; vazia = ok
```

- [ ] **Passo 1: testes que falham** (`capas-prompt.test.ts`), com uma direção e um briefing de exemplo:
  - `buildCoverPrompt` sempre contém: `photorealistic`, `Imagem 1`, as palavras entre aspas **uma vez só** (contar ocorrências = 1), `faixa central 4:5`, `sem texto extra`, `sem marca d'água`, `no heavy retouching`, e a expressão e o olhar escolhidos; nunca contém "—".
  - Para `format: "16:9"` o prompt diz "horizontal 16:9" e **não** diz "faixa central 4:5"; para "9:16" o contrário.
  - O tamanho fica ≤ `MAX_COVER_PROMPT` mesmo com `scene` de 200 caracteres.
  - `validateDirection` reprova: `words` vazia; `words` com 6 palavras (mensagem cita o limite de 5); `words` com "VOCE ERRA" (acento faltando) e **aprova** "VOCÊ ERRA"; `scene` com "neon", "roxo", "futurista" ou "brilhos" (sem diferenciar acento ou caixa); estilo `numero_grande` com `words` sem dígito, e com um dígito que **não está** em `sourceText`; e **aprova** `numero_grande` com "7 ERROS" quando `sourceText` contém "7".
  - Texto em inglês ("STOP DOING THIS") passa; o idioma não é checado.
- [ ] **Passo 2:** rodar; esperado: falha.
- [ ] **Passo 3: implementar.** `buildCoverPrompt` monta blocos com rótulos em português (Uso, Cena, Pessoa, Composição, Texto, Cores, Restrições), na ordem da seção 7 da biblioteca. `validateDirection` usa uma lista fixa de formas sem acento que não existem em português, inglês ou espanhol (`voce`, `nao`, `tambem`, `entao`, `atencao`, `licao`, `decisao`), comparando a palavra inteira sem diferenciar caixa.
- [ ] **Passo 4:** os testes passam.
- [ ] **Passo 5:** commit `feat(capas): montador de prompt e validação da direção`.

### Tarefa 3: Nota do jev para capas

**Arquivos:** modificar `src/lib/ai/typesafe.ts`, `src/lib/ai/index.ts`, `src/lib/ai/mock.ts`; testar em `tests/unit/capas-score.test.ts`.

**Interfaces — produz:**
```ts
// typesafe.ts, index.ts, mock.ts
export async function scoreCovers(texts: string[], context: string): Promise<number[]>; // 0..1, na ordem dos textos
// mock.ts: "scoreCovers" entra em MockFn
```

- [ ] **Passo 1: teste que falha:** com `setMockResponse("scoreCovers", [0.2, 0.9])`, `scoreCovers(["a","b","c"], "x")` devolve 3 notas girando a lista (como `scoreClosing` no mock) e `getMockCalls("scoreCovers")` vale 1.
- [ ] **Passo 2:** rodar; esperado: falha.
- [ ] **Passo 3: implementar** seguindo `scoreClosing`: em `typesafe.ts`, uma constante `COVER_LEVELS` de 5 níveis ("Capa sem ponto focal, texto demais ou genérica" até "Capa excelente: uma ideia só, lê de relance no celular, curiosidade sem mentira") e a pergunta "Quanto esta ideia de capa de vídeo curto chamaria atenção no feed, lida de relance no celular?"; em `index.ts`, o wrapper `useMock()` igual aos vizinhos.
- [ ] **Passo 4:** o teste passa.
- [ ] **Passo 5:** commit `feat(ai): nota do jev para capas`.

### Tarefa 4: O agente de capas

**Arquivos:** criar `src/lib/ai/agents/capas.ts`; modificar `src/lib/interview/steps.ts`; testar em `tests/unit/capas-agent.test.ts`.

**Interfaces — consome:** `AgentContext`, `contextBlock`, `pickBest`, `Scored`, `UserAi`, `GUIA_CAPAS`, `COVER_STYLE_IDS`, `buildCoverPrompt`, `validateDirection`, `scoreCovers`. **Produz:**
```ts
// steps.ts
export type CoverOption = { type: string; text: string; words: string; why: string; prompt: string; score: number; best: boolean };
// ScriptAgentOptions ganha: covers?: CoverOption[];   Interview ganha: coverRegens?: number[];
// capas.ts
export type CoverScoreFn = (texts: string[], context: string) => Promise<number[]>;
export type CoversDeps = { ai: UserAi; score: CoverScoreFn };
export const CoverBriefSchema; export const CoverDirectionsSchema; // Zod, .meta({ title: "agent_cover_brief" | "agent_cover_directions" })
export async function capasAgent(deps: CoversDeps, input: { ctx: AgentContext; hook?: string | null }): Promise<Scored<CoverOption>[]>;
```

- [ ] **Passo 1: testes que falham** (seguir o estilo dos testes de `hooksAgent` em `tests/unit/agents.test.ts`, com `setMockResponse`):
  - Com um briefing e 3 direções válidas de estilos diferentes no provedor falso: devolve 3 opções, a de maior nota vem primeiro com `best: true`, cada `prompt` contém `Imagem 1` e as `words` entre aspas, e `type` é um id de `COVER_STYLE_IDS`.
  - A direção com 6 palavras é refeita uma vez; se a segunda tentativa vier válida, entra no resultado (o provedor falso recebe 3 chamadas de `generateJson`: briefing, direções, refazer).
  - Duas direções com o mesmo estilo: só uma sobrevive (regra do `pickBest`).
  - `capasAgent` com `score` que lança erro **lança** (quem chama é que trata) e com texto-fonte vazio e o provedor devolvendo lista vazia lança `AiError` com `code: "invalid_output"`.
  - O `user` enviado à IA contém o título e, se houver, o gancho.
- [ ] **Passo 2:** rodar; esperado: falha.
- [ ] **Passo 3: implementar.** Passo 1 do agente: uma chamada `generateJson(CoverBriefSchema, SYSTEM_BRIEF, contextBlock(ctx) + hook)`. Passo 2: `pickBest` com `types = COVER_STYLE_IDS`, `generate` pedindo 3 direções de estilos diferentes (e o `redo` dizendo o problema), onde cada direção passa por `validateDirection` e as reprovadas são descartadas (o `pickBest` já refaz o que faltar). Cada opção vira `{ type: style, text: "<words> | <scene>", words, why, prompt: buildCoverPrompt(d, brief) }`; o texto descritivo vai para o jev junto com o tema do briefing como contexto.
- [ ] **Passo 4:** os testes passam; `npx tsc --noEmit` sem erros.
- [ ] **Passo 5:** commit `feat(capas): agente de capas em 3 passos`.

### Tarefa 5: Ligar ao roteiro e aos cortes

**Arquivos:** modificar `src/lib/script/generate.ts`, `src/lib/script/db.ts`, `src/lib/script/cuts.ts`, `src/lib/script/cuts-generate.ts`, `src/lib/script/actions.ts`; testar em `tests/unit/capas-wiring.test.ts` e estender `tests/integration/script-save.test.ts` e `tests/integration/cuts.test.ts`.

**Interfaces — consome:** `capasAgent`, `CoverScoreFn`, `CoverOption`. **Produz:**
```ts
// generate.ts: ScriptDeps.agents ganha scoreCover: CoverScoreFn
// cuts.ts: Cut ganha coverOptions?: CoverOption[]; MAX_COVER = 2000; validateCuts mantém coverOptions saneado
// cuts-generate.ts: suggestCutsWith deps ganha covers?: { score: CoverScoreFn }
```

- [ ] **Passo 1: testes que falham:**
  - Roteiro (`generateScriptWith`, banco em memória como em `script-save.test.ts`): com agente que devolve 3 opções, o `saveScript` recebe `coverPrompt` igual ao prompt da melhor e `interview.scriptAgents.covers` com 3 itens.
  - Com o agente lançando erro (inclusive `scoreCover` lançando): o roteiro **salva** e `coverPrompt` é o `mainCoverPrompt` que a IA do roteiro devolveu; `scriptAgents.covers` ausente. (Review Focus 1 e 4.)
  - Se `elapsed >= 190_000` (`now` injetado), o agente de capas nem roda.
  - `validateCuts` aceita corte sem `coverOptions` e com `coverPrompt` de 1500 letras; rejeita `coverPrompt` de 2001; com `coverOptions` de 5 itens, mantém só 3; descarta itens que não são objetos e corta `prompt` em 2000 e `why`/`words` em 200 letras. (Review Focus 5.)
  - `suggestCutsWith` com `covers` preenche `coverOptions` e `coverPrompt` de cada corte pela melhor opção; um corte cujo agente falha mantém o `coverPrompt` da IA dos cortes.
- [ ] **Passo 2:** rodar; esperado: falha.
- [ ] **Passo 3: implementar.** Em `generate.ts`: depois do agente de fecho e antes de montar `interview`, mesmo padrão do bloco do fecho (`withTimeout`, `try/catch` com `console.error("[script] agente de capas falhou", …)`), com `COVER_AGENT_MS = 70_000` e `COVER_START_BEFORE_MS = 190_000`; passar o gancho escolhido (`hook?.text`) e o título; gravar `scriptAgents.covers` e o `coverPrompt` da melhor. Em `actions.ts`, passar `scoreCover: scoreCovers` em `agents`. Em `cuts.ts`: subir `MAX_COVER`, aceitar e sanear `coverOptions`. Em `cuts-generate.ts`: um corte por vez com até 3 em paralelo (`Promise.allSettled` em lotes), teto de 60 s por corte e 100 s no total, usando como `sourceText` o texto dos blocos do corte e como título o do corte; antes de começar, ler o `maxDuration` da rota que chama `suggestCuts` e manter o total dentro dele (se for menor que 130 s, reduzir os tetos proporcionalmente).
- [ ] **Passo 4:** os testes passam; `npm test` completo verde.
- [ ] **Passo 5:** commit `feat(capas): agente roda ao gerar o roteiro e os cortes`.

### Tarefa 6: Refazer capas, com trava

**Arquivos:** criar `src/lib/script/covers.ts`; modificar `src/lib/script/actions.ts`, `src/lib/script/db.ts`; testar em `tests/unit/capas-regen.test.ts`.

**Interfaces — produz:**
```ts
// covers.ts
export const MAX_REGENS = 10; export const REGEN_WINDOW_MS = 3_600_000;
export function allowRegen(history: number[], now: number): { ok: boolean; history: number[] };
// db.ts: ScriptDb.saveCovers(projectId: string, data: { coverPrompt: string | null; interview: Interview }): Promise<boolean>
// actions.ts
export async function regenerateCovers(projectId: string, cutId?: string): Promise<{ ok: true; options: CoverOption[] } | ActionError>;
```

- [ ] **Passo 1: testes que falham:** `allowRegen`: com 9 registros recentes o próximo passa e devolve 10; com 10 recentes é barrado e o histórico não muda; registros com mais de `REGEN_WINDOW_MS` saem da conta (com 10 antigos, passa e devolve só o novo); histórico com valores que não são número é ignorado. A mensagem de erro para o usuário, quando barrado, é exatamente "Você refez muitas vezes seguidas. Tente de novo daqui a pouco." (Review Focus 6.)
- [ ] **Passo 2:** rodar; esperado: falha.
- [ ] **Passo 3: implementar** `allowRegen`, `saveCovers` (grava `interview` e `cover_prompt` do projeto com `userId`, como `saveScript`) e `regenerateCovers`: valida UUID, sessão, aplica `allowRegen` sobre `interview.coverRegens`, roda `capasAgent` (para `cutId`, usa o texto dos blocos do corte), grava as opções (no projeto ou no corte via `saveCuts`) e responde com `failure(e)` em erro. **Não** chama nenhuma função de cota de uso.
- [ ] **Passo 4:** os testes passam.
- [ ] **Passo 5:** commit `feat(capas): refazer capas com trava de 10 por hora`.

### Tarefa 7: A tela

**Arquivos:** criar `src/components/script/CoverOptions.tsx`; modificar `VideoInfo.tsx`, `CutsPanel.tsx`, `script.module.css`, `src/app/(app)/projetos/[id]/script/page.tsx`.

**Interfaces — consome:** `CoverOption`, `COVER_STYLES`, `regenerateCovers`. **Produz:**
```tsx
export function CoverOptions(props: { options: CoverOption[]; legacyPrompt: string | null; projectId: string; cutId?: string; compact?: boolean }): JSX.Element | null;
```

- [ ] **Passo 1: implementar** `CoverOptions`: para cada opção mostra o rótulo do estilo (`COVER_STYLES[type].label`), a etiqueta "Melhor" na marcada, a linha `why`, as palavras da capa, o prompt (recolhido em "Ver prompt" no modo `compact`), e o botão copiar com `aria-label` "Copiar prompt da capa: <estilo>". Acima da lista, exatamente: "Abra o ChatGPT, anexe a sua foto e cole o prompt. A sua foto será a Imagem 1." Botão "Refazer capas" que chama `regenerateCovers`, mostra "Refazendo…" e desabilita enquanto roda, e mostra o erro devolvido. Sem `options`, mostra o `legacyPrompt` como um cartão único (comportamento de hoje). Sem nada, devolve `null`.
- [ ] **Passo 2:** `VideoInfo` usa `CoverOptions` no lugar do cartão "Capa (prompt para IA)"; `page.tsx` passa `project.interview?.scriptAgents?.covers`; `CutsPanel` usa a versão `compact` dentro de "Capa e descrições".
- [ ] **Passo 3:** estilos em `script.module.css` seguindo as classes `infoCard`, `infoHead`, `iconBtn` que já existem (sem cores novas, sem roxo).
- [ ] **Passo 4: verificar de verdade.** `npx tsc --noEmit` sem erros e `npm test` verde. Subir o app (`npm run dev -- -p 3100`, mantendo o processo vivo) e, com o `AI_MOCK` do projeto se existir (procurar `useMock` em `src/lib/ai/index.ts` para saber a variável), abrir um vídeo com roteiro: ver as 3 opções, copiar, refazer; abrir um vídeo antigo sem opções e ver o cartão único. Conferir nos dois a tela no celular (largura de 390 px).
- [ ] **Passo 5:** commit `feat(capas): 3 opções de capa na tela, com refazer`.

### Tarefa 8: Teste de aceite (5 temas)

**Arquivos:** criar `scripts/eval-capas.ts`; modificar `package.json`; resultado em `docs/avaliacoes/`.

- [ ] **Passo 1:** `scripts/eval-capas.ts`, no molde de `scripts/eval-roteiro.ts` e `tests/evals/harness.ts`: 5 temas fixos (fé, finanças, educação, livro, bastidor), cada um com um texto-fonte de ~600 caracteres; para cada tema escreve o `mainCoverPrompt` antigo (a chamada de roteiro de antes) e as 3 opções novas, e salva um único arquivo `docs/avaliacoes/capas-AAAA-MM-DD.md` com os prompts lado a lado e uma linha em branco "Escolha: antigo | novo" por tema.
- [ ] **Passo 2:** em `package.json`, `"eval:capas": "NODE_USE_ENV_PROXY=1 node --conditions=react-server --import tsx scripts/eval-capas.ts"`.
- [ ] **Passo 3:** rodar `npm run eval:capas` (usa a IA e a chave do Raniel, então só com o "sim" dele) e entregar o arquivo. O Raniel cola os 5 prompts novos no ChatGPT com a própria foto e escolhe. **Critério de sucesso:** o novo vence em pelo menos 4 dos 5 temas, sem "cara de IA" apontada.
- [ ] **Passo 4:** commit `feat(capas): avaliação de 5 temas, antigo contra novo`.

### Tarefa 9: Fechamento

- [ ] **Passo 1:** `npx tsc --noEmit` e `npm test` verdes; `npm run build` (webpack, como no Vercel) passa.
- [ ] **Passo 2:** `git push` da branch e PR para a `main` (só com o "sim" do Raniel). O merge e o deploy dependem de outro "sim".
- [ ] **Passo 3:** atualizar `projetos/gravai.md` no Segundo Cérebro com o estado e o próximo passo (agente de fala, etapa 1).

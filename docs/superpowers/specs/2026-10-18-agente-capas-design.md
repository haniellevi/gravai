# Agente de capas: desenho

Data: 2026-10-18. Caminho: arquitetural. Estado: aguardando revisão do Raniel.
Base de conhecimento: `docs/conhecimento/capas-biblioteca.md` (rótulos de confiança [OFICIAL] [ESTUDO] [PRÁTICA] [TESTAR]).

## 1. Entendimento combinado

**O problema (palavras do Raniel):** a geração de prompt de capa está "muito ruim", com "cara de IA". A capa precisa de tratamento
profissional: contexto do tema, técnicas de design, tipografia, marketing, neuromarketing e gatilhos visuais, para chamar atenção nas redes.

**Causa encontrada no código:** a capa não tem agente. Ela é um campo do prompt do roteiro (`mainCoverPrompt` em
`src/lib/script/prompts.ts` e `coverPrompt` em `src/lib/script/cuts.ts`): "descrição da capa do vídeo". A mesma chamada que escreve o roteiro
escreve a capa de passagem, sem referência, sem técnica, sem checagem.

**Decisões já tomadas:**
- Opção A: agente de capas dedicado, em 3 passos (contexto, direção criativa, prompt final).
- O gerador de imagem é o **ChatGPT / Codex (gpt-image)**. O app não gera a imagem; entrega o prompt para o usuário colar.
- A capa **mostra o rosto do criador**, a partir da foto que o usuário anexa.
- Referências em **duas fases**: fase 1 é a biblioteca de conhecimento dentro do agente; fase 2 é a busca de referências na hora.

**Sucesso =** num teste com **5 temas diferentes**, o Raniel olha as capas geradas com o prompt antigo e com o novo e escolhe o novo na maioria,
sem apontar "cara de IA". Esse teste é o critério de aceite da fase 1.

**Fora desta entrega:** agente de fala (outro desenho), gerar a imagem dentro do app, guardar a foto do criador, busca no Pinterest.

## 2. Abordagem

O agente segue o padrão que os agentes de título e de gancho já usam (`src/lib/ai/agents/titulos.ts`): esquema Zod, `deps.ai.generateJson`,
`contextBlock`, e `pickBest` com nota do jev para escolher a melhor opção.

**Ideia central: o prompt final é montado por código, não escrito livremente pela IA.** A IA só preenche campos (fórmula, emoção, palavras da capa,
cores, olhar). Um modelo fixo de prompt, em código, junta tudo. Assim as regras que importam (fotorrealismo, texto entre aspas e uma vez só,
rosto travado, lista anti "cara de IA", faixa central 4:5) estão **sempre** no prompt, e não dependem da IA lembrar.

### Passo 1: Contexto (1 chamada de IA)
Entrada: o `AgentContext` que já existe (texto-fonte, título, perfil, estilo da pasta, plataformas, episódio, gancho escolhido).
Saída (JSON): tema em uma frase, promessa do vídeo, 3 a 6 palavras-chave, emoção dominante, nicho visual (fé, finanças, educação, livro, saúde, outro),
plataforma principal e formato (9:16 ou 16:9).

### Passo 2: Direção criativa (1 chamada de IA + nota do jev)
A IA propõe **3 direções**, cada uma com uma fórmula **diferente** das 8 da biblioteca (rosto com emoção, número grande, antes e depois, pergunta
incômoda, objeto herói, erro riscado, cena real, citação). Cada direção tem: fórmula, 3 a 5 palavras da capa, emoção do rosto, olhar (para o texto
ou para a câmera, conforme a regra da biblioteca), até 3 cores com uma de destaque, posição do rosto e do texto, cenário real do tema, e o gatilho
visual usado (curiosidade, contraste, rosto, erro, número).
O jev dá nota a cada direção; a melhor é marcada, como já acontece nos títulos.

### Passo 3: Prompt final (código, sem IA)
Um montador junta a direção ao modelo da seção 9 da biblioteca e entrega o texto pronto para o gpt-image, em português, com:
foto como "Imagem 1", fotorrealismo, texto entre aspas e uma vez só, fonte grossa sem serifa, contraste, faixa central 4:5, restrições anti "cara de IA".

### Checagens (código, depois de cada direção)
- Palavras da capa: de 1 a 5. Mais que isso, refaz.
- Acentos: nenhuma palavra com acento faltando em termos comuns (lista simples de checagem).
- Proibidos no prompt gerado: "neon", "roxo", "futurista", "brilhos". Se a IA colocar na cenografia, refaz.
- As 3 direções têm fórmulas diferentes.
- Respeita o que o roteiro promete: o texto da capa não pode afirmar o que o texto-fonte não diz (mesma regra dos títulos).
- Tamanho do prompt final cabe no limite (ver seção 4).

Se uma checagem falhar, refaz só aquela direção, uma vez (o mesmo padrão `redo` do `pickBest`). Se falhar de novo, usa a melhor das que passaram; se
nenhuma passar, cai no comportamento antigo (campo `coverPrompt` do roteiro) e avisa no log, para o app nunca ficar sem capa.

## 3. Onde entra no app

- **Quando roda:** depois que o roteiro é salvo, no mesmo ponto onde os agentes de título e gancho já são chamados (o plano confirma o lugar
  exato em `generate.ts`). Para os cortes, roda depois que os cortes são definidos. O roteiro deixa de pedir a capa à IA do roteiro
  (o campo antigo fica como plano B).
- **O que o usuário vê** (no cartão "Capa", hoje em `src/components/script/VideoInfo.tsx`, e no cartão de cada corte):
  - 3 opções de capa, cada uma com o nome da fórmula e uma linha dizendo por que serve ao vídeo; a melhor vem marcada.
  - Botão **Copiar prompt** em cada uma.
  - Instrução clara acima do botão: "Abra o ChatGPT, anexe a sua foto e cole o prompt. A sua foto será a Imagem 1."
  - Botão **Refazer capas** (outra rodada de 3 direções).
- **Texto da tela:** português simples, sem jargão ("fórmula" aparece como "estilo da capa").

## 4. Dados

- `cover_prompt` continua guardando o prompt da opção escolhida (compatível com tudo que já lê esse campo).
- Nova coluna `cover_options jsonb` em `projects` (e `coverOptions` dentro do JSON de cada corte) com as 3 direções, a escolhida e o prompt de cada uma.
  Migração nova `0018_capas.sql`. Precisa ser aplicada no Supabase **antes** do deploy, como foi a da lixeira.
- O limite `MAX_COVER = 1000` em `src/lib/script/cuts.ts` é pequeno para o modelo de prompt (cerca de 1.200 a 1.600 caracteres).
  Sobe para 2.000.

## 5. Custo e limites

- Passos 1 e 2: duas chamadas de IA por rodada, mais a nota do jev, na conta de IA do próprio usuário (mesmo mecanismo de `withUserAi` e do uso já registrado).
- Registrar o custo no uso existente (`src/lib/ai/usage.ts`), com nome de agente próprio, para aparecer separado.
- O botão "Refazer capas" **não conta** no limite de uso de projetos e minutos (decisão do Raniel, 2026-10-18). O custo continua registrado no
  uso, só que fora da cota. Como a IA é a conta do próprio usuário, o gasto é dele. Para evitar um loop sem querer, o app aceita no máximo
  10 refazeres por vídeo por hora (trava simples, sem relação com a cota). O número é ajustável no plano.

## 6. Erros

- IA fora do ar ou resposta inválida: cai no `coverPrompt` antigo e o app segue; o usuário vê uma capa, só sem as 3 opções.
- Sem texto-fonte suficiente: o passo 1 devolve o que tiver; o montador usa fórmulas que não dependem de número ou citação.
- Nunca bloquear o roteiro por causa da capa.

## 7. Testes

- **Testes automáticos (vitest):** o montador de prompt (campos entram no lugar certo; todas as restrições sempre presentes), as checagens
  (5 palavras, acentos, proibidos, fórmulas diferentes), e o plano B quando a IA falha. Não precisam de IA real.
- **Avaliação com IA real**, no estilo de `eval:roteiro`: 5 temas fixos (fé, finanças, educação, livro, bastidor), prompt antigo contra novo, com
  o resultado guardado para o Raniel comparar. Esse é o teste de aceite da seção 1.
- **Teste manual:** gerar as imagens no ChatGPT com a foto do Raniel e ver o rosto, o texto e os acentos.

## 8. Fase 2 (não entra agora)

- Referências na hora: pela API oficial do Pinterest se for aprovada, ou o usuário cola links e imagens de referência que ele gosta.
- Guardar a foto do criador no perfil, para anexar sozinho.
- Gerar a imagem dentro do app (já previsto na fase 2 do produto) usando o mesmo prompt.
- Ajustar a biblioteca com o que o usuário realmente escolher (quais fórmulas vencem).

## 9. Riscos

- O gpt-image não é controlado por nós: prompt melhor reduz a cara de IA, mas não garante. Por isso o teste de aceite.
- Fé, livro e saúde estão como [TESTAR] na biblioteca. As primeiras capas desses temas podem precisar de ajuste.
- Acentos em português dentro da imagem podem sair errados mesmo com o prompt certo. Testar cedo.
- O recorte da grade do Instagram é incerto. A faixa central 4:5 é a escolha segura até testarmos.

## 10. Decisões do Raniel (2026-10-18)

1. Mostrar **3 opções** de capa, com a melhor marcada.
2. Na tela, a palavra "fórmula" vira **"estilo da capa"**.
3. "Refazer capas" **não conta** no limite de uso (com a trava simples de 10 por vídeo por hora, seção 5).

Em aberto: nenhuma. O próximo passo é a aprovação do desenho escrito e depois o plano de implementação.

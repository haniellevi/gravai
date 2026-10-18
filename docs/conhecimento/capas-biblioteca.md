# Biblioteca de capas do GravAI

Base de conhecimento para o agente de capas. Escrita em 2026-10-18, a partir de pesquisa na internet.
Este documento é pesquisa, não código. Ele alimenta o desenho do agente de capas (opção A, em 3 passos).

## Como ler os rótulos de confiança

Quase tudo que se acha na internet sobre capas é blog de criador ou de ferramenta. Não há estudo com dado aberto
sobre "% de cliques". Por isso cada regra tem um rótulo:

- **[OFICIAL]**: vem de documentação do fabricante (OpenAI).
- **[ESTUDO]**: estudo científico revisado (eye-tracking, Frontiers in Psychology).
- **[PRÁTICA]**: várias fontes de criadores concordam, mas sem dado aberto. Use como padrão, não como lei.
- **[TESTAR]**: hipótese razoável. Só vale depois de testar com capas reais.

Os números de "+38% de cliques com rosto" ou "+40% com alto contraste" aparecem em blogs sem fonte.
**Não devem entrar no app como fato.**

## 1. Princípios de atenção

1. **Um ponto focal só.** A capa precisa ser entendida em cerca de 3 segundos, no celular. [PRÁTICA]
2. **Contraste vale mais que a cor em si.** Uma forma clara sobre fundo escuro (ou o contrário) lê bem pequena. [PRÁTICA]
3. **Rosto com emoção legível** chama mais que rosto neutro. Rosto ocupando mais ou menos 20% a 35% do quadro. [PRÁTICA, números TESTAR]
4. **O olhar guia o olhar.** O olhar da pessoa direciona para onde o espectador olha. [ESTUDO]
   - Olhar **desviado, apontando para o título ou o objeto** aumenta a atenção ao texto e à mensagem e ajuda a lembrar.
   - Olhar **direto para a câmera** puxa a atenção para o rosto e pode tirar atenção do texto.
   - Regra do agente: se o texto é o que vende, o rosto olha para o texto. Se a marca pessoal é o que vende, olhar direto.
   - Limite: os estudos são com banners de anúncio, não com capas de vídeo. Tratar como boa hipótese.
5. **Curiosidade sem mentira.** A capa abre uma pergunta que o vídeo responde. Capa que promete o que o vídeo não entrega derruba confiança. [PRÁTICA]
6. **Espaço vazio é design.** Poucos elementos, margem respirando. [PRÁTICA]

## 2. Tipografia

- **3 a 5 palavras no máximo.** Menos é melhor. A capa não repete o título do vídeo, ela completa. [PRÁTICA]
- **Fonte grossa, sem serifa, de contorno limpo.** Evitar fina, cursiva e decorativa. Serifa pequena e fina some no celular. [PRÁTICA]
- **Cuidado com fonte muito condensada** com letras coladas, que vira borrão em tamanho pequeno. [PRÁTICA]
- **Contraste do texto:** texto claro em fundo escuro ou o contrário. Se o fundo for foto, usar faixa sólida, sombra ou contorno atrás das letras. [PRÁTICA]
- **Hierarquia:** uma palavra de destaque em tamanho ou cor diferente, o resto menor. Nunca três tamanhos brigando. [PRÁTICA]
- **Testar em tamanho real:** olhar a capa reduzida a cerca de 170 px de largura. Se não lê, está errada. [PRÁTICA]
- **Português:** pedir sempre acentos corretos e conferir. Acento errado derruba a credibilidade na hora. [TESTAR no gpt-image]

## 3. Cor

- **Complementares** (azul e amarelo, azul e laranja) dão contraste vivo. Evitar combinações que "brigam". [PRÁTICA]
- **Saturação alta chama atenção, mas cansa.** Baixa parece sofisticada, mas pode passar batido. Escolher conforme o tema. [PRÁTICA]
- **Quentes** (vermelho, laranja, amarelo) puxam o olhar no feed. **Azuis** passam confiança. [PRÁTICA, é regra de bolso]
- **Máximo de 3 cores** por capa, sendo uma de destaque. [PRÁTICA]
- Conferir se funciona no modo escuro e para quem tem daltonismo. [PRÁTICA]

## 4. Formatos e zonas seguras

| Onde | Formato | Cuidado |
|---|---|---|
| Reels, TikTok, Shorts | 9:16 (1080 x 1920) | Rosto e texto na faixa central, a área de 4:5. |
| Feed e grade do Instagram | Recorte central 4:5, ou 3:4, ou 1:1 | **As fontes discordam do recorte da grade.** Verificar num Reel de teste antes de fixar. [TESTAR] |
| YouTube | 16:9 | Não pôr texto no canto inferior direito, onde aparece a duração. Texto na parte de cima é mais seguro. |

Regra do agente: o rosto e as palavras ficam no centro e a capa ainda precisa funcionar se for cortada em quadrado.

## 5. Fórmulas de capa (o agente escolhe uma por vídeo)

Cada fórmula diz quando usar, o que tem e o que evitar.

1. **Rosto + emoção + 3 palavras.** Para opinião, testemunho, confronto, desabafo. Rosto grande de um lado, palavras do outro, olhar para o texto.
2. **Número grande.** Para lista, dado, resultado ("7 erros", "R$ 0 a R$ 10 mil"). O número é o herói da capa.
3. **Antes e depois.** Para transformação, correção, comparação. Dois lados bem separados, mesma moldura.
4. **A pergunta incômoda.** Para tema que gera dúvida. Uma pergunta curta em letra grande, rosto pensativo ou olhando de lado.
5. **Objeto herói.** Para livro, produto, ferramenta, versículo. Um objeto grande, iluminado, fundo limpo, uma frase.
6. **Erro riscado.** Para "pare de fazer X". A palavra errada riscada e a certa ao lado.
7. **Cena real.** Para bastidor, rotina, viagem, culto. Foto com cara de celular, texto mínimo, sem encenação.
8. **Citação.** Para frase forte, trecho de livro, versículo. Tipografia é a estrela, rosto pequeno ou sem rosto.

## 6. Estilos por tema

**Aviso:** as fontes só trouxeram dado para finanças, negócios e educação. Para fé, igreja e devocional não achei
nenhuma recomendação com base. O que está abaixo para esses temas é **[TESTAR]** e precisa de capas reais para validar.

- **Finanças e negócios:** paleta sóbria (azul-marinho, grafite, dourado, off-white), número grande como foco, linhas de gráfico discretas ao fundo. [PRÁTICA]
- **Educação e ensino:** texto grande e ícone relevante, tema entendido de relance. [PRÁTICA]
- **Fé, devocional e pregação:** [TESTAR] luz natural e calorosa, tipografia firme e respeitosa, rosto sereno ou de olhar firme, pouco ornamento. Evitar clichês de imagem pronta (pomba, raios de luz do céu, mãos para o alto) e céu em tom roxo.
- **Livro e leitura:** [TESTAR] fórmula 5 (objeto herói) ou 8 (citação), com tipografia forte.
- **Saúde e bem-estar:** [TESTAR] cores limpas e claras, rosto tranquilo, texto curto e direto.

## 7. Como pedir ao gpt-image (fonte oficial da OpenAI)

**Estrutura do prompt** [OFICIAL]: cena e fundo, depois sujeito, depois detalhes, depois restrições. Dizer para que serve ("capa
de vídeo vertical para Reels"). Usar blocos curtos com rótulos, não um parágrafo gigante.

**Fotorrealismo** [OFICIAL]:
- Escrever a palavra "photorealistic" ou "real photograph" ou "iPhone photo".
- Pedir textura real: poros, rugas, tecido gasto, imperfeições.
- Evitar palavras de estúdio e polimento. Acrescentar "no heavy retouching".
- Termos de câmera (lente, abertura) valem só para o jeito geral da imagem, o modelo não simula com precisão.
- Qualidade alta quando houver texto pequeno ou retrato de perto.

**Texto na imagem** [OFICIAL]:
- Texto literal entre aspas, e pedir que apareça **uma vez só**, sem letras extras.
- Dizer fonte, tamanho, cor e posição.
- Soletrar palavras difíceis, letra por letra.
- Se ficar ilegível, encurtar o texto e apertar o layout, depois repetir.

**Rosto do criador a partir da foto** [OFICIAL]:
- Chamar a foto pelo número e pela função: "Imagem 1 é a referência do rosto".
- Travar o que não pode mudar: rosto, traços, tom de pele, cabelo, expressão.
- Dizer "mude só X, mantenha o resto igual".
- Repetir a lista do que preservar a cada nova tentativa, para evitar deriva.
- Observação da própria OpenAI: o guia é inconsistente sobre o ajuste de fidelidade de entrada no gpt-image-2. Conferir na API antes de depender dele.

**Anúncios** [OFICIAL]: escrever como um briefing (marca, público, conceito, composição e texto exato) e acrescentar "sem texto extra, sem marca d'água".

## 8. Anti "cara de IA" (lista de checagem do agente)

Cada item abaixo é uma combinação das regras oficiais de fotorrealismo com [PRÁTICA]. O que o prompt deve evitar:

- Pele lisa de plástico. Pedir poros e imperfeições.
- Brilhos, partículas e luzes de neon genéricas. Pedir luz natural de janela ou de ambiente real.
- Fundo de gradiente roxo e azul. Pedir cenário real do tema.
- Rosto perfeito e simétrico demais. Pedir expressão real, assimetria leve.
- Cenário de "estúdio de catálogo". Pedir "foto de celular, momento real".
- Texto cheio, com várias frases. Pedir 3 a 5 palavras no máximo.
- Mãos e dedos em destaque (a IA ainda erra). Pedir enquadramento onde as mãos aparecem pouco.
- Elementos decorativos sem função (estrelas, raios, ícones soltos). Cada elemento precisa ter um motivo.

## 9. Modelo de prompt final (rascunho para o desenho)

```
Uso: capa de vídeo vertical 9:16 para [plataforma]. Fotografia realista (photorealistic), foto de celular, sem retoque pesado.
Cena: [cenário real do tema, luz natural, horário].
Pessoa: use a Imagem 1 como referência do rosto. Mantenha rosto, traços, tom de pele, cabelo. Expressão: [emoção]. Olhar: [para o texto | para a câmera].
Composição: fórmula [nome]. Rosto e texto dentro da faixa central 4:5. Pessoa ocupa cerca de [20 a 35]% do quadro, lado [esquerdo|direito].
Texto: "[3 a 5 palavras]" escrito uma única vez, letras grossas sem serifa, [cor], contorno/sombra para contraste, posição [parte de cima à direita].
Cores: no máximo 3, destaque em [cor]. Textura real de pele (poros), sem pele de plástico.
Restrições: sem texto extra, sem marca d'água, sem brilhos ou neon, sem roxo, sem decoração sem função.
```

## 10. O que falta (lacunas honestas)

1. **Pinterest:** não consultei o Pinterest. Ele não tem busca aberta de imagens (a API exige app aprovado) e raspar o site é proibido
   pelos termos. A parte de referências do Pinterest fica para a **fase 2**, via API oficial se for aprovada, ou via referências que o
   próprio usuário cola.
2. **Fé e devocional:** sem fonte. Precisa de teste real com capas do seu público.
3. **Recorte da grade do Instagram:** as fontes discordam. Verificar num Reel de teste.
4. **Números de desempenho:** não há dado confiável. Medir com o próprio app e com testes A/B.
5. **Acentos em português no gpt-image:** testar.
6. **Teste de aceite combinado:** 5 temas, prompt antigo contra prompt novo, e o Raniel escolhe o melhor.

## Fontes

- OpenAI, guia de prompts de imagem: https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide
- Palcu et al. (2017), olhar em banners, Frontiers in Psychology: https://pmc.ncbi.nlm.nih.gov/articles/PMC5454066
- Estudo de 2014 sobre olhar direto e desviado em banners, Frontiers in Psychology: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00166/pdf
- vidIQ, dicas de capa: https://vidiq.com/blog/post/youtube-thumbnail-design-tips/
- Tipografia em capas: https://blog.autonolab.com/blog/2025-09-22-typography-in-thumbnails-text-that-converts/
- Texto em capas: https://fluxnote.io/guides/youtube-thumbnail-text-guide-2026
- Cor em capas: https://blog.autonolab.com/blog/2025-09-21-color-theory-for-thumbnails-using-psychology/
- Tamanho e zonas seguras do Reel: https://www.hopperhq.com/blog/instagram-reel-size/
- Ideias de capa por nicho: https://miraflow.ai/blog/youtube-thumbnail-ideas-every-niche
- Psicologia de capas (blog, evidência fraca): https://thumbfa.st/posts/psychology-behind-clickable-youtube-thumbnails

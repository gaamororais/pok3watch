# Chrome Web Store Listing — Pok3Watch

> Última atualização: 2026-09-19 · Versão 1.40
> Modelo oficial do skill `chrome-extensions` do Chrome. Os textos longos em pt/en/es estão em `DESCRICAO-LOJA.md`.
> Este arquivo **não vai no pacote** (o `empacotar.js` só inclui o que a extensão precisa).

## Store Listing

**Extension Name** [OBRIGATÓRIO]
Pok3Watch — Alertas para Poke Idle World

> Nome trocado para "Pok3Watch" (com "3") para não usar a marca "Pokémon". O ícone é uma bola
> estilizada genérica. A descrição cita "Poke Idle World" só como jogo alvo — é referência nominativa
> a um jogo de terceiros, não uso da marca Pokémon.

**Short Description** [OBRIGATÓRIO] — 102 caracteres
Avisa no WhatsApp quando cai shiny, Pokémon raro, item raro, acabam as Pokébolas ou o jogo desconecta.

**Detailed Description** [OBRIGATÓRIO]
Use o texto completo de `DESCRICAO-LOJA.md`, seção 1 (há versão em pt, en e es).
Ele já segue o que a loja espera: o que faz, recursos, passo a passo de uso, privacidade e avisos.

**Category** [OBRIGATÓRIO]
Diversão (Fun). Segunda opção: Produtividade.

**Single Purpose** [OBRIGATÓRIO]
Avisar o jogador de Poke Idle World, no WhatsApp e por notificação do Chrome, sobre eventos da própria sessão de jogo dele (shiny, Pokémon raro, item raro, Pokébolas acabando, gift diário e queda de conexão), lendo apenas o que já está na tela do jogo.

**Primary Language** [OBRIGATÓRIO]
Português (Brasil). A extensão em si fala pt/en/es e escolhe sozinha.

## Graphics & Assets

| Asset | Dimensões | Situação | Arquivo |
|-------|-----------|----------|---------|
| Store Icon [OBRIGATÓRIO] | 128×128 PNG | ✅ Pronto | `icons/icon128.png` |
| Screenshot 1 [OBRIGATÓRIO] | 1280×800 | ⬜ Falta | popup com o editor de regras |
| Screenshot 2 | 1280×800 | ⬜ Falta | HUD sobre a tela do jogo |
| Screenshot 3 | 1280×800 | ⬜ Falta | alerta chegando no WhatsApp |
| Screenshot 4 | 1280×800 | ⬜ Falta | tutorial do CallMeBot |
| Screenshot 5 | 1280×800 | ⬜ Falta | modo expandido em colunas |
| Small Promo Tile | 440×280 | ⬜ Falta | |
| Marquee Promo Tile | 1400×560 | ⬜ Opcional | |

### Observações das capturas
Cantos retos, sem moldura e sem espaço vazio em volta. Precisam mostrar a versão atual da interface.
Nada de mockup de celular, exceto na captura do WhatsApp, que é o uso real.

## Permissions Justification

| Permissão | Tipo | Justificativa |
|-----------|------|---------------|
| `storage` | permissions | Guarda no navegador do usuário as configurações da extensão: número de WhatsApp, API Key do CallMeBot, regras de alerta por raridade e IV, idioma e o histórico local de capturas usado no resumo periódico. Nada vai para servidor do desenvolvedor. É indispensável porque o service worker hiberna e perde o estado em memória. |
| `notifications` | permissions | Mostra o alerta como notificação do sistema no instante em que é detectado, para quem está no computador. É o canal local, complementar ao WhatsApp. Só exibe o alerta que o próprio usuário configurou. |
| `alarms` | permissions | O service worker hiberna. Um alarme de 1 em 1 minuto acorda a extensão para verificar se a aba do jogo parou de responder (travada, congelada ou descartada pelo Chrome) e avisar que o monitoramento caiu. |
| `power` | permissions | O monitoramento roda por horas seguidas. A extensão impede a suspensão do computador **apenas enquanto existe uma aba do jogo respondendo**, e libera assim que ela some. |
| `sidePanel` | permissions | Permite abrir o mesmo painel na barra lateral do Chrome, a pedido do usuário (botão no popup), porque a tela de regras é grande demais para o popup. |
| `https://poke.idleworld.online/*` | host_permissions | É o site monitorado e a razão da extensão existir. O content script lê o DOM das janelas "Log de Capturas" e "Hunt Analyzer" e o contador de Pokébolas para detectar shiny, raridade, IV, drops, falta de bolas e desconexão, e desenha um painel informativo na página. Não clica, não automatiza e não envia comando ao jogo. |
| `https://api.callmebot.com/*` | host_permissions | Único destino externo. Entrega o texto do alerta no WhatsApp do próprio usuário, usando o número e a API Key que ele cadastrou no CallMeBot. Sem esse host o recurso principal não funciona. |

**Código remoto:** não. Todo o JavaScript está no pacote. Não há `eval`, `new Function`, CDN, script injetado nem download em tempo de execução. O único `importScripts` carrega um arquivo local do próprio pacote.

## Privacy & Data Use

**A extensão coleta dados do usuário?** Sim.

| Tipo de dado | Coletado? | Sai do dispositivo? | Finalidade | Compartilhado com terceiros? |
|---|---|---|---|---|
| Identificação pessoal | Sim (telefone, digitado pelo usuário) | Sim | Endereçar a mensagem de alerta ao WhatsApp do próprio usuário | Sim — CallMeBot, serviço escolhido pelo usuário, que entrega a mensagem |
| Informação de saúde | Não | — | — | — |
| Informação financeira | Não | — | — | — |
| Autenticação | Sim (API Key do CallMeBot) | Sim | Autorizar o envio no CallMeBot | Sim — apenas o CallMeBot |
| Comunicações pessoais | Não (a extensão gera a mensagem; não lê conversas) | — | — | — |
| Localização | Não | — | — | — |
| Histórico de navegação | Não | — | — | — |
| Atividade do usuário | Não (sem rastreio de clique, rolagem ou digitação) | — | — | — |
| Conteúdo de site | Sim (nome, raridade e IV do Pokémon e nome de itens, lidos da tela do jogo) | Sim | Formam o texto do alerta | Sim — vai dentro do texto entregue pelo CallMeBot |

### Certificações de uso de dados
- [x] Os dados **não** são vendidos a terceiros
- [x] Os dados **não** são usados para fins alheios ao propósito único
- [x] Os dados **não** são usados para avaliar crédito ou conceder empréstimo

## Privacy Policy

**Privacy Policy URL** [OBRIGATÓRIO] — ⬜ falta publicar
Texto pronto em `DESCRICAO-LOJA.md`, seção 5 (pt e en). Hospede em GitHub Pages, Google Sites ou Notion público e cole a URL no painel.
A política precisa citar, além do telefone: a **API Key**, o fato de o `chrome.storage.local` **não ser criptografado**, e o nome do terceiro (**CallMeBot**).

## Distribution

**Visibilidade:** comece em **Não listada**, valide o fluxo completo com uma conta real e só depois mude para Pública.
**Regiões:** todas.

## Developer Info

| Campo | Situação |
|---|---|
| Publisher Name [OBRIGATÓRIO] | Gustavo Amorais |
| Contact Email [OBRIGATÓRIO] | gaamorais1@gmail.com |
| Support URL | ⬜ o formulário do Google de sugestões serve (opcional) |
| Homepage URL | ⬜ a página da política de privacidade serve (opcional) |
| Declaração Trader/Non-Trader | **Não negociante** (pessoa física, extensão gratuita, sem monetização) |
| Taxa de registro US$ 5 | ⬜ conferir se já foi paga |

## Version History

| Versão | Data | Mudanças | Situação |
|---|---|---|---|
| 1.43 | 2026-09-19 | Interface (popup, HUD, modal Tool, tutorial) agora em pt/en/es; aba "Última captura" mostra só o que o jogo entrega (sem dados fictícios); poda de `ultimasMensagens` no worker; timers do popup pausam quando escondido; captura passa por `enviarAlerta()` (não estoura mais em "Extension context invalidated") | Rascunho |
| 1.42 | 2026-09-19 | Correções de bug e revisão de segurança (XSS do HUD, texto seguro nas mensagens, teto de 20/h e 100/dia), manifesto polido para publicação | Não enviada |
| 1.40 | 2026-09-19 | Correções das revisões: XSS no HUD, teto de alertas, descrição dentro do limite, botão de print condicional, `tabs` removida, worker morto apagado, KeepAwake condicional, `minimum_chrome_version` 114 | Substituída pela 1.42 |
| 1.39 | 2026-09-19 | Três idiomas (pt/en/es) nas mensagens, barra lateral e guia nova, bloco de doação | Não enviada |

## Review Notes

### Pontos que o revisor pode questionar
1. **Marca registrada** — nome, descrição e ícone remetem a Pokémon e ao jogo. Mitigação: deixar explícito que é ferramenta não oficial, sem vínculo com Nintendo, Game Freak, Creatures ou com o Poke Idle World. Mitigação mais forte: trocar nome e ícone.
2. **Propósito único** — ocultar banners de shiny e promoções do jogo pode parecer recurso à parte. Justificativa: esses elementos cobrem as janelas que a extensão precisa ler.
3. **`power`** — permissão incomum. A chamada agora é condicional, o que bate com a justificativa.
4. **Doação em cripto no popup** — permitida, mas costuma puxar análise manual mais lenta. Dá para deixar só o PIX.
5. **Dependência do CallMeBot** — o revisor vai ver uma chamada externa. A descrição já explica que é o usuário mandando mensagem para si mesmo.

### Limitações conhecidas (vale dizer na descrição)
- Depende do CallMeBot, gratuito e com limite de mensagens.
- Precisa das janelas do jogo abertas (Log de Capturas, Hunt Analyzer, barra de captura).
- Com o computador desligado ou o Chrome fechado, não há alerta.

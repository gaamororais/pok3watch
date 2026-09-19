// Pok3Watch — Idiomas (pt / en / es)
// Carregue este arquivo ANTES do cerebro.js, do content.js e do popup.js.
//
// Uso:  I.definir('auto'); I.t('captura.regra', { regras: 'Shiny' })
// Texto que faltar num idioma cai para o inglês e, em último caso, para o português.
//
// Interface: marque o elemento no HTML e chame I.traduzir() depois de I.definir().
//   <span data-i18n="popup.secaoBolas">Pokébolas</span>
//   <input data-i18n-ph="popup.numeroPlaceholder">      (placeholder)
//   <button data-i18n-title="popup.btnJanela">          (title)
// Dentro do texto, **assim** vira negrito (montado por DOM, nunca por innerHTML).

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PokeWatchIdiomas = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const IDIOMAS = ['pt', 'en', 'es'];
  const LOCALES = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

  const NOMES_IDIOMA = { auto: { pt: 'Automático', en: 'Automatic', es: 'Automático' }, pt: 'Português', en: 'English', es: 'Español' };

  // Nomes das raridades do jogo, na ordem oficial (Fraca -> Divina)
  const RARIDADES = {
    pt: ['Fraca', 'Comum', 'Incomum', 'Rara', 'Épica', 'Lendária', 'Mítica', 'Anciã', 'Divina'],
    en: ['Weak', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Ancient', 'Divine'],
    es: ['Débil', 'Común', 'Poco común', 'Rara', 'Épica', 'Legendaria', 'Mítica', 'Anciana', 'Divina']
  };

  // Raridade de item (pelo preço no NPC)
  const RARIDADES_ITEM = {
    pt: ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico'],
    en: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'],
    es: ['Común', 'Poco común', 'Raro', 'Épico', 'Legendario', 'Mítico']
  };

  const TEXTOS = {
    pt: {
      'comum.rodape': '_Pok3Watch 24/7_',
      'comum.naoInformada': 'não informada',
      'comum.naoInformado': 'não informado',
      'comum.desconhecido': 'Desconhecido',
      'comum.menosDeUmMin': 'menos de 1 min',
      'comum.minutos': '{n} min',

      'prioridade.MAXIMA': '🚨 Máximo',
      'prioridade.ALTA': '⚠️ Alto',

      'regra.se': 'Se {condicoes} → {prioridade}',
      'regra.e': ' E ',
      'regra.ou': ' ou ',
      'regra.shiny': 'shiny',
      'regra.qualquerRaridade': 'qualquer raridade',
      'regra.ivMinimo': 'IV ≥ {iv}',
      'regra.ivExato': 'IV {iv}',
      'regraNome.shiny': 'Shiny',
      'regraNome.mitica-mais': 'Mítica ou superior',
      'regraNome.iv-perfeito': 'IV perfeito',
      'regraNome.lendaria-top': 'Lendária top',
      'regraNome.lendaria': 'Lendária',
      'regraNome.epica-160': 'Épica IV 160+',
      'regraNome.rara-180': 'Rara IV 180+',
      'regraNome.iv-185': 'IV 185+ (qualquer raridade)',

      'captura.topoShiny': '🌟✨ *POKEWATCH — SHINY CAPTURADO!* ✨🌟',
      'captura.topoMaximo': '🚨 *POKEWATCH — CAPTURA TOP!* 🚨',
      'captura.topoAlto': '🎯 *POKEWATCH — CAPTURA ESPECIAL* 🎯',
      'captura.regra': 'Regra: {regras}',
      'captura.pokemon': '👾 *Pokémon:* {nome}',
      'captura.raridade': '💎 *Raridade:* {raridade}',
      'captura.iv': '📊 *IV:* {iv}',
      'captura.bola': '🔴 *Pokébola:* {bola}',
      'captura.horario': '⏰ *Horário:* {hora}',

      'bolas.topo': '⚠️ *POKEWATCH — POKÉBOLAS ACABANDO!* ⚠️',
      'bolas.item': '• *{tipo}*: {qtd} restantes (limite ≤ {limite})',
      'bolas.dica': '👉 Compre mais antes que acabem para não perder shiny.',
      'semBolas.topo': '🛑 *POKEWATCH — ACABARAM AS POKÉBOLAS!* 🛑',
      'semBolas.linha1': 'A barra de captura do jogo está mostrando "Sem Pokébolas".',
      'semBolas.linha2': 'Enquanto não comprar mais, nenhum selvagem (nem shiny) é capturado.',

      'drop.topo': '💰 *POKEWATCH — DROP RARO!* 💰',
      'drop.item': '• *{nome}* +{ganho}{raridade} — total na sessão: {total}',

      'resumo.topo': '📊 *POKEWATCH — RESUMO DAS ÚLTIMAS {horas}H*',
      'resumo.capturas': '🎯 *Capturas:* {total}',
      'resumo.shinies': ' (✨ {n} shiny)',
      'resumo.melhores': '🏆 *Melhores:*',
      'resumo.semCapturas': '   (nenhuma captura vista — o Log de Capturas ficou aberto?)',
      'resumo.saldo': '💰 *Saldo:* {saldo}',
      'resumo.lootSupply': '   Loot {loot} · Supply {supply}',
      'resumo.ritmo': '   Ritmo atual: {ritmo}',
      'resumo.itensRaros': '💎 *Itens raros:* {itens}',
      'resumo.semItens': '💎 *Itens raros:* nenhum',
      'resumo.semHunt': '💰 *Saldo e drops:* sem leitura — deixe o Hunt Analyzer aberto no jogo',
      'resumo.bolas': '🎒 *Pokébolas:* {bolas}',
      'resumo.semBolas': '🛑 *Pokébolas:* ACABARAM',
      'resumo.huntReiniciou': 'a hunt reiniciou no período; valores desde o reinício',
      'resumo.sessaoInteira': 'valores da sessão atual inteira',

      'conexao.topo': '🔌 *POKEWATCH — JOGO DESCONECTADO!* 🔌',
      'conexao.motivo': 'Motivo: {motivo}',
      'conexao.tempo': 'Sem jogar há {tempo}.',
      'conexao.dica': '👉 Confira o computador e a aba do jogo.',
      'conexao.voltouTopo': '✅ *POKEWATCH — JOGO VOLTOU*',
      'conexao.voltouCorpo': 'Conexão normal de novo depois de {tempo}.',
      'conexao.perdida': 'conexão perdida (o jogo está tentando reconectar)',
      'conexao.manutencao': 'jogo em manutenção',
      'conexao.namelock': 'o jogo pediu troca de nome (namelock)',
      'conexao.foraDoJogo': 'saiu da tela do jogo ({caminho})',

      'aba.topo': '🔌 *POKEWATCH — ABA DO JOGO SEM SINAL!* 🔌',
      'aba.descartada': 'o Chrome descartou a aba do jogo para economizar memória',
      'aba.travada': 'a aba do jogo travou ou parou de responder',
      'aba.tempo': 'Sem sinal há {n} min.',
      'aba.dica': '👉 Abra a aba do jogo e recarregue se precisar.',
      'aba.voltouTopo': '✅ *POKEWATCH — ABA DO JOGO VOLTOU*',
      'aba.voltouCorpo': 'A aba voltou a responder depois de ~{n} min.',

      'gift.topo': '🎁 *POKEWATCH — DAILY GIFT DISPONÍVEL!* 🎁',
      'gift.corpo': 'Passe no jogo para resgatar o seu presente diário.',

      'titulo.IV_ALTO': 'IV alto',
      'titulo.SHINY': 'Shiny capturado',
      'titulo.CAPTURA_MAXIMA': 'Captura top',
      'titulo.CAPTURA_ALTA': 'Captura especial',
      'titulo.RARIDADE_ALTA': 'Premium capturado',
      'titulo.BOLAS_BAIXAS': 'Bolas baixas',
      'titulo.SEM_BOLAS': 'Pokébolas acabaram',
      'titulo.DROP_RARO': 'Drop raro',
      'titulo.GIFT': 'Gift disponível',
      'titulo.RESUMO': 'Resumo',
      'titulo.DESCONECTADO': 'Jogo desconectado',
      'titulo.RECONECTADO': 'Jogo voltou',
      'titulo.TRAVADO': 'Jogo travado',
      'titulo.SNAPSHOT': 'Print',
      'titulo.TESTE': 'Teste',
      'titulo.ALERTA': 'Alerta',

      'envio.semNumero': 'Número do WhatsApp não configurado no popup.',
      'envio.numeroInvalido': 'Número inválido. Use DDI + DDD + telefone, ex: 5511998454621.',
      'print.indisponivel': 'Esta versão envia só texto, então não tira print.',
      'envio.semChave': 'API Key do CallMeBot não configurada no popup.',
      'envio.chaveInvalida': 'API Key inválida. Refaça o passo a passo do CallMeBot e cole a chave nova.',
      'envio.numeroNaoLiberado': 'O CallMeBot não reconheceu este número. Mande a mensagem de liberação para o bot e confira o número no popup.',
      'envio.limite': 'O CallMeBot pediu para esperar (limite de envios). Vai tentar de novo em instantes.',
      'envio.timeout': 'Timeout: o servidor demorou demais para responder.',
      'envio.rede': 'Falha de rede: o Chrome não conseguiu enviar a mensagem. Verifique a internet.',
      'envio.mensagemCortada': '(mensagem cortada)',
      'envio.limiteExtensao': 'Limite de alertas atingido (20 por hora / 100 por dia). Os próximos voltam quando o período passar.',
      'dados.apagados': 'Seus dados foram apagados desta extensão.',

      'popup.dispara': '{prioridade} — dispara: {regras}',
      'popup.naoAlerta': '🔕 Não alerta',
      'popup.regraSemFiltros': 'Regra sem filtros',
      'popup.regraVazia': '⚠️ Regra vazia alertaria TODAS as capturas. Marque uma raridade, um IV mínimo ou "Só shiny".',
      'popup.criteriosE': 'Critérios desta regra funcionam em conjunto (E).',
      'popup.nomePersonalizado': 'Nome personalizado (opcional)',
      'popup.idioma': 'Idioma',

      // ---- Popup: cabeçalho e status ----
      'popup.titulo': 'Pok3Watch — Cockpit de Controle',
      'popup.btnBarraLateral': 'Abrir na barra lateral do Chrome',
      'popup.btnJanela': 'Abrir em janela separada',
      'popup.contasDetectadas': 'Contas no jogo detectadas:',
      'popup.verificandoAba': 'Verificando a aba do jogo...',
      'popup.conta': 'Conta: {nome} (aba #{tab})',
      'popup.focarAba': 'Clique para focar na aba de {nome}',
      'popup.statusOnline': 'ONLINE',
      'popup.statusCaiu': 'CAIU',
      'popup.statusSemSinal': 'SEM SINAL',
      'popup.statusCarregando': 'CARREGANDO',
      'popup.statusOffline': 'OFFLINE',
      'popup.jogoAberto': 'Jogo aberto — aguardando o monitor responder',
      'popup.abraOJogoNavegador': 'Abra o Poke Idle World no navegador',

      // ---- Popup: painel da hunt ----
      'popup.huntTitulo': '⚔️ Sessão da Hunt',
      'popup.huntCapturados': 'Capturados',
      'popup.huntShinies': 'Shinies',
      'popup.huntDerrotados': 'Derrotados',
      'popup.huntSaldo': 'Saldo da Hunt',

      // ---- Popup: WhatsApp ----
      'popup.secaoWhatsApp': 'Canal WhatsApp',
      'popup.numeroLabel': 'Número com DDD (apenas dígitos)',
      'popup.numeroPlaceholder': 'Ex: 11900000000',
      'popup.numeroErro': 'Número inválido: use DDD + telefone (10 a 13 dígitos). O número salvo antes continua valendo.',

      // ---- Popup: regras ----
      'popup.secaoRegras': 'Regras de Alerta de Captura',
      'popup.regrasAjuda': 'Dentro da regra vale **E**. Entre regras vale **OU** (basta uma bater). Nenhuma raridade marcada = qualquer raridade. IV 0 = qualquer IV.',
      'popup.novaRegra': '+ Nova regra',
      'popup.restaurarRegras': 'Restaurar padrão',
      'popup.confirmarDeNovo': 'Clique de novo p/ confirmar',
      'popup.regrasRestauradas': 'Regras padrão restauradas.',
      'popup.semRegras': '⚠️ Nenhuma regra: nenhuma captura vai alertar. Use "+ Nova regra" ou "Restaurar padrão".',
      'popup.testeTitulo': '🧪 Teste rápido — e se eu pegar…',
      'popup.soShiny': 'Só shiny ✨',
      'popup.fecharDetalhes': 'Fechar detalhes',
      'popup.editarRegra': 'Editar regra',
      'popup.excluirRegra': 'Excluir esta regra',
      'popup.excluirConfirmar': 'Excluir?',
      'popup.prioridadeMax': '🚨 Máx',
      'popup.prioridadeAlta': '⚠️ Alta',
      'popup.badgeMax': 'MÁX',
      'popup.badgeAlta': 'ALTA',

      // ---- Popup: pokébolas ----
      'popup.secaoBolas': 'Pokébolas',
      'popup.bolaVigiada': 'Bola vigiada',
      'popup.avisarAbaixoDe': 'Avisar abaixo de',
      'popup.unidade': 'un',
      'popup.dicaAutoHelper': 'Com o Auto-Helper aberto, a extensão vigia sozinha a bola escolhida no Auto-Catch.',
      'popup.estoqueBaixo': 'Estoque baixo',
      'popup.estoqueBaixoSub': 'Repete a cada 15 min enquanto estiver abaixo',
      'popup.acabaramBolas': 'Acabaram as Pokébolas',
      'popup.acabaramBolasSub': 'Jogo mostrando "Sem Pokébolas" por 20s',

      // ---- Popup: drops e resumo ----
      'popup.secaoDrops': 'Drops & Resumo',
      'popup.dropRaro': 'Alerta de drop raro',
      'popup.dropRaroSub': 'Precisa do Hunt Analyzer aberto no jogo',
      'popup.itemRaroAPartir': 'Item raro a partir de',
      'popup.itemFaixa': '{raridade} ({preco}+)',
      'popup.resumoACada': 'Resumo a cada',
      'popup.umaHora': '1 hora',
      'popup.nHoras': '{n} horas',
      'popup.itensSempre': 'Itens que sempre avisam (separe por vírgula)',
      'popup.itensPlaceholder': 'Ex: Metal Stone, Pheromone, Upgrade',
      'popup.resumoPeriodico': 'Resumo periódico',
      'popup.resumoPeriodicoSub': 'Melhores Pokémon, saldo, loot e itens raros',

      // ---- Popup: vigilância e QoL ----
      'popup.secaoVigilancia': 'Vigilância',
      'popup.jogoDesconectado': 'Jogo desconectado',
      'popup.jogoDesconectadoSub': 'Queda, conta em uso, manutenção ou aba sem sinal',
      'popup.secaoQoL': 'QoL & Filtros Visuais',
      'popup.bloquearAnuncios': 'Bloquear anúncios de shiny',
      'popup.bloquearAnunciosSub': 'Oculta os avisos globais de shiny no jogo',
      'popup.bloquearPromocoes': 'Bloquear promoções da loja',
      'popup.bloquearPromocoesSub': 'Oculta banners e popups de diamantes',
      'popup.lembreteGift': 'Lembrete de daily gift',
      'popup.lembreteGiftSub': 'Mostra um aviso no HUD quando estiver pronto para coletar',
      'popup.giftWhatsApp': 'Alerta de gift no WhatsApp',
      'popup.giftWhatsAppSub': 'Avisa no celular quando o presente estiver pronto',

      // ---- Popup: rotas e prints ----
      'popup.rotasTitulo': '🗺️ Rotas de farm & spawns',
      'popup.nivel': 'Lv {n}',
      'popup.printsTitulo': '📸 Filtros de prints inteligentes',
      'popup.filtrosAtivos': '{n} ativos',
      'popup.printShiny': 'Print ao capturar shiny',
      'popup.printShinySub': 'Registro visual imediato',
      'popup.printDrop': 'Print em drops raros',
      'popup.printDropSub': 'Comprovante de obtenção de itens',
      'popup.printIv': 'Print em alertas máximos',
      'popup.printIvSub': 'Capturas 🚨 que não são shiny',
      'popup.printTravado': 'Print se o jogo desconectar',
      'popup.printTravadoSub': 'Mostra a tela de erro do jogo',
      'popup.cropInteligente': 'Crop inteligente (foco no log)',
      'popup.cropInteligenteSub': 'Recorta a área nobre sem poluição',

      // ---- Popup: telemetria ----
      'popup.secaoTelemetria': 'Telemetria de estoque',
      'popup.estoqueAtual': 'Estoque atual',
      'popup.gastoUltimaHora': 'Gasto na última 1h',
      'popup.ritmoConsumo': 'Ritmo de consumo',
      'popup.previsaoDuracao': 'Previsão de duração',
      'popup.aguardandoLeitura': 'Aguardando a leitura do jogo...',
      'popup.abraOJogo': 'Abra o jogo até o estoque aparecer na tela.',
      'popup.abraAutoHelper': 'Abra o Auto-Helper ou espere a barra de captura aparecer no jogo.',
      'popup.semPrevisao': 'Sem previsão ainda (coletando dados)',
      'popup.dura': 'Dura {tempo}',
      'popup.acabaAs': ' • acaba às {hora}',
      'popup.estoqueDetectado': 'Estoque detectado.',
      'popup.fonte': 'Fonte: {fonte}',
      'popup.fonteAutoHelper': 'Auto-Helper',
      'popup.fonteCaptura': 'Barra de captura',
      'popup.fonteDireta': 'leitura direta da tela',
      'popup.duracaoMin': '{n} min',
      'popup.duracaoH': '{h}h',
      'popup.duracaoHM': '{h}h {m}min',

      // ---- Popup: entrega e botões ----
      'popup.whatsappNaoTestado': 'WhatsApp ainda não testado.',
      'popup.ultimoEnvioOk': 'Último envio OK às {hora}',
      'popup.ultimoEnvioOkPara': 'Último envio OK às {hora} para {destino}',
      'popup.falhaEnvio': 'Falha às {hora}: {erro}',
      'popup.erroEnvio': 'erro de envio',
      'popup.salvamAutomatico': 'As alterações salvam sozinhas',
      'popup.btnSalvar': 'Salvar configurações',
      'popup.btnTestar': 'Testar notificação',
      'popup.btnTestando': 'Testando o envio...',
      'popup.btnResetar': 'Resetar métricas de farm',
      'popup.toastPadrao': 'Configurações salvas com sucesso!',
      'popup.salvoAs': '✓ Salvo automaticamente às {hora}',
      'popup.salvoIncompletas': '⚠️ Salvo às {hora} — {n} regra(s) incompleta(s) ainda não valem',
      'popup.erroSalvar': 'Erro ao salvar: {erro}',
      'popup.salvo': 'Configurações salvas!',
      'popup.salvoNumeroInvalido': 'Salvo, mas o número do WhatsApp está inválido.',
      'popup.semBarraLateral': 'Não consegui abrir a barra lateral: {erro}',
      'popup.semJanela': 'Não consegui abrir a janela: {erro}',
      'popup.informeWhatsApp': 'Informe o WhatsApp com DDD (ex.: 11999998888).',
      'popup.coleApiKey': 'Cole a API Key do CallMeBot (veja o passo a passo no topo).',
      'popup.testeTopo': '*Pok3Watch* — WhatsApp online! ✅',
      'popup.testeRegrasAtivas': '📋 Regras de captura ativas: {n}',
      'popup.falhaGenerica': 'Falha: {erro}',
      'popup.falhaTeste': 'Falha ao enviar o teste.',
      'popup.testeEnviado': 'Teste enviado para o WhatsApp!',
      'popup.metricasResetadas': 'Métricas de farm resetadas.',
      'popup.copiar': 'copiar',
      'popup.copiado': 'copiado!',
      'popup.copieCtrlC': 'copie com Ctrl+C',

      // ---- Versão pública (CallMeBot) ----
      'pub.doarTitulo': '❤️ Ajude o criador',
      'pub.doarTexto': 'O Pok3Watch é gratuito, sem anúncios e não vende nenhum dado seu. Se ele já te salvou um shiny, considere ajudar:',
      'pub.bmc': '☕ Buy me a coffee',
      'pub.ou': 'ou',
      'pub.criptoNota': 'USDT ou USDC em redes EVM (BSC, Polygon, Arbitrum, Ethereum)',
      'pub.sugestao': '💡 Mandar uma dica ou sugestão',
      'pub.secaoWhatsApp': 'Canal WhatsApp (CallMeBot)',
      'pub.avisoConfig': '⚠️ **Falta configurar o WhatsApp.** Sem o número e a API Key aqui embaixo, nenhum alerta é enviado.',
      'pub.passosTitulo': 'Liberação do WhatsApp (uma vez só):',
      'pub.passo1a': '1) Abra',
      'pub.passo1b': 'e salve nos contatos o número que aparece lá.',
      'pub.passo2': '2) Mande para esse contato:',
      'pub.passo3': '3) O bot responde com a sua **API Key**. Cole ela aqui embaixo.',
      'pub.abrirTutorial': '📖 Abrir o tutorial completo',
      'pub.numeroLabel': 'Seu número com DDD (só os dígitos)',
      'pub.numeroDica': 'Sem +55 e sem espaços. Se você puser o 55 na frente também funciona.',
      'pub.apiKeyLabel': 'API Key do CallMeBot (só o final)',
      'pub.apiKeyDica1': 'O bot responde com um link tipo',
      'pub.apiKeyDica2': 'Cole aqui **só o que vem depois de apikey=**. Se colar o link inteiro, a chave é aproveitada sozinha.',
      'pub.apiKeyErro': 'Sem a API Key o CallMeBot recusa o envio.',
      'pub.dicaSoTexto': 'O CallMeBot é gratuito e envia só texto, então esta versão não manda print. Alertas seguidos saem espaçados para o bot não recusar.',

      // ---- HUD dentro do jogo ----
      'hud.heartbeat': 'Heartbeat ativo',
      'hud.vigilanteAtivo': 'Vigilante ativo',
      'hud.vigia': 'Vigia • {nome}',
      'hud.giftBadge': '🎁 Gift!',
      'hud.giftTitle': 'Daily gift disponível para resgate!',
      'hud.vigiaOn': '• VIGIA ON',
      'hud.btnTool': 'Abrir a Pok3Watch Tool (Alt+K)',
      'hud.btnSnap': 'Tirar print agora',
      'hud.btnRecolher': 'Recolher em pílula',
      'hud.btnExpandir': 'Expandir o cockpit',
      'hud.secaoSensores': 'Status dos sensores',
      'hud.logCapturas': '📋 Log de Capturas',
      'hud.buscando': 'Buscando...',
      'hud.hintLog': '⚠️ Abra o "Log de Capturas" no jogo para monitorar!',
      'hud.estoqueBolas': '🎒 Estoque de bolas',
      'hud.hintBolas': '⚠️ Abra o "Auto-Helper" ou espere uma captura!',
      'hud.huntAnalyzer': '💰 Hunt Analyzer',
      'hud.hintHunt': '⚠️ Abra o "Hunt Analyzer" para ver saldo e drops raros!',
      'hud.conexao': '🌐 Conexão',
      'hud.antiSleep': '⚡ 2º plano (anti-sleep)',
      'hud.ativo': '🟢 Ativo',
      'hud.secaoSessao': 'Sessão atual',
      'hud.capturas': 'Capturas',
      'hud.shinies': '★ Shinies',
      'hud.ultimaCaptura': 'Última captura:',
      'hud.aguardando': 'Aguardando leituras...',
      'hud.secaoEstoque': 'Estoque ativo',
      'hud.badgeConectado': '🟢 Conectado',
      'hud.badgeFechado': '🔴 Fechado',
      'hud.badgeAcabaram': '🔴 Acabaram',
      'hud.badgeCaptura': '🟢 Captura',
      'hud.badgeAutoHelper': '🟢 Auto-Helper',
      'hud.badgeOculto': '🟡 Oculto',
      'hud.badgeHuntFechado': '🟡 Fechado',
      'hud.badgeConexaoOk': '🟢 OK',
      'hud.badgeConexaoCaiu': '🔴 Caiu',

      // ---- Modal "Pok3Watch Tool" (Alt+K) ----
      'tool.status': 'conta conectada',
      'tool.conta': 'conta: {nome}',
      'tool.fechar': 'Fechar (Esc)',
      'tool.tabConfig': '⚙️ Ações & configs',
      'tool.tabPokemon': '🧮 Última captura',
      'tool.tabRotas': '🗺️ Rotas de farm',
      'tool.acoesRapidas': 'Ações rápidas',
      'tool.detalhesTitulo': 'Detalhes da última captura',
      'tool.detalhesTexto': 'Veja o IV lido no Log de Capturas.',
      'tool.configsInGame': 'Configurações no jogo',
      'tool.bloquearAnuncios': 'Bloquear anúncios',
      'tool.bloquearAnunciosSub': 'Oculta os anúncios globais de shiny.',
      'tool.bloquearPromocoes': 'Bloquear promoções',
      'tool.bloquearPromocoesSub': 'Oculta os anúncios da loja de diamantes.',
      'tool.lembreteGift': 'Lembrete de gift',
      'tool.lembreteGiftSub': 'Mostra o lembrete do daily gift.',
      'tool.notaWhatsApp': 'Os alertas de WhatsApp são configurados no popup da extensão.',
      'tool.rodape': 'Pok3Watch 24/7 • observador passivo',
      'tool.faixaLevel': 'Faixa de level da hunt',
      'tool.semCaptura': 'Nenhuma captura lida ainda',
      'tool.semCapturaDica': 'Deixe o "Log de Capturas" aberto no jogo. Assim que um Pokémon for capturado, os dados dele aparecem aqui.',
      'tool.ivTotal': 'IV total',
      'tool.nivel': 'Level {n}',
      'tool.horario': 'Capturado: {quando}',
      'tool.bola': 'Pokébola: {bola}',
      'tool.semRaridade': 'sem raridade',
      'tool.shiny': '✨ Shiny',
      'tool.ivNota': 'O jogo mostra só o IV total no Log de Capturas. IV por atributo, tipo e golpes não aparecem lá, então o Pok3Watch não tem como exibi-los.',

      // ---- Tutorial (versão pública) ----
      'tut.titulo': 'Pok3Watch — Como receber os alertas no WhatsApp',
      'tut.chamada': 'Para receber os alertas no celular, você precisa liberar o CallMeBot uma única vez. Leva 2 minutos.',
      'tut.h2Liberar': 'Liberar o WhatsApp',
      'tut.passo1a': 'Abra a página do CallMeBot:',
      'tut.passo1b': 'Lá aparece o número de WhatsApp do bot. **Salve esse número nos seus contatos.**',
      'tut.passo2': 'Mande esta mensagem para o contato que você acabou de salvar:',
      'tut.passo3a': 'O bot responde na hora com um link de teste, parecido com este:',
      'tut.passo3b': 'A sua **API Key** é só esse final (no exemplo, **1234567**) — não precisa do link todo. Se colar o link inteiro no campo da extensão, ela aproveita a chave sozinha.',
      'tut.passo3c': 'Guarde essa chave só para você: quem tiver ela consegue mandar mensagem no seu WhatsApp pelo bot.',
      'tut.passo4': 'Clique no ícone do Pok3Watch no navegador e preencha, no topo: **seu número com DDD** e a **API Key**. As configurações salvam sozinhas. Depois clique em **Testar notificação**: a mensagem deve chegar no seu WhatsApp em alguns segundos.',
      'tut.h2Janelas': 'Deixe estas janelas abertas no jogo',
      'tut.janelasIntro': 'O Pok3Watch só lê o que está na tela. Cada janela do jogo alimenta uma parte dos alertas:',
      'tut.janelaLog': '**Log de Capturas** — alertas de shiny, raridade e IV, e a lista de melhores do resumo.',
      'tut.janelaHunt': '**Hunt Analyzer** — saldo, loot e drops de itens raros.',
      'tut.janelaBolas': '**Auto-Helper** ou a barra de captura — contagem de Pokébolas.',
      'tut.h2Problemas': 'Se não chegar mensagem',
      'tut.colunaProblema': 'O que aparece no popup',
      'tut.colunaSolucao': 'O que fazer',
      'tut.probChave': 'API Key inválida',
      'tut.solChave': 'Refaça os passos 1 a 3 e cole a chave nova. A chave é só de números, sem espaços.',
      'tut.probNumero': 'O CallMeBot não reconheceu este número',
      'tut.solNumero': 'Você precisa mandar a frase de liberação do próprio celular que vai receber os alertas. Confira também o DDD.',
      'tut.probLimite': 'Limite de envios',
      'tut.solLimite': 'O CallMeBot é gratuito e recusa mensagens em rajada. O Pok3Watch já espaça os envios e tenta de novo sozinho.',
      'tut.probRede': 'Falha de rede',
      'tut.solRede': 'Sem internet ou o CallMeBot fora do ar. O alerta aparece mesmo assim como notificação do computador.',
      'tut.h2Escopo': 'O que a extensão faz e o que não faz',
      'tut.escopo1': 'Ela **só observa** a tela do jogo e avisa você. Não clica, não captura, não joga e não manda nenhum comando para o jogo.',
      'tut.escopo2': 'O que sai do seu computador é apenas o texto do alerta e o seu número, e vai direto para o CallMeBot, que é um serviço gratuito de terceiros e entrega a mensagem no seu WhatsApp. Número e API Key ficam salvos só no seu navegador.',
      'tut.h2Doar': 'Ajude o criador',
      'tut.rodape': 'Pok3Watch — monitor passivo para Poke Idle World'
    },

    en: {
      'comum.rodape': '_Pok3Watch 24/7_',
      'comum.naoInformada': 'not reported',
      'comum.naoInformado': 'not reported',
      'comum.desconhecido': 'Unknown',
      'comum.menosDeUmMin': 'less than 1 min',
      'comum.minutos': '{n} min',

      'prioridade.MAXIMA': '🚨 Maximum',
      'prioridade.ALTA': '⚠️ High',

      'regra.se': 'If {condicoes} → {prioridade}',
      'regra.e': ' AND ',
      'regra.ou': ' or ',
      'regra.shiny': 'shiny',
      'regra.qualquerRaridade': 'any rarity',
      'regra.ivMinimo': 'IV ≥ {iv}',
      'regra.ivExato': 'IV {iv}',
      'regraNome.shiny': 'Shiny',
      'regraNome.mitica-mais': 'Mythic or above',
      'regraNome.iv-perfeito': 'Perfect IV',
      'regraNome.lendaria-top': 'Top Legendary',
      'regraNome.lendaria': 'Legendary',
      'regraNome.epica-160': 'Epic IV 160+',
      'regraNome.rara-180': 'Rare IV 180+',
      'regraNome.iv-185': 'IV 185+ (any rarity)',

      'captura.topoShiny': '🌟✨ *POKEWATCH — SHINY CAUGHT!* ✨🌟',
      'captura.topoMaximo': '🚨 *POKEWATCH — TOP CATCH!* 🚨',
      'captura.topoAlto': '🎯 *POKEWATCH — SPECIAL CATCH* 🎯',
      'captura.regra': 'Rule: {regras}',
      'captura.pokemon': '👾 *Pokémon:* {nome}',
      'captura.raridade': '💎 *Rarity:* {raridade}',
      'captura.iv': '📊 *IV:* {iv}',
      'captura.bola': '🔴 *Poké Ball:* {bola}',
      'captura.horario': '⏰ *Time:* {hora}',

      'bolas.topo': '⚠️ *POKEWATCH — RUNNING OUT OF POKÉ BALLS!* ⚠️',
      'bolas.item': '• *{tipo}*: {qtd} left (limit ≤ {limite})',
      'bolas.dica': '👉 Buy more before they run out so you do not miss a shiny.',
      'semBolas.topo': '🛑 *POKEWATCH — OUT OF POKÉ BALLS!* 🛑',
      'semBolas.linha1': 'The game capture bar is showing "No Poké Balls".',
      'semBolas.linha2': 'Until you buy more, no wild Pokémon (not even shiny) is caught.',

      'drop.topo': '💰 *POKEWATCH — RARE DROP!* 💰',
      'drop.item': '• *{nome}* +{ganho}{raridade} — session total: {total}',

      'resumo.topo': '📊 *POKEWATCH — LAST {horas}H SUMMARY*',
      'resumo.capturas': '🎯 *Catches:* {total}',
      'resumo.shinies': ' (✨ {n} shiny)',
      'resumo.melhores': '🏆 *Best ones:*',
      'resumo.semCapturas': '   (no catches seen — was the Capture Log open?)',
      'resumo.saldo': '💰 *Balance:* {saldo}',
      'resumo.lootSupply': '   Loot {loot} · Supply {supply}',
      'resumo.ritmo': '   Current rate: {ritmo}',
      'resumo.itensRaros': '💎 *Rare items:* {itens}',
      'resumo.semItens': '💎 *Rare items:* none',
      'resumo.semHunt': '💰 *Balance and drops:* no reading — keep the Hunt Analyzer open in the game',
      'resumo.bolas': '🎒 *Poké Balls:* {bolas}',
      'resumo.semBolas': '🛑 *Poké Balls:* EMPTY',
      'resumo.huntReiniciou': 'the hunt restarted during the period; values since the restart',
      'resumo.sessaoInteira': 'values for the whole current session',

      'conexao.topo': '🔌 *POKEWATCH — GAME DISCONNECTED!* 🔌',
      'conexao.motivo': 'Reason: {motivo}',
      'conexao.tempo': 'Not playing for {tempo}.',
      'conexao.dica': '👉 Check your computer and the game tab.',
      'conexao.voltouTopo': '✅ *POKEWATCH — GAME IS BACK*',
      'conexao.voltouCorpo': 'Connection is fine again after {tempo}.',
      'conexao.perdida': 'connection lost (the game is trying to reconnect)',
      'conexao.manutencao': 'game under maintenance',
      'conexao.namelock': 'the game asked for a name change (namelock)',
      'conexao.foraDoJogo': 'left the game screen ({caminho})',

      'aba.topo': '🔌 *POKEWATCH — GAME TAB NOT RESPONDING!* 🔌',
      'aba.descartada': 'Chrome discarded the game tab to save memory',
      'aba.travada': 'the game tab froze or stopped responding',
      'aba.tempo': 'No signal for {n} min.',
      'aba.dica': '👉 Open the game tab and reload it if needed.',
      'aba.voltouTopo': '✅ *POKEWATCH — GAME TAB IS BACK*',
      'aba.voltouCorpo': 'The tab started responding again after ~{n} min.',

      'gift.topo': '🎁 *POKEWATCH — DAILY GIFT AVAILABLE!* 🎁',
      'gift.corpo': 'Drop by the game to claim your daily gift.',

      'titulo.IV_ALTO': 'High IV',
      'titulo.SHINY': 'Shiny caught',
      'titulo.CAPTURA_MAXIMA': 'Top catch',
      'titulo.CAPTURA_ALTA': 'Special catch',
      'titulo.RARIDADE_ALTA': 'Premium catch',
      'titulo.BOLAS_BAIXAS': 'Low on balls',
      'titulo.SEM_BOLAS': 'Out of Poké Balls',
      'titulo.DROP_RARO': 'Rare drop',
      'titulo.GIFT': 'Gift available',
      'titulo.RESUMO': 'Summary',
      'titulo.DESCONECTADO': 'Game disconnected',
      'titulo.RECONECTADO': 'Game is back',
      'titulo.TRAVADO': 'Game frozen',
      'titulo.SNAPSHOT': 'Screenshot',
      'titulo.TESTE': 'Test',
      'titulo.ALERTA': 'Alert',

      'envio.semNumero': 'WhatsApp number not set in the popup.',
      'envio.numeroInvalido': 'Invalid number. Use country code + area code + number, e.g. 5511998454621.',
      'print.indisponivel': 'This version only sends text, so it takes no screenshot.',
      'envio.semChave': 'CallMeBot API Key not set in the popup.',
      'envio.chaveInvalida': 'Invalid API Key. Redo the CallMeBot steps and paste the new key.',
      'envio.numeroNaoLiberado': 'CallMeBot did not recognize this number. Send the activation message to the bot and check the number in the popup.',
      'envio.limite': 'CallMeBot asked to wait (sending limit). It will try again shortly.',
      'envio.timeout': 'Timeout: the server took too long to answer.',
      'envio.rede': 'Network error: Chrome could not send the message. Check your internet.',
      'envio.mensagemCortada': '(message trimmed)',
      'envio.limiteExtensao': 'Alert limit reached (20 per hour / 100 per day). Alerts resume when the period rolls over.',
      'dados.apagados': 'Your data has been erased from this extension.',

      'popup.dispara': '{prioridade} — fires: {regras}',
      'popup.naoAlerta': '🔕 No alert',
      'popup.regraSemFiltros': 'Rule with no filters',
      'popup.regraVazia': '⚠️ An empty rule would alert on EVERY catch. Pick a rarity, a minimum IV or "Shiny only".',
      'popup.criteriosE': 'The criteria of this rule work together (AND).',
      'popup.nomePersonalizado': 'Custom name (optional)',
      'popup.idioma': 'Language',

      // ---- Popup: header and status ----
      'popup.titulo': 'Pok3Watch — Control Cockpit',
      'popup.btnBarraLateral': 'Open in the Chrome side panel',
      'popup.btnJanela': 'Open in a separate window',
      'popup.contasDetectadas': 'Game accounts detected:',
      'popup.verificandoAba': 'Checking the game tab...',
      'popup.conta': 'Account: {nome} (tab #{tab})',
      'popup.focarAba': 'Click to focus the tab of {nome}',
      'popup.statusOnline': 'ONLINE',
      'popup.statusCaiu': 'DROPPED',
      'popup.statusSemSinal': 'NO SIGNAL',
      'popup.statusCarregando': 'LOADING',
      'popup.statusOffline': 'OFFLINE',
      'popup.jogoAberto': 'Game open — waiting for the monitor to answer',
      'popup.abraOJogoNavegador': 'Open Poke Idle World in the browser',

      // ---- Popup: hunt panel ----
      'popup.huntTitulo': '⚔️ Hunt session',
      'popup.huntCapturados': 'Caught',
      'popup.huntShinies': 'Shinies',
      'popup.huntDerrotados': 'Defeated',
      'popup.huntSaldo': 'Hunt balance',

      // ---- Popup: WhatsApp ----
      'popup.secaoWhatsApp': 'WhatsApp channel',
      'popup.numeroLabel': 'Number with area code (digits only)',
      'popup.numeroPlaceholder': 'e.g. 11900000000',
      'popup.numeroErro': 'Invalid number: use area code + number (10 to 13 digits). The number saved before still works.',

      // ---- Popup: rules ----
      'popup.secaoRegras': 'Catch alert rules',
      'popup.regrasAjuda': 'Inside a rule it is **AND**. Between rules it is **OR** (one match is enough). No rarity ticked = any rarity. IV 0 = any IV.',
      'popup.novaRegra': '+ New rule',
      'popup.restaurarRegras': 'Restore defaults',
      'popup.confirmarDeNovo': 'Click again to confirm',
      'popup.regrasRestauradas': 'Default rules restored.',
      'popup.semRegras': '⚠️ No rules: no catch will alert. Use "+ New rule" or "Restore defaults".',
      'popup.testeTitulo': '🧪 Quick test — what if I catch…',
      'popup.soShiny': 'Shiny only ✨',
      'popup.fecharDetalhes': 'Close details',
      'popup.editarRegra': 'Edit rule',
      'popup.excluirRegra': 'Delete this rule',
      'popup.excluirConfirmar': 'Delete?',
      'popup.prioridadeMax': '🚨 Max',
      'popup.prioridadeAlta': '⚠️ High',
      'popup.badgeMax': 'MAX',
      'popup.badgeAlta': 'HIGH',

      // ---- Popup: Poké Balls ----
      'popup.secaoBolas': 'Poké Balls',
      'popup.bolaVigiada': 'Watched ball',
      'popup.avisarAbaixoDe': 'Warn below',
      'popup.unidade': 'pcs',
      'popup.dicaAutoHelper': 'With the Auto-Helper open, the extension watches the ball picked in Auto-Catch on its own.',
      'popup.estoqueBaixo': 'Low stock',
      'popup.estoqueBaixoSub': 'Repeats every 15 min while below the limit',
      'popup.acabaramBolas': 'Out of Poké Balls',
      'popup.acabaramBolasSub': 'Game showing "No Poké Balls" for 20s',

      // ---- Popup: drops and summary ----
      'popup.secaoDrops': 'Drops & Summary',
      'popup.dropRaro': 'Rare drop alert',
      'popup.dropRaroSub': 'Needs the Hunt Analyzer open in the game',
      'popup.itemRaroAPartir': 'Rare item from',
      'popup.itemFaixa': '{raridade} ({preco}+)',
      'popup.resumoACada': 'Summary every',
      'popup.umaHora': '1 hour',
      'popup.nHoras': '{n} hours',
      'popup.itensSempre': 'Items that always alert (comma separated)',
      'popup.itensPlaceholder': 'e.g. Metal Stone, Pheromone, Upgrade',
      'popup.resumoPeriodico': 'Periodic summary',
      'popup.resumoPeriodicoSub': 'Best Pokémon, balance, loot and rare items',

      // ---- Popup: watch and QoL ----
      'popup.secaoVigilancia': 'Watch',
      'popup.jogoDesconectado': 'Game disconnected',
      'popup.jogoDesconectadoSub': 'Drop, account in use, maintenance or tab with no signal',
      'popup.secaoQoL': 'QoL & Visual filters',
      'popup.bloquearAnuncios': 'Block shiny announcements',
      'popup.bloquearAnunciosSub': 'Hides the global shiny notices in the game',
      'popup.bloquearPromocoes': 'Block shop promotions',
      'popup.bloquearPromocoesSub': 'Hides diamond banners and popups',
      'popup.lembreteGift': 'Daily gift reminder',
      'popup.lembreteGiftSub': 'Shows a notice on the HUD when it is ready to claim',
      'popup.giftWhatsApp': 'Gift alert on WhatsApp',
      'popup.giftWhatsAppSub': 'Warns you on the phone when the gift is ready',

      // ---- Popup: routes and screenshots ----
      'popup.rotasTitulo': '🗺️ Farm routes & spawns',
      'popup.nivel': 'Lv {n}',
      'popup.printsTitulo': '📸 Smart screenshot filters',
      'popup.filtrosAtivos': '{n} active',
      'popup.printShiny': 'Screenshot when catching a shiny',
      'popup.printShinySub': 'Immediate visual record',
      'popup.printDrop': 'Screenshot on rare drops',
      'popup.printDropSub': 'Proof that you got the item',
      'popup.printIv': 'Screenshot on maximum alerts',
      'popup.printIvSub': '🚨 catches that are not shiny',
      'popup.printTravado': 'Screenshot if the game disconnects',
      'popup.printTravadoSub': 'Shows the game error screen',
      'popup.cropInteligente': 'Smart crop (focus on the log)',
      'popup.cropInteligenteSub': 'Cuts the useful area without clutter',

      // ---- Popup: telemetry ----
      'popup.secaoTelemetria': 'Stock telemetry',
      'popup.estoqueAtual': 'Current stock',
      'popup.gastoUltimaHora': 'Spent in the last 1h',
      'popup.ritmoConsumo': 'Consumption rate',
      'popup.previsaoDuracao': 'Estimated duration',
      'popup.aguardandoLeitura': 'Waiting for the game reading...',
      'popup.abraOJogo': 'Open the game until the stock shows up on screen.',
      'popup.abraAutoHelper': 'Open the Auto-Helper or wait for the capture bar to show up in the game.',
      'popup.semPrevisao': 'No estimate yet (collecting data)',
      'popup.dura': 'Lasts {tempo}',
      'popup.acabaAs': ' • runs out at {hora}',
      'popup.estoqueDetectado': 'Stock detected.',
      'popup.fonte': 'Source: {fonte}',
      'popup.fonteAutoHelper': 'Auto-Helper',
      'popup.fonteCaptura': 'Capture bar',
      'popup.fonteDireta': 'read straight from the screen',
      'popup.duracaoMin': '{n} min',
      'popup.duracaoH': '{h}h',
      'popup.duracaoHM': '{h}h {m}min',

      // ---- Popup: delivery and buttons ----
      'popup.whatsappNaoTestado': 'WhatsApp not tested yet.',
      'popup.ultimoEnvioOk': 'Last send OK at {hora}',
      'popup.ultimoEnvioOkPara': 'Last send OK at {hora} to {destino}',
      'popup.falhaEnvio': 'Failed at {hora}: {erro}',
      'popup.erroEnvio': 'sending error',
      'popup.salvamAutomatico': 'Changes save on their own',
      'popup.btnSalvar': 'Save settings',
      'popup.btnTestar': 'Test notification',
      'popup.btnTestando': 'Testing the send...',
      'popup.btnResetar': 'Reset farm metrics',
      'popup.toastPadrao': 'Settings saved!',
      'popup.salvoAs': '✓ Saved automatically at {hora}',
      'popup.salvoIncompletas': '⚠️ Saved at {hora} — {n} incomplete rule(s) do not count yet',
      'popup.erroSalvar': 'Error while saving: {erro}',
      'popup.salvo': 'Settings saved!',
      'popup.salvoNumeroInvalido': 'Saved, but the WhatsApp number is invalid.',
      'popup.semBarraLateral': 'Could not open the side panel: {erro}',
      'popup.semJanela': 'Could not open the window: {erro}',
      'popup.informeWhatsApp': 'Type the WhatsApp number with area code (e.g. 11999998888).',
      'popup.coleApiKey': 'Paste the CallMeBot API Key (see the steps at the top).',
      'popup.testeTopo': '*Pok3Watch* — WhatsApp online! ✅',
      'popup.testeRegrasAtivas': '📋 Active catch rules: {n}',
      'popup.falhaGenerica': 'Failed: {erro}',
      'popup.falhaTeste': 'Could not send the test.',
      'popup.testeEnviado': 'Test sent to WhatsApp!',
      'popup.metricasResetadas': 'Farm metrics reset.',
      'popup.copiar': 'copy',
      'popup.copiado': 'copied!',
      'popup.copieCtrlC': 'copy with Ctrl+C',

      // ---- Public version (CallMeBot) ----
      'pub.doarTitulo': '❤️ Support the creator',
      'pub.doarTexto': 'Pok3Watch is free, ad-free and sells none of your data. If it already saved you a shiny, consider helping:',
      'pub.bmc': '☕ Buy me a coffee',
      'pub.ou': 'or',
      'pub.criptoNota': 'USDT or USDC on EVM networks (BSC, Polygon, Arbitrum, Ethereum)',
      'pub.sugestao': '💡 Send a tip or suggestion',
      'pub.secaoWhatsApp': 'WhatsApp channel (CallMeBot)',
      'pub.avisoConfig': '⚠️ **WhatsApp is not set up yet.** Without the number and the API Key below, no alert is sent.',
      'pub.passosTitulo': 'WhatsApp activation (one time only):',
      'pub.passo1a': '1) Open',
      'pub.passo1b': 'and save the number shown there in your contacts.',
      'pub.passo2': '2) Send this to that contact:',
      'pub.passo3': '3) The bot answers with your **API Key**. Paste it below.',
      'pub.abrirTutorial': '📖 Open the full tutorial',
      'pub.numeroLabel': 'Your number with area code (digits only)',
      'pub.numeroDica': 'No plus sign and no spaces. Adding the country code in front also works.',
      'pub.apiKeyLabel': 'CallMeBot API Key (only the ending)',
      'pub.apiKeyDica1': 'The bot answers with a link like',
      'pub.apiKeyDica2': 'Paste here **only what comes after apikey=**. If you paste the whole link, the key is picked up on its own.',
      'pub.apiKeyErro': 'Without the API Key, CallMeBot refuses to send.',
      'pub.dicaSoTexto': 'CallMeBot is free and only sends text, so this version takes no screenshot. Back-to-back alerts are spaced out so the bot does not refuse them.',

      // ---- In-game HUD ----
      'hud.heartbeat': 'Heartbeat active',
      'hud.vigilanteAtivo': 'Watcher active',
      'hud.vigia': 'Watching • {nome}',
      'hud.giftBadge': '🎁 Gift!',
      'hud.giftTitle': 'Daily gift ready to claim!',
      'hud.vigiaOn': '• WATCH ON',
      'hud.btnTool': 'Open the Pok3Watch Tool (Alt+K)',
      'hud.btnSnap': 'Take a screenshot now',
      'hud.btnRecolher': 'Collapse into a pill',
      'hud.btnExpandir': 'Expand the cockpit',
      'hud.secaoSensores': 'Sensor status',
      'hud.logCapturas': '📋 Capture Log',
      'hud.buscando': 'Looking...',
      'hud.hintLog': '⚠️ Open the "Capture Log" in the game to monitor it!',
      'hud.estoqueBolas': '🎒 Ball stock',
      'hud.hintBolas': '⚠️ Open the "Auto-Helper" or wait for a catch!',
      'hud.huntAnalyzer': '💰 Hunt Analyzer',
      'hud.hintHunt': '⚠️ Open the "Hunt Analyzer" to see balance and rare drops!',
      'hud.conexao': '🌐 Connection',
      'hud.antiSleep': '⚡ Background (anti-sleep)',
      'hud.ativo': '🟢 Active',
      'hud.secaoSessao': 'Current session',
      'hud.capturas': 'Catches',
      'hud.shinies': '★ Shinies',
      'hud.ultimaCaptura': 'Last catch:',
      'hud.aguardando': 'Waiting for readings...',
      'hud.secaoEstoque': 'Active stock',
      'hud.badgeConectado': '🟢 Connected',
      'hud.badgeFechado': '🔴 Closed',
      'hud.badgeAcabaram': '🔴 Empty',
      'hud.badgeCaptura': '🟢 Capture bar',
      'hud.badgeAutoHelper': '🟢 Auto-Helper',
      'hud.badgeOculto': '🟡 Hidden',
      'hud.badgeHuntFechado': '🟡 Closed',
      'hud.badgeConexaoOk': '🟢 OK',
      'hud.badgeConexaoCaiu': '🔴 Dropped',

      // ---- "Pok3Watch Tool" modal (Alt+K) ----
      'tool.status': 'account connected',
      'tool.conta': 'account: {nome}',
      'tool.fechar': 'Close (Esc)',
      'tool.tabConfig': '⚙️ Actions & settings',
      'tool.tabPokemon': '🧮 Last catch',
      'tool.tabRotas': '🗺️ Farm routes',
      'tool.acoesRapidas': 'Quick actions',
      'tool.detalhesTitulo': 'Details of the last catch',
      'tool.detalhesTexto': 'See the IV read from the Capture Log.',
      'tool.configsInGame': 'In-game settings',
      'tool.bloquearAnuncios': 'Block announcements',
      'tool.bloquearAnunciosSub': 'Hides the global shiny announcements.',
      'tool.bloquearPromocoes': 'Block promotions',
      'tool.bloquearPromocoesSub': 'Hides the diamond shop ads.',
      'tool.lembreteGift': 'Gift reminder',
      'tool.lembreteGiftSub': 'Shows the daily gift reminder.',
      'tool.notaWhatsApp': 'WhatsApp alerts are set up in the extension popup.',
      'tool.rodape': 'Pok3Watch 24/7 • passive watcher',
      'tool.faixaLevel': 'Hunt level range',
      'tool.semCaptura': 'No catch read yet',
      'tool.semCapturaDica': 'Keep the "Capture Log" open in the game. As soon as a Pokémon is caught, its data shows up here.',
      'tool.ivTotal': 'Total IV',
      'tool.nivel': 'Level {n}',
      'tool.horario': 'Caught: {quando}',
      'tool.bola': 'Poké Ball: {bola}',
      'tool.semRaridade': 'no rarity',
      'tool.shiny': '✨ Shiny',
      'tool.ivNota': 'The game only shows the total IV in the Capture Log. Per-stat IV, type and moves are not there, so Pok3Watch has no way to show them.',

      // ---- Tutorial (public version) ----
      'tut.titulo': 'Pok3Watch — How to get the alerts on WhatsApp',
      'tut.chamada': 'To get the alerts on your phone you have to enable CallMeBot once. It takes 2 minutes.',
      'tut.h2Liberar': 'Enable WhatsApp',
      'tut.passo1a': 'Open the CallMeBot page:',
      'tut.passo1b': 'The bot WhatsApp number is shown there. **Save that number in your contacts.**',
      'tut.passo2': 'Send this message to the contact you just saved:',
      'tut.passo3a': 'The bot answers right away with a test link, similar to this one:',
      'tut.passo3b': 'Your **API Key** is just that ending (in the example, **1234567**) — you do not need the whole link. If you paste the whole link in the extension field, it picks up the key on its own.',
      'tut.passo3c': 'Keep that key to yourself: anyone who has it can send messages to your WhatsApp through the bot.',
      'tut.passo4': 'Click the Pok3Watch icon in the browser and fill in, at the top: **your number with area code** and the **API Key**. Settings save on their own. Then click **Test notification**: the message should reach your WhatsApp in a few seconds.',
      'tut.h2Janelas': 'Keep these windows open in the game',
      'tut.janelasIntro': 'Pok3Watch only reads what is on the screen. Each game window feeds a part of the alerts:',
      'tut.janelaLog': '**Capture Log** — shiny, rarity and IV alerts, and the best-catches list of the summary.',
      'tut.janelaHunt': '**Hunt Analyzer** — balance, loot and rare item drops.',
      'tut.janelaBolas': '**Auto-Helper** or the capture bar — Poké Ball count.',
      'tut.h2Problemas': 'If no message arrives',
      'tut.colunaProblema': 'What the popup shows',
      'tut.colunaSolucao': 'What to do',
      'tut.probChave': 'Invalid API Key',
      'tut.solChave': 'Redo steps 1 to 3 and paste the new key. The key is digits only, no spaces.',
      'tut.probNumero': 'CallMeBot did not recognize this number',
      'tut.solNumero': 'You have to send the activation phrase from the very phone that will get the alerts. Check the area code too.',
      'tut.probLimite': 'Sending limit',
      'tut.solLimite': 'CallMeBot is free and refuses bursts of messages. Pok3Watch already spaces the sends and retries on its own.',
      'tut.probRede': 'Network error',
      'tut.solRede': 'No internet or CallMeBot is down. The alert still shows up as a computer notification.',
      'tut.h2Escopo': 'What the extension does and does not do',
      'tut.escopo1': 'It **only watches** the game screen and warns you. It does not click, does not catch, does not play and sends no command to the game.',
      'tut.escopo2': 'What leaves your computer is only the alert text and your number, and it goes straight to CallMeBot, a free third-party service that delivers the message to your WhatsApp. Number and API Key are stored only in your browser.',
      'tut.h2Doar': 'Support the creator',
      'tut.rodape': 'Pok3Watch — passive monitor for Poke Idle World'
    },

    es: {
      'comum.rodape': '_Pok3Watch 24/7_',
      'comum.naoInformada': 'no informada',
      'comum.naoInformado': 'no informado',
      'comum.desconhecido': 'Desconocido',
      'comum.menosDeUmMin': 'menos de 1 min',
      'comum.minutos': '{n} min',

      'prioridade.MAXIMA': '🚨 Máximo',
      'prioridade.ALTA': '⚠️ Alto',

      'regra.se': 'Si {condicoes} → {prioridade}',
      'regra.e': ' Y ',
      'regra.ou': ' o ',
      'regra.shiny': 'shiny',
      'regra.qualquerRaridade': 'cualquier rareza',
      'regra.ivMinimo': 'IV ≥ {iv}',
      'regra.ivExato': 'IV {iv}',
      'regraNome.shiny': 'Shiny',
      'regraNome.mitica-mais': 'Mítica o superior',
      'regraNome.iv-perfeito': 'IV perfecto',
      'regraNome.lendaria-top': 'Legendaria top',
      'regraNome.lendaria': 'Legendaria',
      'regraNome.epica-160': 'Épica IV 160+',
      'regraNome.rara-180': 'Rara IV 180+',
      'regraNome.iv-185': 'IV 185+ (cualquier rareza)',

      'captura.topoShiny': '🌟✨ *POKEWATCH — ¡SHINY CAPTURADO!* ✨🌟',
      'captura.topoMaximo': '🚨 *POKEWATCH — ¡CAPTURA TOP!* 🚨',
      'captura.topoAlto': '🎯 *POKEWATCH — CAPTURA ESPECIAL* 🎯',
      'captura.regra': 'Regla: {regras}',
      'captura.pokemon': '👾 *Pokémon:* {nome}',
      'captura.raridade': '💎 *Rareza:* {raridade}',
      'captura.iv': '📊 *IV:* {iv}',
      'captura.bola': '🔴 *Poké Ball:* {bola}',
      'captura.horario': '⏰ *Hora:* {hora}',

      'bolas.topo': '⚠️ *POKEWATCH — ¡SE ACABAN LAS POKÉ BALLS!* ⚠️',
      'bolas.item': '• *{tipo}*: quedan {qtd} (límite ≤ {limite})',
      'bolas.dica': '👉 Compra más antes de que se acaben para no perder un shiny.',
      'semBolas.topo': '🛑 *POKEWATCH — ¡TE QUEDASTE SIN POKÉ BALLS!* 🛑',
      'semBolas.linha1': 'La barra de captura del juego muestra "Sin Poké Balls".',
      'semBolas.linha2': 'Hasta que compres más, no se captura ningún salvaje (ni shiny).',

      'drop.topo': '💰 *POKEWATCH — ¡DROP RARO!* 💰',
      'drop.item': '• *{nome}* +{ganho}{raridade} — total en la sesión: {total}',

      'resumo.topo': '📊 *POKEWATCH — RESUMEN DE LAS ÚLTIMAS {horas}H*',
      'resumo.capturas': '🎯 *Capturas:* {total}',
      'resumo.shinies': ' (✨ {n} shiny)',
      'resumo.melhores': '🏆 *Las mejores:*',
      'resumo.semCapturas': '   (ninguna captura vista — ¿el Registro de Capturas quedó abierto?)',
      'resumo.saldo': '💰 *Saldo:* {saldo}',
      'resumo.lootSupply': '   Loot {loot} · Supply {supply}',
      'resumo.ritmo': '   Ritmo actual: {ritmo}',
      'resumo.itensRaros': '💎 *Objetos raros:* {itens}',
      'resumo.semItens': '💎 *Objetos raros:* ninguno',
      'resumo.semHunt': '💰 *Saldo y drops:* sin lectura — deja el Hunt Analyzer abierto en el juego',
      'resumo.bolas': '🎒 *Poké Balls:* {bolas}',
      'resumo.semBolas': '🛑 *Poké Balls:* SE ACABARON',
      'resumo.huntReiniciou': 'la caza se reinició en el período; valores desde el reinicio',
      'resumo.sessaoInteira': 'valores de toda la sesión actual',

      'conexao.topo': '🔌 *POKEWATCH — ¡JUEGO DESCONECTADO!* 🔌',
      'conexao.motivo': 'Motivo: {motivo}',
      'conexao.tempo': 'Sin jugar desde hace {tempo}.',
      'conexao.dica': '👉 Revisa la computadora y la pestaña del juego.',
      'conexao.voltouTopo': '✅ *POKEWATCH — EL JUEGO VOLVIÓ*',
      'conexao.voltouCorpo': 'Conexión normal otra vez después de {tempo}.',
      'conexao.perdida': 'conexión perdida (el juego está intentando reconectar)',
      'conexao.manutencao': 'juego en mantenimiento',
      'conexao.namelock': 'el juego pidió cambio de nombre (namelock)',
      'conexao.foraDoJogo': 'salió de la pantalla del juego ({caminho})',

      'aba.topo': '🔌 *POKEWATCH — ¡LA PESTAÑA DEL JUEGO NO RESPONDE!* 🔌',
      'aba.descartada': 'Chrome descartó la pestaña del juego para ahorrar memoria',
      'aba.travada': 'la pestaña del juego se congeló o dejó de responder',
      'aba.tempo': 'Sin señal desde hace {n} min.',
      'aba.dica': '👉 Abre la pestaña del juego y recárgala si hace falta.',
      'aba.voltouTopo': '✅ *POKEWATCH — LA PESTAÑA VOLVIÓ*',
      'aba.voltouCorpo': 'La pestaña volvió a responder después de ~{n} min.',

      'gift.topo': '🎁 *POKEWATCH — ¡REGALO DIARIO DISPONIBLE!* 🎁',
      'gift.corpo': 'Pasa por el juego para reclamar tu regalo diario.',

      'titulo.IV_ALTO': 'IV alto',
      'titulo.SHINY': 'Shiny capturado',
      'titulo.CAPTURA_MAXIMA': 'Captura top',
      'titulo.CAPTURA_ALTA': 'Captura especial',
      'titulo.RARIDADE_ALTA': 'Captura premium',
      'titulo.BOLAS_BAIXAS': 'Pocas Poké Balls',
      'titulo.SEM_BOLAS': 'Sin Poké Balls',
      'titulo.DROP_RARO': 'Drop raro',
      'titulo.GIFT': 'Regalo disponible',
      'titulo.RESUMO': 'Resumen',
      'titulo.DESCONECTADO': 'Juego desconectado',
      'titulo.RECONECTADO': 'El juego volvió',
      'titulo.TRAVADO': 'Juego congelado',
      'titulo.SNAPSHOT': 'Captura de pantalla',
      'titulo.TESTE': 'Prueba',
      'titulo.ALERTA': 'Alerta',

      'envio.semNumero': 'Número de WhatsApp sin configurar en el popup.',
      'envio.numeroInvalido': 'Número inválido. Usa código de país + área + teléfono, ej.: 5511998454621.',
      'print.indisponivel': 'Esta versión envía solo texto, así que no toma captura.',
      'envio.semChave': 'API Key de CallMeBot sin configurar en el popup.',
      'envio.chaveInvalida': 'API Key inválida. Rehaz los pasos de CallMeBot y pega la clave nueva.',
      'envio.numeroNaoLiberado': 'CallMeBot no reconoció este número. Envía el mensaje de activación al bot y revisa el número en el popup.',
      'envio.limite': 'CallMeBot pidió esperar (límite de envíos). Lo intentará de nuevo en breve.',
      'envio.timeout': 'Tiempo agotado: el servidor tardó demasiado en responder.',
      'envio.rede': 'Error de red: Chrome no pudo enviar el mensaje. Revisa tu internet.',
      'envio.mensagemCortada': '(mensaje recortado)',
      'envio.limiteExtensao': 'Límite de alertas alcanzado (20 por hora / 100 por día). Vuelven cuando pase el período.',
      'dados.apagados': 'Tus datos fueron borrados de esta extensión.',

      'popup.dispara': '{prioridade} — dispara: {regras}',
      'popup.naoAlerta': '🔕 No alerta',
      'popup.regraSemFiltros': 'Regla sin filtros',
      'popup.regraVazia': '⚠️ Una regla vacía alertaría en TODAS las capturas. Marca una rareza, un IV mínimo o "Solo shiny".',
      'popup.criteriosE': 'Los criterios de esta regla funcionan juntos (Y).',
      'popup.nomePersonalizado': 'Nombre personalizado (opcional)',
      'popup.idioma': 'Idioma',

      // ---- Popup: encabezado y estado ----
      'popup.titulo': 'Pok3Watch — Cabina de control',
      'popup.btnBarraLateral': 'Abrir en la barra lateral de Chrome',
      'popup.btnJanela': 'Abrir en una ventana aparte',
      'popup.contasDetectadas': 'Cuentas del juego detectadas:',
      'popup.verificandoAba': 'Revisando la pestaña del juego...',
      'popup.conta': 'Cuenta: {nome} (pestaña #{tab})',
      'popup.focarAba': 'Haz clic para ir a la pestaña de {nome}',
      'popup.statusOnline': 'EN LÍNEA',
      'popup.statusCaiu': 'SE CAYÓ',
      'popup.statusSemSinal': 'SIN SEÑAL',
      'popup.statusCarregando': 'CARGANDO',
      'popup.statusOffline': 'DESCONECTADO',
      'popup.jogoAberto': 'Juego abierto — esperando que el monitor responda',
      'popup.abraOJogoNavegador': 'Abre Poke Idle World en el navegador',

      // ---- Popup: panel de la caza ----
      'popup.huntTitulo': '⚔️ Sesión de caza',
      'popup.huntCapturados': 'Capturados',
      'popup.huntShinies': 'Shinies',
      'popup.huntDerrotados': 'Derrotados',
      'popup.huntSaldo': 'Saldo de la caza',

      // ---- Popup: WhatsApp ----
      'popup.secaoWhatsApp': 'Canal de WhatsApp',
      'popup.numeroLabel': 'Número con prefijo (solo dígitos)',
      'popup.numeroPlaceholder': 'Ej.: 11900000000',
      'popup.numeroErro': 'Número inválido: usa prefijo + teléfono (10 a 13 dígitos). El número guardado antes sigue valiendo.',

      // ---- Popup: reglas ----
      'popup.secaoRegras': 'Reglas de alerta de captura',
      'popup.regrasAjuda': 'Dentro de la regla vale **Y**. Entre reglas vale **O** (basta con que una coincida). Ninguna rareza marcada = cualquier rareza. IV 0 = cualquier IV.',
      'popup.novaRegra': '+ Nueva regla',
      'popup.restaurarRegras': 'Restaurar por defecto',
      'popup.confirmarDeNovo': 'Haz clic otra vez para confirmar',
      'popup.regrasRestauradas': 'Reglas por defecto restauradas.',
      'popup.semRegras': '⚠️ Sin reglas: ninguna captura va a alertar. Usa "+ Nueva regla" o "Restaurar por defecto".',
      'popup.testeTitulo': '🧪 Prueba rápida — ¿y si atrapo…?',
      'popup.soShiny': 'Solo shiny ✨',
      'popup.fecharDetalhes': 'Cerrar detalles',
      'popup.editarRegra': 'Editar regla',
      'popup.excluirRegra': 'Eliminar esta regla',
      'popup.excluirConfirmar': '¿Eliminar?',
      'popup.prioridadeMax': '🚨 Máx',
      'popup.prioridadeAlta': '⚠️ Alta',
      'popup.badgeMax': 'MÁX',
      'popup.badgeAlta': 'ALTA',

      // ---- Popup: Poké Balls ----
      'popup.secaoBolas': 'Poké Balls',
      'popup.bolaVigiada': 'Bola vigilada',
      'popup.avisarAbaixoDe': 'Avisar por debajo de',
      'popup.unidade': 'un',
      'popup.dicaAutoHelper': 'Con el Auto-Helper abierto, la extensión vigila sola la bola elegida en el Auto-Catch.',
      'popup.estoqueBaixo': 'Pocas existencias',
      'popup.estoqueBaixoSub': 'Se repite cada 15 min mientras esté por debajo',
      'popup.acabaramBolas': 'Se acabaron las Poké Balls',
      'popup.acabaramBolasSub': 'El juego muestra "Sin Poké Balls" por 20s',

      // ---- Popup: drops y resumen ----
      'popup.secaoDrops': 'Drops y resumen',
      'popup.dropRaro': 'Alerta de drop raro',
      'popup.dropRaroSub': 'Necesita el Hunt Analyzer abierto en el juego',
      'popup.itemRaroAPartir': 'Objeto raro a partir de',
      'popup.itemFaixa': '{raridade} ({preco}+)',
      'popup.resumoACada': 'Resumen cada',
      'popup.umaHora': '1 hora',
      'popup.nHoras': '{n} horas',
      'popup.itensSempre': 'Objetos que siempre avisan (separa con comas)',
      'popup.itensPlaceholder': 'Ej.: Metal Stone, Pheromone, Upgrade',
      'popup.resumoPeriodico': 'Resumen periódico',
      'popup.resumoPeriodicoSub': 'Mejores Pokémon, saldo, loot y objetos raros',

      // ---- Popup: vigilancia y QoL ----
      'popup.secaoVigilancia': 'Vigilancia',
      'popup.jogoDesconectado': 'Juego desconectado',
      'popup.jogoDesconectadoSub': 'Caída, cuenta en uso, mantenimiento o pestaña sin señal',
      'popup.secaoQoL': 'QoL y filtros visuales',
      'popup.bloquearAnuncios': 'Bloquear anuncios de shiny',
      'popup.bloquearAnunciosSub': 'Oculta los avisos globales de shiny del juego',
      'popup.bloquearPromocoes': 'Bloquear promociones de la tienda',
      'popup.bloquearPromocoesSub': 'Oculta banners y ventanas de diamantes',
      'popup.lembreteGift': 'Recordatorio del regalo diario',
      'popup.lembreteGiftSub': 'Muestra un aviso en el HUD cuando esté listo para reclamar',
      'popup.giftWhatsApp': 'Alerta del regalo por WhatsApp',
      'popup.giftWhatsAppSub': 'Avisa al celular cuando el regalo esté listo',

      // ---- Popup: rutas y capturas de pantalla ----
      'popup.rotasTitulo': '🗺️ Rutas de farmeo y spawns',
      'popup.nivel': 'Lv {n}',
      'popup.printsTitulo': '📸 Filtros de capturas de pantalla',
      'popup.filtrosAtivos': '{n} activos',
      'popup.printShiny': 'Captura al atrapar un shiny',
      'popup.printShinySub': 'Registro visual inmediato',
      'popup.printDrop': 'Captura en drops raros',
      'popup.printDropSub': 'Comprobante de haber obtenido el objeto',
      'popup.printIv': 'Captura en alertas máximas',
      'popup.printIvSub': 'Capturas 🚨 que no son shiny',
      'popup.printTravado': 'Captura si el juego se desconecta',
      'popup.printTravadoSub': 'Muestra la pantalla de error del juego',
      'popup.cropInteligente': 'Recorte inteligente (foco en el registro)',
      'popup.cropInteligenteSub': 'Recorta el área útil sin ruido',

      // ---- Popup: telemetría ----
      'popup.secaoTelemetria': 'Telemetría de existencias',
      'popup.estoqueAtual': 'Existencias actuales',
      'popup.gastoUltimaHora': 'Gasto en la última 1h',
      'popup.ritmoConsumo': 'Ritmo de consumo',
      'popup.previsaoDuracao': 'Duración estimada',
      'popup.aguardandoLeitura': 'Esperando la lectura del juego...',
      'popup.abraOJogo': 'Abre el juego hasta que las existencias aparezcan en pantalla.',
      'popup.abraAutoHelper': 'Abre el Auto-Helper o espera a que aparezca la barra de captura en el juego.',
      'popup.semPrevisao': 'Todavía sin estimación (recogiendo datos)',
      'popup.dura': 'Dura {tempo}',
      'popup.acabaAs': ' • se acaba a las {hora}',
      'popup.estoqueDetectado': 'Existencias detectadas.',
      'popup.fonte': 'Fuente: {fonte}',
      'popup.fonteAutoHelper': 'Auto-Helper',
      'popup.fonteCaptura': 'Barra de captura',
      'popup.fonteDireta': 'lectura directa de la pantalla',
      'popup.duracaoMin': '{n} min',
      'popup.duracaoH': '{h}h',
      'popup.duracaoHM': '{h}h {m}min',

      // ---- Popup: entrega y botones ----
      'popup.whatsappNaoTestado': 'WhatsApp todavía sin probar.',
      'popup.ultimoEnvioOk': 'Último envío OK a las {hora}',
      'popup.ultimoEnvioOkPara': 'Último envío OK a las {hora} a {destino}',
      'popup.falhaEnvio': 'Falló a las {hora}: {erro}',
      'popup.erroEnvio': 'error de envío',
      'popup.salvamAutomatico': 'Los cambios se guardan solos',
      'popup.btnSalvar': 'Guardar configuración',
      'popup.btnTestar': 'Probar notificación',
      'popup.btnTestando': 'Probando el envío...',
      'popup.btnResetar': 'Reiniciar métricas de farmeo',
      'popup.toastPadrao': '¡Configuración guardada!',
      'popup.salvoAs': '✓ Guardado automáticamente a las {hora}',
      'popup.salvoIncompletas': '⚠️ Guardado a las {hora} — {n} regla(s) incompleta(s) todavía no valen',
      'popup.erroSalvar': 'Error al guardar: {erro}',
      'popup.salvo': '¡Configuración guardada!',
      'popup.salvoNumeroInvalido': 'Guardado, pero el número de WhatsApp es inválido.',
      'popup.semBarraLateral': 'No pude abrir la barra lateral: {erro}',
      'popup.semJanela': 'No pude abrir la ventana: {erro}',
      'popup.informeWhatsApp': 'Escribe el WhatsApp con prefijo (ej.: 11999998888).',
      'popup.coleApiKey': 'Pega la API Key de CallMeBot (mira los pasos arriba).',
      'popup.testeTopo': '*Pok3Watch* — ¡WhatsApp en línea! ✅',
      'popup.testeRegrasAtivas': '📋 Reglas de captura activas: {n}',
      'popup.falhaGenerica': 'Falló: {erro}',
      'popup.falhaTeste': 'No se pudo enviar la prueba.',
      'popup.testeEnviado': '¡Prueba enviada a WhatsApp!',
      'popup.metricasResetadas': 'Métricas de farmeo reiniciadas.',
      'popup.copiar': 'copiar',
      'popup.copiado': '¡copiado!',
      'popup.copieCtrlC': 'copia con Ctrl+C',

      // ---- Versión pública (CallMeBot) ----
      'pub.doarTitulo': '❤️ Ayuda al creador',
      'pub.doarTexto': 'Pok3Watch es gratis, sin anuncios y no vende ningún dato tuyo. Si ya te salvó un shiny, considera ayudar:',
      'pub.bmc': '☕ Buy me a coffee',
      'pub.ou': 'o',
      'pub.criptoNota': 'USDT o USDC en redes EVM (BSC, Polygon, Arbitrum, Ethereum)',
      'pub.sugestao': '💡 Mandar una idea o sugerencia',
      'pub.secaoWhatsApp': 'Canal de WhatsApp (CallMeBot)',
      'pub.avisoConfig': '⚠️ **Falta configurar WhatsApp.** Sin el número y la API Key de abajo, no se envía ninguna alerta.',
      'pub.passosTitulo': 'Activación de WhatsApp (una sola vez):',
      'pub.passo1a': '1) Abre',
      'pub.passo1b': 'y guarda en tus contactos el número que aparece allí.',
      'pub.passo2': '2) Manda a ese contacto:',
      'pub.passo3': '3) El bot responde con tu **API Key**. Pégala aquí abajo.',
      'pub.abrirTutorial': '📖 Abrir el tutorial completo',
      'pub.numeroLabel': 'Tu número con prefijo (solo los dígitos)',
      'pub.numeroDica': 'Sin el signo + y sin espacios. Si pones el código de país delante también funciona.',
      'pub.apiKeyLabel': 'API Key de CallMeBot (solo el final)',
      'pub.apiKeyDica1': 'El bot responde con un enlace tipo',
      'pub.apiKeyDica2': 'Pega aquí **solo lo que viene después de apikey=**. Si pegas el enlace entero, la clave se aprovecha sola.',
      'pub.apiKeyErro': 'Sin la API Key, CallMeBot rechaza el envío.',
      'pub.dicaSoTexto': 'CallMeBot es gratis y envía solo texto, así que esta versión no manda capturas de pantalla. Las alertas seguidas salen espaciadas para que el bot no las rechace.',

      // ---- HUD dentro del juego ----
      'hud.heartbeat': 'Latido activo',
      'hud.vigilanteAtivo': 'Vigilante activo',
      'hud.vigia': 'Vigila • {nome}',
      'hud.giftBadge': '🎁 ¡Regalo!',
      'hud.giftTitle': '¡Regalo diario listo para reclamar!',
      'hud.vigiaOn': '• VIGILA ON',
      'hud.btnTool': 'Abrir la Pok3Watch Tool (Alt+K)',
      'hud.btnSnap': 'Tomar una captura ahora',
      'hud.btnRecolher': 'Recoger en pastilla',
      'hud.btnExpandir': 'Expandir la cabina',
      'hud.secaoSensores': 'Estado de los sensores',
      'hud.logCapturas': '📋 Registro de Capturas',
      'hud.buscando': 'Buscando...',
      'hud.hintLog': '⚠️ ¡Abre el "Registro de Capturas" en el juego para monitorear!',
      'hud.estoqueBolas': '🎒 Existencias de bolas',
      'hud.hintBolas': '⚠️ ¡Abre el "Auto-Helper" o espera una captura!',
      'hud.huntAnalyzer': '💰 Hunt Analyzer',
      'hud.hintHunt': '⚠️ ¡Abre el "Hunt Analyzer" para ver saldo y drops raros!',
      'hud.conexao': '🌐 Conexión',
      'hud.antiSleep': '⚡ 2º plano (anti-sleep)',
      'hud.ativo': '🟢 Activo',
      'hud.secaoSessao': 'Sesión actual',
      'hud.capturas': 'Capturas',
      'hud.shinies': '★ Shinies',
      'hud.ultimaCaptura': 'Última captura:',
      'hud.aguardando': 'Esperando lecturas...',
      'hud.secaoEstoque': 'Existencias activas',
      'hud.badgeConectado': '🟢 Conectado',
      'hud.badgeFechado': '🔴 Cerrado',
      'hud.badgeAcabaram': '🔴 Se acabaron',
      'hud.badgeCaptura': '🟢 Barra de captura',
      'hud.badgeAutoHelper': '🟢 Auto-Helper',
      'hud.badgeOculto': '🟡 Oculto',
      'hud.badgeHuntFechado': '🟡 Cerrado',
      'hud.badgeConexaoOk': '🟢 OK',
      'hud.badgeConexaoCaiu': '🔴 Se cayó',

      // ---- Modal "Pok3Watch Tool" (Alt+K) ----
      'tool.status': 'cuenta conectada',
      'tool.conta': 'cuenta: {nome}',
      'tool.fechar': 'Cerrar (Esc)',
      'tool.tabConfig': '⚙️ Acciones y ajustes',
      'tool.tabPokemon': '🧮 Última captura',
      'tool.tabRotas': '🗺️ Rutas de farmeo',
      'tool.acoesRapidas': 'Acciones rápidas',
      'tool.detalhesTitulo': 'Detalles de la última captura',
      'tool.detalhesTexto': 'Mira el IV leído del Registro de Capturas.',
      'tool.configsInGame': 'Ajustes dentro del juego',
      'tool.bloquearAnuncios': 'Bloquear anuncios',
      'tool.bloquearAnunciosSub': 'Oculta los anuncios globales de shiny.',
      'tool.bloquearPromocoes': 'Bloquear promociones',
      'tool.bloquearPromocoesSub': 'Oculta los anuncios de la tienda de diamantes.',
      'tool.lembreteGift': 'Recordatorio del regalo',
      'tool.lembreteGiftSub': 'Muestra el recordatorio del regalo diario.',
      'tool.notaWhatsApp': 'Las alertas de WhatsApp se configuran en el popup de la extensión.',
      'tool.rodape': 'Pok3Watch 24/7 • observador pasivo',
      'tool.faixaLevel': 'Rango de nivel de la caza',
      'tool.semCaptura': 'Todavía no se leyó ninguna captura',
      'tool.semCapturaDica': 'Deja el "Registro de Capturas" abierto en el juego. En cuanto captures un Pokémon, sus datos aparecen aquí.',
      'tool.ivTotal': 'IV total',
      'tool.nivel': 'Nivel {n}',
      'tool.horario': 'Capturado: {quando}',
      'tool.bola': 'Poké Ball: {bola}',
      'tool.semRaridade': 'sin rareza',
      'tool.shiny': '✨ Shiny',
      'tool.ivNota': 'El juego solo muestra el IV total en el Registro de Capturas. El IV por atributo, el tipo y los movimientos no aparecen allí, así que Pok3Watch no puede mostrarlos.',

      // ---- Tutorial (versión pública) ----
      'tut.titulo': 'Pok3Watch — Cómo recibir las alertas en WhatsApp',
      'tut.chamada': 'Para recibir las alertas en el celular tienes que activar CallMeBot una sola vez. Toma 2 minutos.',
      'tut.h2Liberar': 'Activar WhatsApp',
      'tut.passo1a': 'Abre la página de CallMeBot:',
      'tut.passo1b': 'Allí aparece el número de WhatsApp del bot. **Guarda ese número en tus contactos.**',
      'tut.passo2': 'Manda este mensaje al contacto que acabas de guardar:',
      'tut.passo3a': 'El bot responde al instante con un enlace de prueba, parecido a este:',
      'tut.passo3b': 'Tu **API Key** es solo ese final (en el ejemplo, **1234567**) — no hace falta el enlace entero. Si pegas el enlace completo en el campo de la extensión, ella aprovecha la clave sola.',
      'tut.passo3c': 'Guarda esa clave solo para ti: quien la tenga puede mandar mensajes a tu WhatsApp por el bot.',
      'tut.passo4': 'Haz clic en el icono de Pok3Watch en el navegador y completa, arriba: **tu número con prefijo** y la **API Key**. La configuración se guarda sola. Después haz clic en **Probar notificación**: el mensaje debe llegar a tu WhatsApp en unos segundos.',
      'tut.h2Janelas': 'Deja estas ventanas abiertas en el juego',
      'tut.janelasIntro': 'Pok3Watch solo lee lo que está en la pantalla. Cada ventana del juego alimenta una parte de las alertas:',
      'tut.janelaLog': '**Registro de Capturas** — alertas de shiny, rareza e IV, y la lista de las mejores del resumen.',
      'tut.janelaHunt': '**Hunt Analyzer** — saldo, loot y drops de objetos raros.',
      'tut.janelaBolas': '**Auto-Helper** o la barra de captura — cuenta de Poké Balls.',
      'tut.h2Problemas': 'Si no llega ningún mensaje',
      'tut.colunaProblema': 'Lo que aparece en el popup',
      'tut.colunaSolucao': 'Qué hacer',
      'tut.probChave': 'API Key inválida',
      'tut.solChave': 'Rehaz los pasos 1 a 3 y pega la clave nueva. La clave es solo de números, sin espacios.',
      'tut.probNumero': 'CallMeBot no reconoció este número',
      'tut.solNumero': 'Tienes que mandar la frase de activación desde el mismo celular que va a recibir las alertas. Revisa también el prefijo.',
      'tut.probLimite': 'Límite de envíos',
      'tut.solLimite': 'CallMeBot es gratis y rechaza mensajes en ráfaga. Pok3Watch ya espacia los envíos y lo intenta de nuevo solo.',
      'tut.probRede': 'Error de red',
      'tut.solRede': 'Sin internet o CallMeBot caído. La alerta aparece igual como notificación de la computadora.',
      'tut.h2Escopo': 'Qué hace y qué no hace la extensión',
      'tut.escopo1': 'Ella **solo observa** la pantalla del juego y te avisa. No hace clic, no captura, no juega y no manda ningún comando al juego.',
      'tut.escopo2': 'Lo que sale de tu computadora es solo el texto de la alerta y tu número, y va directo a CallMeBot, que es un servicio gratuito de terceros y entrega el mensaje en tu WhatsApp. El número y la API Key se guardan solo en tu navegador.',
      'tut.h2Doar': 'Ayuda al creador',
      'tut.rodape': 'Pok3Watch — monitor pasivo para Poke Idle World'
    }
  };

  let idiomaAtual = 'pt';

  // Ordem da escolha: o que o usuário marcou no popup > idioma do jogo > idioma do navegador
  function detectar(preferencia) {
    if (IDIOMAS.includes(preferencia)) return preferencia;

    const candidatos = [];
    try {
      // Páginas da própria extensão (popup, tutorial) têm lang fixo no HTML e não valem
      // como pista. Só o idioma do jogo interessa aqui.
      const paginaDaExtensao = typeof location !== 'undefined' && String(location.protocol).startsWith('chrome-extension');
      if (!paginaDaExtensao && typeof document !== 'undefined' && document.documentElement) {
        candidatos.push(document.documentElement.lang);
      }
    } catch (_) {}
    try {
      if (typeof navigator !== 'undefined') {
        candidatos.push(navigator.language, ...(navigator.languages || []));
      }
    } catch (_) {}

    for (const candidato of candidatos) {
      const curto = String(candidato || '').slice(0, 2).toLowerCase();
      if (IDIOMAS.includes(curto)) return curto;
    }
    return 'en';
  }

  function definir(preferencia) {
    idiomaAtual = detectar(preferencia);
    return idiomaAtual;
  }

  function idioma() {
    return idiomaAtual;
  }

  function locale() {
    return LOCALES[idiomaAtual] || LOCALES.en;
  }

  function numero(valor) {
    return Number(valor || 0).toLocaleString(locale());
  }

  /**
   * Texto traduzido, com troca de {marcadores}.
   * Se faltar no idioma atual, usa inglês e depois português.
   */
  function t(chave, valores) {
    const texto = (TEXTOS[idiomaAtual] && TEXTOS[idiomaAtual][chave])
      ?? (TEXTOS.en && TEXTOS.en[chave])
      ?? (TEXTOS.pt && TEXTOS.pt[chave])
      ?? chave;

    if (!valores) return texto;
    return texto.replace(/\{(\w+)\}/g, (inteiro, nome) => (valores[nome] !== undefined ? String(valores[nome]) : inteiro));
  }

  // Raridade do Pokémon: recebe o nome em português (o interno) e devolve no idioma atual
  function raridade(nomeEmPortugues) {
    const posicao = RARIDADES.pt.indexOf(nomeEmPortugues);
    if (posicao < 0) return nomeEmPortugues;
    return (RARIDADES[idiomaAtual] || RARIDADES.pt)[posicao];
  }

  function raridadeItem(nomeEmPortugues) {
    const posicao = RARIDADES_ITEM.pt.indexOf(nomeEmPortugues);
    if (posicao < 0) return nomeEmPortugues;
    return (RARIDADES_ITEM[idiomaAtual] || RARIDADES_ITEM.pt)[posicao];
  }

  function nomeDoIdioma(codigo) {
    if (codigo === 'auto') return NOMES_IDIOMA.auto[idiomaAtual] || NOMES_IDIOMA.auto.en;
    return NOMES_IDIOMA[codigo] || codigo;
  }

  // -------------------------------------------------------------
  // Tradução da interface
  // -------------------------------------------------------------

  /**
   * Escreve o texto no elemento. Trechos entre **asteriscos duplos** viram <b>,
   * montados por DOM — nada de innerHTML, nem mesmo com texto nosso.
   */
  function escrever(elemento, texto) {
    if (!elemento) return;
    if (!String(texto).includes('**')) {
      elemento.textContent = texto;
      return;
    }
    elemento.textContent = '';
    String(texto).split('**').forEach((pedaco, indice) => {
      if (!pedaco) return;
      if (indice % 2 === 1) {
        const forte = elemento.ownerDocument.createElement('b');
        forte.textContent = pedaco;
        elemento.appendChild(forte);
      } else {
        elemento.appendChild(elemento.ownerDocument.createTextNode(pedaco));
      }
    });
  }

  /**
   * Preenche tudo que estiver marcado com data-i18n (texto), data-i18n-title
   * e data-i18n-ph (placeholder). Chame depois de definir().
   * `raiz` pode ser o document ou só um pedaço da tela (HUD, modal).
   */
  function traduzir(raiz) {
    const alvo = raiz || (typeof document !== 'undefined' ? document : null);
    if (!alvo || typeof alvo.querySelectorAll !== 'function') return;

    const cada = (seletor, acao) => {
      if (typeof alvo.matches === 'function' && alvo.matches(seletor)) acao(alvo);
      alvo.querySelectorAll(seletor).forEach(acao);
    };

    cada('[data-i18n]', (el) => escrever(el, t(el.getAttribute('data-i18n'))));
    cada('[data-i18n-title]', (el) => el.setAttribute('title', t(el.getAttribute('data-i18n-title'))));
    cada('[data-i18n-ph]', (el) => el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))));
  }

  return {
    IDIOMAS,
    RARIDADES,
    RARIDADES_ITEM,
    detectar,
    definir,
    idioma,
    locale,
    numero,
    t,
    raridade,
    raridadeItem,
    nomeDoIdioma,
    escrever,
    traduzir
  };
});

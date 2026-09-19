// Pok3Watch — Content Script Principal
// Injetado em: https://poke.idleworld.online/*

(function () {
  console.log('[Pok3Watch] Inicializando monitor passivo...');

  // Estado global do monitor
  const estado = {
    configs: {},
    nomeTreinador: null,
    audioAtivo: false,
    workerAtivo: false,
    ticksHeartbeat: 0,
    ultimaChecagemResumo: 0,
    ultimoHeartbeat: 0,
    janelaLogEncontrada: false,
    fontePokebolas: null, // 'CAPTURA' | 'AUTO_HELPER' | null
    estoqueBolas: {},
    capturasVistas: new Set(),
    totalSessao: 0,
    shiniesSessao: 0,
    ultimaCaptura: null,
    ultimoAlertaBolas: 0,
    observerLog: null,
    elLogContainer: null,
    logAbaBase: null,
    logBaselinePendente: true,
    semBolas: false,
    semBolasDesde: 0,
    alertouSemBolas: false,
    huntAtual: null,
    huntBase: null,
    ultimoSnapshotHunt: 0,
    conexao: { problema: null, desde: 0, alertou: false },
    resumoEmAndamento: false,
    giftDisponivel: false,
    ultimoAlertaGift: 0,
    alertouGiftWhatsApp: false
  };

  // -------------------------------------------------------------
  // 1. ANTI-THROTTLING & KEEP-ALIVE
  // -------------------------------------------------------------
  let audioCtx = null;

  function iniciarAudioAntiThrottle() {
    const ativar = () => {
      try {
        if (audioCtx && audioCtx.state === 'running') return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        if (!audioCtx) {
          audioCtx = new AudioContextClass();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          gain.gain.value = 0.00001;
          osc.frequency.value = 440;
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
        }

        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        estado.audioAtivo = true;
      } catch (e) {}
    };

    // Tenta e registra para ativar na primeira interação do jogador
    ativar();
    window.addEventListener('click', ativar, { once: true, passive: true });
    window.addEventListener('keydown', ativar, { once: true, passive: true });
  }

  // O Chrome congela abas em 2º plano e os timers param, o que fazia o vigia
  // achar que a aba travou. Segurar um Web Lock mantém a página fora do congelamento.
  function segurarTravaAntiCongelamento() {
    try {
      if (!navigator.locks || !navigator.locks.request) return;
      navigator.locks.request('pokewatch-vigia', () => new Promise(() => {})).catch(() => {});
    } catch (_) {}
  }

  // O background cutuca a aba antes de alertar: se ela responder, não estava travada
  function responderCutucada() {
    try {
      chrome.runtime.onMessage.addListener((mensagem, _remetente, responder) => {
        if (mensagem && mensagem.tipo === 'PING_ABA') {
          responder({ vivo: true, quando: Date.now() });
          enviarHeartbeatTab();
        }
        return false;
      });
    } catch (_) {}
  }

  function iniciarWorkerHeartbeat() {
    // Timer principal de inspeção contínua (1 segundo)
    setInterval(() => {
      estado.ticksHeartbeat++;
      cicloVerificacao();
    }, 1000);
    estado.workerAtivo = true;
  }

  // -------------------------------------------------------------
  // 2. SCRAPERS DO DOM (Log de Capturas & Pokébolas OR)
  // -------------------------------------------------------------

  // Estrutura da janela "Log de Capturas" (conferida no código do próprio jogo):
  //   .clog-window > .clog-tabs > .clog-tab.on        (Todos / ✨ Shiny / Normais)
  //   .clog-window > .clog-list > .clog-row[.shiny]   (últimas 100, mais nova no topo)
  //     .clog-name ("✨ " + nome + <i.clog-first>1ª</i>) · .clog-lvl · .clog-meta (<b>raridade</b> · IV x/192) · .clog-ball · .clog-when
  // Ler só essas classes evita tratar Loja, Bag e outras listas com "Lv."/"IV" como capturas.

  /**
   * Localiza estritamente a janela do "Log de Capturas", rejeitando qualquer
   * outra janela do jogo (como Inventário, Mochila, Box, Depósito, Party, Loja).
   */
  function encontrarJanelaLogDeCapturas() {
    const janelas = document.querySelectorAll('.clog-window, .win-window');
    for (const janela of janelas) {
      const headerEl = janela.querySelector('h1, h2, h3, h4, .win-header, .win-title, .clog-header');
      const textoHeader = (headerEl ? headerEl.textContent : janela.textContent.slice(0, 300)).toLowerCase();

      // REJEIÇÃO TOTAL: Se for inventário, mochila, box, depósito, equipe, time ou loja, pula sumariamente
      if (/invent[aá]r|mochila|bag|box|dep[oó]sit|storage|equipe|party|time|meus\s*pok[eé]mon|loja|shop|pokedex/i.test(textoHeader)) {
        continue;
      }

      // Validação positiva: Deve ter indicação do Log de Capturas
      const temTituloLog = /log\s*(de\s*)?captura|capture\s*log/i.test(textoHeader);
      const temAssinaturaLog = /Total\s*:\s*\d+/i.test(janela.textContent) && /(?:Shiny|Normais|Normal)\s*:\s*\d+/i.test(janela.textContent);
      const temTabsLog = Boolean(janela.querySelector('.clog-tabs'));

      if (temTituloLog || (temAssinaturaLog && temTabsLog) || janela.classList.contains('clog-window')) {
        const lista = janela.querySelector('.clog-list');
        if (lista) {
          return { janela, lista };
        }
      }
    }

    return null;
  }

  /**
   * Monitora a janela "LOG DE CAPTURAS"
   */
  function inspecionarLogDeCapturas() {
    const alvo = encontrarJanelaLogDeCapturas();

    if (!alvo || !alvo.lista) {
      estado.janelaLogEncontrada = false;
      if (estado.observerLog) {
        estado.observerLog.disconnect();
        estado.observerLog = null;
      }
      estado.elLogContainer = null;
      return;
    }

    const { janela, lista } = alvo;
    estado.janelaLogEncontrada = true;

    // Janela recém-aberta ou trocada: o que já está na lista é histórico, não captura nova
    if (lista !== estado.elLogContainer) {
      estado.elLogContainer = lista;
      estado.logBaselinePendente = true;

      if (estado.observerLog) estado.observerLog.disconnect();
      estado.observerLog = new MutationObserver(() => {
        processarLinhasDoLog(lista, janela);
      });
      estado.observerLog.observe(lista, { childList: true, subtree: true });
    }

    processarLinhasDoLog(lista, janela);
  }

  /**
   * Compara as linhas do log com as já vistas e trata só as capturas novas
   */
  function processarLinhasDoLog(elLista, janelaAlvo) {
    const janela = janelaAlvo || elLista.closest('.clog-window') || elLista.parentElement;
    if (!janela) return;

    // Dupla checagem: se a janela for inventário, mochila ou box, ignora sumariamente
    const headerTxt = (janela.querySelector('h1, h2, h3, h4, .win-header, .win-title')?.textContent || '').toLowerCase();
    if (/invent[aá]r|mochila|bag|box|dep[oó]sit|storage|equipe|party|time/i.test(headerTxt)) {
      return;
    }

    const abaAtiva = (janela.querySelector('.clog-tab.on')?.textContent || '').trim();

    // Trocar de aba recarrega a lista com o histórico daquele filtro
    if (abaAtiva !== estado.logAbaBase) {
      estado.logAbaBase = abaAtiva;
      estado.logBaselinePendente = true;
    }

    const linhas = elLista.querySelectorAll('.clog-row');

    // Sincroniza contador com os totais oficiais do Log se visíveis no cabeçalho
    const matchTotal = (janela.textContent || '').match(/Total\s*:\s*(\d+)/i);
    const matchShiny = (janela.textContent || '').match(/Shiny\s*:\s*(\d+)/i);
    if (matchTotal) {
      estado.totalSessao = parseInt(matchTotal[1], 10);
      if (matchShiny) estado.shiniesSessao = parseInt(matchShiny[1], 10);
    }

    if (linhas.length === 0) {
      // "Carregando…" = o histórico ainda vai chegar; lista vazia de verdade já pode alertar a próxima captura
      const aviso = elLista.querySelector('.clog-empty');
      if (aviso) estado.logBaselinePendente = /carregando|loading|cargando/i.test(aviso.textContent);
      return;
    }

    // Linhas idênticas (mesmo Pokémon, IV, ball e minuto) ganham número de ocorrência para não se anularem
    const ocorrencias = new Map();
    const chavesAtuais = [];
    const novas = [];
    linhas.forEach((linha) => {
      // Validação estrita: Linha de captura DEVE ter horário de captura (.clog-when)
      // No inventário, Pokémon não possuem hora de captura relativa
      const whenTxt = (linha.querySelector('.clog-when')?.textContent || '').trim();
      if (!whenTxt) return;

      const texto = (linha.textContent || '').replace(/\s+/g, ' ').trim();
      const n = (ocorrencias.get(texto) || 0) + 1;
      ocorrencias.set(texto, n);

      const chave = `${linha.classList.contains('shiny') ? 'S' : 'N'}|${texto}#${n}`;
      chavesAtuais.push(chave);
      if (estado.capturasVistas.has(chave)) return;
      estado.capturasVistas.add(chave);
      if (!estado.logBaselinePendente) novas.push(linha);
    });
    estado.logBaselinePendente = false;

    // Evita crescer sem limite em sessões 24/7
    if (estado.capturasVistas.size > 5000) estado.capturasVistas = new Set(chavesAtuais);

    // A lista vem da mais nova para a mais antiga; processa na ordem em que aconteceram
    novas.reverse().forEach((linha) => {
      const dados = extrairDadosCaptura(linha);
      if (dados && dados.nome && dados.dataHora) {
        tratarNovaCaptura(dados, linha);
      }
    });
  }

  function extrairDadosCaptura(linha) {
    if (!linha || !linha.querySelector) return null;
    const textoDe = (seletor) => (linha.querySelector(seletor)?.textContent || '').replace(/\s+/g, ' ').trim();

    // Uma captura real do Log DEVE ter data/hora (.clog-when)
    const dataHora = textoDe('.clog-when');
    if (!dataHora) return null;

    // Nome sem o "✨ " e sem o selo "1ª" de primeira captura
    let nome = '';
    const elNome = linha.querySelector('.clog-name');
    if (elNome) {
      const copia = elNome.cloneNode(true);
      copia.querySelectorAll('.clog-first').forEach((el) => el.remove());
      nome = copia.textContent.replace(/✨/g, '').replace(/\s+/g, ' ').trim();
    }

    // "Lv.30"
    const matchLv = textoDe('.clog-lvl').match(/(\d+)/);

    // "Incomum · IV 76/192" (sem raridade o jogo mostra "—")
    const matchIV = textoDe('.clog-meta').match(/IV\s*(\d+)\s*\/\s*(\d+)/i);

    return {
      nome: textoSeguro(nome, 40) || 'Pokémon',
      level: matchLv ? matchLv[1] : '',
      raridade: textoDe('.clog-meta b'),
      iv: matchIV ? parseInt(matchIV[1], 10) : 0,
      ivMax: matchIV ? parseInt(matchIV[2], 10) : 192,
      ball: textoDe('.clog-ball'),
      dataHora: dataHora,
      isShiny: linha.classList.contains('shiny')
    };
  }

  function tratarNovaCaptura(captura, elItem) {
    estado.totalSessao++;
    if (captura.isShiny) estado.shiniesSessao++;
    estado.ultimaCaptura = captura;

    registrarNoHistorico('capturas', {
      t: Date.now(),
      n: captura.nome,
      r: captura.raridade,
      iv: captura.iv,
      s: captura.isShiny ? 1 : 0,
      lv: captura.level
    });

    // Avalia no cérebro
    if (window.PokeWatchCerebro) {
      const avaliacao = window.PokeWatchCerebro.avaliarCaptura(captura, estado.configs);
      if (avaliacao.deveAlertar) {
        console.log('[Pok3Watch] ALERTA DISPARADO!', avaliacao);
        const alvoCrop = elItem || estado.elLogContainer;
        const cropRect = obterCoordenadasElemento(alvoCrop);

        // Depois de atualizar/recarregar a extensão, o canal morre e o envio direto
        // estoura "Extension context invalidated" — enviarAlerta já engole isso.
        enviarAlerta(avaliacao.tipo, avaliacao.mensagem, { pedirPrint: true, cropRect });
      }
    }

    atualizarHUD();
    if (toolModalAberto) atualizarDadosPokemonTool();
  }

  function obterCoordenadasElemento(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const margem = 20;
    return {
      x: Math.max(0, rect.left - margem),
      y: Math.max(0, rect.top - margem),
      width: rect.width + (margem * 2),
      height: rect.height + (margem * 2),
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    };
  }

  function enviarAlerta(tipo, mensagem, extras = {}) {
    try {
      chrome.runtime.sendMessage({ tipo, mensagem, nomeTreinador: estado.nomeTreinador || null, ...extras }, () => {
        if (chrome.runtime.lastError) {}
      });
    } catch (_) {}
  }

  // O texto vem da página do jogo, que não é confiável: tira controle, tira link e corta o tamanho.
  // Isso vale tanto para o que aparece no HUD quanto para o que vira mensagem de WhatsApp.
  function textoSeguro(texto, limite = 60) {
    const semControle = String(texto || '')
      .split('')
      .filter((caractere) => {
        const codigo = caractere.charCodeAt(0);
        return codigo >= 32 && codigo !== 127;
      })
      .join('');

    return semControle
      .replace(/https?:[^ ]+/gi, '')
      .replace(/ +/g, ' ')
      .trim()
      .slice(0, limite);
  }

  function lerNumero(texto) {
    const digitos = String(texto || '').replace(/\D/g, '');
    return digitos ? parseInt(digitos, 10) : 0;
  }

  function lerDinheiro(texto) {
    const t = String(texto || '');
    const valor = lerNumero(t);
    return /[−-]/.test(t) ? -valor : valor;
  }

  // Pokébolas (classes conferidas no código do jogo):
  //   Barra de captura: .cap-panel > .cap-empty-balls ("Sem Pokébolas") | .cap-balls > button.cap-chip[title=nome] > .cap-chip-n
  //   Auto-Helper:      .ah-balls > button.cap-chip[.on = bola do Auto-Catch] > .cap-chip-n
  //   A barra só aparece com selvagem esperando e esconde as bolas zeradas.
  function lerChipsDeBolas(container) {
    const bolas = {};
    let selecionada = null;
    if (!container) return { bolas, selecionada };
    container.querySelectorAll('.cap-chip').forEach((chip) => {
      const nome = (chip.getAttribute('title') || '').trim();
      if (!nome) return;
      bolas[nome] = lerNumero(chip.querySelector('.cap-chip-n')?.textContent);
      if (chip.classList.contains('on')) selecionada = nome;
    });
    return { bolas, selecionada };
  }

  // Vigia a bola do Auto-Catch; se o Auto-Helper nunca foi aberto, usa a escolhida no popup
  function bolaVigiada(bolas) {
    const C = window.PokeWatchCerebro;
    const alvo = C.normalizarTexto(estado.bolaAutoCatch || estado.configs.bolaMonitorada).replace(/\s/g, '');
    return Object.keys(bolas).find((nome) => C.normalizarTexto(nome).replace(/\s/g, '') === alvo) || null;
  }

  function inspecionarEstoquePokebolas() {
    const C = window.PokeWatchCerebro;
    const painel = document.querySelector('.cap-panel');
    const autoHelper = lerChipsDeBolas(document.querySelector('.ah-balls'));
    const barra = lerChipsDeBolas(painel ? painel.querySelector('.cap-balls') : null);
    if (autoHelper.selecionada) estado.bolaAutoCatch = autoHelper.selecionada;

    let fonte = null;
    let bolas = null;
    if (Object.keys(autoHelper.bolas).length) {
      fonte = 'AUTO_HELPER';
      bolas = autoHelper.bolas;
    } else if (Object.keys(barra.bolas).length) {
      fonte = 'CAPTURA';
      bolas = barra.bolas;
    }

    // "Sem Pokébolas" só vale se ficar 20s na tela (evita piscada durante compra)
    const agora = Date.now();
    if (painel && painel.querySelector('.cap-empty-balls')) {
      estado.semBolas = true;
      if (!estado.semBolasDesde) estado.semBolasDesde = agora;
      if (!estado.alertouSemBolas && estado.configs.alertaSemBolas && agora - estado.semBolasDesde >= 20000) {
        estado.alertouSemBolas = true;
        enviarAlerta('SEM_BOLAS', C.formatarMensagemSemBolas());
      }
    } else if (bolas && Object.values(bolas).some((qtd) => qtd > 0)) {
      estado.semBolas = false;
      estado.semBolasDesde = 0;
      estado.alertouSemBolas = false;
    }

    // Sem leitura agora (barra/Auto-Helper fechados): mantém o último estoque conhecido
    if (!bolas) return;
    estado.fontePokebolas = fonte;
    estado.estoqueBolas = bolas;

    const json = JSON.stringify(bolas);
    if (json !== estado.ultimoJsonBolas) {
      estado.ultimoJsonBolas = json;
      chrome.storage.local.set({
        pokeBallStats: {
          total: Object.values(bolas).reduce((a, b) => a + b, 0),
          detalhes: bolas,
          fonte: fonte === 'AUTO_HELPER' ? 'Auto-Helper' : 'Barra de Captura'
        }
      });
    }

    const vigiada = bolaVigiada(bolas);
    if (vigiada) {
      const avaliacao = C.avaliarEstoqueBolas({ [vigiada]: bolas[vigiada] }, estado.configs, estado.ultimoAlertaBolas);
      if (avaliacao.deveAlertar) {
        estado.ultimoAlertaBolas = avaliacao.timestampAtual;
        enviarAlerta('BOLAS_BAIXAS', avaliacao.mensagem);
      }
    }
  }

  // Hunt Analyzer (classes conferidas no código do jogo):
  //   .ha-body > .ha-grid > .ha-card (ícone ⏱️ = tempo) · .ha-loot b · .ha-supply b
  //   .ha-balance b ("+$1.234" / "−$1.234") · .ha-rates > .ha-rate ("📈 +$500/h")
  //   .ha-drops > .ha-drop > .ha-drop-name[title=raridade] · .ha-drop-qty ("×3")
  //   Os valores são da sessão da hunt e zeram ao trocar de hunt.
  function lerDuracaoSegundos(texto) {
    const t = String(texto || '');
    const h = parseInt((t.match(/(\d+)\s*h/) || [])[1] || '0', 10);
    const m = parseInt((t.match(/(\d+)\s*m/) || [])[1] || '0', 10);
    const s = parseInt((t.match(/(\d+)\s*s/) || [])[1] || '0', 10);
    return h * 3600 + m * 60 + s;
  }

  function lerHuntAnalyzer() {
    const corpo = document.querySelector('.ha-body');
    if (!corpo || !corpo.querySelector('.ha-grid')) return null;

    const cartaoTempo = [...corpo.querySelectorAll('.ha-card')]
      .find((card) => (card.querySelector('.ha-card-ico')?.textContent || '').includes('⏱'));

    let derrotados = 0;
    let capturados = 0;
    let tempoTexto = (cartaoTempo?.querySelector('b')?.textContent || '').trim();
    let xpGanha = '';

    corpo.querySelectorAll('.ha-card').forEach((card) => {
      const txt = (card.textContent || '').toLowerCase();
      const valB = (card.querySelector('b')?.textContent || '').trim();
      if (txt.includes('derrotad')) {
        derrotados = lerNumero(valB);
      } else if (txt.includes('capturad')) {
        capturados = lerNumero(valB);
      } else if (txt.includes('xp')) {
        xpGanha = valB;
      } else if (txt.includes('tempo') || (card.querySelector('.ha-card-ico')?.textContent || '').includes('⏱')) {
        tempoTexto = valB;
      }
    });

    let ritmoSaldo = '';
    let ritmoXp = '';
    let ritmoBolas = '';

    corpo.querySelectorAll('.ha-rate').forEach((rateEl) => {
      const txt = (rateEl.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt.includes('$')) ritmoSaldo = txt;
      else if (txt.toLowerCase().includes('xp')) ritmoXp = txt;
      else if (txt.includes('/h')) ritmoBolas = txt;
    });
    if (!ritmoSaldo && corpo.querySelector('.ha-rate')) {
      ritmoSaldo = (corpo.querySelector('.ha-rate')?.textContent || '').replace(/\s+/g, ' ').trim();
    }

    const drops = {};
    corpo.querySelectorAll('.ha-drops .ha-drop').forEach((linha) => {
      const elNome = linha.querySelector('.ha-drop-name');
      const nome = textoSeguro(elNome?.textContent, 40);
      if (!nome) return;
      drops[nome] = {
        qtd: lerNumero(linha.querySelector('.ha-drop-qty')?.textContent),
        raridade: elNome.getAttribute('title') || ''
      };
    });

    const saldoTxt = (corpo.querySelector('.ha-balance b')?.textContent || '').trim();

    return {
      t: Date.now(),
      segundos: lerDuracaoSegundos(tempoTexto),
      tempoTexto,
      derrotados,
      capturados,
      xpGanha,
      saldo: lerDinheiro(saldoTxt),
      saldoTexto: saldoTxt,
      loot: lerNumero(corpo.querySelector('.ha-loot b')?.textContent),
      supply: lerNumero(corpo.querySelector('.ha-supply b')?.textContent),
      ganhoHora: ritmoSaldo,
      ritmoSaldo,
      ritmoXp,
      ritmoBolas,
      drops
    };
  }

  function inspecionarHuntAnalyzer() {
    const leitura = lerHuntAnalyzer();
    estado.huntAtual = leitura;
    if (!leitura) return;

    if (leitura.capturados > 0 && estado.totalSessao === 0) {
      estado.totalSessao = leitura.capturados;
    }

    verificarDrops(leitura);

    // Foto da sessão a cada 5 min para o resumo calcular o período
    if (Date.now() - estado.ultimoSnapshotHunt >= 5 * 60 * 1000) {
      estado.ultimoSnapshotHunt = Date.now();
      registrarNoHistorico('hunt', leitura);
    }
  }

  function verificarDrops(leitura) {
    const C = window.PokeWatchCerebro;
    const base = estado.huntBase;
    const reiniciou = !!base && (leitura.segundos + 5 < base.segundos ||
      Object.entries(base.drops).some(([nome, d]) => (leitura.drops[nome]?.qtd || 0) < d.qtd));
    estado.huntBase = { segundos: leitura.segundos, drops: leitura.drops };

    // Primeira leitura ou hunt nova: o que já está na lista não é drop novo.
    // Com o Hunt Analyzer fechado a base fica guardada, então drops desse intervalo avisam ao reabrir.
    if (!base || reiniciou || !estado.configs.alertaDropRaro) return;

    const novos = Object.entries(leitura.drops)
      .map(([nome, d]) => ({
        nome,
        raridade: C.normalizarRaridadeItem(d.raridade) || d.raridade,
        total: d.qtd,
        ganho: d.qtd - (base.drops[nome]?.qtd || 0)
      }))
      .filter((d) => d.ganho > 0 && C.motivoItemNotificavel(d, estado.configs));

    if (novos.length) enviarAlerta('DROP_RARO', C.formatarMensagemDrops(novos));
  }

  // -------------------------------------------------------------
  // HISTÓRICO LOCAL (capturas e fotos do Hunt Analyzer para o resumo)
  // -------------------------------------------------------------
  const HISTORICO_MAX_MS = 13 * 60 * 60 * 1000;
  const historico = {};

  function entradaHistorico(tipo) {
    const chave = `pw:${tipo}:${estado.nomeTreinador || 'Treinador'}`;
    if (!historico[chave]) {
      const entrada = { chave, itens: [], timer: null, pronto: null };
      entrada.pronto = new Promise((resolve) => {
        chrome.storage.local.get([chave], (res) => {
          // Junta o que já estava salvo com o que chegou enquanto lia
          const salvos = Array.isArray(res && res[chave]) ? res[chave] : [];
          entrada.itens = salvos.concat(entrada.itens);
          resolve(entrada);
        });
      });
      historico[chave] = entrada;
    }
    return historico[chave];
  }

  function registrarNoHistorico(tipo, item) {
    const entrada = entradaHistorico(tipo);
    entrada.itens.push(item);
    entrada.pronto.then(() => {
      clearTimeout(entrada.timer);
      entrada.timer = setTimeout(() => {
        const limite = Date.now() - HISTORICO_MAX_MS;
        entrada.itens = entrada.itens.filter((i) => i.t >= limite).slice(-3000);
        chrome.storage.local.set({ [entrada.chave]: entrada.itens });
      }, 2000);
    });
  }

  function lerHistorico(tipo) {
    return entradaHistorico(tipo).pronto.then((entrada) => entrada.itens);
  }

  // -------------------------------------------------------------
  // RESUMO PERIÓDICO (1h, 2h, 3h, 6h ou 12h)
  // -------------------------------------------------------------
  function calcularHuntDoPeriodo(fotos, leituraAtual) {
    const C = window.PokeWatchCerebro;
    const ultimaFoto = fotos[fotos.length - 1];
    // Hunt Analyzer fechado há mais de 10 min: não dá para afirmar saldo
    const atual = leituraAtual || (ultimaFoto && Date.now() - ultimaFoto.t <= 10 * 60 * 1000 ? ultimaFoto : null);
    if (!atual) return null;

    // Se a hunt reiniciou no meio (tempo da sessão voltou), conta a partir do reinício
    const serie = leituraAtual ? fotos.concat([leituraAtual]) : fotos;
    let reiniciou = false;
    for (let i = 1; i < serie.length; i++) {
      if (serie[i].segundos + 5 < serie[i - 1].segundos) reiniciou = true;
    }
    const base = serie[0];
    const usarSessao = reiniciou || !base || base === atual;
    const ref = usarSessao ? null : base;

    const drops = Object.entries(atual.drops || {}).map(([nome, d]) => {
      const item = {
        nome,
        raridade: C.normalizarRaridadeItem(d.raridade) || d.raridade,
        ganho: d.qtd - (ref?.drops?.[nome]?.qtd || 0),
        total: d.qtd
      };
      item.motivo = C.motivoItemNotificavel(item, estado.configs);
      return item;
    });

    return {
      saldo: atual.saldo - (ref ? ref.saldo : 0),
      loot: atual.loot - (ref ? ref.loot : 0),
      supply: atual.supply - (ref ? ref.supply : 0),
      ganhoHora: atual.ganhoHora,
      drops,
      observacaoChave: reiniciou
        ? 'resumo.huntReiniciou'
        : (usarSessao ? 'resumo.sessaoInteira' : '')
    };
  }

  function verificarResumo() {
    const C = window.PokeWatchCerebro;
    if (!estado.configs.resumoAtivo || estado.resumoEmAndamento) return;

    const chave = `pw:ultimoResumo:${estado.nomeTreinador || 'Treinador'}`;
    const periodoMs = estado.configs.resumoHoras * 60 * 60 * 1000;
    estado.resumoEmAndamento = true;

    chrome.storage.local.get([chave], async (res) => {
      try {
        const agora = Date.now();
        const ultimo = Number(res && res[chave]) || 0;
        // Primeira vez (ou relógio voltou): começa a contar agora
        if (!ultimo || ultimo > agora) {
          chrome.storage.local.set({ [chave]: agora });
          return;
        }
        if (agora - ultimo < periodoMs) return;

        chrome.storage.local.set({ [chave]: agora });
        const inicio = agora - periodoMs;
        const capturas = (await lerHistorico('capturas')).filter((c) => c.t >= inicio);
        const fotos = (await lerHistorico('hunt')).filter((f) => f.t >= inicio);

        enviarAlerta('RESUMO', C.formatarResumo({
          horas: estado.configs.resumoHoras,
          capturas,
          hunt: calcularHuntDoPeriodo(fotos, estado.huntAtual),
          bolas: Object.keys(estado.estoqueBolas).length ? estado.estoqueBolas : null,
          semBolas: estado.semBolas
        }));
      } finally {
        estado.resumoEmAndamento = false;
      }
    });
  }

  // -------------------------------------------------------------
  // CONEXÃO (telas do próprio jogo)
  //   .ws-reconnecting ("🔌 Conexão perdida — reconectando…")
  //   .win-overlay .win-window h3: "Conta em uso" / "Limite de contas por rede" / "Limite de contas por computador"
  //   Manutenção redireciona para /?maintenance=1 e nome bloqueado para /namelock
  // -------------------------------------------------------------
  function detectarProblemaConexao() {
    const noJogo = location.pathname.startsWith('/play');
    let estavaNoJogo = false;
    try {
      if (noJogo) sessionStorage.setItem('pw:estavaNoJogo', '1');
      estavaNoJogo = sessionStorage.getItem('pw:estavaNoJogo') === '1';
    } catch (_) {}

    if (!noJogo) {
      // Só é queda se esta aba estava jogando antes
      if (!estavaNoJogo) return null;
      const T = window.PokeWatchIdiomas;
      if (/maintenance/i.test(location.search)) return { motivo: T.t('conexao.manutencao'), esperaMs: 0 };
      if (location.pathname.startsWith('/namelock')) return { motivo: T.t('conexao.namelock'), esperaMs: 0 };
      return { motivo: T.t('conexao.foraDoJogo', { caminho: location.pathname }), esperaMs: 30000 };
    }

    const titulo = [...document.querySelectorAll('.win-overlay .win-window h3')]
      .map((h3) => h3.textContent.trim())
      .find((texto) => /conta em uso|account in use|cuenta en uso|limite de contas|accounts-per|l[ií]mite de cuentas/i.test(texto));
    if (titulo) return { motivo: textoSeguro(titulo, 60), esperaMs: 5000 };

    if (document.querySelector('.ws-reconnecting')) {
      return { motivo: window.PokeWatchIdiomas.t('conexao.perdida'), esperaMs: 60000 };
    }
    return null;
  }

  function vigiarConexao() {
    const C = window.PokeWatchCerebro;
    const problema = detectarProblemaConexao();
    const agora = Date.now();
    const con = estado.conexao;

    if (problema) {
      con.problema = problema.motivo;
      if (!con.desde) con.desde = agora;
      if (!con.alertou && estado.configs.alertaDesconexao && agora - con.desde >= problema.esperaMs) {
        con.alertou = true;
        enviarAlerta('DESCONECTADO', C.formatarMensagemDesconexao(problema.motivo, (agora - con.desde) / 60000));
      }
      return;
    }

    if (con.alertou) {
      enviarAlerta('RECONECTADO', C.formatarMensagemReconexao((agora - con.desde) / 60000));
    }
    estado.conexao = { problema: null, desde: 0, alertou: false };
  }

  /**
   * Extrai o nome do treinador no canto superior esquerdo da tela
   */
  function extrairNomeTreinador() {
    try {
      // Método 1: Busca elementos específicos no quadrante superior esquerdo (x < 360, y < 220)
      const elementos = document.querySelectorAll('div, span, p, h1, h2, h3, h4, b, strong');
      for (const el of elementos) {
        if (el.children.length === 0) {
          const txt = (el.textContent || '').trim();
          if (/^(n[ií]vel|level)\s*\d+/i.test(txt)) {
            const rect = el.getBoundingClientRect();
            if (rect.left >= 0 && rect.left < 400 && rect.top >= 0 && rect.top < 220) {
              if (el.previousElementSibling) {
                const nick = el.previousElementSibling.textContent.trim();
                if (nick.length >= 2 && nick.length <= 25 && !/n[ií]vel/i.test(nick)) {
                  return nick;
                }
              }
              const pai = el.parentElement;
              if (pai) {
                for (const filho of pai.children) {
                  const nick = (filho.textContent || '').trim();
                  if (filho !== el && nick.length >= 2 && nick.length <= 25 && !/n[ií]vel/i.test(nick) && !/\d{2,}/.test(nick)) {
                    return nick;
                  }
                }
              }
            }
          }
        }
      }

      // Método 2: Regex de busca no texto linear do topo da página
      const textoTopo = (document.body.innerText || '').slice(0, 1500);
      const match = textoTopo.match(/([A-Za-z0-9_\-\s]{2,20})\s*\n\s*(?:N[ií]vel|Level)\s*\d+/i);
      if (match && match[1]) {
        const provavel = match[1].trim();
        if (provavel.length >= 2 && !/poke|idle|jogar|menu/i.test(provavel)) {
          return provavel;
        }
      }
    } catch (_) {}

    return null;
  }

  function enviarHeartbeatTab() {
    try {
      chrome.runtime.sendMessage({
        tipo: 'HEARTBEAT_TAB',
        nomeTreinador: estado.nomeTreinador || 'Treinador',
        totalSessao: estado.totalSessao,
        shiniesSessao: estado.shiniesSessao,
        ultimaCaptura: estado.ultimaCaptura,
        estoqueBolas: estado.estoqueBolas,
        fontePokebolas: estado.fontePokebolas,
        audioAtivo: estado.audioAtivo,
        janelaLogEncontrada: estado.janelaLogEncontrada,
        huntAnalyzerAberto: !!estado.huntAtual,
        huntStats: estado.huntAtual || null,
        semBolas: estado.semBolas,
        problemaConexao: estado.conexao.problema
      }, () => {
        if (chrome.runtime.lastError) {}
      });
    } catch (_) {}
  }

  // -------------------------------------------------------------
  // 2b. BLOQUEIOS VISUAIS & LEMBRETE DE GIFT (IV TOOL FEATURES)
  // -------------------------------------------------------------
  function aplicarBloqueiosVisuais() {
    const cfg = estado.configs || {};
    if (!document.body) return;
    document.body.classList.toggle('pw-block-shiny-news', Boolean(cfg.bloquearAnuncios));
    document.body.classList.toggle('pw-block-diamond-promos', Boolean(cfg.bloquearPromocoes));
  }

  function detectarGiftDisponivel() {
    if (!estado.configs || !estado.configs.lembreteGift) {
      estado.giftDisponivel = false;
      return;
    }

    const seletoresGift = [
      '.daily-gift',
      '.gift-btn',
      '.reward-gift',
      '[class*="daily-gift"]',
      '[class*="daily-reward"]',
      '.btn-gift',
      'button[title*="Gift" i]',
      'button[title*="Presente" i]',
      '.gift-ready',
      '.gift-available'
    ];

    let encontrado = false;
    for (const sel of seletoresGift) {
      const el = document.querySelector(sel);
      if (el) {
        const txt = (el.textContent || '').toLowerCase();
        const temDot = Boolean(el.querySelector('.dot, .badge, .notification, .alert, .active, .on'));
        const temClasseAtiva = el.matches('.ready, .available, .active, .on, .notify, .glow');
        const temTextoPronto = /pronto|dispon[ií]vel|claim|coletar|resgatar/i.test(txt);

        // Antes bastava "não estar coletado", o que dava positivo em quase tudo
        if (temDot || temClasseAtiva || temTextoPronto) {
          encontrado = true;
          break;
        }
      }
    }

    estado.giftDisponivel = encontrado;

    const agora = Date.now();
    const COOLDOWN_GIFT_MS = 4 * 60 * 60 * 1000;
    if (encontrado && estado.configs.alertaGiftWhatsApp && !estado.alertouGiftWhatsApp) {
      estado.alertouGiftWhatsApp = true;

      // O cooldown fica no storage: recarregar a página não pode liberar alerta de novo
      const chaveGift = `pw:ultimoGift:${estado.nomeTreinador || 'Treinador'}`;
      chrome.storage.local.get([chaveGift], (res) => {
        const ultimo = Number(res && res[chaveGift]) || 0;
        if (agora - ultimo < COOLDOWN_GIFT_MS) return;

        chrome.storage.local.set({ [chaveGift]: agora });
        estado.ultimoAlertaGift = agora;
        if (window.PokeWatchCerebro && window.PokeWatchCerebro.formatarMensagemGift) {
          enviarAlerta('GIFT', window.PokeWatchCerebro.formatarMensagemGift());
        }
      });
    } else if (!encontrado) {
      estado.alertouGiftWhatsApp = false;
    }
  }

  // -------------------------------------------------------------
  // 3. CICLO DE VERIFICAÇÃO CONTÍNUA
  // -------------------------------------------------------------
  function cicloVerificacao() {
    // Procura o nome do treinador periodicamente até encontrar
    // A busca varre o documento inteiro: sem nome tenta a cada 5s, com nome a cada 30s
    if ((!estado.nomeTreinador && estado.ticksHeartbeat % 5 === 0) || estado.ticksHeartbeat % 30 === 0) {
      const nome = textoSeguro(extrairNomeTreinador(), 20);
      if (nome && nome !== estado.nomeTreinador) {
        estado.nomeTreinador = nome;
        console.log('[Pok3Watch] Treinador detectado nesta aba:', estado.nomeTreinador);
      }
    }

    inspecionarLogDeCapturas();
    inspecionarEstoquePokebolas();
    inspecionarHuntAnalyzer();
    vigiarConexao();
    aplicarBloqueiosVisuais();
    detectarGiftDisponivel();
    // Pelo relógio, não pela contagem de batidas: em 2º plano o Chrome freia os temporizadores
    // e cada batida pode demorar 1 minuto, o que atrasaria muito o resumo.
    if (Date.now() - estado.ultimaChecagemResumo >= 60000) {
      estado.ultimaChecagemResumo = Date.now();
      verificarResumo();
    }
    atualizarHUD();

    // Sinal de vida a cada 3s de relógio (em 2º plano cada batida pode demorar 1 min)
    if (Date.now() - estado.ultimoHeartbeat >= 3000) {
      estado.ultimoHeartbeat = Date.now();
      enviarHeartbeatTab();
    }
  }

  // -------------------------------------------------------------
  // 4. INTERFACE VISUAL (HUD OVERLAY NA TELA)
  // -------------------------------------------------------------
  function injetarHUD() {
    if (document.getElementById('pokewatch-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'pokewatch-hud';
    hud.innerHTML = `
      <div class="pw-card" id="pw-card">
        <div class="pw-header" id="pw-header">
          <div class="pw-title-wrap">
            <div class="pw-pulse-dot" data-i18n-title="hud.heartbeat"></div>
            <span class="pw-title-text" data-i18n="hud.vigilanteAtivo"></span>
            <span id="pw-gift-badge" class="pw-gift-badge" style="display:none;" data-i18n="hud.giftBadge" data-i18n-title="hud.giftTitle"></span>
            <div class="pw-pill-status" id="pw-pill-status">
              <span id="pw-pill-ball">🟡 0</span>
              <span style="color:#dfba73; font-size:9px;" data-i18n="hud.vigiaOn"></span>
            </div>
          </div>
          <div class="pw-controls">
            <button class="pw-btn-icon" id="pw-btn-tool" data-i18n-title="hud.btnTool">🧮</button>
            <button class="pw-btn-icon" id="pw-btn-snap" data-i18n-title="hud.btnSnap">📸</button>
            <button class="pw-btn-icon" id="pw-btn-min" data-i18n-title="hud.btnRecolher">−</button>
          </div>
        </div>
        <div class="pw-body">
          <div class="pw-section-title" data-i18n="hud.secaoSensores"></div>

          <!-- STATUS LOG DE CAPTURAS -->
          <div class="pw-status-row">
            <span class="pw-status-label" data-i18n="hud.logCapturas"></span>
            <span class="pw-badge" id="pw-badge-log" data-i18n="hud.buscando"></span>
          </div>
          <div class="pw-sub-hint" id="pw-hint-log" style="display:none;" data-i18n="hud.hintLog"></div>

          <!-- STATUS POKÉBOLAS (DUPLA FONTE) -->
          <div class="pw-status-row">
            <span class="pw-status-label" data-i18n="hud.estoqueBolas"></span>
            <span class="pw-badge" id="pw-badge-bolas" data-i18n="hud.buscando"></span>
          </div>
          <div class="pw-sub-hint" id="pw-hint-bolas" style="display:none;" data-i18n="hud.hintBolas"></div>

          <!-- STATUS HUNT ANALYZER -->
          <div class="pw-status-row">
            <span class="pw-status-label" data-i18n="hud.huntAnalyzer"></span>
            <span class="pw-badge" id="pw-badge-hunt" data-i18n="hud.buscando"></span>
          </div>
          <div class="pw-sub-hint" id="pw-hint-hunt" style="display:none;" data-i18n="hud.hintHunt"></div>

          <!-- STATUS CONEXÃO -->
          <div class="pw-status-row">
            <span class="pw-status-label" data-i18n="hud.conexao"></span>
            <span class="pw-badge ok" id="pw-badge-conexao" data-i18n="hud.badgeConexaoOk"></span>
          </div>

          <!-- STATUS ANTI-SLEEP -->
          <div class="pw-status-row">
            <span class="pw-status-label" data-i18n="hud.antiSleep"></span>
            <span class="pw-badge ok" id="pw-badge-sleep" data-i18n="hud.ativo"></span>
          </div>

          <!-- ESTATÍSTICAS RÁPIDAS -->
          <div class="pw-section-title" style="margin-top:2px;" data-i18n="hud.secaoSessao"></div>
          <div class="pw-stats-grid">
            <div class="pw-stat-box">
              <div class="pw-stat-lbl" data-i18n="hud.capturas"></div>
              <div class="pw-stat-num" id="pw-stat-total">0</div>
            </div>
            <div class="pw-stat-box">
              <div class="pw-stat-lbl" data-i18n="hud.shinies"></div>
              <div class="pw-stat-num shiny" id="pw-stat-shinies">0</div>
            </div>
          </div>

          <!-- ÚLTIMA CAPTURA (COM BARRA VISUAL DE IV) -->
          <div class="pw-last-catch" id="pw-last-catch-box">
            <div style="font-size:9.5px;color:#94a3b8;font-family:monospace;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;">
              <span data-i18n="hud.ultimaCaptura"></span>
              <span id="pw-iv-pct" style="color:#dfba73;font-size:9px;font-weight:bold;"></span>
            </div>
            <div class="pw-last-catch-detail" id="pw-last-catch-txt" data-i18n="hud.aguardando"></div>
            <div class="pw-iv-bar" id="pw-iv-bar" style="display:none;">
              <div class="pw-iv-fill" id="pw-iv-fill"></div>
            </div>
          </div>

          <!-- GRADE DE BOLAS -->
          <div class="pw-section-title" style="margin-top:2px;" data-i18n="hud.secaoEstoque"></div>
          <div class="pw-bolas-bar" id="pw-bolas-bar">
            <div class="pw-bola-item"><span>🔴 Poké</span><b>--</b></div>
            <div class="pw-bola-item"><span>🔵 Super</span><b>--</b></div>
            <div class="pw-bola-item"><span>🟡 Ultra</span><b>--</b></div>
            <div class="pw-bola-item"><span>⚡ Idle</span><b>--</b></div>
          </div>
        </div>
      </div>
    `;

    window.PokeWatchIdiomas.traduzir(hud);
    document.body.appendChild(hud);

    // Recupera posição salva do HUD
    try {
      const posSalva = localStorage.getItem('pw_hud_pos');
      if (posSalva) {
        const p = JSON.parse(posSalva);
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('posição inválida');
        hud.style.left = p.x + 'px';
        hud.style.top = p.y + 'px';
        hud.style.bottom = 'auto';
      }
    } catch (_) {}

    // Botão de recolher/expandir com transição Cockpit Pill
    const card = document.getElementById('pw-card');
    const btnMin = document.getElementById('pw-btn-min');
    btnMin.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.toggle('pw-collapsed');
      const isCollapsed = card.classList.contains('pw-collapsed');
      btnMin.textContent = isCollapsed ? '+' : '−';
      btnMin.setAttribute('data-i18n-title', isCollapsed ? 'hud.btnExpandir' : 'hud.btnRecolher');
      window.PokeWatchIdiomas.traduzir(btnMin);
    });

    // Botão de Snapshot Rápido
    const btnSnap = document.getElementById('pw-btn-snap');
    btnSnap.addEventListener('click', (e) => {
      e.stopPropagation();
      btnSnap.style.transform = 'scale(0.85)';
      setTimeout(() => { btnSnap.style.transform = ''; }, 150);
      try {
        chrome.runtime.sendMessage({ tipo: 'CAPTURAR_TELA_INSTANTANEA' });
      } catch (_) {}
    });

    // Motor de Arraste Livre com Clamps e Memória
    const header = document.getElementById('pw-header');
    let isDragging = false;
    let startX, startY, origLeft, origTop;

    header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      header.setPointerCapture(e.pointerId);

      startX = e.clientX;
      startY = e.clientY;

      const rect = hud.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      hud.style.transition = 'none';
    });

    header.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const maxLeft = Math.max(0, window.innerWidth - hud.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - hud.offsetHeight);

      const newLeft = Math.max(0, Math.min(origLeft + dx, maxLeft));
      const newTop = Math.max(0, Math.min(origTop + dy, maxTop));

      hud.style.left = newLeft + 'px';
      hud.style.top = newTop + 'px';
      hud.style.bottom = 'auto';
    });

    const encerrarArraste = (e) => {
      if (!isDragging) return;
      isDragging = false;
      try { header.releasePointerCapture(e.pointerId); } catch (_) {}
      hud.style.transition = '';
      try {
        const x = parseInt(hud.style.left, 10);
        const y = parseInt(hud.style.top, 10);
        localStorage.setItem('pw_hud_pos', JSON.stringify({ x, y }));
      } catch (_) {}
    };

    // Botão Pok3Watch Tool (Alt+K)
    const btnTool = document.getElementById('pw-btn-tool');
    if (btnTool) {
      btnTool.addEventListener('click', (e) => {
        e.stopPropagation();
        btnTool.style.transform = 'scale(0.85)';
        setTimeout(() => { btnTool.style.transform = ''; }, 150);
        alternarToolModal();
      });
    }

    // Atalho global Alt + K com capture=true e suporte a code KeyK
    const tratarAtalhoTool = (e) => {
      if (e.altKey && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) {
        e.preventDefault();
        e.stopPropagation();
        alternarToolModal();
      } else if (e.key === 'Escape' && toolModalAberto) {
        alternarToolModal(false);
      }
    };
    window.addEventListener('keydown', tratarAtalhoTool, true);
    document.addEventListener('keydown', tratarAtalhoTool, true);

    // Expõe no window para teste direto pelo console do desenvolvedor
    window.PokeWatchAbrirTool = alternarToolModal;
    console.log('[Pok3Watch] Pok3Watch Tool pronta! Use Alt + K ou clique no botão 🧮 do HUD.');

    // O botão de print não existe em toda versão: pergunta e some se não houver
    try {
      chrome.runtime.sendMessage({ tipo: 'SUPORTA_PRINT' }, (resposta) => {
        if (chrome.runtime.lastError) return;
        if (resposta && resposta.suporta === false) {
          document.getElementById('pw-btn-snap')?.remove();
        }
      });
    } catch (_) {}

    header.addEventListener('pointerup', encerrarArraste);
    header.addEventListener('pointercancel', encerrarArraste);
  }

  // -------------------------------------------------------------
  // 4b. MODAL IN-GAME COMPLETO: POKEWATCH TOOL (ALT+K)
  // -------------------------------------------------------------
  const DADOS_ROTAS_TOOL = {
    '1': [
      { nome: 'Paras', mult: '×4', featured: true },
      { nome: 'Caterpie', mult: '×2' },
      { nome: 'Weedle', mult: '×2' },
      { nome: 'Oddish', mult: '×2' },
      { nome: 'Bellsprout', mult: '×2' },
      { nome: 'Hoppip', mult: '×2' },
      { nome: 'Sunkern', mult: '×2' }
    ],
    '10': [
      { nome: 'Rattata', mult: '×3', featured: true },
      { nome: 'Pidgey', mult: '×2' },
      { nome: 'Spearow', mult: '×2' },
      { nome: 'Sentret', mult: '×2' },
      { nome: 'Zigzagoon', mult: '×2' }
    ],
    '20': [
      { nome: 'Zubat', mult: '×3', featured: true },
      { nome: 'Geodude', mult: '×2' },
      { nome: 'Machop', mult: '×2' },
      { nome: 'Diglett', mult: '×2' }
    ],
    '30': [
      { nome: 'Vulpix', mult: '×3', featured: true },
      { nome: 'Growlithe', mult: '×2' },
      { nome: 'Ponyta', mult: '×2' },
      { nome: 'Houndour', mult: '×2' }
    ],
    '50': [
      { nome: 'Gastly', mult: '×3', featured: true },
      { nome: 'Haunter', mult: '×2' },
      { nome: 'Misdreavus', mult: '×2' },
      { nome: 'Shuppet', mult: '×2' }
    ],
    '100': [
      { nome: 'Snorlax', mult: '×3', featured: true },
      { nome: 'Lapras', mult: '×2', featured: true },
      { nome: 'Tauros', mult: '×2' },
      { nome: 'Chansey', mult: '×2' }
    ],
    '150': [
      { nome: 'Dratini', mult: '×3', featured: true },
      { nome: 'Dragonair', mult: '×2', featured: true },
      { nome: 'Bagon', mult: '×2' },
      { nome: 'Larvitar', mult: '×2' }
    ],
    '510': [
      { nome: 'Tyranitar', mult: '×3', featured: true },
      { nome: 'Salamence', mult: '×2' },
      { nome: 'Garchomp', mult: '×2' }
    ],
    '600': [
      { nome: 'Dragonite', mult: '×4', featured: true },
      { nome: 'Tyranitar', mult: '×3', featured: true },
      { nome: 'Metagross', mult: '×3' }
    ]
  };

  let toolModalAberto = false;

  function alternarToolModal(forcar) {
    let modal = document.getElementById('pw-tool-backdrop');
    if (!modal) {
      injetarToolModal();
      modal = document.getElementById('pw-tool-backdrop');
    }
    toolModalAberto = (forcar !== undefined) ? Boolean(forcar) : !toolModalAberto;
    if (modal) {
      modal.style.display = toolModalAberto ? 'flex' : 'none';
      if (toolModalAberto) {
        atualizarDadosPokemonTool();
        sincronizarSwitchesTool();
      }
    }
  }

  function injetarToolModal() {
    if (document.getElementById('pw-tool-backdrop')) return;

    const modal = document.createElement('div');
    modal.id = 'pw-tool-backdrop';
    modal.className = 'pw-tool-backdrop';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="pw-tool-window" id="pw-tool-window">
        <!-- HEADER -->
        <div class="pw-tool-header">
          <div class="pw-tool-header-left">
            <div class="pw-tool-title"><span>Pok3Watch</span> Tool</div>
            <span class="pw-tool-badge-ver">v${chrome.runtime.getManifest().version}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="pw-tool-status-dot" id="pw-tool-trainer-lbl" data-i18n="tool.status"></div>
            <button class="pw-tool-btn-close" id="pw-tool-btn-close" data-i18n-title="tool.fechar">✕</button>
          </div>
        </div>

        <!-- NAVEGAÇÃO PRINCIPAL -->
        <div class="pw-tool-tabs-nav">
          <button type="button" class="pw-tool-tab-btn active" data-tab="config" data-i18n="tool.tabConfig"></button>
          <button type="button" class="pw-tool-tab-btn" data-tab="pokemon" data-i18n="tool.tabPokemon"></button>
          <button type="button" class="pw-tool-tab-btn" data-tab="rotas" data-i18n="tool.tabRotas"></button>
        </div>

        <!-- CORPO DAS ABAS -->
        <div class="pw-tool-body">
          <!-- ABA 1: AÇÕES & CONFIGURAÇÕES -->
          <div id="pw-pane-config" class="pw-tool-pane" style="display:flex; flex-direction:column; gap:10px;">
            <div class="pw-tool-section-lbl" data-i18n="tool.acoesRapidas"></div>
            <div class="pw-tool-action-card" id="pw-card-open-calc">
              <div class="pw-tool-action-left">
                <div class="pw-tool-action-ico">📋</div>
                <div class="pw-tool-action-info">
                  <strong data-i18n="tool.detalhesTitulo"></strong>
                  <p data-i18n="tool.detalhesTexto"></p>
                </div>
              </div>
              <span class="pw-tool-shortcut-badge">Alt + K</span>
            </div>

            <div class="pw-tool-section-lbl" style="margin-top:4px;" data-i18n="tool.configsInGame"></div>

            <div class="pw-tool-switch-row">
              <div class="pw-tool-switch-info">
                <strong data-i18n="tool.bloquearAnuncios"></strong>
                <p data-i18n="tool.bloquearAnunciosSub"></p>
              </div>
              <label class="pw-switch">
                <input type="checkbox" id="pw-sw-anuncios">
                <span class="pw-slider"></span>
              </label>
            </div>

            <div class="pw-tool-switch-row">
              <div class="pw-tool-switch-info">
                <strong data-i18n="tool.bloquearPromocoes"></strong>
                <p data-i18n="tool.bloquearPromocoesSub"></p>
              </div>
              <label class="pw-switch">
                <input type="checkbox" id="pw-sw-promocoes">
                <span class="pw-slider"></span>
              </label>
            </div>

            <div class="pw-tool-switch-row">
              <div class="pw-tool-switch-info">
                <strong data-i18n="tool.lembreteGift"></strong>
                <p data-i18n="tool.lembreteGiftSub"></p>
              </div>
              <label class="pw-switch">
                <input type="checkbox" id="pw-sw-gift">
                <span class="pw-slider"></span>
              </label>
            </div>

            <div class="pw-tool-nota" data-i18n="tool.notaWhatsApp"></div>

            <div style="font-size:9.5px; color:#64748b; font-family:monospace; text-align:center; margin-top:4px;" data-i18n="tool.rodape"></div>
          </div>

          <!-- ABA 2: ÚLTIMA CAPTURA -->
          <!-- Só o que o Log de Capturas do jogo entrega de verdade: nome, level,
               raridade, shiny, IV total, pokébola e horário. -->
          <div id="pw-pane-pokemon" class="pw-tool-pane" style="display:none; flex-direction:column; gap:10px;">
            <div class="pw-tool-action-card" id="pw-pkmn-vazio" style="cursor:default;">
              <div class="pw-tool-action-left">
                <div class="pw-tool-action-ico">📋</div>
                <div class="pw-tool-action-info">
                  <strong data-i18n="tool.semCaptura"></strong>
                  <p data-i18n="tool.semCapturaDica"></p>
                </div>
              </div>
            </div>

            <div id="pw-pkmn-dados" style="display:none; flex-direction:column; gap:10px;">
              <div class="pw-pkmn-hero-card">
                <div class="pw-pkmn-avatar-box">
                  <div class="pw-pkmn-avatar-ico" id="pw-pkmn-ico">🔴</div>
                </div>
                <div class="pw-pkmn-meta-info">
                  <div class="pw-pkmn-meta-title" id="pw-pkmn-nome"></div>
                  <div class="pw-pkmn-meta-stats" id="pw-pkmn-lv"></div>
                  <div class="pw-pkmn-meta-stats" id="pw-pkmn-quando"></div>
                  <div class="pw-pkmn-badges-row">
                    <span class="pw-pkmn-badge rarity-generica" id="pw-pkmn-rarity"></span>
                    <span class="pw-pkmn-badge shiny" id="pw-pkmn-shiny" style="display:none;" data-i18n="tool.shiny"></span>
                  </div>
                </div>
              </div>

              <div class="pw-iv-total-card">
                <div class="pw-iv-total-header">
                  <span data-i18n="tool.ivTotal"></span>
                  <b id="pw-iv-total-num"></b>
                </div>
                <div class="pw-iv-total-track">
                  <div class="pw-iv-total-fill" id="pw-iv-total-fill" style="width:0%;"></div>
                </div>
              </div>

              <div class="pw-pkmn-meta-stats" id="pw-pkmn-bola"></div>
            </div>

            <div class="pw-tool-nota" data-i18n="tool.ivNota"></div>
          </div>

          <!-- ABA 3: ROTAS DE FARM -->
          <div id="pw-pane-rotas" class="pw-tool-pane" style="display:none; flex-direction:column; gap:8px;">
            <div class="pw-tool-section-lbl" data-i18n="tool.faixaLevel"></div>
            <div class="route-levels-grid" id="pw-tool-routes-grid"></div>
            <div class="route-spawns-list" id="pw-tool-routes-list" style="max-height:220px;"></div>
          </div>
        </div>
      </div>
    `;

    window.PokeWatchIdiomas.traduzir(modal);
    document.body.appendChild(modal);

    // Eventos do Modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) alternarToolModal(false);
    });

    const btnClose = document.getElementById('pw-tool-btn-close');
    if (btnClose) {
      btnClose.addEventListener('click', () => alternarToolModal(false));
    }

    // Alternar abas principais
    const tabsBtn = modal.querySelectorAll('.pw-tool-tab-btn[data-tab]');
    const panes = {
      config: document.getElementById('pw-pane-config'),
      pokemon: document.getElementById('pw-pane-pokemon'),
      rotas: document.getElementById('pw-pane-rotas')
    };

    tabsBtn.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabsBtn.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        Object.keys(panes).forEach((k) => {
          if (panes[k]) panes[k].style.display = (k === tab) ? 'flex' : 'none';
        });
      });
    });

    // Card de ação rápida leva para a aba do Pokémon
    const cardCalc = document.getElementById('pw-card-open-calc');
    if (cardCalc) {
      cardCalc.addEventListener('click', () => {
        const btnPkmn = modal.querySelector('.pw-tool-tab-btn[data-tab="pokemon"]');
        if (btnPkmn) btnPkmn.click();
      });
    }

    // Vinculação de switches com o storage
    vincularSwitchTool('pw-sw-anuncios', 'bloquearAnuncios', () => aplicarBloqueiosVisuais());
    vincularSwitchTool('pw-sw-promocoes', 'bloquearPromocoes', () => aplicarBloqueiosVisuais());
    vincularSwitchTool('pw-sw-gift', 'lembreteGift');

    // Inicializa as rotas
    injetarRotasToolModal();
  }

  function vincularSwitchTool(idEl, chaveConfig, callbackExtra) {
    const sw = document.getElementById(idEl);
    if (!sw) return;
    sw.addEventListener('change', () => {
      estado.configs[chaveConfig] = sw.checked;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [chaveConfig]: sw.checked });
      }
      if (callbackExtra) callbackExtra();
    });
  }

  function sincronizarSwitchesTool() {
    const cfg = estado.configs || {};
    const swA = document.getElementById('pw-sw-anuncios');
    const swP = document.getElementById('pw-sw-promocoes');
    const swG = document.getElementById('pw-sw-gift');
    if (swA) swA.checked = Boolean(cfg.bloquearAnuncios);
    if (swP) swP.checked = Boolean(cfg.bloquearPromocoes);
    if (swG) swG.checked = cfg.lembreteGift !== false;

    const trainerLbl = document.getElementById('pw-tool-trainer-lbl');
    if (trainerLbl && estado.nomeTreinador) {
      trainerLbl.textContent = window.PokeWatchIdiomas.t('tool.conta', { nome: estado.nomeTreinador });
    }
  }

  // Mostra a última captura lida no Log — e nada além disso. O jogo só entrega o IV
  // total ali; tipo, golpes e IV por atributo não existem nessa tela.
  function atualizarDadosPokemonTool() {
    const T = window.PokeWatchIdiomas;
    const vazio = document.getElementById('pw-pkmn-vazio');
    const dados = document.getElementById('pw-pkmn-dados');
    if (!vazio || !dados) return;

    const c = estado.ultimaCaptura;
    if (!c || !c.nome) {
      vazio.style.display = 'flex';
      dados.style.display = 'none';
      return;
    }

    vazio.style.display = 'none';
    dados.style.display = 'flex';

    const ivAtual = parseInt(c.iv, 10) || 0;
    const ivMaximo = parseInt(c.ivMax, 10) || 192;
    const pct = Math.min(100, Math.max(0, (ivAtual / ivMaximo) * 100));

    const definir = (id, texto) => {
      const el = document.getElementById(id);
      if (el) el.textContent = texto;
    };

    definir('pw-pkmn-ico', c.isShiny ? '✨' : '🔴');
    definir('pw-pkmn-nome', textoSeguro(c.nome, 40));
    definir('pw-pkmn-lv', c.level ? T.t('tool.nivel', { n: textoSeguro(c.level, 8) }) : '');
    definir('pw-pkmn-quando', c.dataHora ? T.t('tool.horario', { quando: textoSeguro(c.dataHora, 30) }) : '');
    definir('pw-pkmn-bola', c.ball ? T.t('tool.bola', { bola: textoSeguro(c.ball, 24) }) : '');

    const raridade = window.PokeWatchCerebro.normalizarRaridade(c.raridade);
    definir('pw-pkmn-rarity', raridade ? T.raridade(raridade) : T.t('tool.semRaridade'));

    const selo = document.getElementById('pw-pkmn-shiny');
    if (selo) selo.style.display = c.isShiny ? 'inline-block' : 'none';

    definir('pw-iv-total-num', `${T.numero(ivAtual)} / ${T.numero(ivMaximo)} (${pct.toFixed(1)}%)`);
    const totalFill = document.getElementById('pw-iv-total-fill');
    if (totalFill) totalFill.style.width = `${pct.toFixed(1)}%`;
  }

  function injetarRotasToolModal() {
    const grid = document.getElementById('pw-tool-routes-grid');
    const list = document.getElementById('pw-tool-routes-list');
    if (!grid || !list) return;

    // Remontar (troca de idioma) não pode perder o nível que estava escolhido
    const escolhido = grid.querySelector('.route-lvl-btn.active')?.getAttribute('data-lvl') || '1';

    const lvls = ['1', '10', '20', '30', '50', '100', '150', '510', '600'];
    grid.innerHTML = lvls.map((lvl) => `
      <button type="button" class="route-lvl-btn ${lvl === escolhido ? 'active' : ''}" data-lvl="${lvl}"></button>
    `).join('');
    // "Lv 1", "Lv 10"… no idioma escolhido
    grid.querySelectorAll('.route-lvl-btn').forEach((botao) => {
      botao.textContent = window.PokeWatchIdiomas.t('popup.nivel', { n: botao.getAttribute('data-lvl') });
    });

    function renderSpawns(lvl) {
      const spawns = DADOS_ROTAS_TOOL[lvl] || DADOS_ROTAS_TOOL['1'];
      list.innerHTML = spawns.map((s) => `
        <div class="route-spawn-item ${s.featured ? 'featured' : ''}">
          <span>${s.nome}</span>
          <span class="route-spawn-badge">${s.mult}</span>
        </div>
      `).join('');
    }

    // Trocar o idioma remonta os botões: o clique é ligado uma vez só
    if (!grid.dataset.ligado) {
      grid.dataset.ligado = '1';
      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.route-lvl-btn');
        if (!btn) return;
        grid.querySelectorAll('.route-lvl-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        renderSpawns(btn.getAttribute('data-lvl') || '1');
      });
    }

    renderSpawns(escolhido);
  }

  function atualizarHUD() {
    const badgeLog = document.getElementById('pw-badge-log');
    const hintLog = document.getElementById('pw-hint-log');
    const badgeBolas = document.getElementById('pw-badge-bolas');
    const hintBolas = document.getElementById('pw-hint-bolas');
    const statTotal = document.getElementById('pw-stat-total');
    const statShinies = document.getElementById('pw-stat-shinies');
    const lastCatchTxt = document.getElementById('pw-last-catch-txt');
    const bolasBar = document.getElementById('pw-bolas-bar');
    const pillBall = document.getElementById('pw-pill-ball');

    if (!badgeLog) return;

    const T = window.PokeWatchIdiomas;

    // Atualiza nome do Treinador no cabeçalho do HUD
    const titleText = document.querySelector('.pw-title-text');
    if (titleText && estado.nomeTreinador) {
      titleText.textContent = T.t('hud.vigia', { nome: estado.nomeTreinador });
    }

    // 1. Status Log de Capturas
    if (estado.janelaLogEncontrada) {
      badgeLog.className = 'pw-badge ok';
      badgeLog.textContent = T.t('hud.badgeConectado');
      if (hintLog) hintLog.style.display = 'none';
    } else {
      badgeLog.className = 'pw-badge error';
      badgeLog.textContent = T.t('hud.badgeFechado');
      if (hintLog) hintLog.style.display = 'block';
    }

    // 2. Status Pokébolas
    if (estado.semBolas) {
      badgeBolas.className = 'pw-badge error';
      badgeBolas.textContent = T.t('hud.badgeAcabaram');
      if (hintBolas) hintBolas.style.display = 'none';
    } else if (estado.fontePokebolas === 'CAPTURA') {
      badgeBolas.className = 'pw-badge ok';
      badgeBolas.textContent = T.t('hud.badgeCaptura');
      if (hintBolas) hintBolas.style.display = 'none';
    } else if (estado.fontePokebolas === 'AUTO_HELPER') {
      badgeBolas.className = 'pw-badge ok';
      badgeBolas.textContent = T.t('hud.badgeAutoHelper');
      if (hintBolas) hintBolas.style.display = 'none';
    } else {
      badgeBolas.className = 'pw-badge warn';
      badgeBolas.textContent = T.t('hud.badgeOculto');
      if (hintBolas) hintBolas.style.display = 'block';
    }

    // 2b. Hunt Analyzer e conexão
    const badgeHunt = document.getElementById('pw-badge-hunt');
    const hintHunt = document.getElementById('pw-hint-hunt');
    if (badgeHunt) {
      badgeHunt.className = estado.huntAtual ? 'pw-badge ok' : 'pw-badge warn';
      badgeHunt.textContent = estado.huntAtual
        ? `🟢 ${window.PokeWatchCerebro.formatarDinheiro(estado.huntAtual.saldo, true)}`
        : T.t('hud.badgeHuntFechado');
      if (hintHunt) hintHunt.style.display = estado.huntAtual ? 'none' : 'block';
    }
    const badgeConexao = document.getElementById('pw-badge-conexao');
    if (badgeConexao) {
      badgeConexao.className = estado.conexao.problema ? 'pw-badge error' : 'pw-badge ok';
      badgeConexao.textContent = T.t(estado.conexao.problema ? 'hud.badgeConexaoCaiu' : 'hud.badgeConexaoOk');
      badgeConexao.title = estado.conexao.problema || '';
    }

    // 3. Estatísticas
    if (statTotal) statTotal.textContent = T.numero(estado.totalSessao);
    if (statShinies) statShinies.textContent = T.numero(estado.shiniesSessao);

    // 4. Última Captura & Barra de IV
    if (lastCatchTxt && estado.ultimaCaptura) {
      const c = estado.ultimaCaptura;
      const ivVal = parseInt(c.iv, 10) || 0;
      const ivMax = parseInt(c.ivMax, 10) || 192;
      const pct = Math.min(100, Math.max(0, (ivVal / ivMax) * 100));

      // Montado por DOM: o nome vem do jogo e não pode virar HTML
      lastCatchTxt.textContent = '';
      const nomeCaixa = document.createElement('span');
      const nomeForte = document.createElement('b');
      nomeForte.textContent = `${c.isShiny ? '✨ ' : ''}${c.nome}`;
      nomeCaixa.appendChild(nomeForte);

      const ivCaixa = document.createElement('span');
      ivCaixa.style.color = '#dfba73';
      ivCaixa.textContent = ` IV ${ivVal}/${ivMax}`;

      lastCatchTxt.append(nomeCaixa, ivCaixa);

      const ivBar = document.getElementById('pw-iv-bar');
      const ivFill = document.getElementById('pw-iv-fill');
      const ivPct = document.getElementById('pw-iv-pct');
      if (ivBar && ivFill) {
        ivBar.style.display = 'block';
        ivFill.style.width = `${pct.toFixed(1)}%`;
        ivFill.className = 'pw-iv-fill' + (ivVal >= 192 ? ' iv-perfect' : (ivVal >= 165 ? ' iv-top' : ''));
        if (ivPct) ivPct.textContent = `${pct.toFixed(1)}%`;
      }
    }

    // 4b. Badge de Gift Diário
    const giftBadge = document.getElementById('pw-gift-badge');
    if (giftBadge) {
      giftBadge.style.display = (estado.configs && estado.configs.lembreteGift && estado.giftDisponivel) ? 'inline-flex' : 'none';
    }

    // 5. Barrinha de bolas e Cockpit Pill
    if (bolasBar && Object.keys(estado.estoqueBolas).length > 0) {
      const limite = estado.configs.limiteAlertaBolas;
      const apelidos = {
        'Poké Ball': '🔴 Poké',
        'Great Ball': '🔵 Super',
        'Ultra Ball': '🟡 Ultra',
        'Idle Ball': '⚡ Idle'
      };

      // Montado por DOM: o nome da bola vem do atributo title da página do jogo
      bolasBar.textContent = '';
      Object.entries(estado.estoqueBolas).forEach(([nome, qtd]) => {
        const item = document.createElement('div');
        item.className = qtd <= limite ? 'pw-bola-item critica' : 'pw-bola-item';

        const rotulo = document.createElement('span');
        rotulo.textContent = apelidos[nome] || textoSeguro(nome, 18);

        const valor = document.createElement('b');
        valor.textContent = T.numero(qtd);

        item.append(rotulo, valor);
        bolasBar.appendChild(item);
      });

      // Atualiza o pill com a bola monitorada ou a com menor estoque
      if (pillBall) {
        const bolaPref = bolaVigiada(estado.estoqueBolas) || Object.keys(estado.estoqueBolas)[0];
        const qtdPref = estado.estoqueBolas[bolaPref] ?? 0;
        const apelidoPref = apelidos[bolaPref] || textoSeguro(bolaPref, 18);
        pillBall.textContent = `${apelidoPref}: ${T.numero(qtdPref)}`;
      }
    }
  }

  // -------------------------------------------------------------
  // 5. INICIALIZAÇÃO
  // -------------------------------------------------------------
  function carregarConfiguracoes(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(window.PokeWatchCerebro.CHAVES_CONFIG, (items) => {
        estado.configs = window.PokeWatchCerebro.normalizarConfigs(items);
        window.PokeWatchIdiomas.definir(estado.configs.idioma);
        if (callback) callback();
      });
    } else {
      estado.configs = window.PokeWatchCerebro.normalizarConfigs({});
      window.PokeWatchIdiomas.definir(estado.configs.idioma);
      if (callback) callback();
    }
  }

  // Mudanças salvas no popup valem na hora, sem recarregar o jogo
  function ouvirMudancasDeConfig() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) return;
    chrome.storage.onChanged.addListener((mudancas, area) => {
      if (area !== 'local') return;
      if (!Object.keys(mudancas).some((chave) => window.PokeWatchCerebro.CHAVES_CONFIG.includes(chave))) return;
      const trocouIdioma = Boolean(mudancas.idioma);
      carregarConfiguracoes(() => {
        if (trocouIdioma) retraduzirTela();
        atualizarHUD();
      });
    });
  }

  // Trocar o idioma no popup reescreve o HUD e o modal na hora
  function retraduzirTela() {
    const T = window.PokeWatchIdiomas;
    const hud = document.getElementById('pokewatch-hud');
    const modal = document.getElementById('pw-tool-backdrop');
    if (hud) T.traduzir(hud);
    if (modal) {
      T.traduzir(modal);
      injetarRotasToolModal();
      sincronizarSwitchesTool();
      atualizarDadosPokemonTool();
    }
  }

  function iniciar() {
    carregarConfiguracoes(() => {
      ouvirMudancasDeConfig();
      segurarTravaAntiCongelamento();
      responderCutucada();
      iniciarAudioAntiThrottle();
      iniciarWorkerHeartbeat();
      injetarHUD();
      injetarToolModal();
      cicloVerificacao();
      console.log('[Pok3Watch] Monitor passivo rodando com sucesso!');
    });
  }

  // Aguarda carregamento do DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();

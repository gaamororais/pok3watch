// Pok3Watch — Cérebro (Motor de Regras, Decisões e Mensagens)
// Usado pelo content script (aba do jogo) e pelo popup (editor de regras e teste rápido).

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PokeWatchCerebro = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const IV_MAXIMO = 192;

  // Os textos em pt/en/es vêm do idiomas.js, que é carregado antes deste arquivo
  function I() {
    const alvo = (typeof self !== 'undefined' && self.PokeWatchIdiomas)
      || (typeof globalThis !== 'undefined' && globalThis.PokeWatchIdiomas);
    if (!alvo) throw new Error('Pok3Watch: carregue idiomas.js antes de cerebro.js');
    return alvo;
  }

  // Nome em português das regras que vêm de fábrica. Serve para saber se o usuário
  // renomeou a regra (aí mantém o que ele escreveu) ou se dá para traduzir o nome.
  const NOMES_PADRAO_PT = {
    'shiny': 'Shiny',
    'mitica-mais': 'Mítica ou superior',
    'iv-perfeito': 'IV perfeito',
    'lendaria-top': 'Lendária top',
    'lendaria': 'Lendária',
    'epica-160': 'Épica IV 160+',
    'rara-180': 'Rara IV 180+',
    'iv-185': 'IV 185+ (qualquer raridade)'
  };

  // Ordem oficial do jogo (tela "Qualidade & Growth"). Mítica, Anciã e Divina só saem de shiny ou breeding.
  const RARIDADES = ['Fraca', 'Comum', 'Incomum', 'Rara', 'Épica', 'Lendária', 'Mítica', 'Anciã', 'Divina'];

  // Raridade de item no Hunt Analyzer = faixa de preço no NPC (Raro ≥ $1.000, Épico ≥ $10.000, Lendário ≥ $50.001, Mítico ≥ $150.001)
  const RARIDADES_ITEM = ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico'];

  const PRIORIDADES = {
    MAXIMA: { rotulo: '🚨 Máximo', ordem: 2 },
    ALTA: { rotulo: '⚠️ Alto', ordem: 1 }
  };

  const HORAS_RESUMO = [1, 2, 3, 6, 12];

  // Textos do jogo em pt/en/es → nome oficial em português
  const APELIDOS_RARIDADE = {
    fraca: 'Fraca', weak: 'Fraca', debil: 'Fraca',
    comum: 'Comum', common: 'Comum', comun: 'Comum',
    incomum: 'Incomum', uncommon: 'Incomum', 'poco comun': 'Incomum',
    rara: 'Rara', rare: 'Rara',
    epica: 'Épica', epic: 'Épica',
    lendaria: 'Lendária', legendary: 'Lendária', legendaria: 'Lendária',
    mitica: 'Mítica', mythic: 'Mítica',
    ancia: 'Anciã', ancient: 'Anciã', anciana: 'Anciã',
    divina: 'Divina', divine: 'Divina'
  };

  const APELIDOS_RARIDADE_ITEM = {
    comum: 'Comum', common: 'Comum', comun: 'Comum',
    incomum: 'Incomum', uncommon: 'Incomum', 'poco comun': 'Incomum',
    raro: 'Raro', rare: 'Raro',
    epico: 'Épico', epic: 'Épico',
    lendario: 'Lendário', legendary: 'Lendário', legendario: 'Lendário',
    mitico: 'Mítico', mythic: 'Mítico'
  };

  // Dentro de uma regra vale E; entre regras vale OU (basta uma bater).
  const REGRAS_PADRAO = [
    { id: 'shiny', ativa: true, nome: 'Shiny', raridades: [], ivMinimo: 0, soShiny: true, prioridade: 'MAXIMA' },
    { id: 'mitica-mais', ativa: true, nome: 'Mítica ou superior', raridades: ['Mítica', 'Anciã', 'Divina'], ivMinimo: 0, soShiny: false, prioridade: 'MAXIMA' },
    { id: 'iv-perfeito', ativa: true, nome: 'IV perfeito', raridades: [], ivMinimo: 192, soShiny: false, prioridade: 'MAXIMA' },
    { id: 'lendaria-top', ativa: true, nome: 'Lendária top', raridades: ['Lendária'], ivMinimo: 170, soShiny: false, prioridade: 'MAXIMA' },
    { id: 'lendaria', ativa: true, nome: 'Lendária', raridades: ['Lendária'], ivMinimo: 0, soShiny: false, prioridade: 'ALTA' },
    { id: 'epica-160', ativa: true, nome: 'Épica IV 160+', raridades: ['Épica'], ivMinimo: 160, soShiny: false, prioridade: 'ALTA' },
    { id: 'rara-180', ativa: true, nome: 'Rara IV 180+', raridades: ['Rara'], ivMinimo: 180, soShiny: false, prioridade: 'ALTA' },
    { id: 'iv-185', ativa: true, nome: 'IV 185+ (qualquer raridade)', raridades: [], ivMinimo: 185, soShiny: false, prioridade: 'ALTA' }
  ];

  const CONFIG_PADRAO = {
    regrasCaptura: REGRAS_PADRAO,
    idioma: 'auto', // 'auto' | 'pt' | 'en' | 'es'
    alertaBolasAtivo: true,
    limiteAlertaBolas: 100,
    bolaMonitorada: 'Ultra Ball',
    cooldownBolasMinutos: 15,
    alertaSemBolas: true,
    alertaDropRaro: true,
    raridadeMinimaItem: 'Épico',
    itensMonitorados: '',
    resumoAtivo: true,
    resumoHoras: 1,
    alertaDesconexao: true,
    // Features QoL (inspiradas no IV Tool)
    bloquearAnuncios: false,
    bloquearPromocoes: false,
    lembreteGift: true,
    alertaGiftWhatsApp: false
  };

  // Chaves do storage que mudam o comportamento do monitor (o resto é histórico/estado)
  const CHAVES_CONFIG = Object.keys(CONFIG_PADRAO);

  // -------------------------------------------------------------
  // Utilidades
  // -------------------------------------------------------------
  function normalizarTexto(texto) {
    return String(texto ?? '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function inteiroEntre(valor, minimo, maximo, padrao) {
    const n = parseInt(valor, 10);
    if (!Number.isFinite(n)) return padrao;
    return Math.min(maximo, Math.max(minimo, n));
  }

  function clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizarRaridade(rotulo) {
    return APELIDOS_RARIDADE[normalizarTexto(rotulo)] || null;
  }

  function normalizarRaridadeItem(rotulo) {
    return APELIDOS_RARIDADE_ITEM[normalizarTexto(rotulo)] || null;
  }

  function listarComOu(itens) {
    if (itens.length <= 1) return itens.join('');
    return `${itens.slice(0, -1).join(', ')}${I().t('regra.ou')}${itens[itens.length - 1]}`;
  }

  function formatarDinheiro(valor, comSinal = false) {
    const n = Math.round(Number(valor) || 0);
    const sinal = comSinal ? (n >= 0 ? '+' : '−') : (n < 0 ? '−' : '');
    return `${sinal}$${Math.abs(n).toLocaleString(I().locale())}`;
  }

  // -------------------------------------------------------------
  // Regras de captura
  // -------------------------------------------------------------
  function descreverCondicoes(regra) {
    const T = I();
    const partes = [];
    if (regra.soShiny) partes.push(T.t('regra.shiny'));
    if (regra.raridades.length) partes.push(listarComOu(regra.raridades.map((r) => T.raridade(r))));
    else if (!regra.soShiny) partes.push(T.t('regra.qualquerRaridade'));
    if (regra.ivMinimo > 0) {
      partes.push(regra.ivMinimo >= IV_MAXIMO
        ? T.t('regra.ivExato', { iv: IV_MAXIMO })
        : T.t('regra.ivMinimo', { iv: regra.ivMinimo }));
    }
    return partes.join(T.t('regra.e'));
  }

  function rotuloPrioridade(prioridade) {
    return I().t('prioridade.' + (PRIORIDADES[prioridade] ? prioridade : 'ALTA'));
  }

  // O nome que o usuário digitou (vazio quando ainda é o de fábrica)
  function nomeCustomizado(regra) {
    const padrao = NOMES_PADRAO_PT[regra.id];
    return regra.nome && regra.nome !== padrao ? regra.nome : '';
  }

  // Só é "nome de fábrica" se as CONDIÇÕES também forem as de fábrica.
  // Se o usuário mexeu na raridade ou no IV, o nome antigo passaria a mentir.
  function ehNomePadrao(regra) {
    if (!NOMES_PADRAO_PT[regra.id] || nomeCustomizado(regra)) return false;

    const original = REGRAS_PADRAO.find((r) => r.id === regra.id);
    if (!original) return false;

    const mesmasRaridades = original.raridades.length === regra.raridades.length
      && original.raridades.every((r) => regra.raridades.includes(r));

    return mesmasRaridades
      && original.ivMinimo === regra.ivMinimo
      && original.soShiny === regra.soShiny;
  }

  // Nome para mostrar: traduz o de fábrica, respeita o que o usuário digitou e,
  // se a regra foi alterada, mostra as condições reais no lugar de um nome errado.
  function nomeExibido(regra) {
    if (ehNomePadrao(regra)) return I().t('regraNome.' + regra.id);
    return nomeCustomizado(regra) || descreverCondicoes(regra);
  }

  function descreverRegra(regra) {
    return I().t('regra.se', {
      condicoes: descreverCondicoes(regra),
      prioridade: rotuloPrioridade(regra.prioridade)
    });
  }

  /**
   * Devolve a regra limpa ou null se ela for inválida.
   * Uma regra sem nenhuma condição dispararia em TODA captura, então é descartada.
   */
  function sanitizarRegra(regra, indice = 0) {
    if (!regra || typeof regra !== 'object') return null;

    const raridades = [...new Set((Array.isArray(regra.raridades) ? regra.raridades : [])
      .map(normalizarRaridade)
      .filter(Boolean))]
      .sort((a, b) => RARIDADES.indexOf(a) - RARIDADES.indexOf(b));
    const ivMinimo = inteiroEntre(regra.ivMinimo, 0, IV_MAXIMO, 0);
    const soShiny = regra.soShiny === true;

    if (raridades.length === 0 && ivMinimo === 0 && !soShiny) return null;

    const limpa = {
      id: typeof regra.id === 'string' && regra.id ? regra.id.slice(0, 60) : `regra-${Date.now()}-${indice}`,
      ativa: regra.ativa !== false,
      nome: '',
      raridades,
      ivMinimo,
      soShiny,
      prioridade: PRIORIDADES[regra.prioridade] ? regra.prioridade : 'ALTA'
    };
    // Nome vazio fica vazio de propósito: quem mostra decide o texto (e assim dá para traduzir)
    limpa.nome = String(regra.nome ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return limpa;
  }

  function sanitizarRegras(lista) {
    if (!Array.isArray(lista)) return clonar(REGRAS_PADRAO);
    return lista.slice(0, 40).map(sanitizarRegra).filter(Boolean);
  }

  function regraBate(regra, captura) {
    if (!regra.ativa) return false;
    if (regra.soShiny && !captura.isShiny) return false;
    if (regra.raridades.length && !regra.raridades.includes(normalizarRaridade(captura.raridade))) return false;
    if (regra.ivMinimo > 0 && (parseInt(captura.iv, 10) || 0) < regra.ivMinimo) return false;
    return true;
  }

  /**
   * Junta o que veio do storage com os padrões, sempre devolvendo valores válidos.
   */
  function normalizarConfigs(items = {}) {
    const cfg = { ...CONFIG_PADRAO, ...items };
    cfg.regrasCaptura = sanitizarRegras(items.regrasCaptura);
    cfg.alertaBolasAtivo = items.alertaBolasAtivo !== false;
    cfg.limiteAlertaBolas = inteiroEntre(items.limiteAlertaBolas, 0, 10000000, CONFIG_PADRAO.limiteAlertaBolas);
    cfg.bolaMonitorada = String(items.bolaMonitorada || CONFIG_PADRAO.bolaMonitorada);
    cfg.cooldownBolasMinutos = inteiroEntre(items.cooldownBolasMinutos, 1, 1440, CONFIG_PADRAO.cooldownBolasMinutos);
    cfg.alertaSemBolas = items.alertaSemBolas !== false;
    cfg.alertaDropRaro = items.alertaDropRaro !== false;
    cfg.raridadeMinimaItem = normalizarRaridadeItem(items.raridadeMinimaItem) || CONFIG_PADRAO.raridadeMinimaItem;
    cfg.itensMonitorados = String(items.itensMonitorados ?? '');
    cfg.resumoAtivo = items.resumoAtivo !== false;
    cfg.resumoHoras = HORAS_RESUMO.includes(Number(items.resumoHoras)) ? Number(items.resumoHoras) : CONFIG_PADRAO.resumoHoras;
    cfg.alertaDesconexao = items.alertaDesconexao !== false;
    cfg.idioma = ['auto', 'pt', 'en', 'es'].includes(items.idioma) ? items.idioma : 'auto';
    // QoL features (defaults false/true conforme CONFIG_PADRAO)
    cfg.bloquearAnuncios = items.bloquearAnuncios === true;
    cfg.bloquearPromocoes = items.bloquearPromocoes === true;
    cfg.lembreteGift = items.lembreteGift !== false;
    cfg.alertaGiftWhatsApp = items.alertaGiftWhatsApp === true;
    return cfg;
  }

  /**
   * Avalia uma captura contra as regras.
   * @param {Object} captura { nome, level, raridade, iv, ivMax, ball, dataHora, isShiny }
   * @returns {Object} { deveAlertar, regras, prioridade, tipo, mensagem }
   */
  function avaliarCaptura(captura, configs = {}) {
    const batidas = sanitizarRegras(configs.regrasCaptura).filter((regra) => regraBate(regra, captura));
    if (batidas.length === 0) {
      return { deveAlertar: false, regras: [], prioridade: null, tipo: null, mensagem: '' };
    }

    const prioridade = batidas.some((r) => r.prioridade === 'MAXIMA') ? 'MAXIMA' : 'ALTA';
    const tipo = captura.isShiny ? 'SHINY' : (prioridade === 'MAXIMA' ? 'CAPTURA_MAXIMA' : 'CAPTURA_ALTA');

    return {
      deveAlertar: true,
      regras: batidas,
      prioridade,
      tipo,
      mensagem: formatarMensagemCaptura(captura, batidas, prioridade)
    };
  }

  function formatarMensagemCaptura(captura, regras, prioridade) {
    const T = I();
    const iv = parseInt(captura.iv, 10) || 0;
    const ivMax = parseInt(captura.ivMax, 10) || IV_MAXIMO;
    const ivTexto = iv ? `${iv}/${ivMax} (${((iv / ivMax) * 100).toFixed(1)}%)` : T.t('comum.naoInformado');
    const topo = captura.isShiny
      ? T.t('captura.topoShiny')
      : (prioridade === 'MAXIMA' ? T.t('captura.topoMaximo') : T.t('captura.topoAlto'));
    const raridadeCanonica = normalizarRaridade(captura.raridade);

    return [
      topo,
      T.t('captura.regra', { regras: regras.map((r) => nomeExibido(r)).join(' + ') }),
      '',
      T.t('captura.pokemon', {
        nome: `${captura.isShiny ? '✨ ' : ''}${captura.nome || T.t('comum.desconhecido')}${captura.level ? ` (Lv. ${captura.level})` : ''}`
      }),
      T.t('captura.raridade', {
        raridade: raridadeCanonica ? T.raridade(raridadeCanonica) : (captura.raridade || T.t('comum.naoInformada'))
      }),
      T.t('captura.iv', { iv: ivTexto }),
      T.t('captura.bola', { bola: captura.ball || 'N/D' }),
      T.t('captura.horario', { hora: captura.dataHora || new Date().toLocaleTimeString(T.locale()) }),
      '',
      T.t('comum.rodape')
    ].join('\n');
  }

  // -------------------------------------------------------------
  // Pokébolas
  // -------------------------------------------------------------
  /**
   * @param {Object} estoqueBolas { 'Ultra Ball': 40 } (só as bolas que devem ser vigiadas)
   */
  function avaliarEstoqueBolas(estoqueBolas, configs = {}, timestampUltimoAlertaBolas = 0) {
    const cfg = { ...CONFIG_PADRAO, ...configs };
    if (!cfg.alertaBolasAtivo || !estoqueBolas) {
      return { deveAlertar: false, bolasCriticas: [] };
    }

    const agora = Date.now();
    const cooldownMs = (Number(cfg.cooldownBolasMinutos) || 15) * 60 * 1000;
    if (timestampUltimoAlertaBolas && agora - timestampUltimoAlertaBolas < cooldownMs) {
      return { deveAlertar: false, bolasCriticas: [], emCooldown: true };
    }

    const limite = inteiroEntre(cfg.limiteAlertaBolas, 0, 10000000, CONFIG_PADRAO.limiteAlertaBolas);
    const bolasCriticas = Object.entries(estoqueBolas)
      .filter(([, quantidade]) => typeof quantidade === 'number' && quantidade >= 0 && quantidade <= limite)
      .map(([tipo, quantidade]) => ({ tipo, quantidade }));

    const deveAlertar = bolasCriticas.length > 0;
    return {
      deveAlertar,
      bolasCriticas,
      mensagem: deveAlertar ? formatarMensagemBolas(bolasCriticas, limite) : '',
      timestampAtual: deveAlertar ? agora : timestampUltimoAlertaBolas
    };
  }

  function formatarMensagemBolas(bolasCriticas, limite) {
    const T = I();
    const itens = bolasCriticas
      .map((b) => T.t('bolas.item', { tipo: b.tipo, qtd: T.numero(b.quantidade), limite }))
      .join('\n');

    return [T.t('bolas.topo'), '', itens, '', T.t('bolas.dica'), T.t('comum.rodape')].join('\n');
  }

  function formatarMensagemSemBolas() {
    const T = I();
    return [T.t('semBolas.topo'), '', T.t('semBolas.linha1'), T.t('semBolas.linha2'), '', T.t('comum.rodape')].join('\n');
  }

  // -------------------------------------------------------------
  // Drops (Hunt Analyzer)
  // -------------------------------------------------------------
  function listaItensMonitorados(texto) {
    return String(texto || '').split(',').map(normalizarTexto).filter(Boolean);
  }

  /**
   * Diz por que um drop merece aviso ("lista de itens" / "raridade Épico") ou null.
   * @param {Object} drop { nome, raridade }
   */
  function motivoItemNotificavel(drop, configs = {}) {
    const cfg = { ...CONFIG_PADRAO, ...configs };
    const nome = normalizarTexto(drop.nome);
    if (nome && listaItensMonitorados(cfg.itensMonitorados).some((item) => nome.includes(item))) {
      return 'lista de itens';
    }

    const raridade = normalizarRaridadeItem(drop.raridade);
    const minima = normalizarRaridadeItem(cfg.raridadeMinimaItem) || CONFIG_PADRAO.raridadeMinimaItem;
    if (raridade && RARIDADES_ITEM.indexOf(raridade) >= RARIDADES_ITEM.indexOf(minima)) {
      return `raridade ${raridade}`;
    }
    return null;
  }

  /**
   * @param {Array} drops [{ nome, raridade, ganho, total }]
   */
  function formatarMensagemDrops(drops) {
    const T = I();
    const itens = drops
      .map((d) => T.t('drop.item', {
        nome: d.nome,
        ganho: T.numero(d.ganho),
        raridade: d.raridade ? ` (${T.raridadeItem(normalizarRaridadeItem(d.raridade) || d.raridade)})` : '',
        total: T.numero(d.total)
      }))
      .join('\n');

    return [T.t('drop.topo'), '', itens, '', T.t('comum.rodape')].join('\n');
  }

  // -------------------------------------------------------------
  // Resumo periódico
  // -------------------------------------------------------------
  function pontuarCaptura(c) {
    return (c.s ? 10000 : 0) + (RARIDADES.indexOf(normalizarRaridade(c.r)) + 1) * 300 + (parseInt(c.iv, 10) || 0);
  }

  /**
   * @param {Object} dados
   *   horas, capturas [{ t, n, r, iv, s, lv }],
   *   hunt { saldo, loot, supply, ganhoHora, parcial, drops [{ nome, ganho, motivo }] } | null,
   *   bolas { nome: qtd } | null, semBolas
   */
  function formatarResumo(dados) {
    const T = I();
    const { horas, capturas = [], hunt = null, bolas = null, semBolas = false } = dados;
    const linhas = [T.t('resumo.topo', { horas }), ''];

    const shinies = capturas.filter((c) => c.s).length;
    linhas.push(T.t('resumo.capturas', { total: T.numero(capturas.length) })
      + (shinies ? T.t('resumo.shinies', { n: shinies }) : ''));

    if (capturas.length) {
      const porRaridade = RARIDADES.slice().reverse()
        .map((r) => [r, capturas.filter((c) => normalizarRaridade(c.r) === r).length])
        .filter(([, n]) => n > 0)
        .map(([r, n]) => `${T.raridade(r)} ${n}`)
        .join(' · ');
      if (porRaridade) linhas.push(`   ${porRaridade}`);

      linhas.push('', T.t('resumo.melhores'));
      capturas.slice()
        .sort((a, b) => pontuarCaptura(b) - pontuarCaptura(a))
        .slice(0, 5)
        .forEach((c, i) => {
          const raridadeCapturada = normalizarRaridade(c.r);
          linhas.push(`${i + 1}. ${c.s ? '✨ ' : ''}${c.n} · ${raridadeCapturada ? T.raridade(raridadeCapturada) : '—'} · IV ${c.iv || '?'}${c.lv ? ` · Lv.${c.lv}` : ''}`);
        });
    } else {
      linhas.push(T.t('resumo.semCapturas'));
    }

    linhas.push('');
    if (hunt) {
      const observacao = hunt.observacaoChave ? T.t(hunt.observacaoChave) : hunt.observacao;
      linhas.push(T.t('resumo.saldo', { saldo: formatarDinheiro(hunt.saldo, true) })
        + (observacao ? ` _(${observacao})_` : ''));
      linhas.push(T.t('resumo.lootSupply', {
        loot: formatarDinheiro(hunt.loot),
        supply: formatarDinheiro(-Math.abs(hunt.supply))
      }));
      if (hunt.ganhoHora) linhas.push(T.t('resumo.ritmo', { ritmo: hunt.ganhoHora }));
      const raros = (hunt.drops || []).filter((d) => d.motivo && d.ganho > 0);
      linhas.push(raros.length
        ? T.t('resumo.itensRaros', { itens: raros.map((d) => `${d.nome} +${T.numero(d.ganho)}`).join(', ') })
        : T.t('resumo.semItens'));
    } else {
      linhas.push(T.t('resumo.semHunt'));
    }

    if (semBolas) {
      linhas.push('', T.t('resumo.semBolas'));
    } else if (bolas && Object.keys(bolas).length) {
      linhas.push('', T.t('resumo.bolas', {
        bolas: Object.entries(bolas).map(([n, q]) => `${n} ${T.numero(q)}`).join(' · ')
      }));
    }

    linhas.push('', T.t('comum.rodape'));
    return linhas.join('\n');
  }

  // -------------------------------------------------------------
  // Conexão
  // -------------------------------------------------------------
  function formatarMinutos(minutos) {
    const T = I();
    return minutos < 1 ? T.t('comum.menosDeUmMin') : T.t('comum.minutos', { n: Math.round(minutos) });
  }

  function formatarMensagemDesconexao(motivo, minutos) {
    const T = I();
    return [
      T.t('conexao.topo'),
      '',
      T.t('conexao.motivo', { motivo }),
      T.t('conexao.tempo', { tempo: formatarMinutos(minutos) }),
      '',
      T.t('conexao.dica'),
      T.t('comum.rodape')
    ].join('\n');
  }

  function formatarMensagemReconexao(minutos) {
    const T = I();
    return [
      T.t('conexao.voltouTopo'),
      '',
      T.t('conexao.voltouCorpo', { tempo: formatarMinutos(minutos) }),
      T.t('comum.rodape')
    ].join('\n');
  }

  function formatarMensagemGift() {
    const T = I();
    return [T.t('gift.topo'), '', T.t('gift.corpo'), '', T.t('comum.rodape')].join('\n');
  }

  return {
    IV_MAXIMO,
    RARIDADES,
    RARIDADES_ITEM,
    PRIORIDADES,
    HORAS_RESUMO,
    REGRAS_PADRAO,
    CONFIG_PADRAO,
    CHAVES_CONFIG,
    normalizarTexto,
    normalizarRaridade,
    normalizarRaridadeItem,
    normalizarConfigs,
    sanitizarRegra,
    sanitizarRegras,
    descreverCondicoes,
    descreverRegra,
    rotuloPrioridade,
    nomeExibido,
    ehNomePadrao,
    nomeCustomizado,
    avaliarCaptura,
    formatarMensagemCaptura,
    avaliarEstoqueBolas,
    formatarMensagemBolas,
    formatarMensagemSemBolas,
    motivoItemNotificavel,
    formatarMensagemDrops,
    formatarResumo,
    formatarDinheiro,
    formatarMensagemDesconexao,
    formatarMensagemReconexao,
    formatarMensagemGift
  };
});

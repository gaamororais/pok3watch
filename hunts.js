// Pok3Watch — Recomendador de Hunts Otimizadas

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PokeWatchHunts = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Matriz de tipos (tipo atacante vs tipo defensor) = efetividade
  const EFETIVIDADE = {
    'Normal': { 'Fantasma': 0, 'Rocha': 0.5, 'Aço': 0.5 },
    'Fogo': { 'Água': 0.5, 'Planta': 2, 'Gelo': 2, 'Inseto': 2, 'Aço': 2, 'Fada': 1 },
    'Água': { 'Fogo': 2, 'Chão': 2, 'Rocha': 2, 'Grama': 0.5, 'Elétrico': 0.5, 'Água': 0.5 },
    'Elétrico': { 'Água': 2, 'Voador': 2, 'Fada': 1 },
    'Grama': { 'Água': 2, 'Chão': 2, 'Rocha': 2, 'Fogo': 0.5, 'Gelo': 0.5, 'Veneno': 0.5 },
    'Gelo': { 'Fogo': 0.5, 'Gelo': 0.5, 'Aço': 0.5, 'Água': 0.5 },
    'Luta': { 'Normal': 2, 'Gelo': 2, 'Rocha': 2, 'Escuro': 2, 'Aço': 2 },
    'Veneno': { 'Grama': 2, 'Fada': 2, 'Veneno': 0.5 },
    'Chão': { 'Fogo': 2, 'Elétrico': 2, 'Veneno': 2, 'Rocha': 2, 'Aço': 2 },
    'Voador': { 'Luta': 2, 'Inseto': 2, 'Grama': 2, 'Elétrico': 0.5 },
    'Psíquico': { 'Luta': 2, 'Veneno': 2, 'Escuro': 0.5, 'Aço': 0.5 },
    'Inseto': { 'Grama': 2, 'Psíquico': 2, 'Escuro': 2, 'Fogo': 0.5, 'Luta': 0.5 },
    'Rocha': { 'Fogo': 2, 'Gelo': 2, 'Voador': 2, 'Inseto': 2, 'Água': 0.5, 'Grama': 0.5 },
    'Fantasma': { 'Psíquico': 2, 'Fantasma': 2, 'Normal': 0 },
    'Dragão': { 'Dragão': 2, 'Fada': 0.5 },
    'Escuro': { 'Psíquico': 2, 'Fantasma': 2, 'Luta': 0.5 },
    'Aço': { 'Gelo': 2, 'Rocha': 2, 'Fada': 2, 'Fogo': 0.5, 'Água': 0.5, 'Elétrico': 0.5 },
    'Fada': { 'Luta': 2, 'Dragão': 2, 'Escuro': 2, 'Veneno': 0.5, 'Aço': 0.5 }
  };

  // Dados de hunts (resumido)
  const HUNTS = {
    'zubats': {
      nome: 'Zubats',
      tipo: 'Voador/Veneno',
      level: 10,
      xpPorHora: 450,
      ouroPorHora: 5200,
      risco: 'Baixo',
      recomendadoParaNivel: [10, 50]
    },
    'tentacools': {
      nome: 'Tentacools',
      tipo: 'Água/Veneno',
      level: 15,
      xpPorHora: 380,
      ouroPorHora: 4100,
      risco: 'Baixo',
      recomendadoParaNivel: [15, 60]
    },
    'poliwags': {
      nome: 'Poliwags',
      tipo: 'Água',
      level: 12,
      xpPorHora: 320,
      ouroPorHora: 3500,
      risco: 'Baixo',
      recomendadoParaNivel: [12, 50]
    },
    'geodes': {
      nome: 'Geodes',
      tipo: 'Rocha/Chão',
      level: 25,
      xpPorHora: 520,
      ouroPorHora: 6800,
      risco: 'Médio',
      recomendadoParaNivel: [25, 80]
    },
    'weedles': {
      nome: 'Weedles',
      tipo: 'Inseto/Veneno',
      level: 8,
      xpPorHora: 280,
      ouroPorHora: 2900,
      risco: 'Baixo',
      recomendadoParaNivel: [8, 40]
    }
  };

  /**
   * Calcula efetividade de ataque
   * @param {String} tipoAtacante
   * @param {String} tipoDefensor
   * @returns {Number} multiplicador (0.5, 1, 2, etc)
   */
  function calcularEfetividade(tipoAtacante, tipoDefensor) {
    const mapa = EFETIVIDADE[tipoAtacante] || {};
    return mapa[tipoDefensor] || 1;
  }

  /**
   * Recomenda melhor hunt para um Pokémon
   * @param {Object} pokemon { tipo, level, iv, qualidade, raridade }
   * @returns {Array} hunts recomendadas [{ hunt, score, efetividade, xpPorHora, ... }]
   */
  function recomendarHunt(pokemon) {
    const recomendacoes = Object.entries(HUNTS)
      .map(([id, hunt]) => {
        // Calcula score de recomendação
        const efetividadeAtaque = calcularEfetividade(pokemon.tipo, hunt.tipo);
        const efetividadeDefesa = calcularEfetividade(hunt.tipo, pokemon.tipo);

        // Pontuação: efetividade é o principal, depois risco/XP
        const scoreEfetividade = efetividadeAtaque * 100;
        const scoreRisco = hunt.risco === 'Baixo' ? 30 : hunt.risco === 'Médio' ? 20 : 10;
        const scoreXP = hunt.xpPorHora / 10;
        const scoreNivel = Math.abs(pokemon.level - hunt.level) > 30 ? -50 : 0;

        const score = scoreEfetividade + scoreRisco + scoreXP + scoreNivel;

        return {
          id,
          ...hunt,
          efetividadeAtaque,
          efetividadeDefesa,
          score,
          label: efetividadeAtaque > 1 ? '✅ SUPER EFETIVO' : efetividadeAtaque < 1 ? '⚠️ POUCO EFETIVO' : '→ Neutro'
        };
      })
      .sort((a, b) => b.score - a.score);

    return recomendacoes;
  }

  /**
   * Calcula tempo até level alvo
   * @param {Number} levelAtual
   * @param {Number} levelAlvo
   * @param {Number} xpPorHora
   * @returns {Object} { horas, dias, minutos, formatado }
   */
  function calcularTempoAteLevel(levelAtual, levelAlvo, xpPorHora) {
    // Fórmula simplificada: XP total = level^2 * 100
    const xpAtual = Math.pow(levelAtual, 2) * 100;
    const xpAlvo = Math.pow(levelAlvo, 2) * 100;
    const xpFaltando = xpAlvo - xpAtual;

    const horas = xpFaltando / xpPorHora;
    const dias = Math.floor(horas / 24);
    const horasRestante = horas % 24;
    const minutos = Math.round(horasRestante * 60);

    let formatado = '';
    if (dias > 0) formatado += `${dias}d `;
    if (horasRestante > 0) formatado += `${Math.floor(horasRestante)}h`;
    if (!formatado) formatado = `${minutos}min`;

    return { horas, dias, minutos, formatado };
  }

  /**
   * Formata recomendação para exibir
   * @param {Array} recomendacoes
   * @param {Object} pokemon
   * @returns {String} mensagem formatada
   */
  function formatarRecomendacoes(recomendacoes, pokemon) {
    let msg = `💪 HUNTS OTIMIZADAS\n`;
    msg += `Pokémon: ${pokemon.nome} (${pokemon.tipo})\n`;
    msg += `Level Atual: ${pokemon.level}\n\n`;

    recomendacoes.slice(0, 3).forEach((hunt, i) => {
      const tempo = calcularTempoAteLevel(pokemon.level, 200, hunt.xpPorHora);
      msg += `${i + 1}️⃣ ${hunt.nome} ${hunt.label}\n`;
      msg += `   📈 ${hunt.xpPorHora} XP/h\n`;
      msg += `   💰 $${hunt.ouroPorHora.toLocaleString('pt-BR')}/h\n`;
      msg += `   ⏱️ Até Lv.200: ${tempo.formatado}\n\n`;
    });

    return msg;
  }

  return {
    recomendarHunt,
    calcularEfetividade,
    calcularTempoAteLevel,
    formatarRecomendacoes,
    HUNTS,
    obterTodosOsHunts: () => Object.entries(HUNTS).map(([id, hunt]) => ({ id, ...hunt }))
  };
});

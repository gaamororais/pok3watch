// Pok3Watch — First Catch (registro das PRIMEIRAS capturas de cada espécie)
//
// NÃO é Pokédex/coleção. Não tem total de 807, nem badges, nem meta.
// A detecção de "primeira vez" vem do selo .clog-first do próprio jogo
// (feita no content.js). Aqui só guardamos um histórico leve pra ter
// contador e lista das primeiras capturas que aconteceram.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PokeWatchFirstCatch = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const STORAGE_KEY = 'pok3watch_firstcatch';

  async function obterEstado() {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        resolve(result[STORAGE_KEY] || { especies: {}, total: 0 });
      });
    });
  }

  function salvar(estado) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: estado }, resolve);
    });
  }

  // Registra uma primeira captura. Idempotente: se a espécie já foi
  // registrada antes, não duplica (mantém o primeiro registro).
  async function registrar(nome, dados = {}) {
    const estado = await obterEstado();
    const chave = String(nome || '').toLowerCase().trim();
    if (!chave) return { total: estado.total, jaExistia: true };

    if (estado.especies[chave]) {
      return { total: estado.total, jaExistia: true };
    }

    estado.especies[chave] = {
      nome: String(nome).trim(),
      data: new Date().toISOString(),
      iv: dados.iv || 0,
      level: dados.level || 0,
      raridade: dados.raridade || 'Desconhecida',
      shiny: Boolean(dados.shiny)
    };
    estado.total = Object.keys(estado.especies).length;
    await salvar(estado);

    return { total: estado.total, jaExistia: false };
  }

  // Últimas N primeiras capturas (mais recentes primeiro).
  async function obterHistorico(limite = 20) {
    const estado = await obterEstado();
    return Object.values(estado.especies)
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .slice(0, limite)
      .map((e) => ({
        ...e,
        dataFormatada: new Date(e.data).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      }));
  }

  async function obterTotal() {
    return (await obterEstado()).total;
  }

  // Mensagem enxuta do evento — sem "/807", sem badges, sem "Pokédex".
  function formatarMensagem(nome, total, shiny) {
    const selo = shiny ? '✨ ' : '';
    let msg = `🆕 PRIMEIRA CAPTURA: ${selo}${nome}!\n`;
    msg += `Primeira vez que essa espécie aparece pra você.`;
    if (total > 0) msg += `\n(${total}ª espécie diferente registrada)`;
    return msg;
  }

  return {
    registrar,
    obterEstado,
    obterHistorico,
    obterTotal,
    formatarMensagem
  };
});

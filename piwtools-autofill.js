// Pok3Watch — Autofill da calculadora do piwtools.com.br
//
// Roda em piwtools.com.br. Lê o Pokémon que a extensão capturou no jogo
// (chrome.storage.local.piwAutofill) e preenche a calculadora sozinho:
// seleciona o Pokémon na busca, digita qualidade/IV/nível e os 6 stats,
// e clica em Calcular. Não guarda nada — usa o dado uma vez e apaga.

(function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function nativeSet(el, value) {
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    el.focus();
    setter.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // A busca de Pokémon é um combobox que só reage a eventos de teclado.
  async function digitarBusca(input, texto) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    input.focus();
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
      setter.call(input, texto.slice(0, i + 1));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }));
      await sleep(45);
    }
  }

  async function esperar(fn, tentativas = 40, intervalo = 150) {
    for (let i = 0; i < tentativas; i++) {
      const el = fn();
      if (el) return el;
      await sleep(intervalo);
    }
    return null;
  }

  async function preencher(dados) {
    const busca = await esperar(() => document.querySelector('input[placeholder*="Larvitar"]'));
    if (!busca) return;
    const art = busca.closest('article') || document.querySelectorAll('article')[0] || document;

    // 1. seleciona o Pokémon na lista
    await digitarBusca(busca, dados.nome);
    const dd = await esperar(() => {
      const d = [...document.querySelectorAll('div[class*="top-full"]')].find((e) => e.offsetParent !== null);
      return d && d.querySelector('button') ? d : null;
    }, 25, 120);
    if (dd) {
      const btns = [...dd.querySelectorAll('button')];
      const alvo = btns.find((b) => (b.textContent || '').trim().toLowerCase() === String(dados.nome).toLowerCase()) || btns[0];
      if (alvo) alvo.click();
      await sleep(450);
    }

    // 2. campos numéricos (escopo no card do Pokémon A)
    const q = (ph) => art.querySelector('input[placeholder*="' + ph + '"]');
    const quality = String(dados.quality || '').replace('.', ',');
    if (quality) nativeSet(q('1,58'), quality);
    if (dados.iv) nativeSet(q('114'), dados.iv);
    if (dados.nivel) nativeSet(q('24'), dados.nivel);

    const s = dados.stats || {};
    if (s.hp != null) nativeSet(q('HP'), s.hp);
    if (s.atk != null) nativeSet(q('Atk'), s.atk);
    if (s.def != null) nativeSet(q('Def'), s.def);
    if (s.spa != null) nativeSet(q('SpAtk'), s.spa);
    if (s.spd != null) nativeSet(q('SpDef'), s.spd);
    if (s.spe != null) nativeSet(q('Speed'), s.spe);
    await sleep(300);

    // 3. calcula
    const calc = [...art.querySelectorAll('button')].find((b) => /calcular/i.test(b.textContent || ''));
    if (calc) calc.click();
  }

  try {
    chrome.storage.local.get('piwAutofill', (r) => {
      const dados = r && r.piwAutofill;
      if (!dados) return;
      // usa o dado uma vez só e se for recente (< 2 min)
      if (Date.now() - (dados.capturadoEm || 0) > 120000) {
        chrome.storage.local.remove('piwAutofill');
        return;
      }
      chrome.storage.local.remove('piwAutofill', () => {
        preencher(dados).catch((e) => console.warn('[Pok3Watch] autofill PIW falhou:', e));
      });
    });
  } catch (e) {
    /* fora do contexto da extensão — ignora */
  }
})();

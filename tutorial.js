// Tutorial do CallMeBot: tradução da página e botões de copiar
// (frase de liberação do bot e chave PIX).

const I = window.PokeWatchIdiomas;

// Usa o idioma escolhido no popup; se ainda não houver escolha, cai no 'auto'
function traduzirPagina(preferencia) {
  I.definir(preferencia || 'auto');
  document.documentElement.lang = I.locale();
  I.traduzir();
}

try {
  chrome.storage.local.get(['idioma'], (itens) => {
    traduzirPagina(chrome.runtime.lastError ? 'auto' : (itens || {}).idioma);
  });
} catch (_) {
  traduzirPagina('auto');
}

function ligarCopiar(idBotao, idTexto) {
  const botao = document.getElementById(idBotao);
  const alvo = document.getElementById(idTexto);
  if (!botao || !alvo) return;

  botao.addEventListener('click', async () => {
    const texto = alvo.textContent.trim();

    try {
      await navigator.clipboard.writeText(texto);
      botao.textContent = I.t('popup.copiado');
    } catch (_) {
      // Alguns navegadores bloqueiam a área de transferência: seleciona o texto para copiar na mão
      const selecao = window.getSelection();
      const intervalo = document.createRange();
      intervalo.selectNodeContents(alvo);
      selecao.removeAllRanges();
      selecao.addRange(intervalo);
      botao.textContent = I.t('popup.copieCtrlC');
    }

    setTimeout(() => { botao.textContent = I.t('popup.copiar'); }, 2500);
  });
}

ligarCopiar('btnCopiar', 'frase');
ligarCopiar('btnCopiarPix', 'pix');
ligarCopiar('btnCopiarCripto', 'cripto');

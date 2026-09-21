importScripts('idiomas.js');
const I = self.PokeWatchIdiomas;

// Aplica o idioma escolhido no popup antes de montar qualquer mensagem
async function aplicarIdioma() {
    const { idioma } = await chrome.storage.local.get('idioma');
    I.definir(idioma);
}

// Pok3Watch (versão pública) — Service Worker
// Canal de WhatsApp: CallMeBot. Cada usuário usa o PRÓPRIO número e a PRÓPRIA API Key,
// então não existe token de servidor escrito aqui dentro.

const URL_CALLMEBOT = "https://api.callmebot.com/whatsapp.php";
const DEBOUNCE_MS = 30 * 1000;
const FETCH_TIMEOUT_MS = 20000;
const MAX_TENTATIVAS = 3;
const INTERVALO_MINIMO_MS = 12 * 1000; // O CallMeBot é gratuito e derruba envios em rajada
const LIMITE_CARACTERES = 900;         // A mensagem viaja dentro da URL (GET)
const SEM_SINAL_MS = 10 * 60 * 1000;

// Cada alerta diferente vira uma chave aqui; sem poda, uma sessão 24/7 cresce sem fim.
// Passado o tempo do debounce a entrada não serve mais para nada.
let ultimasMensagens = {};

function podarUltimasMensagens() {
    const limite = Date.now() - DEBOUNCE_MS;
    for (const chave of Object.keys(ultimasMensagens)) {
        if (ultimasMensagens[chave] < limite) delete ultimasMensagens[chave];
    }
}

let filaEnvio = Promise.resolve();

// 1. Manter o computador acordado só enquanto existir aba do jogo respondendo
let keepAwakeLigado = false;

function ajustarKeepAwake(precisa) {
  try {
    if (!chrome.power || !chrome.power.requestKeepAwake) return;
    if (precisa) {
      if (!keepAwakeLigado) {
        chrome.power.requestKeepAwake('system');
        keepAwakeLigado = true;
      }
      return;
    }

    // Solta sempre: o service worker recicla e perde a variável, mas o pedido
    // de manter acordado continua valendo. releaseKeepAwake pode ser repetido à toa.
    chrome.power.releaseKeepAwake();
    keepAwakeLigado = false;
  } catch (err) {
    console.warn('[Pok3Watch] Falha ao ajustar o KeepAwake:', err);
  }
}

// Abre o tutorial na primeira instalação: sem a API Key do CallMeBot nada é enviado
chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason !== 'install') return;
    try {
        chrome.tabs.create({ url: chrome.runtime.getURL('tutorial.html') });
    } catch (err) {
        console.warn('[Pok3Watch] Não consegui abrir o tutorial:', err);
    }
});

// 2. Ouvinte de mensagens do Content Script e do Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Print não existe nesta versão: o CallMeBot só envia texto
    if (request && (request.tipo === 'CAPTURAR_TELA_INSTANTANEA' || request.type === 'CAPTURAR_TELA_INSTANTANEA')) {
        (async () => {
            await aplicarIdioma();
            criarNotificacaoLocal({ tipo: 'SNAPSHOT', mensagem: I.t('print.indisponivel') });
            sendResponse({ ok: false, error: I.t('print.indisponivel') });
        })();
        return true;
    }

    if (request && request.tipo === 'HEARTBEAT_TAB') {
        registrarHeartbeat(request, sender)
            .then(sendResponse)
            .catch(() => sendResponse({ ok: false }));
        return true;
    }

    if (request && request.tipo === 'SUPORTA_PRINT') {
        sendResponse({ ok: true, suporta: false });
        return false;
    }

    if (request && request.type === 'PING') {
        sendResponse({ pong: true, time: Date.now() });
        return false;
    }

    if (request && (request.tipo || request.mensagem)) {
        processarAlerta(request, sender)
            .then((resultado) => sendResponse(resultado))
            .catch((err) => {
                console.error("Pok3Watch: falha inesperada ao processar alerta:", err);
                const resposta = { ok: false, error: classificarErroFetch(err) };
                salvarStatusEnvio(request, resposta);
                sendResponse(resposta);
            });
        return true; // Mantém a porta aberta para resposta assíncrona
    }

    sendResponse({ ok: false, error: 'Comando não reconhecido.' });
    return false;
});

// Limpeza de abas fechadas (fechar de propósito não gera alerta)
chrome.tabs.onRemoved.addListener(async (closedTabId) => {
    const { contasAtivas = {} } = await chrome.storage.local.get('contasAtivas');
    if (contasAtivas[closedTabId]) {
        delete contasAtivas[closedTabId];
        await chrome.storage.local.set({ contasAtivas });
    }
});

// O estado das abas fica no storage: o service worker do MV3 dorme e perde as variáveis
async function registrarHeartbeat(request, sender) {
    await aplicarIdioma();
    const tabId = sender.tab ? sender.tab.id : 'default';
    const agora = Date.now();
    const { contasAtivas = {} } = await chrome.storage.local.get('contasAtivas');
    const anterior = contasAtivas[tabId];

    contasAtivas[tabId] = {
        tabId: tabId,
        windowId: sender.tab ? sender.tab.windowId : null,
        nomeTreinador: request.nomeTreinador || `Treinador #${tabId}`,
        totalSessao: request.totalSessao || 0,
        shiniesSessao: request.shiniesSessao || 0,
        ultimaCaptura: request.ultimaCaptura || null,
        estoqueBolas: request.estoqueBolas || {},
        fontePokebolas: request.fontePokebolas || null,
        audioAtivo: Boolean(request.audioAtivo),
        janelaLogEncontrada: Boolean(request.janelaLogEncontrada),
        huntAnalyzerAberto: Boolean(request.huntAnalyzerAberto),
        semBolas: Boolean(request.semBolas),
        problemaConexao: request.problemaConexao || null,
        huntStats: request.huntStats || null,
        ultimaAtualizacao: agora,
        alertouSemSinal: false
    };

    if (anterior && anterior.alertouSemSinal) {
        const minutos = Math.max(1, Math.round((agora - anterior.ultimaAtualizacao) / 60000));
        processarAlerta({
            tipo: 'RECONECTADO',
            nomeTreinador: contasAtivas[tabId].nomeTreinador,
            mensagem: [
                I.t('aba.voltouTopo'),
                '',
                I.t('aba.voltouCorpo', { n: minutos }),
                I.t('comum.rodape')
            ].join('\n')
        }, sender).catch(() => {});
    }

    // Esquece abas sem sinal há mais de 12h
    for (const [id, conta] of Object.entries(contasAtivas)) {
        if (agora - conta.ultimaAtualizacao > 12 * 60 * 60 * 1000) delete contasAtivas[id];
    }

    await chrome.storage.local.set({ contasAtivas });
    ajustarKeepAwake(true);
    return { ok: true, totalContas: Object.keys(contasAtivas).length };
}

// 3. Vigia de abas sem sinal: aba travada, congelada ou descartada pelo Chrome
chrome.alarms.get('pokewatch-vigia', (alarme) => {
    if (!alarme) chrome.alarms.create('pokewatch-vigia', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarme) => {
    if (alarme.name !== 'pokewatch-vigia') return;
    verificarAbasSemSinal().catch((err) => console.warn('[Pok3Watch] Falha ao vigiar abas:', err));
});

async function verificarAbasSemSinal() {
    const { contasAtivas = {}, alertaDesconexao } = await chrome.storage.local.get(['contasAtivas', 'alertaDesconexao']);
    await aplicarIdioma();
    const agora = Date.now();
    let mudou = false;

    for (const [id, conta] of Object.entries(contasAtivas)) {
        const parado = agora - conta.ultimaAtualizacao;
        if (parado < SEM_SINAL_MS || conta.alertouSemSinal) continue;

        const aba = await chrome.tabs.get(Number(id)).catch(() => null);
        if (!aba) {
            delete contasAtivas[id];
            mudou = true;
            continue;
        }

        // Antes de alertar, cutuca a aba. Se responder, o Chrome só estava segurando
        // os timers dela (aba em 2º plano) e não há nada de errado.
        const respondeu = await new Promise((resolve) => {
            try {
                chrome.tabs.sendMessage(Number(id), { tipo: 'PING_ABA' }, (resposta) => {
                    if (chrome.runtime.lastError) return resolve(false);
                    resolve(Boolean(resposta && resposta.vivo));
                });
            } catch (_) {
                resolve(false);
            }
        });

        if (respondeu) {
            conta.ultimaAtualizacao = agora;
            mudou = true;
            continue;
        }

        conta.alertouSemSinal = true;
        mudou = true;
        if (alertaDesconexao === false) continue;

        const motivo = aba.discarded
            ? I.t('aba.descartada')
            : I.t('aba.travada');
        await processarAlerta({
            tipo: 'DESCONECTADO',
            nomeTreinador: conta.nomeTreinador,
            mensagem: [
                I.t('aba.topo'),
                '',
                I.t('conexao.motivo', { motivo }),
                I.t('aba.tempo', { n: Math.round(parado / 60000) }),
                '',
                I.t('aba.dica'),
                I.t('comum.rodape')
            ].join('\n')
        }, { tab: aba });
    }

    if (mudou) await chrome.storage.local.set({ contasAtivas });

    // Sem aba viva, deixa o computador suspender de novo
    const vivas = Object.values(contasAtivas).filter((c) => agora - c.ultimaAtualizacao < SEM_SINAL_MS);
    ajustarKeepAwake(Object.keys(vivas).length > 0);
}

const LIMITE_POR_HORA = 20;
const LIMITE_POR_DIA = 100;

// Texto vindo do jogo poderia gerar alerta sem parar (12s cada). Este teto protege
// a cota do serviço de envio e a paciência de quem recebe.
async function dentroDoLimite() {
    const agora = Date.now();
    const { pwEnvios = [] } = await chrome.storage.local.get('pwEnvios');
    const doDia = pwEnvios.filter((quando) => agora - quando < 24 * 60 * 60 * 1000);
    const daHora = doDia.filter((quando) => agora - quando < 60 * 60 * 1000);

    if (doDia.length !== pwEnvios.length) await chrome.storage.local.set({ pwEnvios: doDia });
    return daHora.length < LIMITE_POR_HORA && doDia.length < LIMITE_POR_DIA;
}

// Só conta o que realmente foi entregue: erro de rede ou chave errada não gasta cota
async function contabilizarEnvio() {
    const agora = Date.now();
    const { pwEnvios = [] } = await chrome.storage.local.get('pwEnvios');
    const doDia = pwEnvios.filter((quando) => agora - quando < 24 * 60 * 60 * 1000);
    doDia.push(agora);
    await chrome.storage.local.set({ pwEnvios: doDia });
}

async function processarAlerta(request, sender) {
    if (!request || !request.mensagem) {
        return { ok: false, error: "Mensagem vazia ou inválida." };
    }

    await aplicarIdioma();
    const tabId = sender && sender.tab ? sender.tab.id : null;
    const nomeTreinador = request.nomeTreinador ||
        (tabId ? (await chrome.storage.local.get('contasAtivas')).contasAtivas?.[tabId]?.nomeTreinador : null);
    const prefixoConta = nomeTreinador ? `👤 *[Conta: ${nomeTreinador}]*\n` : '';

    const chave = `${nomeTreinador || 'global'}:${request.tipo || "ALERTA"}:${request.mensagem}`;
    if (request.tipo !== 'TESTE' && ultimasMensagens[chave] && (Date.now() - ultimasMensagens[chave] < DEBOUNCE_MS)) {
        return { ok: true, skipped: true, reason: "duplicado" };
    }
    ultimasMensagens[chave] = Date.now();
    podarUltimasMensagens();

    criarNotificacaoLocal(request);

    const credenciais = await lerCredenciais();
    if (!credenciais.ok) {
        salvarStatusEnvio(request, credenciais);
        return credenciais;
    }

    if (!(await dentroDoLimite())) {
        const resposta = { ok: false, error: I.t('envio.limiteExtensao') };
        salvarStatusEnvio(request, resposta);
        return resposta;
    }

    const texto = prepararTexto(`${prefixoConta}${request.mensagem}`);
    const resposta = await enfileirar(() => enviarComRetry(credenciais.numero, credenciais.apiKey, texto));
    if (resposta.ok) await contabilizarEnvio();

    salvarStatusEnvio(request, { ...resposta, destination: mascararTelefone(credenciais.numero) });
    atualizarBadge(resposta.ok);
    return resposta.ok ? { ...resposta, destination: credenciais.numero } : resposta;
}

async function lerCredenciais() {
    const { telefoneDestino, callMeBotKey } = await chrome.storage.local.get(['telefoneDestino', 'callMeBotKey']);

    const destino = normalizarTelefone(telefoneDestino);
    if (!destino.ok) return destino;

    const apiKey = String(callMeBotKey || '').trim();
    if (!apiKey) {
        return { ok: false, error: I.t('envio.semChave') };
    }

    return { ok: true, numero: destino.numero, apiKey };
}

// A mensagem viaja na URL, então textos enormes (resumo) precisam de corte
function prepararTexto(texto) {
    const limpo = String(texto || '').trim();
    if (limpo.length <= LIMITE_CARACTERES) return limpo;
    return `${limpo.slice(0, LIMITE_CARACTERES - 22)}…\n${I.t('envio.mensagemCortada')}`;
}

// Um envio de cada vez, respeitando o intervalo mínimo do CallMeBot
function enfileirar(tarefa) {
    const proxima = filaEnvio.then(async () => {
        const { ultimoEnvioCallMeBot = 0 } = await chrome.storage.local.get('ultimoEnvioCallMeBot');
        const espera = INTERVALO_MINIMO_MS - (Date.now() - ultimoEnvioCallMeBot);
        if (espera > 0) await esperar(espera);
        await chrome.storage.local.set({ ultimoEnvioCallMeBot: Date.now() });
        return tarefa();
    });
    filaEnvio = proxima.catch(() => {});
    return proxima;
}

function criarNotificacaoLocal(request) {
    try {
        chrome.notifications.create('pokewatch-' + (request.tipo || 'ALERTA'), {
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: `Pok3Watch - ${tituloAlerta(request.tipo)}`,
            message: String(request.mensagem || '').replace(/\*/g, '')
        });
    } catch (e) {
        // Ignora caso a notificação do sistema não tenha permissão
    }
}

function tituloAlerta(tipo) {
    const chave = 'titulo.' + (tipo || 'ALERTA');
    const texto = I.t(chave);
    return texto === chave ? I.t('titulo.ALERTA') : texto;
}

function normalizarTelefone(numero) {
    const limpo = String(numero || "").replace(/\D/g, '');
    if (!limpo) return { ok: false, error: I.t('envio.semNumero') };

    // Só completa com o 55 quando o número tem cara de brasileiro sem DDI E o idioma é pt.
    // Quem está fora do Brasil informa o número completo, com DDI.
    const brasileiroSemDDI = (limpo.length === 10 || limpo.length === 11) && I.idioma() === 'pt';
    const destino = brasileiroSemDDI ? `55${limpo}` : limpo;

    // Faixa do padrão internacional E.164
    if (destino.length < 8 || destino.length > 15) {
        return { ok: false, error: I.t('envio.numeroInvalido') };
    }

    return { ok: true, numero: destino };
}

async function enviarComRetry(numero, apiKey, texto) {
    let ultimoErro = null;
    let tentativasFeitas = 0;

    const url = `${URL_CALLMEBOT}?phone=${encodeURIComponent('+' + numero)}`
        + `&text=${encodeURIComponent(texto)}`
        + `&apikey=${encodeURIComponent(apiKey)}`;

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
        tentativasFeitas = tentativa;
        try {
            const response = await fetchComTimeout(url, { method: "GET" }, FETCH_TIMEOUT_MS);
            const corpo = (await response.text().catch(() => "")).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            const problema = interpretarRespostaCallMeBot(response, corpo);

            if (!problema) {
                console.log("Pok3Watch: alerta enviado pelo CallMeBot.");
                return { ok: true, attempts: tentativa, httpStatus: response.status };
            }

            ultimoErro = problema.erro;
            if (!problema.podeTentarDeNovo) break;
        } catch (err) {
            ultimoErro = classificarErroFetch(err);
        }

        if (tentativa < MAX_TENTATIVAS) await esperar(2000 * tentativa);
    }

    return { ok: false, attempts: tentativasFeitas, error: ultimoErro || "Falha desconhecida no envio." };
}

// O CallMeBot costuma responder HTTP 200 mesmo quando recusa, então o texto da resposta é que vale
function interpretarRespostaCallMeBot(response, corpo) {
    if (/api\s*key.*(invalid|incorrect|wrong)|invalid.*api\s*key/i.test(corpo)) {
        return { erro: I.t('envio.chaveInvalida'), podeTentarDeNovo: false };
    }
    if (/(not\s*(allowed|authorized|registered))|you need to (add|register)|apikey is missing|phone.*(missing|invalid)/i.test(corpo)) {
        return { erro: I.t('envio.numeroNaoLiberado'), podeTentarDeNovo: false };
    }
    if (/(too many|limit|flood|wait)/i.test(corpo)) {
        return { erro: I.t('envio.limite'), podeTentarDeNovo: true };
    }
    if (!response.ok) {
        return { erro: `CallMeBot: HTTP ${response.status}`, podeTentarDeNovo: response.status >= 500 };
    }
    if (/error|failed/i.test(corpo)) {
        return { erro: I.t('envio.rede'), podeTentarDeNovo: false };
    }
    return null;
}

async function fetchComTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

function classificarErroFetch(err) {
    const nome = err?.name || '';
    const mensagem = err?.message || String(err || '');

    if (nome === 'AbortError') return I.t('envio.timeout');
    if (/failed to fetch/i.test(mensagem)) {
        return I.t('envio.rede');
    }
    return mensagem || 'Falha de rede desconhecida.';
}

function salvarStatusEnvio(request, resposta) {
    chrome.storage.local.set({
        ultimoEnvioWhatsApp: {
            ok: Boolean(resposta.ok),
            tipo: request?.tipo || "ALERTA",
            erro: resposta.error || null,
            destino: resposta.destination || null,
            tentativas: resposta.attempts || 0,
            httpStatus: resposta.httpStatus || null,
            horario: Date.now()
        }
    });
}

function atualizarBadge(ok) {
    if (chrome.action && chrome.action.setBadgeText) {
        chrome.action.setBadgeText({ text: ok ? "OK" : "!" });
        chrome.action.setBadgeBackgroundColor({ color: ok ? "#00d285" : "#ff4757" });
        setTimeout(() => chrome.action.setBadgeText({ text: "" }), 8000);
    }
}

function mascararTelefone(numero) {
    const texto = String(numero);
    return texto.length <= 4 ? texto : '****' + texto.slice(-4);
}

function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// 🎨 CACHE DE IMAGENS DO JOGO (pokeitems) — acelera o carregamento dos sprites
self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('pokeitems') && event.request.url.includes('.png')) {
        event.respondWith(
            caches.match(event.request).then(response => {
                if (response) return response;
                return fetch(event.request).then(response => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseToCache = response.clone();
                        caches.open('pokemon-images-v1').then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                }).catch(() => caches.match(event.request));
            })
        );
    }
});

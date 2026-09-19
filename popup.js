document.addEventListener('DOMContentLoaded', () => {
    const C = window.PokeWatchCerebro;
    const I = window.PokeWatchIdiomas;
    const $ = (id) => document.getElementById(id);

    const selectIdioma = $('idioma');
    const inputNumero = $('numeroTelefone');
    const inputApiKey = $('callMeBotKey'); // só existe na versão pública (CallMeBot)
    const avisoConfig = $('avisoConfig'); // aviso de configuração pendente (versão pública)
    const inputLimiteBolas = $('limiteBolas');
    const selectBolaMonitorada = $('bolaMonitorada');
    const checkAlertaBolas = $('alertaBolasAtivo');
    const checkSemBolas = $('alertaSemBolas');
    const checkDropRaro = $('alertaDropRaro');
    const selectRaridadeItem = $('raridadeMinimaItem');
    const inputItens = $('itensMonitorados');
    const checkResumo = $('resumoAtivo');
    const selectResumoHoras = $('resumoHoras');
    const checkDesconexao = $('alertaDesconexao');
    const checkPrintShiny = $('printShiny');
    const checkPrintDrop = $('printDrop');
    const checkPrintIv = $('printIv');
    const checkPrintTravado = $('printTravado');
    const checkCropInteligente = $('cropInteligente');
    const checkBloquearAnuncios = $('bloquearAnuncios');
    const checkBloquearPromocoes = $('bloquearPromocoes');
    const checkLembreteGift = $('lembreteGift');
    const checkAlertaGiftWhatsApp = $('alertaGiftWhatsApp');
    const listaRegras = $('listaRegras');
    const btnSalvar = $('btnSalvar');
    const btnTestar = $('btnTestar');
    const btnResetar = $('btnResetarMetricas');
    const toast = $('toast');
    const statusBox = $('statusBox');
    const bolasTotal = $('bolasTotal');
    const bolasGasto = $('bolasGasto');
    const bolasRitmo = $('bolasRitmo');
    const bolasDuracao = $('bolasDuracao');
    const bolasDetalhes = $('bolasDetalhes');
    const whatsappStatus = $('whatsappStatus');

    // Estado do editor: pode ter regra incompleta enquanto o usuário edita (só as válidas são salvas)
    let regras = [];
    let regraAbertaId = null;
    let carregado = false;
    let timerSalvar = null;

    // Só o que a tela usa: o storage também guarda histórico, que pode ficar grande
    const CHAVES_DO_POPUP = [
        ...C.CHAVES_CONFIG,
        'telefoneDestino', 'callMeBotKey', 'regrasRascunho',
        'printShiny', 'printDrop', 'printIv', 'printTravado', 'cropInteligente'
    ];

    // A tela inteira só é montada depois de saber o idioma escolhido: assim nada
    // nasce em português para ser reescrito depois.
    carregarConfiguracoes();

    btnSalvar.addEventListener('click', () => salvarTudo(true));
    btnTestar.addEventListener('click', testarNotificacao);
    btnResetar.addEventListener('click', resetarMetricas);

    // -------------------------------------------------------------
    // Carregar / salvar
    // -------------------------------------------------------------
    function carregarConfiguracoes() {
        chrome.storage.local.get(CHAVES_DO_POPUP, (items) => {
            const cfg = C.normalizarConfigs(items);
            I.definir(cfg.idioma);
            document.documentElement.lang = I.locale();
            I.traduzir();
            traduzirSelects();

            configurarSteppers();
            configurarAccordion();
            configurarRotasFarm();
            configurarEditorDeRegras();
            configurarAutoSalvar();
            configurarModos();
            configurarDoacao();

            if (selectIdioma) selectIdioma.value = cfg.idioma;

            if (items.telefoneDestino) inputNumero.value = items.telefoneDestino;
            if (inputApiKey && items.callMeBotKey) inputApiKey.value = items.callMeBotKey;
            inputLimiteBolas.value = cfg.limiteAlertaBolas;
            selecionarOpcao(selectBolaMonitorada, cfg.bolaMonitorada);
            checkAlertaBolas.checked = cfg.alertaBolasAtivo;
            checkSemBolas.checked = cfg.alertaSemBolas;
            checkDropRaro.checked = cfg.alertaDropRaro;
            selecionarOpcao(selectRaridadeItem, cfg.raridadeMinimaItem);
            inputItens.value = cfg.itensMonitorados;
            checkResumo.checked = cfg.resumoAtivo;
            selectResumoHoras.value = String(cfg.resumoHoras);
            checkDesconexao.checked = cfg.alertaDesconexao;
            checkPrintShiny.checked = items.printShiny !== false;
            checkPrintDrop.checked = items.printDrop !== false;
            checkPrintIv.checked = items.printIv !== false;
            checkPrintTravado.checked = items.printTravado === true;
            checkCropInteligente.checked = items.cropInteligente !== false;
            checkBloquearAnuncios.checked = cfg.bloquearAnuncios === true;
            checkBloquearPromocoes.checked = cfg.bloquearPromocoes === true;
            checkLembreteGift.checked = cfg.lembreteGift !== false;
            checkAlertaGiftWhatsApp.checked = cfg.alertaGiftWhatsApp === true;

            // Regra incompleta não é salva no motor, mas continua no rascunho para não sumir da tela
            regras = Array.isArray(items.regrasRascunho) && items.regrasRascunho.length >= cfg.regrasCaptura.length
                ? items.regrasRascunho
                : cfg.regrasCaptura;
            renderizarRegras();
            atualizarFiltrosBadge();
            validarTelefone();
            validarApiKey();
            atualizarAvisoConfig();
            carregado = true;

            atualizarStatusAba();
            atualizarMetricas();
            iniciarTimers();

            // Primeira vez nesta versão: grava as regras padrão para o jogo usar as mesmas que aparecem aqui
            if (!Array.isArray(items.regrasCaptura)) salvarTudo(false);
        });
    }

    // Fora do popup (barra lateral / guia própria) a tela fica aberta o dia todo.
    // Escondida, ela não lê o storage — mas os temporizadores continuam de pé, para
    // a atualização nunca ficar travada se o navegador não avisar da volta.
    function iniciarTimers() {
        setInterval(() => { if (!document.hidden) atualizarMetricas(); }, 4000);
        setInterval(() => { if (!document.hidden) atualizarStatusAba(); }, 8000);

        // Voltou à tela: atualiza na hora, sem esperar a próxima batida
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) return;
            atualizarMetricas();
            atualizarStatusAba();
        });
    }

    // Rótulos que dependem do idioma e não são texto fixo (raridade, faixas de preço, horas)
    function traduzirSelects() {
        const PRECO_ITEM = { Incomum: 100, Raro: 1000, 'Épico': 10000, 'Lendário': 50001, 'Mítico': 150001 };

        const selectItem = $('raridadeMinimaItem');
        if (selectItem) {
            [...selectItem.options].forEach((opcao) => {
                opcao.textContent = I.t('popup.itemFaixa', {
                    raridade: I.raridadeItem(opcao.value),
                    preco: `$${I.numero(PRECO_ITEM[opcao.value] || 0)}`
                });
            });
        }

        const selectHoras = $('resumoHoras');
        if (selectHoras) {
            [...selectHoras.options].forEach((opcao) => {
                const n = Number(opcao.value);
                opcao.textContent = n === 1 ? I.t('popup.umaHora') : I.t('popup.nHoras', { n });
            });
        }
    }

    function selecionarOpcao(select, valor) {
        const alvo = C.normalizarTexto(valor).replace(/\s/g, '');
        const opcao = [...select.options].find((o) => C.normalizarTexto(o.value).replace(/\s/g, '') === alvo);
        if (opcao) select.value = opcao.value;
    }

    function telefoneValido() {
        const digitos = inputNumero.value.replace(/\D/g, '');
        return digitos.length >= 10 && digitos.length <= 13 ? digitos : null;
    }

    function validarTelefone() {
        const ok = !!telefoneValido();
        inputNumero.classList.toggle('campo-erro', !ok);
        $('erroTelefone').style.display = ok ? 'none' : 'block';
        return ok;
    }

    // Só na versão pública: sem a API Key o CallMeBot recusa o envio
    function validarApiKey() {
        if (!inputApiKey) return true;
        const ok = inputApiKey.value.trim().length >= 4;
        inputApiKey.classList.toggle('campo-erro', !ok);
        const aviso = $('erroApiKey');
        if (aviso) aviso.style.display = ok ? 'none' : 'block';
        return ok;
    }

    // Só na versão pública: avisa no topo quando falta número ou API Key
    function atualizarAvisoConfig() {
        if (!avisoConfig) return;
        const faltaChave = !!inputApiKey && inputApiKey.value.trim().length < 4;
        avisoConfig.style.display = (!telefoneValido() || faltaChave) ? 'block' : 'none';
    }

    // Se a pessoa colar o link inteiro do CallMeBot, aproveita só o número e a chave
    function limparColagem() {
        let mudou = false;

        if (inputApiKey) {
            const chave = inputApiKey.value.match(/apikey=([A-Za-z0-9_-]+)/i);
            if (chave) { inputApiKey.value = chave[1]; mudou = true; }
        }

        const numero = inputNumero.value.match(/phone=[^0-9]*([0-9]+)/i);
        if (numero) { inputNumero.value = numero[1]; mudou = true; }

        if (!mudou) return;
        validarTelefone();
        validarApiKey();
        atualizarAvisoConfig();
        agendarSalvar();
    }

    // Só na versão pública: botões de copiar do bloco "Ajude o criador"
    function configurarDoacao() {
        document.querySelectorAll('[data-copiar]').forEach((botao) => {
            botao.addEventListener('click', async () => {
                const valor = botao.getAttribute('data-copiar');
                const original = botao.textContent;
                try {
                    await navigator.clipboard.writeText(valor);
                    botao.textContent = I.t('popup.copiado');
                } catch (_) {
                    // Sem permissão para a área de transferência: seleciona o texto para copiar com Ctrl+C
                    const valorNaTela = botao.parentElement.querySelector('.doar-valor');
                    if (valorNaTela) {
                        const selecao = window.getSelection();
                        const intervalo = document.createRange();
                        intervalo.selectNodeContents(valorNaTela);
                        selecao.removeAllRanges();
                        selecao.addRange(intervalo);
                    }
                    botao.textContent = I.t('popup.copieCtrlC');
                }
                setTimeout(() => { botao.textContent = original; }, 2500);
            });
        });
    }

    // Abrir na barra lateral do Chrome (estilo MetaMask) ou em janela separada.
    // Com ?painel=1 o layout usa a largura toda, em vez dos 350px do popup.
    function configurarModos() {
        const versao = $('headerVersao');
        if (versao && chrome.runtime.getManifest) versao.textContent = 'v' + chrome.runtime.getManifest().version;

        const noPainel = new URLSearchParams(location.search).get('painel') === '1';
        if (noPainel) {
            document.body.classList.add('modo-painel');
            agruparParaPainel();
        }

        const btnLateral = $('btnBarraLateral');
        const btnJanela = $('btnJanela');
        if (!btnLateral || !btnJanela) return;

        // Já estando fora do popup, os botões não servem para nada
        if (noPainel) {
            btnLateral.style.display = 'none';
            btnJanela.style.display = 'none';
            return;
        }

        // Barra lateral existe a partir do Chrome 114
        if (!chrome.sidePanel || !chrome.sidePanel.open) {
            btnLateral.style.display = 'none';
        } else {
            btnLateral.addEventListener('click', async () => {
                try {
                    const janela = await chrome.windows.getCurrent();
                    await chrome.sidePanel.open({ windowId: janela.id });
                    window.close();
                } catch (err) {
                    mostrarToast(I.t('popup.semBarraLateral', { erro: err.message }), 'error');
                }
            });
        }

        btnJanela.addEventListener('click', async () => {
            try {
                await chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?painel=1') });
                window.close();
            } catch (err) {
                mostrarToast(I.t('popup.semJanela', { erro: err.message }), 'error');
            }
        });
    }

    // Junta cada seção (título + campos) num bloco, para o layout em colunas
    // do modo expandido não separar um título do que vem embaixo dele.
    function agruparParaPainel() {
        const conteudo = document.querySelector('.content');
        if (!conteudo) return;

        let grupo = null;
        [...conteudo.children].forEach((elemento) => {
            if (!grupo || elemento.classList.contains('section-title')) {
                grupo = document.createElement('section');
                grupo.className = 'grupo';
                conteudo.insertBefore(grupo, elemento);
            }
            grupo.appendChild(elemento);
        });
    }

    function lerConfiguracoes() {
        return {
            regrasCaptura: C.sanitizarRegras(regras),
            regrasRascunho: regras,
            idioma: selectIdioma ? selectIdioma.value : 'auto',
            ...(inputApiKey ? { callMeBotKey: inputApiKey.value.trim() } : {}),
            limiteAlertaBolas: Math.max(0, parseInt(inputLimiteBolas.value, 10) || 0),
            bolaMonitorada: selectBolaMonitorada.value,
            alertaBolasAtivo: checkAlertaBolas.checked,
            alertaSemBolas: checkSemBolas.checked,
            alertaDropRaro: checkDropRaro.checked,
            raridadeMinimaItem: selectRaridadeItem.value,
            itensMonitorados: inputItens.value.trim(),
            resumoAtivo: checkResumo.checked,
            resumoHoras: Number(selectResumoHoras.value),
            alertaDesconexao: checkDesconexao.checked,
            printShiny: checkPrintShiny.checked,
            printDrop: checkPrintDrop.checked,
            printIv: checkPrintIv.checked,
            printTravado: checkPrintTravado.checked,
            cropInteligente: checkCropInteligente.checked,
            bloquearAnuncios: checkBloquearAnuncios.checked,
            bloquearPromocoes: checkBloquearPromocoes.checked,
            lembreteGift: checkLembreteGift.checked,
            alertaGiftWhatsApp: checkAlertaGiftWhatsApp.checked
        };
    }

    function salvarTudo(mostrarAviso, callback) {
        if (!carregado) return;
        clearTimeout(timerSalvar);
        timerSalvar = null;

        const config = lerConfiguracoes();
        const telefone = telefoneValido();
        // Número inválido nunca apaga o número bom que já estava salvo
        if (telefone) config.telefoneDestino = telefone;
        validarTelefone();

        chrome.storage.local.set(config, () => {
            if (chrome.runtime.lastError) {
                mostrarToast(I.t('popup.erroSalvar', { erro: chrome.runtime.lastError.message }), 'error');
                return;
            }

            const incompletas = regras.length - config.regrasCaptura.length;
            $('statusSalvo').textContent = incompletas > 0
                ? I.t('popup.salvoIncompletas', { hora: formatarHora(Date.now()), n: incompletas })
                : I.t('popup.salvoAs', { hora: formatarHora(Date.now()) });

            if (mostrarAviso) {
                mostrarToast(telefone ? I.t('popup.salvo') : I.t('popup.salvoNumeroInvalido'), telefone ? 'success' : 'error');
            }
            if (callback) callback(config, telefone);
        });
    }

    function agendarSalvar() {
        clearTimeout(timerSalvar);
        timerSalvar = setTimeout(() => salvarTudo(false), 400);
    }

    function configurarAutoSalvar() {
        const campos = [
            inputNumero, inputLimiteBolas, selectBolaMonitorada, checkAlertaBolas, checkSemBolas,
            checkDropRaro, selectRaridadeItem, inputItens, checkResumo, selectResumoHoras, checkDesconexao,
            checkPrintShiny, checkPrintDrop, checkPrintIv, checkPrintTravado, checkCropInteligente,
            checkBloquearAnuncios, checkBloquearPromocoes, checkLembreteGift, checkAlertaGiftWhatsApp
        ];
        campos.forEach((campo) => {
            campo.addEventListener('change', agendarSalvar);
            campo.addEventListener('input', agendarSalvar);
        });
        inputNumero.addEventListener('input', validarTelefone);
        if (selectIdioma) {
            selectIdioma.addEventListener('change', () => salvarTudo(false, () => location.reload()));
        }
        if (inputApiKey) {
            inputApiKey.addEventListener('input', agendarSalvar);
            inputApiKey.addEventListener('change', agendarSalvar);
            inputApiKey.addEventListener('input', validarApiKey);
        }

        if (avisoConfig) {
            inputNumero.addEventListener('input', atualizarAvisoConfig);
            if (inputApiKey) inputApiKey.addEventListener('input', atualizarAvisoConfig);
        }

        // Colar o link inteiro do CallMeBot também funciona
        ['paste', 'input'].forEach((evento) => {
            inputNumero.addEventListener(evento, () => setTimeout(limparColagem, 0));
            if (inputApiKey) inputApiKey.addEventListener(evento, () => setTimeout(limparColagem, 0));
        });
        [checkPrintShiny, checkPrintDrop, checkPrintIv, checkPrintTravado, checkCropInteligente]
            .forEach((ch) => ch.addEventListener('change', atualizarFiltrosBadge));

        // Fechou o popup logo depois de mexer: salva o que estiver pendente
        window.addEventListener('pagehide', () => {
            if (timerSalvar) salvarTudo(false);
        });
    }

    // -------------------------------------------------------------
    // Editor de regras
    // -------------------------------------------------------------
    function configurarEditorDeRegras() {
        const selectTeste = $('testeRaridade');
        C.RARIDADES.forEach((r) => selectTeste.appendChild(new Option(I.raridade(r), r, r === 'Épica', r === 'Épica')));
        ['testeRaridade', 'testeIv', 'testeShiny'].forEach((id) => {
            $(id).addEventListener('input', atualizarTeste);
            $(id).addEventListener('change', atualizarTeste);
        });

        $('btnNovaRegra').addEventListener('click', () => {
            const novaId = `regra-${Date.now()}`;
            regras.push({
                id: novaId,
                ativa: true,
                nome: '',
                raridades: ['Épica'],
                ivMinimo: 150,
                soShiny: false,
                prioridade: 'ALTA'
            });
            regraAbertaId = novaId;
            renderizarRegras();
            listaRegras.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            agendarSalvar();
        });

        confirmarEmDoisCliques($('btnRestaurarRegras'), I.t('popup.confirmarDeNovo'), () => {
            regras = C.sanitizarRegras(C.REGRAS_PADRAO);
            renderizarRegras();
            salvarTudo(false);
            mostrarToast(I.t('popup.regrasRestauradas'));
        });
    }

    // Evita apagar sem querer: o primeiro clique só arma o botão por 3s
    function confirmarEmDoisCliques(botao, textoArmado, acao) {
        const textoOriginal = botao.textContent;
        let armado = null;
        botao.addEventListener('click', () => {
            if (armado) {
                clearTimeout(armado);
                armado = null;
                botao.textContent = textoOriginal;
                botao.classList.remove('armado');
                acao();
                return;
            }
            botao.textContent = textoArmado;
            botao.classList.add('armado');
            armado = setTimeout(() => {
                armado = null;
                botao.textContent = textoOriginal;
                botao.classList.remove('armado');
            }, 3000);
        });
    }

    function criar(tag, classe, texto) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (texto !== undefined) el.textContent = texto;
        return el;
    }

    function renderizarRegras() {
        listaRegras.textContent = '';
        if (regras.length === 0) {
            listaRegras.appendChild(criar('div', 'regra-erro', I.t('popup.semRegras')));
        }
        regras.forEach((regra) => listaRegras.appendChild(criarCardRegra(regra)));
        atualizarTeste();
    }

    function criarCardRegra(regra) {
        regra.raridades = Array.isArray(regra.raridades) ? regra.raridades : [];
        if (!regra.id) regra.id = `regra-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const estaAberta = (regra.id === regraAbertaId);

        const card = criar('div', `rule-item ${estaAberta ? 'editing' : ''}`);

        // Linha de resumo compacta (1 linha)
        const summaryRow = criar('div', 'rule-summary-row');

        const left = criar('div', 'rule-left');
        const chave = criar('label', 'mini-switch');
        const checkAtiva = criar('input');
        checkAtiva.type = 'checkbox';
        checkAtiva.checked = regra.ativa !== false;
        checkAtiva.addEventListener('click', (e) => e.stopPropagation());
        checkAtiva.addEventListener('change', (e) => {
            e.stopPropagation();
            regra.ativa = checkAtiva.checked;
            atualizarCard();
        });
        chave.append(checkAtiva, criar('span', 'mini-slider'));

        const ruleText = criar('span', 'rule-text');
        left.append(chave, ruleText);

        const badgePri = criar('span', `rule-badge-priority ${regra.prioridade === 'MAXIMA' ? 'pri-max' : 'pri-high'}`,
            I.t(regra.prioridade === 'MAXIMA' ? 'popup.badgeMax' : 'popup.badgeAlta'));

        const btnEdit = criar('button', 'btn-edit-rule', estaAberta ? '▲' : '▼');
        btnEdit.type = 'button';
        btnEdit.title = I.t(estaAberta ? 'popup.fecharDetalhes' : 'popup.editarRegra');

        summaryRow.append(left, badgePri, btnEdit);
        summaryRow.addEventListener('click', (e) => {
            if (e.target === checkAtiva || chave.contains(e.target)) return;
            regraAbertaId = (regraAbertaId === regra.id ? null : regra.id);
            renderizarRegras();
        });

        // Gaveta de edição expandível
        const drawer = criar('div', 'rule-edit-drawer');

        // Input de nome
        const inputNome = criar('input', 'rule-name-input');
        inputNome.type = 'text';
        inputNome.maxLength = 40;
        inputNome.placeholder = C.nomeExibido(regra);
        inputNome.value = C.nomeCustomizado(regra);
        inputNome.addEventListener('input', () => {
            regra.nome = inputNome.value;
            atualizarCard();
        });

        // Grade de botões de raridade (3 colunas, estilizados por cor)
        const chipGrid = criar('div', 'chip-grid');
        C.RARIDADES.forEach((raridade) => {
            const rKey = raridade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const btnRarity = criar('button', `rarity-btn ${rKey} ${regra.raridades.includes(raridade) ? 'active' : ''}`, I.raridade(raridade));
            btnRarity.type = 'button';
            btnRarity.addEventListener('click', (e) => {
                e.stopPropagation();
                const i = regra.raridades.indexOf(raridade);
                if (i >= 0) regra.raridades.splice(i, 1);
                else regra.raridades.push(raridade);
                btnRarity.classList.toggle('active', i < 0);
                atualizarCard();
            });
            chipGrid.appendChild(btnRarity);
        });

        // Linha de controles secundários
        const controlsRow = criar('div', 'edit-controls-row');

        // Stepper de IV
        const miniStepper = criar('div', 'mini-stepper');
        const btnMenos = criar('button', '', '−');
        btnMenos.type = 'button';
        const inputIv = criar('input');
        inputIv.type = 'number';
        inputIv.min = '0';
        inputIv.max = String(C.IV_MAXIMO);
        inputIv.value = regra.ivMinimo || 0;
        const btnMais = criar('button', '', '+');
        btnMais.type = 'button';

        const definirIv = (val) => {
            regra.ivMinimo = Math.min(C.IV_MAXIMO, Math.max(0, parseInt(val, 10) || 0));
            inputIv.value = regra.ivMinimo;
            atualizarCard();
        };
        btnMenos.addEventListener('click', (e) => { e.stopPropagation(); definirIv((regra.ivMinimo || 0) - 5); });
        btnMais.addEventListener('click', (e) => { e.stopPropagation(); definirIv((regra.ivMinimo || 0) + 5); });
        inputIv.addEventListener('input', () => definirIv(inputIv.value));
        miniStepper.append(btnMenos, inputIv, criar('span', '', 'IV≥'), btnMais);

        // Switch Só Shiny
        const shinyWrap = criar('div', 'rule-left');
        shinyWrap.style.gap = '5px';
        const shinySwitch = criar('label', 'mini-switch');
        const checkShiny = criar('input');
        checkShiny.type = 'checkbox';
        checkShiny.checked = regra.soShiny === true;
        checkShiny.addEventListener('change', () => {
            regra.soShiny = checkShiny.checked;
            atualizarCard();
        });
        shinySwitch.append(checkShiny, criar('span', 'mini-slider'));
        const lblShiny = criar('span', '', I.t('popup.soShiny'));
        lblShiny.style.fontSize = '9.5px';
        lblShiny.style.color = '#cbd5e1';
        lblShiny.style.cursor = 'pointer';
        lblShiny.addEventListener('click', () => {
            checkShiny.checked = !checkShiny.checked;
            regra.soShiny = checkShiny.checked;
            atualizarCard();
        });
        shinyWrap.append(shinySwitch, lblShiny);

        // Ações da gaveta (Prioridade + Deletar)
        const drawerActions = criar('div', 'drawer-actions');
        const selectPri = criar('select');
        selectPri.style.padding = '3px 6px';
        selectPri.style.fontSize = '10px';
        selectPri.appendChild(new Option(I.t('popup.prioridadeMax'), 'MAXIMA'));
        selectPri.appendChild(new Option(I.t('popup.prioridadeAlta'), 'ALTA'));
        selectPri.value = regra.prioridade === 'MAXIMA' ? 'MAXIMA' : 'ALTA';
        selectPri.addEventListener('change', () => {
            regra.prioridade = selectPri.value;
            badgePri.className = `rule-badge-priority ${regra.prioridade === 'MAXIMA' ? 'pri-max' : 'pri-high'}`;
            badgePri.textContent = I.t(regra.prioridade === 'MAXIMA' ? 'popup.badgeMax' : 'popup.badgeAlta');
            atualizarCard();
        });

        const btnDel = criar('button', 'btn-del-drawer', '🗑');
        btnDel.type = 'button';
        btnDel.title = I.t('popup.excluirRegra');
        confirmarEmDoisCliques(btnDel, I.t('popup.excluirConfirmar'), () => {
            regras = regras.filter((r) => r !== regra);
            if (regraAbertaId === regra.id) regraAbertaId = null;
            renderizarRegras();
            agendarSalvar();
        });

        drawerActions.append(selectPri, btnDel);
        controlsRow.append(miniStepper, shinyWrap, drawerActions);

        const hintText = criar('div', 'rule-hint-text');
        const errorText = criar('div', 'rule-error-text');

        drawer.append(inputNome, chipGrid, controlsRow, hintText, errorText);
        card.append(summaryRow, drawer);

        function atualizarCard(salvar = true) {
            const limpa = C.sanitizarRegra(regra);
            card.classList.toggle('desativada', regra.ativa === false);
            card.classList.toggle('invalida', !limpa);

            const textoDescr = limpa ? C.descreverRegra(limpa) : I.t('popup.regraSemFiltros');
            const nomeMostrado = limpa ? C.nomeExibido(limpa) : '';
            ruleText.textContent = nomeMostrado && nomeMostrado !== C.descreverCondicoes(limpa)
                ? `${nomeMostrado} (${textoDescr})`
                : textoDescr;
            ruleText.title = textoDescr;

            if (!limpa) {
                errorText.textContent = I.t('popup.regraVazia');
                errorText.style.display = 'block';
                hintText.style.display = 'none';
            } else {
                errorText.style.display = 'none';
                hintText.textContent = I.t('popup.criteriosE');
                hintText.style.display = 'block';
            }

            if (salvar) {
                atualizarTeste();
                agendarSalvar();
            }
        }

        atualizarCard(false);
        return card;
    }

    function atualizarTeste() {
        const iv = Math.min(C.IV_MAXIMO, Math.max(0, parseInt($('testeIv').value, 10) || 0));
        const resultado = C.avaliarCaptura({
            nome: 'Teste',
            raridade: $('testeRaridade').value,
            iv,
            ivMax: C.IV_MAXIMO,
            isShiny: $('testeShiny').checked
        }, { regrasCaptura: C.sanitizarRegras(regras) });

        $('testeResultado').textContent = resultado.deveAlertar
            ? I.t('popup.dispara', {
                prioridade: C.rotuloPrioridade(resultado.prioridade),
                regras: resultado.regras.map((r) => C.nomeExibido(r)).join(' + ')
            })
            : I.t('popup.naoAlerta');
    }

    // -------------------------------------------------------------
    // Componentes antigos da tela
    // -------------------------------------------------------------
    function configurarSteppers() {
        $('btnBolasDec').addEventListener('click', () => {
            inputLimiteBolas.value = Math.max(0, (parseInt(inputLimiteBolas.value, 10) || 0) - 25);
            agendarSalvar();
        });
        $('btnBolasInc').addEventListener('click', () => {
            inputLimiteBolas.value = (parseInt(inputLimiteBolas.value, 10) || 0) + 25;
            agendarSalvar();
        });
    }

    function configurarAccordion() {
        // Accordion de Prints
        const togglePrints = $('toggleAccordionPrints');
        const bodyPrints = $('bodyAccordionPrints');
        const chevronPrints = $('chevronPrints');
        if (togglePrints && bodyPrints) {
            togglePrints.addEventListener('click', () => {
                const isOpen = bodyPrints.classList.toggle('open');
                if (chevronPrints) chevronPrints.classList.toggle('expanded', isOpen);
            });
        }

        // Accordion de Rotas de Farm
        const toggleRotas = $('toggleAccordionRotas');
        const bodyRotas = $('bodyAccordionRotas');
        const chevronRotas = $('chevronRotas');
        if (toggleRotas && bodyRotas) {
            toggleRotas.addEventListener('click', () => {
                const isOpen = bodyRotas.classList.toggle('open');
                if (chevronRotas) chevronRotas.classList.toggle('expanded', isOpen);
            });
        }
    }

    function configurarRotasFarm() {
        const dadosRotas = {
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
                { nome: 'Zigzagoon', mult: '×2' },
                { nome: 'Poochyena', mult: '×2' }
            ],
            '20': [
                { nome: 'Zubat', mult: '×3', featured: true },
                { nome: 'Geodude', mult: '×2' },
                { nome: 'Machop', mult: '×2' },
                { nome: 'Diglett', mult: '×2' },
                { nome: 'Aipom', mult: '×2' },
                { nome: 'Mankey', mult: '×2' }
            ],
            '30': [
                { nome: 'Vulpix', mult: '×3', featured: true },
                { nome: 'Growlithe', mult: '×2' },
                { nome: 'Ponyta', mult: '×2' },
                { nome: 'Houndour', mult: '×2' },
                { nome: 'Numel', mult: '×2' },
                { nome: 'Magby', mult: '×2' }
            ],
            '40': [
                { nome: 'Psyduck', mult: '×3', featured: true },
                { nome: 'Poliwag', mult: '×2' },
                { nome: 'Tentacool', mult: '×2' },
                { nome: 'Slowpoke', mult: '×2' },
                { nome: 'Goldeen', mult: '×2' },
                { nome: 'Marill', mult: '×2' }
            ],
            '50': [
                { nome: 'Gastly', mult: '×3', featured: true },
                { nome: 'Haunter', mult: '×2' },
                { nome: 'Misdreavus', mult: '×2' },
                { nome: 'Shuppet', mult: '×2' },
                { nome: 'Duskull', mult: '×2' },
                { nome: 'Sableye', mult: '×2' }
            ],
            '60': [
                { nome: 'Pikachu', mult: '×3', featured: true },
                { nome: 'Voltorb', mult: '×2' },
                { nome: 'Magnemite', mult: '×2' },
                { nome: 'Electabuzz', mult: '×2' },
                { nome: 'Mareep', mult: '×2' },
                { nome: 'Plusle', mult: '×2' }
            ],
            '80': [
                { nome: 'Kadabra', mult: '×3', featured: true },
                { nome: 'Alakazam', mult: '×2' },
                { nome: 'Drowzee', mult: '×2' },
                { nome: 'Hypno', mult: '×2' },
                { nome: 'Ralts', mult: '×2' },
                { nome: 'Kirlia', mult: '×2' }
            ],
            '100': [
                { nome: 'Snorlax', mult: '×3', featured: true },
                { nome: 'Lapras', mult: '×2', featured: true },
                { nome: 'Tauros', mult: '×2' },
                { nome: 'Kangaskhan', mult: '×2' },
                { nome: 'Chansey', mult: '×2' },
                { nome: 'Scyther', mult: '×2' }
            ],
            '150': [
                { nome: 'Dratini', mult: '×3', featured: true },
                { nome: 'Dragonair', mult: '×2', featured: true },
                { nome: 'Bagon', mult: '×2' },
                { nome: 'Gible', mult: '×2' },
                { nome: 'Larvitar', mult: '×2' },
                { nome: 'Beldum', mult: '×2' }
            ],
            '510': [
                { nome: 'Tyranitar', mult: '×3', featured: true },
                { nome: 'Salamence', mult: '×2' },
                { nome: 'Metagross', mult: '×2' },
                { nome: 'Garchomp', mult: '×2' },
                { nome: 'Dragonite', mult: '×2' }
            ],
            '520': [
                { nome: 'Charizard', mult: '×3', featured: true },
                { nome: 'Blastoise', mult: '×2' },
                { nome: 'Venusaur', mult: '×2' },
                { nome: 'Feraligatr', mult: '×2' },
                { nome: 'Typhlosion', mult: '×2' }
            ],
            '530': [
                { nome: 'Steelix', mult: '×3', featured: true },
                { nome: 'Aggron', mult: '×2' },
                { nome: 'Rhyperior', mult: '×2' },
                { nome: 'Mamoswine', mult: '×2' },
                { nome: 'Gliscor', mult: '×2' }
            ],
            '540': [
                { nome: 'Lucario', mult: '×3', featured: true },
                { nome: 'Gallade', mult: '×2' },
                { nome: 'Gardevoir', mult: '×2' },
                { nome: 'Togekiss', mult: '×2' },
                { nome: 'Milotic', mult: '×2' }
            ],
            '550': [
                { nome: 'Gengar', mult: '×3', featured: true },
                { nome: 'Chandelure', mult: '×2' },
                { nome: 'Spiritomb', mult: '×2' },
                { nome: 'Rotom', mult: '×2' },
                { nome: 'Zoroark', mult: '×2' }
            ],
            '560': [
                { nome: 'Slaking', mult: '×3', featured: true },
                { nome: 'Ursaring', mult: '×2' },
                { nome: 'Walrein', mult: '×2' },
                { nome: 'Haxorus', mult: '×2' },
                { nome: 'Hydreigon', mult: '×2' }
            ],
            '580': [
                { nome: 'Volcarona', mult: '×3', featured: true },
                { nome: 'Zoroark', mult: '×2' },
                { nome: 'Electivire', mult: '×2' },
                { nome: 'Magmortar', mult: '×2' },
                { nome: 'Dusknoir', mult: '×2' }
            ],
            '600': [
                { nome: 'Dragonite', mult: '×4', featured: true },
                { nome: 'Tyranitar', mult: '×3', featured: true },
                { nome: 'Metagross', mult: '×3' },
                { nome: 'Garchomp', mult: '×3' },
                { nome: 'Hydreigon', mult: '×3' }
            ]
        };

        const grid = $('routeLevelsGrid');
        const listContainer = $('routeSpawnsList');
        const badge = $('badgeRotaSelecionada');
        if (!grid || !listContainer) return;

        function renderizarSpawns(lvl) {
            const spawns = dadosRotas[lvl] || [];
            listContainer.textContent = '';
            if (badge) badge.textContent = I.t('popup.nivel', { n: lvl });

            spawns.forEach((s) => {
                const item = document.createElement('div');
                item.className = `route-spawn-item ${s.featured ? 'featured' : ''}`;
                
                const nomeSpan = document.createElement('span');
                nomeSpan.textContent = s.nome;
                
                const multSpan = document.createElement('span');
                multSpan.className = 'route-spawn-badge';
                multSpan.textContent = s.mult;
                
                item.append(nomeSpan, multSpan);
                listContainer.appendChild(item);
            });
        }

        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('.route-lvl-btn');
            if (!btn) return;
            grid.querySelectorAll('.route-lvl-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const lvl = btn.getAttribute('data-lvl') || '1';
            renderizarSpawns(lvl);
        });

        // Renderiza nível 1 por padrão
        renderizarSpawns('1');
    }

    function atualizarFiltrosBadge() {
        const checks = [checkPrintShiny, checkPrintDrop, checkPrintIv, checkPrintTravado, checkCropInteligente];
        $('badgeFiltrosAtivos').textContent = I.t('popup.filtrosAtivos', { n: checks.filter((c) => c.checked).length });
    }

    function mostrarToast(mensagem, tipo = 'success') {
        toast.textContent = mensagem;
        toast.className = tipo === 'error' ? 'toast-error' : 'toast-success';
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3500);
    }

    let contaSelecionadaId = null;

    function atualizarStatusAba() {
        chrome.storage.local.get(['contasAtivas'], (storageRes) => {
            const contas = storageRes.contasAtivas || {};
            const chaves = Object.keys(contas);
            const wrapper = $('accountTabsWrapper');
            const tabsContainer = $('accountTabs');

            if (chaves.length > 0) {
                if (!contaSelecionadaId || !contas[contaSelecionadaId]) contaSelecionadaId = chaves[0];

                if (chaves.length > 1) {
                    wrapper.style.display = 'block';
                    tabsContainer.textContent = '';
                    chaves.forEach((id) => {
                        const botao = criar('button', `account-tab-btn ${id === String(contaSelecionadaId) ? 'active' : ''}`, `👤 ${contas[id].nomeTreinador}`);
                        botao.onclick = () => {
                            contaSelecionadaId = id;
                            atualizarStatusAba();
                            atualizarMetricas();
                        };
                        tabsContainer.appendChild(botao);
                    });
                } else {
                    wrapper.style.display = 'none';
                }

                const conta = contas[contaSelecionadaId] || contas[chaves[0]];
                // Aba em 2º plano tem os timers segurados pelo Chrome: 1 min dava alarme falso
                const semSinal = Date.now() - (conta.ultimaAtualizacao || 0) > 5 * 60 * 1000;
                const ok = !semSinal && !conta.problemaConexao;
                const problema = semSinal
                    ? I.t('popup.statusSemSinal')
                    : (conta.problemaConexao ? I.t('popup.statusCaiu') : I.t('popup.statusOnline'));

                statusBox.textContent = '';
                const inner = criar('div', 'status-card-inner');
                inner.append(criar('div', 'heartbeat-dot'),
                    criar('span', '', I.t('popup.conta', { nome: conta.nomeTreinador, tab: conta.tabId })));
                statusBox.append(inner, criar('span', 'status-card-hint', problema));
                statusBox.className = `status-card ${ok ? 'status-on' : 'status-off'}`;
                statusBox.style.cursor = 'pointer';
                statusBox.title = conta.problemaConexao || I.t('popup.focarAba', { nome: conta.nomeTreinador });
                statusBox.onclick = () => {
                    if (conta.tabId) chrome.tabs.update(parseInt(conta.tabId, 10), { active: true });
                    if (conta.windowId) chrome.windows.update(parseInt(conta.windowId, 10), { focused: true });
                };
                return;
            }

            wrapper.style.display = 'none';
            chrome.tabs.query({ url: 'https://poke.idleworld.online/*' }, (tabs) => {
                const abaJogo = (tabs || []).find((t) => t.url && t.url.includes('poke.idleworld.online'));
                statusBox.textContent = '';
                const inner = criar('div', 'status-card-inner');
                inner.append(criar('div', 'heartbeat-dot'),
                    criar('span', '', I.t(abaJogo ? 'popup.jogoAberto' : 'popup.abraOJogoNavegador')));
                statusBox.append(inner,
                    criar('span', 'status-card-hint', I.t(abaJogo ? 'popup.statusCarregando' : 'popup.statusOffline')));
                statusBox.className = `status-card ${abaJogo ? 'status-on' : 'status-off'}`;
                statusBox.style.cursor = abaJogo ? 'pointer' : 'default';
                statusBox.onclick = abaJogo ? () => {
                    chrome.tabs.update(abaJogo.id, { active: true });
                    if (abaJogo.windowId) chrome.windows.update(abaJogo.windowId, { focused: true });
                } : null;
            });
        });
    }

    function atualizarMetricas() {
        chrome.storage.local.get(['contasAtivas', 'pokeBallStats', 'ultimoEnvioWhatsApp'], (result) => {
            const contas = result.contasAtivas || {};
            const contaAtual = contaSelecionadaId && contas[contaSelecionadaId] ? contas[contaSelecionadaId] : (Object.values(contas)[0] || null);

            renderizarHunt(contaAtual);

            let stats = result.pokeBallStats;
            if (contaAtual && contaAtual.estoqueBolas && Object.keys(contaAtual.estoqueBolas).length > 0) {
                stats = {
                    ...(stats || {}),
                    total: Object.values(contaAtual.estoqueBolas).reduce((a, b) => a + Number(b || 0), 0),
                    detalhes: contaAtual.estoqueBolas,
                    fonte: contaAtual.fontePokebolas
                };
            }

            renderizarBolas(stats);
            renderizarWhatsApp(result.ultimoEnvioWhatsApp);
        });
    }

    function renderizarHunt(conta) {
        const dashboard = $('huntDashboard');
        if (!dashboard) return;

        if (!conta) {
            dashboard.style.display = 'none';
            return;
        }

        const hunt = conta.huntStats;
        const temHunt = Boolean(hunt || conta.totalSessao > 0 || conta.shiniesSessao > 0);

        if (!temHunt) {
            dashboard.style.display = 'none';
            return;
        }

        dashboard.style.display = 'flex';

        // Capturas: sincronizado entre hunt.capturados e conta.totalSessao
        const caps = (hunt && hunt.capturados > 0) ? hunt.capturados : (conta.totalSessao || 0);
        $('huntCapturados').textContent = I.numero(caps);

        // Shinies: conta.shiniesSessao
        const shinies = conta.shiniesSessao || 0;
        $('huntShinies').textContent = I.numero(shinies);

        // Derrotados:
        const derrotados = (hunt && hunt.derrotados) ? hunt.derrotados : 0;
        $('huntDerrotados').textContent = derrotados > 0 ? I.numero(derrotados) : '--';

        // Tempo na hunt:
        const tempo = (hunt && hunt.tempoTexto) ? hunt.tempoTexto : '--';
        $('huntTempo').textContent = tempo;

        // Saldo:
        if (hunt && (hunt.saldoTexto || hunt.saldo !== undefined)) {
            const sVal = hunt.saldo || 0;
            const sTxt = hunt.saldoTexto || C.formatarDinheiro(sVal, true);
            $('huntSaldo').textContent = sTxt;
            $('huntSaldo').className = `hunt-stat-val ${sVal >= 0 ? 'val-green' : 'val-rose'}`;
        } else {
            $('huntSaldo').textContent = '--';
            $('huntSaldo').className = 'hunt-stat-val val-green';
        }

        // Rates da Hunt:
        if (hunt && (hunt.ritmoSaldo || hunt.ritmoXp)) {
            $('huntRateRow').style.display = 'flex';
            $('huntRitmoSaldo').textContent = hunt.ritmoSaldo || '📈 --/h';
            $('huntRitmoXp').textContent = hunt.ritmoXp || (hunt.xpGanha ? `⚡ ${hunt.xpGanha}` : '');
        } else {
            $('huntRateRow').style.display = 'none';
        }
    }

    // O content.js grava a fonte como código; versões antigas gravavam o rótulo em português
    function rotuloDaFonte(fonte) {
        const mapa = {
            AUTO_HELPER: 'popup.fonteAutoHelper',
            'Auto-Helper': 'popup.fonteAutoHelper',
            CAPTURA: 'popup.fonteCaptura',
            'Barra de Captura': 'popup.fonteCaptura'
        };
        return mapa[fonte] ? I.t(mapa[fonte]) : (fonte || I.t('popup.fonteDireta'));
    }

    function renderizarBolas(stats) {
        if (!stats) {
            bolasTotal.textContent = '--';
            bolasGasto.textContent = '--';
            bolasRitmo.textContent = '--/h';
            bolasDuracao.textContent = I.t('popup.aguardandoLeitura');
            bolasDetalhes.textContent = I.t('popup.abraAutoHelper');
            return;
        }

        bolasTotal.textContent = stats.total !== undefined && stats.total !== null
            ? I.numero(stats.total)
            : '--';
        bolasGasto.textContent = I.numero(stats.gastasUltimaHora || 0);
        bolasRitmo.textContent = `${stats.gastoPorHora || 0}/h`;

        const previsaoTermino = stats.horasRestantes > 0
            ? I.t('popup.acabaAs', { hora: calcularHoraTermino(stats.horasRestantes) })
            : '';
        bolasDuracao.textContent = stats.horasRestantes === null || stats.horasRestantes === undefined
            ? I.t('popup.semPrevisao')
            : I.t('popup.dura', { tempo: formatarDuracao(stats.horasRestantes) }) + previsaoTermino;

        const textoDetalhes = Object.entries(stats.detalhes || {})
            .map(([tipo, quantidade]) => `${tipo}: ${I.numero(quantidade)}`)
            .join(' | ');
        bolasDetalhes.textContent = [
            textoDetalhes || I.t('popup.estoqueDetectado'),
            I.t('popup.fonte', { fonte: rotuloDaFonte(stats.fonte) })
        ].join(' | ');
    }

    function renderizarWhatsApp(status) {
        const pip = $('whatsappPip');
        if (!status) {
            whatsappStatus.textContent = I.t('popup.whatsappNaoTestado');
            whatsappStatus.className = 'mini-status';
            pip.style.background = 'var(--text-dim)';
            return;
        }

        const quando = status.horario ? formatarHora(status.horario) : '--';
        if (status.ok) {
            whatsappStatus.textContent = status.destino
                ? I.t('popup.ultimoEnvioOkPara', { hora: quando, destino: status.destino })
                : I.t('popup.ultimoEnvioOk', { hora: quando });
            whatsappStatus.className = 'mini-status status-on-text';
            pip.style.background = 'var(--emerald)';
            pip.style.boxShadow = '0 0 6px var(--emerald)';
            return;
        }

        whatsappStatus.textContent = I.t('popup.falhaEnvio', { hora: quando, erro: status.erro || I.t('popup.erroEnvio') });
        whatsappStatus.className = 'mini-status status-off-text';
        pip.style.background = 'var(--rose)';
        pip.style.boxShadow = '0 0 6px var(--rose)';
    }

    function testarNotificacao() {
        if (!validarTelefone()) {
            mostrarToast(I.t('popup.informeWhatsApp'), 'error');
            return;
        }

        if (!validarApiKey()) {
            mostrarToast(I.t('popup.coleApiKey'), 'error');
            return;
        }

        salvarTudo(false, () => {
            btnTestar.disabled = true;
            btnTestar.textContent = I.t('popup.btnTestando');

            const ativas = C.sanitizarRegras(regras).filter((r) => r.ativa);
            const mensagem = [
                I.t('popup.testeTopo'),
                '',
                I.t('popup.testeRegrasAtivas', { n: ativas.length }),
                ...ativas.map((r) => `• ${C.nomeExibido(r)}: ${C.descreverRegra(r)}`)
            ].join('\n');

            chrome.runtime.sendMessage({ tipo: 'TESTE', mensagem }, (response) => {
                btnTestar.disabled = false;
                btnTestar.textContent = I.t('popup.btnTestar');

                if (chrome.runtime.lastError) {
                    mostrarToast(I.t('popup.falhaGenerica', { erro: chrome.runtime.lastError.message }), 'error');
                    return;
                }
                if (!response || !response.ok) {
                    mostrarToast(response?.error || I.t('popup.falhaTeste'), 'error');
                    atualizarMetricas();
                    return;
                }
                mostrarToast(I.t('popup.testeEnviado'));
                atualizarMetricas();
            });
        });
    }

    function resetarMetricas() {
        chrome.storage.local.remove(['pokeBallSamples', 'pokeBallStats'], () => {
            mostrarToast(I.t('popup.metricasResetadas'));
            atualizarMetricas();
        });
    }

    function formatarDuracao(horas) {
        const minutosTotais = Math.round(horas * 60);
        const h = Math.floor(minutosTotais / 60);
        const m = minutosTotais % 60;
        if (h <= 0) return I.t('popup.duracaoMin', { n: Math.max(m, 1) });
        if (m === 0) return I.t('popup.duracaoH', { h });
        return I.t('popup.duracaoHM', { h, m });
    }

    function formatarHora(timestamp) {
        return new Date(timestamp).toLocaleTimeString(I.locale(), { hour: '2-digit', minute: '2-digit' });
    }

    function calcularHoraTermino(horasRestantes) {
        if (!horasRestantes || horasRestantes <= 0) return '';
        return formatarHora(Date.now() + (horasRestantes * 3600 * 1000));
    }
});

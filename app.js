let wsBot = null;
let tokenDeriv = "";
const logsDiv = document.getElementById('bot-logs');

function log(mensagem) {
    logsDiv.innerHTML += `> ${mensagem}<br>`;
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

function conectarDeriv() {
    const tokenInput = document.getElementById('deriv-token').value.trim();
    if (!tokenInput) return alert("Insira um token válido!");

    tokenDeriv = tokenInput;
    log("🔄 Conectando e validando token na Deriv...");

    const tempWs = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=34aspGUGPyiOkGCgGtkUw`);
    tempWs.onopen = () => {
        tempWs.send(JSON.stringify({ authorize: tokenDeriv }));
    };
    tempWs.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.msg_type === 'authorize') {
            log(`✅ Conectado com sucesso! Conta: ${data.authorize.email} (${data.authorize.currency})`);
            document.getElementById('btn-start-bot').disabled = false;
            tempWs.close();
        } else if (data.error) {
            log(`❌ Erro de autenticação: ${data.error.message}`);
            tempWs.close();
        }
    };
}

document.getElementById('btn-start-bot').addEventListener('click', () => {
    const tipoRobo = document.getElementById('select-robo').value;
    const configGeral = {
        stakeInicial: parseFloat(document.getElementById('stake-inicial').value),
        stopWin: parseFloat(document.getElementById('stop-win').value),
        stopLoss: parseFloat(document.getElementById('stop-loss').value)
    };

    document.getElementById('btn-start-bot').disabled = true;
    document.getElementById('btn-stop-bot').disabled = false;
    document.getElementById('select-robo').disabled = true;

    log(`🚀 Iniciando motor para: ${tipoRobo}`);
    iniciarMotor(tipoRobo, configGeral);
});

document.getElementById('btn-stop-bot').addEventListener('click', () => {
    if (wsBot) {
        wsBot.close();
    }
    pararRoboUI();
});

function pararRoboUI() {
    document.getElementById('btn-start-bot').disabled = false;
    document.getElementById('btn-stop-bot').disabled = true;
    document.getElementById('select-robo').disabled = false;
    log("⏹️ Robô parado pelo usuário.");
}

// ==================== MOTOR CENTRALIZADO ====================
function iniciarMotor(tipoRobo, config) {
    wsBot = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=34aspGUGPyiOkGCgGtkUw`);

    let lucroTotal = 0;
    let stakeAtual = config.stakeInicial;

    // Estado exclusivo do Robô 4x4 (convertido do seu XML)
    let estado4x4 = {
        contadorLossVirtual: 0,
        emModoReal: false,
        passoAlternancia: 0,
        maxMg: 10,
        fatorMg: 1.8,
        contadorMg: 0,
        metaLossVirtual: 4
    };

    wsBot.onopen = () => {
        wsBot.send(JSON.stringify({ authorize: tokenDeriv }));
        wsBot.send(JSON.stringify({ ticks: "1HZ100V" })); // Volatility 100 Index
    };

    wsBot.onmessage = (msg) => {
        const data = JSON.parse(msg.data);

        // 1. Monitoramento de Ticks do Mercado
        if (data.msg_type === 'tick') {
            const preco = data.tick.quote;

            if (tipoRobo === 'robo_4x4') {
                executarLogicaRobo4x4(preco, stakeAtual, estado4x4);
            }
            // Aqui você poderá adicionar futuros robôs:
            // else if (tipoRobo === 'outro_robo') { ... }
        }

        // 2. Confirmação de Ordem Enviada
        if (data.msg_type === 'buy') {
            const contractId = data.buy.contract_id;
            wsBot.send(JSON.stringify({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 }));
        }

        // 3. Acompanhamento do Contrato Aberto / Resultado
        if (data.msg_type === 'proposal_open_contract') {
            const contrato = data.proposal_open_contract;
            if (contrato && contrato.is_sold) {
                lucroTotal += contrato.profit;
                log(`📊 Resultado: ${contrato.status.toUpperCase()} | Lucro da Rodada: $${contrato.profit.toFixed(2)} | Acumulado: $${lucroTotal.toFixed(2)}`);

                // Verificação de Stop Win / Stop Loss Global
                if (lucroTotal >= config.stopWin) {
                    log(`🏆 Meta de Stop Win atingida! Parando robô.`);
                    wsBot.close();
                    pararRoboUI();
                    return;
                }
                if (lucroTotal <= -config.stopLoss) {
                    log(`🛑 Limite de Stop Loss atingido! Parando robô.`);
                    wsBot.close();
                    pararRoboUI();
                    return;
                }

                // Processamento de pós-venda específico do Robô 4x4
                if (tipoRobo === 'robo_4x4') {
                    processarResultado4x4(contrato, estado4x4, config);
                    stakeAtual = estado4x4.stakeAtual;
                }
            }
        }
    };
}

// ==================== LÓGICA DO ROBÔ 4X4 (XML) ====================
function executarLogicaRobo4x4(preco, stake, estado) {
    const ultimoDigito = parseInt(preco.toString().slice(-1));
    const ehPar = ultimoDigito % 2 === 0;

    if (!estado.emModoReal) {
        let condicaoVirtual = (estado.passoAlternancia < 4 && ehPar) || (estado.passoAlternancia >= 4 && !ehPar);
        
        if (condicaoVirtual) {
            estado.contadorLossVirtual++;
            log(`⚠️ Loss virtual detectado (Dígito: ${ultimoDigito}). Contador: ${estado.contadorLossVirtual}/${estado.metaLossVirtual}`);
            
            if (estado.contadorLossVirtual >= estado.metaLossVirtual) {
                estado.emModoReal = true;
                log(`🎯 Meta de loss virtual atingida. Entrando em modo real!`);
                enviarOrdem(estado.passoAlternancia < 4 ? "DIGITODD" : "DIGITEVEN", stake);
            }
        }
        estado.passoAlternancia = (estado.passoAlternancia + 1) % 8;
    }
}

function processarResultado4x4(contrato, estado, config) {
    if (contrato.status === 'won') {
        estado.stakeAtual = config.stakeInicial;
        estado.contadorMg = 0;
        estado.contadorLossVirtual = 0;
        estado.emModoReal = false;
        log(`✅ Win! Retornando ao stake inicial: $${config.stakeInicial}`);
    } else {
        if (estado.contadorMg < estado.maxMg) {
            estado.stakeAtual = Number((estado.stakeAtual * estado.fatorMg).toFixed(2));
            estado.contadorMg++;
            estado.emModoReal = true;
            log(`🔄 Martingale (${estado.contadorMg}/${estado.maxMg}). Novo Stake: $${estado.stakeAtual}`);
            enviarOrdem(estado.passoAlternancia < 4 ? "DIGITODD" : "DIGITEVEN", estado.stakeAtual);
        } else {
            log(`❌ Limite máximo de Martingale atingido. Robô parado por segurança.`);
            wsBot.close();
            pararRoboUI();
        }
    }
}

function enviarOrdem(tipoContrato, stake) {
    log(`🛒 Enviando ordem (${tipoContrato}) com stake $${stake}...`);
    wsBot.send(JSON.stringify({
        buy: 1,
        price: stake,
        parameters: {
            amount: stake,
            basis: "stake",
            contract_type: tipoContrato,
            currency: "USD",
            duration: 1,
            duration_unit: "t",
            symbol: "1HZ100V"
        }
    }));
}

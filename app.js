let wsBot = null;
let tokenDeriv = "";
const logsDiv = document.getElementById('bot-logs');

function log(mensagem) {
    logsDiv.innerHTML += `> ${mensagem}<br>`;
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

// 1. Redireciona para a página oficial de login da Deriv OAuth
function conectarOAuthDeriv() {
    const appId = "34aspGUGPyiOkGCgGtkUw"; // Substitua pelo seu App ID da Deriv se necessário
    const redirectUrl = encodeURIComponent(window.location.origin + window.location.pathname);
    window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&l=pt&brand=deriv`;
}

// 2. Captura o token da URL quando a Deriv redireciona de volta para o seu site
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    
    // Tenta capturar o token da primeira conta retornada pelo OAuth da Deriv
    for (let [key, value] of params.entries()) {
        if (key.startsWith('token1')) {
            tokenDeriv = value;
            break;
        }
    }

    if (!tokenDeriv) {
        // Tenta buscar do localStorage se já estava conectado antes
        tokenDeriv = localStorage.getItem('deriv_token');
    }

    if (tokenDeriv) {
        localStorage.setItem('deriv_token', tokenDeriv);
        validarTokenSalvo(tokenDeriv);
    }
};

function validarTokenSalvo(token) {
    log("🔄 Validando sessão na Deriv...");
    const tempWs = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=34aspGUGPyiOkGCgGtkUw`);
    
    tempWs.onopen = () => {
        tempWs.send(JSON.stringify({ authorize: token }));
    };
    
    tempWs.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.msg_type === 'authorize') {
            log(`✅ Conectado com sucesso!`);
            document.getElementById('user-account').innerText = `${data.authorize.email} (${data.authorize.currency})`;
            document.getElementById('user-info').style.display = 'block';
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('btn-start-bot').disabled = false;
            tempWs.close();
        } else if (data.error) {
            log(`❌ Sessão expirada ou inválida. Conecte novamente.`);
            localStorage.removeItem('deriv_token');
            tempWs.close();
        }
    };
}

// Controles de Início e Parada do Robô
document.getElementById('btn-start-bot').addEventListener('click', () => {
    const tipoRobo = document.getElementById('select-robo').value;
    
    // Captura dinâmica dos inputs que você pediu
    const config = {
        stakeInicial: parseFloat(document.getElementById('stake-inicial').value),
        metaLossVirtual: parseInt(document.getElementById('meta-loss-virtual').value),
        maxMartingale: parseInt(document.getElementById('max-martingale').value),
        fatorMultiplicador: parseFloat(document.getElementById('fator-multiplicador').value),
        stopWin: parseFloat(document.getElementById('stop-win').value),
        stopLoss: parseFloat(document.getElementById('stop-loss').value)
    };

    document.getElementById('btn-start-bot').disabled = true;
    document.getElementById('btn-stop-bot').disabled = false;
    document.getElementById('select-robo').disabled = true;

    log(`🚀 Iniciando ${tipoRobo}...`);
    iniciarMotor(tipoRobo, config);
});

document.getElementById('btn-stop-bot').addEventListener('click', () => {
    if (wsBot) wsBot.close();
    pararRoboUI();
});

function pararRoboUI() {
    document.getElementById('btn-start-bot').disabled = false;
    document.getElementById('btn-stop-bot').disabled = true;
    document.getElementById('select-robo').disabled = false;
    log("⏹️ Robô parado pelo usuário.");
}

// ==================== MOTOR DO ROBÔ (4X4) ====================
function iniciarMotor(tipoRobo, config) {
    wsBot = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=34aspGUGPyiOkGCgGtkUw`);

    let lucroTotal = 0;
    let stakeAtual = config.stakeInicial;

    let estado4x4 = {
        contadorLossVirtual: 0,
        emModoReal: false,
        passoAlternancia: 0,
        contadorMg: 0
    };

    wsBot.onopen = () => {
        wsBot.send(JSON.stringify({ authorize: tokenDeriv }));
        wsBot.send(JSON.stringify({ ticks: "1HZ100V" })); // Volatility 100 Index
    };

    wsBot.onmessage = (msg) => {
        const data = JSON.parse(msg.data);

        if (data.msg_type === 'tick') {
            const preco = data.tick.quote;
            if (tipoRobo === 'robo_4x4') {
                executarLogicaRobo4x4(preco, stakeAtual, estado4x4, config);
            }
        }

        if (data.msg_type === 'buy') {
            wsBot.send(JSON.stringify({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 }));
        }

        if (data.msg_type === 'proposal_open_contract') {
            const contrato = data.proposal_open_contract;
            if (contrato && contrato.is_sold) {
                lucroTotal += contrato.profit;
                log(`📊 Resultado: ${contrato.status.toUpperCase()} | Lucro Rodada: $${contrato.profit.toFixed(2)} | Acumulado: $${lucroTotal.toFixed(2)}`);

                if (lucroTotal >= config.stopWin) {
                    log(`🏆 Stop Win atingido! Parando robô.`);
                    wsBot.close();
                    pararRoboUI();
                    return;
                }
                if (lucroTotal <= -config.stopLoss) {
                    log(`🛑 Stop Loss atingido! Parando robô.`);
                    wsBot.close();
                    pararRoboUI();
                    return;
                }

                if (tipoRobo === 'robo_4x4') {
                    stakeAtual = processarResultado4x4(contrato, estado4x4, config);
                }
            }
        }
    };
}

function executarLogicaRobo4x4(preco, stake, estado, config) {
    const ultimoDigito = parseInt(preco.toString().slice(-1));
    const ehPar = ultimoDigito % 2 === 0;

    if (!estado.emModoReal) {
        let condicaoVirtual = (estado.passoAlternancia < 4 && ehPar) || (estado.passoAlternancia >= 4 && !ehPar);
        
        if (condicaoVirtual) {
            estado.contadorLossVirtual++;
            log(`⚠️ Loss virtual detectado (Dígito: ${ultimoDigito}). Contador: ${estado.contadorLossVirtual}/${config.metaLossVirtual}`);
            
            if (estado.contadorLossVirtual >= config.metaLossVirtual) {
                estado.emModoReal = true;
                log(`🎯 Meta virtual atingida. Entrando em modo real!`);
                enviarOrdem(estado.passoAlternancia < 4 ? "DIGITODD" : "DIGITEVEN", stake);
            }
        }
        estado.passoAlternancia = (estado.passoAlternancia + 1) % 8;
    }
}

function processarResultado4x4(contrato, estado, config) {
    if (contrato.status === 'won') {
        estado.contadorMg = 0;
        estado.contadorLossVirtual = 0;
        estado.emModoReal = false;
        log(`✅ Win! Retornando ao stake inicial: $${config.stakeInicial}`);
        return config.stakeInicial;
    } else {
        if (estado.contadorMg < config.maxMartingale) {
            let novoStake = Number((estado.stakeAtual * config.fatorMultiplicador).toFixed(2));
            estado.contadorMg++;
            estado.emModoReal = true;
            log(`🔄 Martingale (${estado.contadorMg}/${config.maxMartingale}). Novo Stake: $${novoStake}`);
            enviarOrdem(estado.passoAlternancia < 4 ? "DIGITODD" : "DIGITEVEN", novoStake);
            return novoStake;
        } else {
            log(`❌ Limite máximo de Martingale atingido. Robô parado por segurança.`);
            wsBot.close();
            pararRoboUI();
            return config.stakeInicial;
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

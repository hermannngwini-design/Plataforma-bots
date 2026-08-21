let wsBot = null;
let tokenDeriv = "";
let isRunning = false;

// 1. Função de Conexão com a Deriv
window.conectarComToken = function() {
    const inputToken = document.getElementById('input-token');
    const botLogs = document.getElementById('bot-logs');
    const userInfo = document.getElementById('user-info');
    const userAccount = document.getElementById('user-account');

    tokenDeriv = inputToken.value.trim();
    
    if (!tokenDeriv) {
        alert("O campo de token está vazio! Cole seu token da Deriv.");
        return;
    }

    botLogs.innerHTML = "🔄 Conectando...<br>";
    
    wsBot = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
    
    wsBot.onopen = () => {
        wsBot.send(JSON.stringify({ authorize: tokenDeriv }));
    };

    wsBot.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        
        if (data.msg_type === 'authorize') {
            botLogs.innerHTML += "✅ Conectado com sucesso!<br>";
            userAccount.innerText = data.authorize.email || "Conta Ativa";
            userInfo.style.display = "block";
            
            // Forma limpa e original que destrava o botão nativamente
            const btnIniciar = document.getElementById('btn-start-bot');
            if (btnIniciar) {
                btnIniciar.disabled = false;
            }
        } else if (data.error) {
            botLogs.innerHTML += "❌ Erro de Token: " + data.error.message + "<br>";
        }
    };
};

// 2. Função de Desconectar
window.desconectar = function() {
    if (wsBot) wsBot.close();
    tokenDeriv = "";
    document.getElementById('input-token').value = "";
    document.getElementById('user-info').style.display = "none";
    
    const btnIniciar = document.getElementById('btn-start-bot');
    const btnParar = document.getElementById('btn-stop-bot');
    if (btnIniciar) btnIniciar.disabled = true;
    if (btnParar) btnParar.disabled = true;
    
    document.getElementById('bot-logs').innerHTML += "🔌 Desconectado.<br>";
};

// 3. Motor de Operações do Robô (Estratégia 4x4)
window.iniciarRobo = function() {
    const botLogs = document.getElementById('bot-logs');
    const btnIniciar = document.getElementById('btn-start-bot');
    const btnParar = document.getElementById('btn-stop-bot');

    if (!tokenDeriv) {
        alert("Conecte a conta primeiro!");
        return;
    }

    isRunning = true;
    btnIniciar.disabled = true;
    btnParar.disabled = false;

    const stakeInicial = parseFloat(document.getElementById('stake-inicial').value) || 0.35;
    const metaLossVirtual = parseInt(document.getElementById('meta-loss-virtual').value) || 4;
    const maxMartingale = parseInt(document.getElementById('max-martingale').value) || 10;
    const fatorMultiplicador = parseFloat(document.getElementById('fator-multiplicador').value) || 1.8;
    const stopWin = parseFloat(document.getElementById('stop-win').value) || 50;
    const stopLoss = parseFloat(document.getElementById('stop-loss').value) || 50;

    let stakeAtual = stakeInicial;
    let contadorLossVirtual = 0;
    let contadorMartingale = 0;
    let emModoReal = false;
    let passoAlternancia = 0;
    let lucroTotal = 0;

    botLogs.innerHTML += "🚀 Iniciando operações...<br>";
    
    wsBot.send(JSON.stringify({ ticks: "1HZ100V", subscribe: 1 }));

    wsBot.onmessage = (evt) => {
        if (!isRunning) return;
        const data = JSON.parse(evt.data);

        if (data.msg_type === 'tick') {
            const preco = data.tick.quote;
            const ultimoDigito = parseInt(preco.toString().slice(-1));
            const ehPar = ultimoDigito % 2 === 0;

            if (emModoReal) {
                const tipoContrato = passoAlternancia < 4 ? "DIGITODD" : "DIGITEVEN";
                botLogs.innerHTML += `🎯 [Real] Passo ${passoAlternancia} | Comprando ${tipoContrato} | Stake: $${stakeAtual}<br>`;
                enviarCompra(tipoContrato, stakeAtual);
            } else {
                let condicaoVirtual = (passoAlternancia < 4 && ehPar) || (passoAlternancia >= 4 && !ehPar);
                
                if (condicaoVirtual) {
                    contadorLossVirtual++;
                    botLogs.innerHTML += `⚠️ Loss virtual (${contadorLossVirtual}/${metaLossVirtual}) | Dígito: ${ultimoDigito}<br>`;
                    
                    if (contadorLossVirtual >= metaLossVirtual) {
                        emModoReal = true;
                        botLogs.innerHTML += "🚀 Meta de Loss Virtual atingida! Mudando para Modo Real.<br>";
                        const tipoContrato = passoAlternancia < 4 ? "DIGITODD" : "DIGITEVEN";
                        enviarCompra(tipoContrato, stakeAtual);
                    }
                }
            }
        }

        if (data.msg_type === 'buy') {
            const contractId = data.buy.contract_id;
            wsBot.send(JSON.stringify({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 }));
        }

        if (data.msg_type === 'proposal_open_contract') {
            const contrato = data.proposal_open_contract;
            if (contrato && contrato.is_sold) {
                const lucroRodada = contrato.profit;
                lucroTotal += lucroRodada;
                botLogs.innerHTML += `📊 Resultado: ${contrato.status.toUpperCase()} | Lucro: $${lucroRodada.toFixed(2)} | Acumulado: $${lucroTotal.toFixed(2)}<br>`;

                if (lucroTotal >= stopWin) {
                    botLogs.innerHTML += "🏆 Stop Win atingido! Parando robô.<br>";
                    window.pararRobo();
                    return;
                }
                if (lucroTotal <= -stopLoss) {
                    botLogs.innerHTML += "🛑 Stop Loss atingido! Parando robô.<br>";
                    window.pararRobo();
                    return;
                }

                if (contrato.status === 'won') {
                    stakeAtual = stakeInicial;
                    contadorMartingale = 0;
                    contadorLossVirtual = 0;
                    emModoReal = false;
                    botLogs.innerHTML += "✅ Win! Resetando martingale e voltando ao modo virtual.<br>";
                } else {
                    if (contadorMartingale < maxMartingale) {
                        contadorMartingale++;
                        stakeAtual = Number((stakeAtual * fatorMultiplicador).toFixed(2));
                        botLogs.innerHTML += `🔄 Martingale (${contadorMartingale}/${maxMartingale}) | Novo Stake: $${stakeAtual}<br>`;
                        emModoReal = true;
                    } else {
                        botLogs.innerHTML += "❌ Limite máximo de Martingale atingido. Parando robô.<br>";
                        window.pararRobo();
                        return;
                    }
                }

                passoAlternancia = (passoAlternancia + 1) % 8;
            }
        }
    };
};

function enviarCompra(tipoContrato, stake) {
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

window.pararRobo = function() {
    isRunning = false;
    const btnIniciar = document.getElementById('btn-start-bot');
    const btnParar = document.getElementById('btn-stop-bot');
    if (btnIniciar) btnIniciar.disabled = false;
    if (btnParar) btnParar.disabled = true;
    document.getElementById('bot-logs').innerHTML += "⏹️ Robô parado.<br>";
};

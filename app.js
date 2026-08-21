// Elementos da Interface
const inputToken = document.getElementById('input-token');
const btnConectar = document.querySelector('.btn-deriv');
const btnIniciar = document.getElementById('btn-start-bot');
const btnParar = document.getElementById('btn-stop-bot');
const botLogs = document.getElementById('bot-logs');
const userInfo = document.getElementById('user-info');
const userAccount = document.getElementById('user-account');

let wsBot = null;
let tokenDeriv = "";
let isRunning = false;

// Evento de clique para o botão "Conectar Conta"
if (btnConectar) {
    btnConectar.addEventListener('click', (e) => {
        e.preventDefault();
        tokenDeriv = inputToken.value.trim();
        
        if (!tokenDeriv) {
            alert("O campo de token está vazio! Cole seu token da Deriv.");
            return;
        }

        botLogs.innerHTML = "🔄 Conectando ao servidor da Deriv...<br>";
        
        wsBot = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
        
        wsBot.onopen = () => {
            botLogs.innerHTML += "🔌 Canal aberto. Autorizando token...<br>";
            wsBot.send(JSON.stringify({ authorize: tokenDeriv }));
        };

        wsBot.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            
            if (data.msg_type === 'authorize') {
                botLogs.innerHTML += "✅ Conta conectada com sucesso!<br>";
                userAccount.innerText = data.authorize.email || "Conta Ativa";
                userInfo.style.display = "block";
                
                // FORÇA A HABILITAÇÃO DO BOTÃOaqui explicitamente
                if (btnIniciar) {
                    btnIniciar.disabled = false;
                    btnIniciar.style.opacity = "1";
                    btnIniciar.style.cursor = "pointer";
                }
            } else if (data.error) {
                botLogs.innerHTML += "❌ Erro de Token: " + data.error.message + "<br>";
            }
        };

        wsBot.onerror = (err) => {
            botLogs.innerHTML += "❌ Erro na conexão WebSocket.<br>";
        };
    });
}

// Botão Desconectar
window.desconectar = function() {
    if (wsBot) wsBot.close();
    tokenDeriv = "";
    inputToken.value = "";
    userInfo.style.display = "none";
    if (btnIniciar) btnIniciar.disabled = true;
    if (btnParar) btnParar.disabled = true;
    botLogs.innerHTML += "🔌 Desconectado.<br>";
};

// Motor do Robô (Estratégia 4x4)
if (btnIniciar) {
    btnIniciar.addEventListener('click', () => {
        if (!tokenDeriv) {
            alert("Conecte a conta primeiro!");
            return;
        }

        if (!wsBot || wsBot.readyState !== WebSocket.OPEN) {
            alert("A conexão com a Deriv caiu. Reconecte o token.");
            return;
        }

        isRunning = true;
        btnIniciar.disabled = true;
        if (btnParar) btnParar.disabled = false;

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

        botLogs.innerHTML += "🚀 Robô iniciado! Assinando ticks do 1HZ100V...<br>";
        
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
                    } else {
                        botLogs.innerHTML += `🔍 Analisando tick: ${ultimoDigito} (${ehPar ? 'Par' : 'Ímpar'}) | Passo: ${passoAlternancia}<br>`;
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
                        pararRoboUI();
                        return;
                    }
                    if (lucroTotal <= -stopLoss) {
                        botLogs.innerHTML += "🛑 Stop Loss atingido! Parando robô.<br>";
                        pararRoboUI();
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
                            pararRoboUI();
                            return;
                        }
                    }

                    passoAlternancia = (passoAlternancia + 1) % 8;
                }
            }
        };
    });
}

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

function pararRoboUI() {
    isRunning = false;
    if (btnIniciar) btnIniciar.disabled = false;
    if (btnParar) btnParar.disabled = true;
    botLogs.innerHTML += "⏹️ Robô parado.<br>";
}

if (btnParar) {
    btnParar.addEventListener('click', () => {
        pararRoboUI();
    });
}

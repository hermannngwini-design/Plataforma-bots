// Elementos da Interface
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const userLoggedSpan = document.getElementById('user-logged');

const inputToken = document.getElementById('input-token');
const btnConnectToken = document.getElementById('btn-connect-token');
const derivStatus = document.getElementById('deriv-status');
const botLogs = document.getElementById('bot-logs');
const btnStartBot = document.getElementById('btn-start-bot');
const btnStopBot = document.getElementById('btn-stop-bot');
const selectRobo = document.getElementById('select-robo');

let wsBot = null;
let tokenDeriv = "";

// --- CONTROLE DE USUÁRIOS LOCAL (LOGIN / CADASTRO) ---
if (btnRegister) {
    btnRegister.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if(!email || !password) return alert("Preencha todos os campos!");
        if(password.length < 6) return alert("A senha deve ter pelo menos 6 caracteres.");

        localStorage.setItem("user_email", email);
        localStorage.setItem("user_pass", password);
        localStorage.setItem("user_session", email);
        
        alert("Conta criada com sucesso!");
        verificarSessao();
    });
}

if (btnLogin) {
    btnLogin.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const savedEmail = localStorage.getItem("user_email");
        const savedPass = localStorage.getItem("user_pass");

        if (email === savedEmail && password === savedPass && email !== null) {
            localStorage.setItem("user_session", email);
            verificarSessao();
        } else {
            alert("Usuário não encontrado ou senha incorreta!");
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem("user_session");
        verificarSessao();
    });
}

function verificarSessao() {
    const session = localStorage.getItem("user_session");
    if (session) {
        if(authContainer) authContainer.classList.add('hidden');
        if(dashboardContainer) dashboardContainer.classList.remove('hidden');
        if(userLoggedSpan) userLoggedSpan.innerText = session;
    } else {
        if(authContainer) authContainer.classList.remove('hidden');
        if(dashboardContainer) dashboardContainer.classList.add('hidden');
    }
}

// --- CONEXÃO COM A DERIV VIA TOKEN ---
function conectarComToken(token) {
    if (!token) return alert("Insira o token!");
    tokenDeriv = token;
    localStorage.setItem('deriv_token', token);

    botLogs.innerHTML += "🔄 Validando token na Deriv...<br>";
    const tempWs = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=1089`);
    
    tempWs.onopen = () => {
        tempWs.send(JSON.stringify({ authorize: token }));
    };
    
    tempWs.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.msg_type === 'authorize') {
            if (derivStatus) {
                derivStatus.innerText = `Status: Conectado (${data.authorize.email})`;
                derivStatus.className = "status-online";
            }
            botLogs.innerHTML += `✅ Conectado com sucesso à Deriv!<br>`;
            if (btnStartBot) btnStartBot.disabled = false;
            tempWs.close();
        } else if (data.error) {
            botLogs.innerHTML += `❌ Erro de autenticação: ${data.error.message}<br>`;
            localStorage.removeItem('deriv_token');
            tempWs.close();
        }
    };
}

if (btnConnectToken) {
    btnConnectToken.addEventListener('click', () => {
        const tokenInput = inputToken ? inputToken.value.trim() : "";
        conectarComToken(tokenInput);
    });
}

// --- CONTROLE DE EXECUÇÃO DO ROBÔ ---
if (btnStartBot) {
    btnStartBot.addEventListener('click', () => {
        const tipoRobo = selectRobo ? selectRobo.value : 'robo_4x4';
        
        const config = {
            stakeInicial: parseFloat(document.getElementById('stake-inicial')?.value || 0.35),
            metaLossVirtual: parseInt(document.getElementById('meta-loss-virtual')?.value || 4),
            maxMartingale: parseInt(document.getElementById('max-martingale')?.value || 10),
            fatorMultiplicador: parseFloat(document.getElementById('fator-multiplicador')?.value || 1.8),
            stopWin: parseFloat(document.getElementById('stop-win')?.value || 10000),
            stopLoss: parseFloat(document.getElementById('stop-loss')?.value || 10000)
        };

        btnStartBot.disabled = true;
        if (btnStopBot) btnStopBot.disabled = false;
        if (selectRobo) selectRobo.disabled = true;

        botLogs.innerHTML += `> 🚀 Iniciando ${tipoRobo} (Ativo: Volatility 100 Index)...<br>`;
        iniciarMotor(tipoRobo, config);
    });
}

if (btnStopBot) {
    btnStopBot.addEventListener('click', () => {
        if (wsBot) {
            wsBot.close();
        }
        pararRoboUI();
    });
}

function pararRoboUI() {
    if (btnStartBot) btnStartBot.disabled = false;
    if (btnStopBot) btnStopBot.disabled = true;
    if (selectRobo) selectRobo.disabled = false;
    botLogs.innerHTML += `> ⏹️ Robô parado pelo usuário.<br>`;
}

// ==================== MOTOR DO ROBÔ (TRADUÇÃO FIEL DO XML 4X4) ====================
function iniciarMotor(tipoRobo, config) {
    wsBot = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=1089`);

    let stakeAtual = config.stakeInicial;
    let contadorLossVirtual = 0;
    let contadorMartingale = 0;
    let emModoReal = false;
    let passoAlternancia = 0;

    wsBot.onopen = () => {
        botLogs.innerHTML += `> 🔌 WebSocket aberto. Autenticando...<br>`;
        wsBot.send(JSON.stringify({ authorize: tokenDeriv }));
    };

    wsBot.onmessage = (msg) => {
        const data = JSON.parse(msg.data);

        // Autorizado com sucesso, inicia a subscrição de ticks do Volatility 100 Index (1HZ100V)
        if (data.msg_type === 'authorize') {
            botLogs.innerHTML += `> 🔓 Autorizado. Assinando ticks do 1HZ100V...<br>`;
            wsBot.send(JSON.stringify({ ticks: "1HZ100V", subscribe: 1 }));
        }

        // Leitura de Ticks (equivalente ao before_purchase do XML)
        if (data.msg_type === 'tick') {
            const preco = data.tick.quote;
            const ultimoDigito = parseInt(preco.toString().slice(-1));
            const ehPar = ultimoDigito % 2 === 0;

            if (tipoRobo === 'robo_4x4') {
                if (emModoReal) {
                    // Execução Real baseada no Passo de Alternância
                    const tipoContrato = passoAlternancia < 4 ? "DIGITODD" : "DIGITEVEN";
                    botLogs.innerHTML += `> 🎯 Modo Real Ativo | Executando compra (${tipoContrato}) | Stake: $${stakeAtual}<br>`;
                    enviarOrdem(tipoContrato, stakeAtual);
                } else {
                    // Análise Virtual 4x4 idêntica ao XML
                    botLogs.innerHTML += `> 🔍 Analisando tick: Preço ${preco} | Dígito: ${ultimoDigito} (${ehPar ? 'Par' : 'Ímpar'}) | Passo: ${passoAlternancia}<br>`;

                    let condicaoVirtual = (passoAlternancia < 4 && ehPar) || (passoAlternancia >= 4 && !ehPar);

                    if (condicaoVirtual) {
                        contadorLossVirtual++;
                        botLogs.innerHTML += `> ⚠️ Loss virtual (Alternância 4x4). Contador: ${contadorLossVirtual}/${config.metaLossVirtual}<br>`;

                        if (contadorLossVirtual >= config.metaLossVirtual) {
                            emModoReal = true;
                            botLogs.innerHTML += `> 🚀 Meta de Loss Virtual atingida! Mudando para Modo Real...<br>`;
                            const tipoContrato = passoAlternancia < 4 ? "DIGITODD" : "DIGITEVEN";
                            enviarOrdem(tipoContrato, stakeAtual);
                        }
                    }
                    // Avança o passo de alternância em looping de 0 a 7
                    passoAlternancia = (passoAlternancia + 1) % 8;
                }
            }
        }

        // Confirmação de Compra de Contrato
        if (data.msg_type === 'buy') {
            const contractId = data.buy.contract_id;
            botLogs.innerHTML += `> 🛒 Contrato aceito. ID: ${contractId}. Aguardando resultado...<br>`;
            wsBot.send(JSON.stringify({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 }));
        }

        // Monitoramento e Pós-Compra (equivalente ao after_purchase do XML)
        if (data.msg_type === 'proposal_open_contract') {
            const contrato = data.proposal_open_contract;
            if (contrato && contrato.is_sold) {
                const lucroRodada = contrato.profit;
                botLogs.innerHTML += `> 📊 Resultado: ${contrato.status.toUpperCase()} | Lucro: $${lucroRodada.toFixed(2)}<br>`;

                // Checagem de Win/Loss do XML
                if (contrato.status === 'won') {
                    stakeAtual = config.stakeInicial;
                    contadorMartingale = 0;
                    contadorLossVirtual = 0;
                    emModoReal = false;
                    botLogs.innerHTML += `> ✅ Win! Resetando martingale e retornando ao stake inicial: $${config.stakeInicial}<br>`;
                } else {
                    // Tratamento de Loss e Martingale
                    if (contadorMartingale < config.maxMartingale) {
                        stakeAtual = Number((stakeAtual * config.fatorMultiplicador).toFixed(2));
                        contadorMartingale++;
                        emModoReal = true;
                        botLogs.innerHTML += `> 🔄 Martingale (${contadorMartingale}/${config.maxMartingale}). Novo Stake: $${stakeAtual}<br>`;
                    } else {
                        botLogs.innerHTML += `> ❌ Limite máximo de Martingale atingido. Robô parado por segurança.<br>`;
                        wsBot.close();
                        pararRoboUI();
                        return;
                    }
                }

                // Avança o passo de alternância pós-compra conforme o XML
                passoAlternancia = (passoAlternancia + 1) % 8;
            }
        }

        if (data.error) {
            botLogs.innerHTML += `> ❌ Erro da Deriv: ${data.error.message}<br>`;
        }
    };
}

function enviarOrdem(tipoContrato, stake) {
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

// Inicialização automática ao carregar a página
window.onload = () => {
    verificarSessao();
    const tokenSalvo = localStorage.getItem('deriv_token');
    if (tokenSalvo) {
        if (inputToken) inputToken.value = tokenSalvo;
        conectarComToken(tokenSalvo);
    }
};

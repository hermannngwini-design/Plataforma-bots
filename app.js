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
        
        // Captura os parâmetros ajustados na interface
        const config = {
            stakeInicial: parseFloat(document.getElementById('stake-inicial')?.value || 0.35),
            metaLossVirtual: parseInt(document.getElementById('meta-loss-virtual')?.value || 4),
            maxMartingale: parseInt(document.getElementById('max-martingale')?.value || 10),
            fatorMultiplicador: parseFloat(document.getElementById('fator-multiplicador')?.value || 1.8),
            stopWin: parseFloat(document.getElementById('stop-win')?.value || 50),
            stopLoss: parseFloat(document.getElementById('stop-loss')?.value || 50)
        };

        btnStartBot.disabled = true;
        if (btnStopBot) btnStopBot.disabled = false;
        if (selectRobo) selectRobo.disabled = true;

        botLogs.innerHTML += `> 🚀 Iniciando ${tipoRobo}...<br>`;
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

// --- MOTOR DO ROBÔ (4X4 COM FILTRO VIRTUAL E MARTINGALE) ---
function iniciarMotor(tipoRobo, config) {
    wsBot = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=1089`);

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
                botLogs.innerHTML += `> 📊 Resultado: ${contrato.status.toUpperCase()} | Lucro Rodada: $${contrato.profit.toFixed(2)} | Acumulado: $${lucroTotal.toFixed(2)}<br>`;

                if (lucroTotal >= config.stopWin) {
                    botLogs.innerHTML += `> 🏆 Stop Win atingido! Parando robô.<br>`;
                    wsBot.close();
                    pararRoboUI();
                    return;
                }
                if (lucroTotal <= -config.stopLoss) {
                    botLogs.innerHTML += `> 🛑 Stop Loss atingido! Parando robô.<br>`;
                    wsBot.close();
                    pararRoboUI();
                    return;
                }

                if (tipoRobo === 'robo_4x4') {
                    stakeAtual = processarResultado4x4(contrato, estado4x4, config, stakeAtual);
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
            botLogs.innerHTML += `> ⚠️ Loss virtual (Dígito: ${ultimoDigito}). Contador: ${estado.contadorLossVirtual}/${config.metaLossVirtual}<br>`;
            
            if (estado.contadorLossVirtual >= config.metaLossVirtual) {
                estado.emModoReal = true;
                botLogs.innerHTML += `> 🎯 Meta virtual atingida. Entrando em modo real!<br>`;
                enviarOrdem(estado.passoAlternancia < 4 ? "DIGITODD" : "DIGITEVEN", stake);
            }
        }
        estado.passoAlternancia = (estado.passoAlternancia + 1) % 8;
    }
}

function processarResultado4x4(contrato, estado, config, stakeAtualFeito) {
    if (contrato.status === 'won') {
        estado.contadorMg = 0;
        estado.contadorLossVirtual = 0;
        estado.emModoReal = false;
        botLogs.innerHTML += `> ✅ Win! Retornando ao stake inicial: $${config.stakeInicial}<br>`;
        return config.stakeInicial;
    } else {
        if (estado.contadorMg < config.maxMartingale) {
            let novoStake = Number((stakeAtualFeito * config.fatorMultiplicador).toFixed(2));
            estado.contadorMg++;
            estado.emModoReal = true;
            botLogs.innerHTML += `> 🔄 Martingale (${estado.contadorMg}/${config.maxMartingale}). Novo Stake: $${novoStake}<br>`;
            enviarOrdem(estado.passoAlternancia < 4 ? "DIGITODD" : "DIGITEVEN", novoStake);
            return novoStake;
        } else {
            botLogs.innerHTML += `> ❌ Limite máximo de Martingale atingido. Robô parado por segurança.<br>`;
            wsBot.close();
            pararRoboUI();
            return config.stakeInicial;
        }
    }
}

function enviarOrdem(tipoContrato, stake) {
    botLogs.innerHTML += `> 🛒 Enviando ordem (${tipoContrato}) com stake $${stake}...<br>`;
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

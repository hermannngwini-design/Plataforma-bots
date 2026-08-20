// Elementos da Interface
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const userLoggedSpan = document.getElementById('user-logged');

const botLogs = document.getElementById('bot-logs');
const btnStartBot = document.getElementById('btn-start-bot');
const btnStopBot = document.getElementById('btn-stop-bot');
const selectRobo = document.getElementById('select-robo');

let wsBot = null;
let tokenDeriv = "";

// App ID numérico oficial da Deriv compatível com OAuth de redirecionamento
const MEU_APP_ID = "1089";

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
        localStorage.removeItem("deriv_token");
        location.reload();
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

// --- REDIRECIONAMENTO OAUTH 1 CLIQUE ---
const btnConnectToken = document.querySelector('.btn-deriv') || document.getElementById('btn-connect-token');

if (btnConnectToken) {
    btnConnectToken.innerText = "Conectar com Conta Deriv (1 Clique)";
    
    btnConnectToken.onclick = (e) => {
        e.preventDefault();
        const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
        window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${MEU_APP_ID}&l=pt&brand=deriv&redirect_uri=${redirectUri}`;
    };
}

// Captura automática do token retornado pela Deriv na URL após o login
function capturarRetornoOAuth() {
    const hash = window.location.hash;
    if (hash && hash.includes('token1=')) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        for (let [key, value] of params.entries()) {
            if (key.startsWith('token1')) {
                tokenDeriv = value;
                localStorage.setItem('deriv_token', value);
                break;
            }
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }
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
            stopWin: parseFloat(document.getElementById('stop-win')?.value || 50),
            stopLoss: parseFloat(document.getElementById('stop-loss')?.value || 50)
        };

        if (!tokenDeriv) {
            alert("Por favor, clique em 'Conectar com Conta Deriv (1 Clique)' primeiro!");
            return;
        }

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

// ==================== MOTOR DO ROBÔ (4X4) ====================
function iniciarMotor(tipoRobo, config) {
    wsBot = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${MEU_APP_ID}`);

    let lucroTotal = 0;
    let stakeAtual = config.stakeInicial;
    let contadorLossVirtual = 0;
    let contadorMartingale = 0;
    let emModoReal = false;
    let passoAlternancia = 0;

    wsBot.onopen = () => {
        botLogs.innerHTML += `> 🔌 WebSocket conectado. Autorizando conta...<br>`;
        wsBot.send(JSON.stringify({ authorize: tokenDeriv }));
    };

    wsBot.onmessage = (msg) => {
        const data = JSON.parse(msg.data);

        if (data.msg_type === 'authorize') {
            botLogs.innerHTML += `> 🔓 Conta autorizada com sucesso! Assinando ticks do 1HZ100V...<br>`;
            wsBot.send(JSON.stringify({ ticks: "1HZ100V", subscribe: 1 }));
        }

        if (data.msg_type === 'tick') {
            const preco = data.tick.quote;
            const ultimoDigito = parseInt(preco.toString().slice(-1));
            const ehPar = ultimoDigito % 2 === 0;

            if (tipoRobo === 'robo_4x4') {
                if (emModoReal) {
                    const tipoContrato = passoAlternancia < 4 ? "DIGITODD" : "DIGITEVEN";
                    botLogs.innerHTML += `> 🎯 Modo Real Ativo | Executando compra (${tipoContrato}) | Stake: $${stakeAtual}<br>`;
                    enviarOrdem(tipoContrato, stakeAtual);
                } else {
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
                }
            }
        }

        if (data.msg_type === 'buy') {
            const contractId = data.buy.contract_id;
            botLogs.innerHTML += `> 🛒 Contrato aceito. ID: ${contractId}. Aguardando resultado...<br>`;
            wsBot.send(JSON.stringify({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 }));
        }

        if (data.msg_type === 'proposal_open_contract') {
            const contrato = data.proposal_open_contract;
            if (contrato && contrato.is_sold) {
                const lucroRodada = contrato.profit;
                lucroTotal += lucroRodada;
                botLogs.innerHTML += `> 📊 Resultado: ${contrato.status.toUpperCase()} | Lucro Rodada: $${lucroRodada.toFixed(2)} | Acumulado: $${lucroTotal.toFixed(2)}<br>`;

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

                if (contrato.status === 'won') {
                    stakeAtual = config.stakeInicial;
                    contadorMartingale = 0;
                    contadorLossVirtual = 0;
                    emModoReal = false;
                    botLogs.innerHTML += `> ✅ Win! Resetando martingale e retornando ao stake inicial: $${config.stakeInicial}<br>`;
                } else {
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
    capturarRetornoOAuth();

    const tokenSalvo = localStorage.getItem('deriv_token');
    if (tokenSalvo) {
        tokenDeriv = tokenSalvo;
        if (botLogs) botLogs.innerHTML += `> ✅ Conta Deriv conectada com sucesso!<br>`;
    }
};

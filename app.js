// Elementos da Interface (HTML)
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const userLoggedSpan = document.getElementById('user-logged');

const derivTokenInput = document.getElementById('deriv-token');
const btnConnectDeriv = document.getElementById('btn-connect-deriv');
const derivStatus = document.getElementById('deriv-status');
const btnStartBot = document.getElementById('btn-start-bot');
const btnStopBot = document.getElementById('btn-stop-bot');
const botLogs = document.getElementById('bot-logs');

let ws; 

// --- CONTROLE DE USUÁRIOS (SISTEMA INTEGRADO IMUNE A ERROS) ---

// Botão Cadastrar
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

// Botão Entrar
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

// Botão Sair da Conta
btnLogout.addEventListener('click', () => {
    localStorage.removeItem("user_session");
    verificarSessao();
});

// Monitor de Sessão
function verificarSessao() {
    const session = localStorage.getItem("user_session");
    if (session) {
        authContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        userLoggedSpan.innerText = session;
    } else {
        authContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
    }
}

// Executa a checagem assim que o site abre
verificarSessao();

// --- MOTOR DE CONEXÃO DERIV (WEBSOCKET COM DIAGNÓSTICO) ---
btnConnectDeriv.addEventListener('click', () => {
    const token = derivTokenInput.value.trim();
    if (!token) return alert("Por favor, cole seu Token de API da Deriv!");

    botLogs.innerHTML = "Conectando ao servidor da Deriv...<br>";
    
    // Conectando diretamente ao WebSocket oficial
    ws = new WebSocket('wss://://derivws.com'); 

    ws.onopen = () => {
        botLogs.innerHTML += "🔌 Conexão de rede estabelecida. Enviando token...<br>";
        ws.send(JSON.stringify({ authorize: token }));
    };

    ws.onmessage = (msg) => {
        const response = JSON.parse(msg.data);

        if (response.error) {
            derivStatus.innerText = "Status: Erro na Autenticação";
            derivStatus.className = "status-offline";
            botLogs.innerHTML += `❌ Erro da Deriv: ${response.error.message} (${response.error.code})<br>`;
            return;
        }

        if (response.msg_type === 'authorize') {
            derivStatus.innerText = "Status: Conectado à Deriv";
            derivStatus.className = "status-online";
            botLogs.innerHTML += `✅ Conta autorizada com sucesso!<br>`;
            botLogs.innerHTML += `📧 Email da conta: ${response.authorize.email}<br>`;
            botLogs.innerHTML += `💰 Saldo atual: ${response.authorize.currency} ${response.authorize.balance}<br>`;
            btnStartBot.disabled = false;
        }
    };

    ws.onerror = (error) => {
        derivStatus.innerText = "Status: Erro de Rede";
        derivStatus.className = "status-offline";
        botLogs.innerHTML += "❌ Falha crítica ao tentar alcançar o servidor da Deriv.<br>";
    };

    ws.onclose = () => {
        derivStatus.innerText = "Status: Desconectado";
        derivStatus.className = "status-offline";
        botLogs.innerHTML += "🔌 Conexão com o servidor encerrada.<br>";
    };
});

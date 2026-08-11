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

let ws = null; // Instância global do WebSocket

// --- CONTROLE DE USUÁRIOS (SISTEMA INTEGRADO LOCAL) ---

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

btnLogout.addEventListener('click', () => {
    localStorage.removeItem("user_session");
    verificarSessao();
});

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

verificarSessao();

// --- MOTOR DE CONEXÃO DERIV ULTRA-ESTÁVEL ---
btnConnectDeriv.addEventListener('click', () => {
    // 1. Limpa o token removendo espaços e quebras de linha invisíveis
    const token = derivTokenInput.value.replace(/\s+/g, '');
    if (!token) return alert("Por favor, cole seu Token de API da Deriv!");

    // 2. Proteção contra cliques duplos: Desativa o botão temporariamente
    btnConnectDeriv.disabled = true;
    btnConnectDeriv.innerText = "Conectando...";
    botLogs.innerHTML = "Iniciando comunicação com a Deriv...<br>";

    // 3. Se já existia uma conexão pendente aberta, força o fechamento dela
    if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
    }

    // 4. Abre a conexão oficial estável usando a API principal da corretora
    ws = new WebSocket('wss://://derivws.com'); 

    ws.onopen = () => {
        botLogs.innerHTML += "🔌 Canal de rede aberto! Validando credenciais...<br>";
        ws.send(JSON.stringify({ authorize: token }));
    };

    ws.onmessage = (msg) => {
        const response = JSON.parse(msg.data);

        // Captura e destrava erros enviados pela corretora
        if (response.error) {
            derivStatus.innerText = "Status: Token Recusado";
            derivStatus.className = "status-offline";
            botLogs.innerHTML += `❌ Resposta da Deriv: ${response.error.message}<br>`;
            
            // Reativa o botão para nova tentativa
            btnConnectDeriv.disabled = false;
            btnConnectDeriv.innerText = "Conectar Conta";
            return;
        }

        // Sucesso na conexão
        if (response.msg_type === 'authorize') {
            derivStatus.innerText = "Status: Conectado à Deriv";
            derivStatus.className = "status-online";
            botLogs.innerHTML += `✅ AUTORIZADO!<br>`;
            botLogs.innerHTML += `📧 Conta: ${response.authorize.email}<br>`;
            botLogs.innerHTML += `💰 Saldo: ${response.authorize.currency} ${response.authorize.balance}<br>`;
            
            btnStartBot.disabled = false;
            btnConnectDeriv.innerText = "Conta Vinculada";
        }
    };

    ws.onerror = (error) => {
        derivStatus.innerText = "Status: Falha na Rede";
        derivStatus.className = "status-offline";
        botLogs.innerHTML += "❌ Não foi possível alcançar o servidor. Verifique o Token.<br>";
        btnConnectDeriv.disabled = false;
        btnConnectDeriv.innerText = "Conectar Conta";
    };

    ws.onclose = () => {
        btnConnectDeriv.disabled = false;
        btnConnectDeriv.innerText = "Conectar Conta";
    };
});

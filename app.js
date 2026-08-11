// Captura a autenticação criada localmente
const auth = window.auth;

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

// --- CONTROLE DE USUÁRIOS (SISTEMA DE CADASTRO E LOGIN LOCAL) ---

// Botão Cadastrar
btnRegister.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if(!email || !password) return alert("Preencha todos os campos!");

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => alert("Conta criada com sucesso!"))
        .catch(error => alert("Erro ao cadastrar: " + error.message));
});

// Botão Entrar
btnLogin.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if(!email || !password) return alert("Preencha todos os campos!");

    auth.signInWithEmailAndPassword(email, password)
        .catch(error => alert("Erro ao entrar: " + error.message));
});

// Botão Sair da Conta
btnLogout.addEventListener('click', () => auth.signOut());

// Monitor de Sessão (Troca as telas automaticamente)
auth.onAuthStateChanged((user) => {
    if (user) {
        authContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        userLoggedSpan.innerText = user.email;
    } else {
        authContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
    }
});

// --- MOTOR DE CONEXÃO DERIV (WEBSOCKET COM DIAGNÓSTICO) ---
btnConnectDeriv.addEventListener('click', () => {
    const token = derivTokenInput.value.trim();
    if (!token) return alert("Por favor, cole seu Token de API da Deriv!");

    botLogs.innerHTML = "Conectando ao servidor da Deriv...<br>";
    
    // Canal oficial WebSocket da Deriv com App ID de testes padrão
    ws = new WebSocket('wss://://derivws.com'); 

    ws.onopen = () => {
        botLogs.innerHTML += "🔌 Conexão de rede estabelecida. Enviando token...<br>";
        // Envia a solicitação de autorização para a corretora
        ws.send(JSON.stringify({ authorize: token }));
    };

    ws.onmessage = (msg) => {
        const response = JSON.parse(msg.data);

        // Se a Deriv responder apontando qualquer tipo de erro no Token
        if (response.error) {
            derivStatus.innerText = "Status: Erro na Autenticação";
            derivStatus.className = "status-offline";
            botLogs.innerHTML += `❌ Erro da Deriv: ${response.error.message} (${response.error.code})<br>`;
            return;
        }

        // Se a resposta for de sucesso na autorização
        if (response.msg_type === 'authorize') {
            derivStatus.innerText = "Status: Conectado à Deriv";
            derivStatus.className = "status-online";
            botLogs.innerHTML += `✅ Conta autorizada com sucesso!<br>`;
            botLogs.innerHTML += `📧 Email da conta: ${response.authorize.email}<br>`;
            botLogs.innerHTML += `💰 Saldo atual: ${response.authorize.currency} ${response.authorize.balance}<br>`;
            
            // Habilita o botão para o usuário poder ligar o robô
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

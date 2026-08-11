// Captura a autenticação criada no index.html
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

// --- CONTROLE DE USUÁRIOS (SISTEMA DE CADASTRO E LOGIN) ---

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

// --- MOTOR DE CONEXÃO DERIV (WEBSOCKET) ---
btnConnectDeriv.addEventListener('click', () => {
    const token = derivTokenInput.value.trim();
    if (!token) return alert("Por favor, cole seu Token de API da Deriv!");

    botLogs.innerHTML = "Conectando ao servidor da Deriv...<br>";
    ws = new WebSocket('wss://://derivws.com'); 

    ws.onopen = () => {
        ws.send(JSON.stringify({ authorize: token }));
    };

    ws.onmessage = (msg) => {
        const response = JSON.parse(msg.data);

        if (response.msg_type === 'authorize') {
            if (response.error) {
                derivStatus.innerText = "Status: Token Inválido";
                derivStatus.className = "status-offline";
                botLogs.innerHTML += `❌ Erro: ${response.error.message}<br>`;
            } else {
                derivStatus.innerText = "Status: Conectado à Deriv";
                derivStatus.className = "status-online";
                botLogs.innerHTML += `✅ Conta autorizada! Usuário: ${response.authorize.email}<br>`;
                btnStartBot.disabled = false;
            }
        }
    };

    ws.onerror = (error) => {
        botLogs.innerHTML += "❌ Erro na conexão com o servidor.<br>";
    };
});

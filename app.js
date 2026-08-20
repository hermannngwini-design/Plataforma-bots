// Elementos da Interface
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const userLoggedSpan = document.getElementById('user-logged');

const btnConnectDeriv = document.getElementById('btn-connect-deriv');
const derivStatus = document.getElementById('deriv-status');
const botLogs = document.getElementById('bot-logs');
const btnStartBot = document.getElementById('btn-start-bot');

// CONFIGURAÇÃO - App ID configurado
const APP_ID = "34aspGUGPyiOkGCgGtkUw"; 
const LOGIN_URL = `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&l=pt&brand=deriv`;

// --- CONTROLE DE USUÁRIOS LOCAL (LOGIN / CADASTRO) ---
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

// --- FLUXO OAUTH DA DERIV ---
btnConnectDeriv.addEventListener('click', () => {
    window.location.href = LOGIN_URL;
});

// Captura token ao retornar da Deriv
window.onload = () => {
    verificarSessao();
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token1'); 

    if (token) {
        processarConexao(token);
    }
};

async function processarConexao(token) {
    btnConnectDeriv.disabled = true;
    btnConnectDeriv.innerText = "Conectando...";
    botLogs.innerHTML = "Autenticando na Deriv...<br>";

    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
    
    ws.onopen = () => ws.send(JSON.stringify({ authorize: token }));

    ws.onmessage = (msg) => {
        const response = JSON.parse(msg.data);
        if (response.authorize) {
            derivStatus.innerText = "Status: Conectado à Deriv";
            derivStatus.className = "status-online";
            botLogs.innerHTML = `✅ Conectado: ${response.authorize.email}<br>💰 Saldo: ${response.authorize.currency} ${response.authorize.balance}`;
            btnStartBot.disabled = false;
            btnConnectDeriv.innerText = "Conta Vinculada";
        } else {
            botLogs.innerHTML = `❌ Erro: ${response.error.message}`;
            btnConnectDeriv.disabled = false;
            btnConnectDeriv.innerText = "Conectar Conta via Deriv";
        }
        ws.close();
    };
}
          

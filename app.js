// Elementos da Interface
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const btnConnectDeriv = document.getElementById('btn-connect-deriv');
const derivStatus = document.getElementById('deriv-status');
const botLogs = document.getElementById('bot-logs');
const btnStartBot = document.getElementById('btn-start-bot');

// CONFIGURAÇÃO - App ID configurado
const APP_ID = "34aspGUGPyiOkGCgGtkUw"; 
const LOGIN_URL = `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&l=pt&brand=deriv`;

// --- CONTROLE DE SESSÃO ---
function verificarSessao() {
    const session = localStorage.getItem("user_session");
    if (session) {
        authContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        document.getElementById('user-logged').innerText = session;
    } else {
        authContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
    }
}

// --- FLUXO OAUTH ---
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
        } else {
            botLogs.innerHTML = `❌ Erro: ${response.error.message}`;
            btnConnectDeriv.disabled = false;
            btnConnectDeriv.innerText = "Conectar Conta via Deriv";
        }
        ws.close();
    };
}

// --- MANTENDO CONTROLE DE USUÁRIOS LOCAL ---
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btnLogin'); // Certifique-se dos IDs no HTML
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');

// (Mantenha aqui as suas funções originais de btnLogin, btnRegister e btnLogout que já funcionavam)

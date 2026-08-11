import { initializeApp } from "https://www.gstatic.com";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://gstatic.com";

const firebaseConfig = {
  apiKey: "AIzaSyCc9yvNTlh-DFHjk38e3aQ9HwF0f-yDmUc",
  authDomain: "hermannusbots.firebaseapp.com",
  projectId: "hermannusbots",
  storageBucket: "hermannusbots.firebasestorage.app",
  messagingSenderId: "76496490010",
  appId: "1:76496490010:web:e43024b6bb3b69f2ad0ba3",
  measurementId: "G-YR3GG9GHP8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Elementos da Tela
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const userLoggedSpan = document.getElementById('user-logged');

// Elementos da Deriv
const derivTokenInput = document.getElementById('deriv-token');
const btnConnectDeriv = document.getElementById('btn-connect-deriv');
const derivStatus = document.getElementById('deriv-status');
const btnStartBot = document.getElementById('btn-start-bot');
const btnStopBot = document.getElementById('btn-stop-bot');
const botLogs = document.getElementById('bot-logs');

let ws; // Variável que guardará a conexão da Deriv

// --- LOGIN E CADASTRO (FIREBASE) ---
btnRegister.addEventListener('click', () => {
    createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
        .then(() => alert("Conta criada!"))
        .catch(error => alert("Erro: " + error.message));
});

btnLogin.addEventListener('click', () => {
    signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
        .catch(error => alert("Erro: " + error.message));
});

btnLogout.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        authContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        userLoggedSpan.innerText = user.email;
    } else {
        authContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
    }
});

// --- CONEXÃO COM A CORRETORA (DERIV API) ---
btnConnectDeriv.addEventListener('click', () => {
    const token = derivTokenInput.value.trim();
    if (!token) return alert("Por favor, cole seu Token de API da Deriv!");

    botLogs.innerHTML = "Conectando ao servidor da Deriv...<br>";

    // Abrindo o canal oficial de WebSockets da Deriv
    ws = new WebSocket('wss://://derivws.com'); // App ID padrão de testes

    ws.onopen = () => {
        // Enviando o token do cliente para autorizar a conta
        ws.send(JSON.stringify({ authorize: token }));
    };

    ws.onmessage = (msg) => {
        const response = JSON.parse(msg.data);

        // Se a resposta for a autorização da conta
        if (response.msg_type === 'authorize') {
            if (response.error) {
                derivStatus.innerText = "Status: Token Inválido";
                derivStatus.className = "status-offline";
                botLogs.innerHTML += `❌ Erro: ${response.error.message}<br>`;
            } else {
                derivStatus.innerText = "Status: Conectado à Deriv";
                derivStatus.className = "status-online";
                botLogs.innerHTML += `✅ Conta autorizada! Usuário: ${response.authorize.email}<br>`;
                
                // Ativa o botão para ligar o robô
                btnStartBot.disabled = false;
            }
        }
    };

    ws.onerror = (error) => {
        botLogs.innerHTML += "❌ Erro na conexão com o servidor.<br>";
    };
});

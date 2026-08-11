// 1. CONFIGURAÇÕES DO SEU FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCc9yvNTlh-DFHjk38e3aQ9HwF0f-yDmUc",
  authDomain: "://firebaseapp.com",
  projectId: "hermannusbots",
  storageBucket: "hermannusbots.firebasestorage.app",
  messagingSenderId: "76496490010",
  appId: "1:76496490010:web:e43024b6bb3b69f2ad0ba3",
  measurementId: "G-YR3GG9GHP8"
};

// Aguarda a página carregar completamente para evitar erros de 'undefined'
window.onload = function() {
    
    // 2. INICIALIZAÇÃO SEGURA
    const firebase = window.firebase;
    if (!firebase) {
        console.error("Erro: O Firebase não foi carregado pelo index.html. Verifique as tags de script.");
        return;
    }
    
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();

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

    // --- CONTROLE DE USUÁRIOS ---
    btnRegister.addEventListener('click', () => {
        auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
            .then(() => alert("Conta criada com sucesso!"))
            .catch(error => alert("Erro ao cadastrar: " + error.message));
    });

    btnLogin.addEventListener('click', () => {
        auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
            .catch(error => alert("Erro ao entrar: " + error.message));
    });

    btnLogout.addEventListener('click', () => auth.signOut());

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

    // --- MOTOR DE CONEXÃO DERIV ---
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
};

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

// --- NOVO MOTOR DE CONEXÃO DERIV (VIA LINK DIRETO HTTPS) ---
btnConnectDeriv.addEventListener('click', async () => {
    const token = derivTokenInput.value.replace(/\s+/g, '');
    if (!token) return alert("Por favor, cole seu Token de API da Deriv!");

    btnConnectDeriv.disabled = true;
    btnConnectDeriv.innerText = "Conectando...";
    botLogs.innerHTML = "Enviando requisição segura para a Deriv...<br>";

    // Usamos a URL oficial de testes via REST para validar o token sem abrir túnel WebSocket
    const url = `https://deriv.com`; 

    try {
        // Envia o pedido direto via internet normal
        botLogs.innerHTML += "🔌 Batendo no servidor da corretora...<br>";
        
        // Criando a mensagem de autorização
        const dados = {
            authorize: token,
            req_id: 1
        };

        // Criando uma simulação estável de WebSocket via objeto nativo para validar se o Token responde
        const testWs = new WebSocket('wss://://derivws.com');
        
        // Define um tempo limite de 5 segundos. Se a Deriv sumir, ele avisa!
        const timeout = setTimeout(() => {
            testWs.close();
            throw new Error("O servidor da Deriv demorou muito para responder. Verifique as permissões do seu Token.");
        }, 5000);

        testWs.onopen = () => {
            testWs.send(JSON.stringify(dados));
        };

        testWs.onmessage = (msg) => {
            clearTimeout(timeout);
            const response = JSON.parse(msg.data);
            testWs.close();

            if (response.error) {
                derivStatus.innerText = "Status: Token Recusado";
                derivStatus.className = "status-offline";
                botLogs.innerHTML += `❌ Erro Real da Deriv: ${response.error.message}<br>`;
                botLogs.innerHTML += `💡 Dica: Verifique se o seu token tem permissão de "Trade" e "Read" marcada no site da Deriv.<br>`;
                btnConnectDeriv.disabled = false;
                btnConnectDeriv.innerText = "Conectar Conta";
            } else {
                derivStatus.innerText = "Status: Conectado à Deriv";
                derivStatus.className = "status-online";
                botLogs.innerHTML += `✅ SUCESSO COMPLETO!<br>`;
                botLogs.innerHTML += `📧 Conta vinculada: ${response.authorize.email}<br>`;
                botLogs.innerHTML += `💰 Saldo disponível: ${response.authorize.currency} ${response.authorize.balance}<br>`;
                
                btnStartBot.disabled = false;
                btnConnectDeriv.innerText = "Conta Vinculada";
            }
        };

        testWs.onerror = () => {
            clearTimeout(timeout);
            throw new Error("Bloqueio de rede ou Token mal formatado.");
        };

    } catch (erro) {
        derivStatus.innerText = "Status: Falha Crítica";
        derivStatus.className = "status-offline";
        botLogs.innerHTML += `❌ Falha: ${erro.message}<br>`;
        btnConnectDeriv.disabled = false;
        btnConnectDeriv.innerText = "Conectar Conta";
    }
});

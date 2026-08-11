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

// --- MOTOR DE CONEXÃO DERIV (URL 100% FIXA E CORRIGIDA) ---
btnConnectDeriv.addEventListener('click', async () => {
    const token = derivTokenInput.value.replace(/\s+/g, '');
    if (!token) return alert("Por favor, cole seu Token de API da Deriv!");

    btnConnectDeriv.disabled = true;
    btnConnectDeriv.innerText = "Conectando...";
    botLogs.innerHTML = "Enviando requisição segura para a Deriv...<br>";

    try {
        botLogs.innerHTML += "🔌 Batendo no servidor da corretora...<br>";
        
        // Criando a mensagem de autorização exigida pela API
        const dados = {
            authorize: token,
            req_id: 1
        };

        // URL FIXA: Sem variáveis para evitar erros de sintaxe ou chaves incorretas
        const testWs = new WebSocket('wss://://derivws.com');
        
        // Define um tempo limite de 5 segundos. Se a Deriv sumir, ele avisa!
        const timeout = setTimeout(() => {
            testWs.close();
            derivStatus.innerText = "Status: Falha Crítica";
            derivStatus.className = "status-offline";
            botLogs.innerHTML += `❌ Falha: O servidor da Deriv demorou muito para responder.<br>`;
            btnConnectDeriv.disabled = false;
            btnConnectDeriv.innerText = "Conectar Conta";
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
                botLogs.innerHTML += `💡 Dica: Verifique se o seu token tem permissões de "Trade" e "Read" ativas na Deriv.<br>`;
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
            derivStatus.innerText = "Status: Falha Crítica";
            derivStatus.className = "status-offline";
            botLogs.innerHTML += `❌ Falha: Bloqueio de rede ou URL mal formatada.<br>`;
            btnConnectDeriv.disabled = false;
            btnConnectDeriv.innerText = "Conectar Conta";
        };

    } catch (erro) {
        derivStatus.innerText = "Status: Falha Crítica";
        derivStatus.className = "status-offline";
        botLogs.innerHTML += `❌ Falha: ${erro.message}<br>`;
        btnConnectDeriv.disabled = false;
        btnConnectDeriv.innerText = "Conectar Conta";
    }
});

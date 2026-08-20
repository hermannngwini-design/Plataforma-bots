const inputToken = document.getElementById('input-token');
const btnConectar = document.querySelector('.btn-deriv'); // O botão vermelho
const btnIniciar = document.getElementById('btn-start-bot');
const botLogs = document.getElementById('bot-logs');

let wsBot;
let tokenDeriv = "";

// Força a conexão ao clicar no botão
btnConectar.onclick = () => {
    tokenDeriv = inputToken.value.trim();
    
    if (!tokenDeriv) {
        alert("O campo de token está vazio! Cole seu token da Deriv.");
        return;
    }

    botLogs.innerHTML = "🔄 Conectando...<br>";
    
    wsBot = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
    
    wsBot.onopen = () => {
        wsBot.send(JSON.stringify({ authorize: tokenDeriv }));
    };

    wsBot.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.msg_type === 'authorize') {
            botLogs.innerHTML += "✅ Conectado com sucesso!<br>";
            btnIniciar.disabled = false;
        } else if (data.error) {
            botLogs.innerHTML += "❌ Erro de Token: " + data.error.message + "<br>";
        }
    };
};

// Motor do Robô (Lógica 4x4)
btnIniciar.onclick = () => {
    const stake = parseFloat(document.getElementById('stake-inicial').value);
    const metaLoss = parseInt(document.getElementById('meta-loss-virtual').value);
    
    botLogs.innerHTML += "🚀 Iniciando operações...<br>";
    
    // Assina os ticks do Volatility 100 para começar a análise
    wsBot.send(JSON.stringify({ ticks: "1HZ100V", subscribe: 1 }));

    wsBot.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.msg_type === 'tick') {
            const digit = parseInt(data.tick.quote.toString().slice(-1));
            botLogs.innerHTML += `🔍 Tick: ${digit}<br>`;
            // Aqui entra a sua lógica de compra baseada no dígito
        }
    };
};

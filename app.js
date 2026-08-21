let wsBot = null;
let tokenDeriv = "";

window.conectarComToken = function() {
    tokenDeriv = document.getElementById('input-token').value.trim();
    if (!tokenDeriv) { alert("Token vazio!"); return; }

    wsBot = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
    
    wsBot.onopen = () => {
        wsBot.send(JSON.stringify({ authorize: tokenDeriv }));
    };

    wsBot.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.msg_type === 'authorize') {
            console.log("Autorizado!");
            
            // MUDANÇA DIRETA:
            const btn = document.getElementById('btn-start-bot');
            btn.style.background = "#22c55e"; // Cor de ativo
            btn.style.cursor = "pointer";
            btn.style.opacity = "1";
            btn.dataset.ativo = "true"; // Marca como ativo
            
            alert("Conectado! Tente clicar agora.");
        }
    };
};

window.iniciarRobo = function() {
    const btn = document.getElementById('btn-start-bot');
    
    // Verificação de segurança simples
    if (btn.dataset.ativo !== "true") {
        alert("Você precisa conectar primeiro!");
        return;
    }
    
    alert("Robô iniciado com sucesso!");
    // ... restante da sua lógica
};

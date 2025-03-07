//websocket_connect.js
// Função para conectar ao Socket.IO com tratamento de erros
function connectWebSocket(socketUrl) {
    try {
        console.log("Tentando conectar ao Socket.IO:", socketUrl);
        const socket = io(socketUrl, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        socket.on('connect', function() {
            console.log('Conectado ao servidor Socket.IO!');
        });

        socket.on('connect_error', function(error) {
            console.error('Erro na conexão Socket.IO:', error);
        });

        socket.on('disconnect', function() {
            console.log('Desconectado do servidor Socket.IO');
        });

        return socket;
    } catch (e) {
        console.error("Erro ao inicializar Socket.IO:", e);
        return null;
    }
}
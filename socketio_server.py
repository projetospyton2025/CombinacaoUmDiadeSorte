# socketio_server.py
import os
import json
import redis
import threading
from flask import Flask, request
from flask_socketio import SocketIO
import logging
from dotenv import load_dotenv, find_dotenv

# Carregar variáveis de ambiente do arquivo .env
dotenv_path = find_dotenv()
if dotenv_path:
    load_dotenv(dotenv_path)

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuração do Redis
# redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
# redis_client = redis.Redis.from_url(redis_url, decode_responses=True)

# Configuração do Redis
redis_url = os.environ.get('REDIS_URL', 'redis://default:B058xThhTvAbptQa0s25EAGk7A5u473O@redis-13833.c336.samerica-east1-1.gce.redns.redis-cloud.com:13833')
redis_client = redis.Redis.from_url(redis_url, decode_responses=True)

# Inicialização do Flask e Socket.IO
app = Flask(__name__)

# Ao configurar o SocketIO, modifique para:
socketio = SocketIO(
    app, 
    cors_allowed_origins=["*"],  # Permitir todas as origens durante desenvolvimento
    async_mode='eventlet',
    logger=True,  # Ativar logs para identificar problemas
    engineio_logger=True
)

# Thread para escutar mensagens do Redis
def redis_listener():
    """
    Ouve mensagens de progresso no Redis e as envia para os clientes via Socket.IO
    """
    pubsub = redis_client.pubsub()
    # Inscrever-se em todos os canais de progresso de tarefas
    pubsub.psubscribe('task_progress:*')
    
    logger.info("Iniciando thread de escuta do Redis")
    
    for message in pubsub.listen():
        try:
            if message['type'] == 'pmessage':
                # Extrair o ID da tarefa do canal
                channel = message['channel']
                task_id = channel.split(':')[1]
                
                # Analisar a mensagem JSON
                data = json.loads(message['data'])
                
                # Enviar para os clientes inscritos nesta tarefa
                logger.info(f"Enviando atualização para tarefa {task_id}: {data['status']}")
                socketio.emit(f'task_update:{task_id}', data)
        except Exception as e:
            logger.error(f"Erro no processamento de mensagem Redis: {str(e)}")

# Iniciar a thread do Redis na inicialização
@socketio.on('connect')
def handle_connect():
    logger.info(f"Cliente conectado: {request.sid}")

@socketio.on('subscribe')
def handle_subscribe(data):
    """
    Cliente se inscreve para receber atualizações de uma tarefa específica
    """
    task_id = data.get('task_id')
    if not task_id:
        return {'error': 'ID da tarefa não fornecido'}
    
    logger.info(f"Cliente {request.sid} inscrito na tarefa {task_id}")
    
    # Verificar se já temos o resultado armazenado
    result_key = f'task_result:{task_id}'
    stored_result = redis_client.get(result_key)
    
    if stored_result:
        # A tarefa já foi concluída, enviar o resultado imediatamente
        result_data = json.loads(stored_result)
        socketio.emit(f'task_update:{task_id}', {
            'status': 'completed',
            'progress': 100,
            'result': result_data
        }, room=request.sid)
        return {'success': True, 'message': 'Resultado já disponível'}
    
    return {'success': True, 'message': 'Inscrito para atualizações'}

# Iniciar a thread do Redis
redis_thread = threading.Thread(target=redis_listener, daemon=True)
redis_thread.start()

if __name__ == '__main__':
    port = int(os.environ.get("SOCKETIO_PORT", 10001))
    logger.info(f"Iniciando servidor Socket.IO na porta {port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=True)

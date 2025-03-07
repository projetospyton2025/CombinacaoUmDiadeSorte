# celery_config.py
from celery import Celery
import os

# Configuração do Redis como broker e backend
# redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Configuração do Redis como broker e backend
redis_url = os.environ.get('REDIS_URL', 'redis://default:B058xThhTvAbptQa0s25EAGk7A5u473O@redis-13833.c336.samerica-east1-1.gce.redns.redis-cloud.com:13833')

# Inicialização do Celery
celery_app = Celery(
    'combinacoes',
    broker=redis_url,
    backend=redis_url,
    include=['celery_tasks']  # Módulo onde as tarefas estão definidas
)

# Configurações do Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='America/Sao_Paulo',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # Limite de 1 hora por tarefa
    worker_max_tasks_per_child=10,  # Reinicia o worker após 10 tarefas
    worker_prefetch_multiplier=4,  # Equilibra a carga entre workers
)

# Para iniciar o Celery, execute:
# celery -A celery_config worker --loglevel=info
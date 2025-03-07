#redis_config.py

import os
from dotenv import load_dotenv, find_dotenv

# Carrega variáveis de ambiente
dotenv_path = find_dotenv()
if dotenv_path:
    load_dotenv(dotenv_path)

# URL do Redis (usar a mesma em todos os componentes)
# REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# URL do Redis (usar a mesma em todos os componentes)
REDIS_URL = os.getenv('REDIS_URL', 'redis://default:B058xThhTvAbptQa0s25EAGk7A5u473O@redis-13833.c336.samerica-east1-1.gce.redns.redis-cloud.com:13833')
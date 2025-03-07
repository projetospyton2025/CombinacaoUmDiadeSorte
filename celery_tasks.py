# celery_tasks.py
import time
import random
import logging
from celery import Task
from celery.utils.log import get_task_logger
from celery_config import celery_app
import redis
import json

# Configurar o logger
logger = get_task_logger(__name__)

# Configuração do Redis para comunicação em tempo real
redis_client = redis.Redis.from_url(
    celery_app.conf.broker_url, 
    decode_responses=True
)

# Importar as funções de geração otimizadas
from gospers_hack import gerar_palpites_mega_sena_gosper
from paralelizacao import gerar_palpites_paralelo

class PaleitosTask(Task):
    """Classe base personalizada para tarefas de geração de palpites que rastreia o progresso"""
    
    def on_success(self, retval, task_id, args, kwargs):
        """Chamado quando a tarefa é concluída com sucesso"""
        # Atualizar o canal Redis com status de conclusão
        redis_client.publish(
            f'task_progress:{task_id}',
            json.dumps({
                'status': 'completed',
                'progress': 100,
                'total_gerado': retval.get('total', 0)
            })
        )
        # Armazenar o resultado por 1 hora (3600 segundos)
        redis_client.setex(
            f'task_result:{task_id}',
            3600,
            json.dumps(retval)
        )
        return super().on_success(retval, task_id, args, kwargs)
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Chamado quando a tarefa falha"""
        # Atualizar o canal Redis com status de falha
        redis_client.publish(
            f'task_progress:{task_id}',
            json.dumps({
                'status': 'failed',
                'error': str(exc)
            })
        )
        return super().on_failure(exc, task_id, args, kwargs, einfo)

@celery_app.task(bind=True, base=PaleitosTask)
def gerar_palpites_tarefa(self, combinacoes_formatadas, total_palpites):
    """
    Tarefa Celery para gerar palpites da Mega Sena em segundo plano
    com atualizações de progresso em tempo real
    """
    task_id = self.request.id
    
    try:
        logger.info(f'Iniciando geração de {total_palpites} palpites. Task ID: {task_id}')
        
        # Publicar status inicial
        redis_client.publish(
            f'task_progress:{task_id}',
            json.dumps({
                'status': 'started',
                'progress': 0,
                'total_solicitado': total_palpites
            })
        )
        
        # Extrair números das combinações
        numeros_unicos = set()
        for combinacao in combinacoes_formatadas:
            i = 0
            while i < len(combinacao):
                if i + 1 < len(combinacao):
                    try:
                        num_str = combinacao[i:i+2]
                        numero = int(num_str)
                        if 1 <= numero <= 60:
                            numeros_unicos.add(numero)
                    except ValueError:
                        pass
                i += 2
        
        numeros_disponiveis = list(numeros_unicos)
        
        # Publicar progresso de processamento de dados
        redis_client.publish(
            f'task_progress:{task_id}',
            json.dumps({
                'status': 'processing',
                'progress': 10,
                'message': f'Encontrados {len(numeros_disponiveis)} números únicos'
            })
        )
        
        # Complementar se necessário
        if len(numeros_disponiveis) < 6:
            numeros_faltantes = set(range(1, 61)) - set(numeros_disponiveis)
            numeros_complementares = random.sample(list(numeros_faltantes), 6 - len(numeros_disponiveis))
            numeros_disponiveis.extend(numeros_complementares)
        
        # Para grandes quantidades, dividir o processamento em blocos com atualizações de progresso
        if total_palpites > 1000:
            palpites = []
            blocos = min(10, total_palpites // 100)  # Dividir em até 10 blocos
            palpites_por_bloco = total_palpites // blocos
            
            for i in range(blocos):
                # Gerar este bloco de palpites
                inicio_bloco = time.time()
                
                if i == blocos - 1:
                    # Último bloco pega o resto
                    qtd_bloco = total_palpites - len(palpites)
                else:
                    qtd_bloco = palpites_por_bloco
                
                # Usar paralelização para este bloco
                palpites_bloco = gerar_palpites_paralelo(
                    numeros_disponiveis, 
                    qtd_bloco
                )
                
                # Adicionar ao resultado total
                palpites.extend(palpites_bloco)
                
                # Calcular e publicar progresso
                progresso = min(95, 10 + (85 * (i + 1) // blocos))
                redis_client.publish(
                    f'task_progress:{task_id}',
                    json.dumps({
                        'status': 'processing',
                        'progress': progresso,
                        'current': len(palpites),
                        'total': total_palpites,
                        'message': f'Gerados {len(palpites)} de {total_palpites} palpites'
                    })
                )
                
                logger.info(f'Bloco {i+1}/{blocos}: Gerados {len(palpites_bloco)} palpites em {time.time() - inicio_bloco:.2f} segundos')
        else:
            # Para quantidades menores, fazer tudo de uma vez
            palpites = gerar_palpites_mega_sena_gosper(numeros_disponiveis, total_palpites)
            
            # Publicar progresso
            redis_client.publish(
                f'task_progress:{task_id}',
                json.dumps({
                    'status': 'processing',
                    'progress': 90,
                    'current': len(palpites),
                    'total': total_palpites
                })
            )
        
        # Garantir que temos exatamente o número solicitado
        palpites = palpites[:total_palpites]
        
        # Preparar o resultado final
        resultado = {
            "total": len(palpites),
            "palpites": palpites
        }
        
        # Armazenar o resultado no Redis por 1 hora
        redis_client.setex(
            f'task_result:{task_id}',
            3600,  # 1 hora
            json.dumps(resultado)
        )
        
        logger.info(f'Concluída geração de {len(palpites)} palpites. Task ID: {task_id}')
        
        return resultado
        
    except Exception as e:
        logger.error(f'Erro na geração de palpites: {str(e)}')
        # Publicar erro
        redis_client.publish(
            f'task_progress:{task_id}',
            json.dumps({
                'status': 'error',
                'message': str(e)
            })
        )
        raise  # Relançar para o Celery lidar
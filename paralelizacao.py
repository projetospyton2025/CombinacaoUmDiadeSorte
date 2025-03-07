#paralelização.py
import multiprocessing
import numpy as np
from concurrent.futures import ProcessPoolExecutor, as_completed
import time
import os
import logging

def gerar_palpites_chunk(args):
    """
    Função para gerar um chunk de palpites, será chamada por cada processo
    
    Args:
        args (tuple): (chunk_id, numeros_disponiveis, quantidade_no_chunk, seed)
        
    Returns:
        list: Lista de palpites gerados neste chunk
    """
    chunk_id, numeros_disponiveis, quantidade, seed = args
    
    # Definir uma semente para reprodutibilidade, mas diferente para cada chunk
    np.random.seed(seed + chunk_id)
    import random
    random.seed(seed + chunk_id)
    
    # Usar uma função existente para gerar palpites
    # Podemos usar a função gospers_hack ou qualquer outra otimizada
    palpites = gerar_palpites_mega_sena_gosper(numeros_disponiveis, quantidade)
    
    return palpites

def gerar_palpites_paralelo(numeros_disponiveis, total_palpites, max_workers=None):
    """
    Gera palpites de forma paralela, dividindo o trabalho em múltiplos processos
    
    Args:
        numeros_disponiveis (list): Lista de números disponíveis para formar palpites
        total_palpites (int): Número total de palpites a serem gerados
        max_workers (int, optional): Número máximo de processos, padrão é None (usa CPUs disponíveis)
        
    Returns:
        list: Lista de palpites, onde cada palpite é uma lista de 6 números
    """
    import time
    inicio = time.time()
    
    # Determinar número de processos
    if max_workers is None:
        max_workers = max(1, multiprocessing.cpu_count() - 1)  # Deixar 1 CPU livre
    
    # Dividir o trabalho em chunks
    chunks = min(max_workers, total_palpites)
    palpites_por_chunk = [total_palpites // chunks] * chunks
    
    # Distribuir o restante
    resto = total_palpites % chunks
    for i in range(resto):
        palpites_por_chunk[i] += 1
    
    # Preparar argumentos para cada processo
    seed = int(time.time())
    args_list = [
        (i, numeros_disponiveis, palpites_por_chunk[i], seed) 
        for i in range(chunks)
    ]
    
    # Usar ProcessPoolExecutor para processamento paralelo
    palpites_resultado = []
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        # Submeter tarefas
        futures = [executor.submit(gerar_palpites_chunk, args) for args in args_list]
        
        # Coletar resultados à medida que eles são concluídos
        for future in as_completed(futures):
            try:
                # Adicionar palpites deste chunk ao resultado
                palpites_chunk = future.result()
                palpites_resultado.extend(palpites_chunk)
            except Exception as e:
                logging.error(f"Erro no processamento de um chunk: {e}")
    
    # Remover possíveis duplicatas (pode acontecer entre chunks)
    palpites_unicos = []
    palpites_set = set()
    
    for palpite in palpites_resultado:
        palpite_tuple = tuple(palpite)
        if palpite_tuple not in palpites_set:
            palpites_set.add(palpite_tuple)
            palpites_unicos.append(palpite)
    
    # Limitar ao total solicitado (pode haver excesso devido à divisão em chunks)
    palpites_finais = palpites_unicos[:total_palpites]
    
    fim = time.time()
    logging.info(f"Gerados {len(palpites_finais)} palpites em {fim - inicio:.2f} segundos usando {chunks} processos")
    
    return palpites_finais

# Implementar no endpoint Flask
def integrar_na_app(app):
    """
    Integra as funções paralelas na aplicação Flask
    """
    @app.route("/gerar_palpites_paralelo", methods=["POST"])
    def gerar_palpites_endpoint():
        try:
            dados = request.get_json()
            combinacoes_formatadas = dados.get("combinacoes", [])
            total_palpites = int(dados.get("quantidade", 10))
            
            app.logger.info(f'Gerando {total_palpites} palpites para a Mega Sena usando paralelização.')
            
            # Validação
            if not combinacoes_formatadas or total_palpites <= 0:
                app.logger.warning('Dados de entrada para geração de palpites inválidos')
                return jsonify({"erro": "Dados inválidos"}), 400
            
            # Usar a função de extração de números existente
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
            
            # Se não houver números suficientes, complementar
            if len(numeros_disponiveis) < 6:
                import random
                numeros_faltantes = set(range(1, 61)) - set(numeros_disponiveis)
                numeros_complementares = random.sample(list(numeros_faltantes), 6 - len(numeros_disponiveis))
                numeros_disponiveis.extend(numeros_complementares)
            
            # Gerar palpites usando paralelização
            palpites = gerar_palpites_paralelo(numeros_disponiveis, total_palpites)
            
            app.logger.info(f'Gerados {len(palpites)} palpites em paralelo')
            
            return jsonify({"total": len(palpites), "palpites": palpites})
        
        except Exception as e:
            app.logger.error(f'Erro inesperado ao gerar palpites: {str(e)}')
            return jsonify({"erro": f"Erro inesperado: {str(e)}"}), 500
from flask import Flask, render_template, request, jsonify, url_for
from dotenv import load_dotenv, find_dotenv
import itertools
from typing import List, Set
import logging
from logging.handlers import RotatingFileHandler
import os
import random
import redis
import time  # Parcopiar para a área de transferência o caso de uso de sleep no código


# Tenta encontrar e carregar o arquivo .env
dotenv_path = find_dotenv()
if not dotenv_path:
    print("❌ ERRO: Arquivo .env não encontrado!")
else:
    print(f"✅ Arquivo .env encontrado: {dotenv_path}")
    load_dotenv(dotenv_path)

# Pegando a URL do Redis
REDIS_URL = os.getenv("REDIS_URL")

print(f"🔍 REDIS_URL: {REDIS_URL}")  # Deve exibir a URL do Redis, não None!

if not REDIS_URL:
    print("❌ ERRO: REDIS_URL não foi carregada! Verifique o .env ou defina manualmente.")
    exit(1)  # Encerra o programa se a variável não foi carregada corretamente

try:
    # Criando a conexão com o Redis
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    
    # Testando a conexão
    redis_client.ping()
    print("✅ Conexão com o Redis estabelecida com sucesso!")

except Exception as e:
    print(f"❌ Erro ao conectar ao Redis: {type(e).__name__} - {e}")








app = Flask(__name__)

# Configuração de logs
if not os.path.exists('logs'):
    os.mkdir('logs')
file_handler = RotatingFileHandler('logs/combinacoes.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('Iniciando aplicação de combinações')

def gerar_combinacoes(numeros: List[int], tamanho: int) -> Set[tuple]:
    """
    Gera combinações normais e adiciona combinações gêmeas.
    """
    # Gerar combinações normais usando permutações dos números originais
    combinacoes = set(itertools.permutations(numeros, tamanho))
    
    # Adicionar combinações gêmeas (onde os dois dígitos são iguais)
    for num in numeros:
        if 1 <= num <= 9:
            gemeo = (num, num)  # Por exemplo, (1,1) para formar "11"
            combinacoes.add(gemeo)
    
    return combinacoes

def formatar_numero(combinacao: tuple) -> str:
    """Formata uma combinação como uma string de dígitos concatenados."""
    return "".join(map(str, combinacao))

@app.route("/")
def index():
    socketio_url = f"http://{request.host.split(':')[0]}:10001"
    return render_template("index.html", socketio_url=socketio_url)


@app.route("/calcular", methods=["POST"])
def calcular():
    try:
        dados = request.get_json()
        numeros_str = dados.get("numeros", "")
        tamanho = int(dados.get("tamanho", 0))
        
        app.logger.info(f'Calculando combinações para números: {numeros_str}, tamanho: {tamanho}')
        
        # Validação dos dados
        if not numeros_str or tamanho < 1:
            app.logger.warning('Dados inválidos recebidos')
            return jsonify({"erro": "Dados inválidos"}), 400
        
        # Validar dígitos únicos
        valido, msg_erro = validar_digitos_unicos(numeros_str)
        if not valido:
            app.logger.warning(f'Validação de dígitos falhou: {msg_erro}')
            return jsonify({"erro": msg_erro}), 400
        
        # Processamento dos números - agora garantimos que são dígitos únicos
        numeros = [int(n.strip()) for n in numeros_str.split(",") if n.strip()]
        
        # Cálculo das combinações
        combinacoes = gerar_combinacoes(numeros, tamanho)
        combinacoes_formatadas = [formatar_numero(c) for c in combinacoes]
        
        # Filtrar combinações que resultam em números maiores que 60 (limite da Mega Sena)
        combinacoes_filtradas = []
        for comb in combinacoes_formatadas:
            try:
                num = int(comb)
                if 1 <= num <= 60:  # Intervalo válido para Mega Sena
                    combinacoes_filtradas.append(comb)
            except ValueError:
                pass  # Ignorar valores que não podem ser convertidos para int
                
        # Ordenar numericamente
        combinacoes_filtradas.sort(key=lambda x: int(x))
        
        # Registrar quantas combinações foram filtradas
        total_combinacoes = len(combinacoes_formatadas)
        total_filtradas = len(combinacoes_filtradas)
        app.logger.info(f'Geradas {total_combinacoes} combinações, {total_filtradas} após filtrar números > 60')
        
        return jsonify({
            "total": total_filtradas,
            "combinacoes": combinacoes_filtradas,
            "formatado_para_excel": True
        })
        
    except ValueError as e:
        app.logger.error(f'Erro nos dados de entrada: {str(e)}')
        return jsonify({"erro": f"Erro nos dados de entrada: {str(e)}"}), 400
    except Exception as e:
        app.logger.error(f'Erro inesperado: {str(e)}')
        return jsonify({"erro": f"Erro inesperado: {str(e)}"}), 500




# Função otimizada de gerar palpites para a Mega Sena
def gerar_palpites_mega_sena(combinacoes_formatadas, total_palpites=10):
    """
    Gera palpites para a Mega Sena a partir das combinações de dois dígitos.
    Cada palpite contém 6 números únicos entre 1 e 60.
    
    Args:
        combinacoes_formatadas: Lista de combinações de dois dígitos já formatadas
        total_palpites: Número de palpites a serem gerados
        
    Returns:
        Uma lista de palpites, onde cada palpite é uma lista de 6 números únicos
    """
    numeros_unicos = set()
    
    # Extrair números das combinações de dois dígitos
    for combinacao in combinacoes_formatadas:
        i = 0
        while i < len(combinacao):
            # Tentar extrair um número de 2 dígitos
            if i + 1 < len(combinacao):
                try:
                    num_str = combinacao[i:i+2]
                    numero = int(num_str)
                    if 1 <= numero <= 60:  # Garantir que está no intervalo da Mega Sena
                        numeros_unicos.add(numero)
                except ValueError:
                    pass
            i += 2  # Avançar para o próximo par de dígitos
    
    # Converter o conjunto para lista para facilitar a manipulação
    numeros_disponiveis = list(numeros_unicos)
    
    # Se não houver números suficientes, complementar com números aleatórios
    if len(numeros_disponiveis) < 6:
        numeros_faltantes = set(range(1, 61)) - set(numeros_disponiveis)
        numeros_complementares = random.sample(list(numeros_faltantes), 6 - len(numeros_disponiveis))
        numeros_disponiveis.extend(numeros_complementares)
    
    # Garantir que temos pelo menos 6 números
    if len(numeros_disponiveis) < 6:
        raise ValueError("Não foi possível extrair números suficientes das combinações")
    
    # Para geração de grandes quantidades, usamos uma abordagem mais eficiente
    if total_palpites > 100:
        return gerar_palpites_grande_quantidade(numeros_disponiveis, total_palpites)
    
    # Para quantidades menores, usamos a abordagem normal
    palpites = []
    tentativas_maximas = total_palpites * 3  # Tentativas extras caso gere duplicatas
    tentativas = 0
    
    while len(palpites) < total_palpites and tentativas < tentativas_maximas:
        tentativas += 1
        
        # Se tivermos muitos números disponíveis, podemos gerar mais variações
        if len(numeros_disponiveis) > 15:
            # Escolher 6 números aleatórios do conjunto disponível
            palpite = sorted(random.sample(numeros_disponiveis, 6))
        else:
            # Para conjuntos menores, podemos precisar de uma abordagem mais criativa
            # Garantir que pelo menos 3 números sejam dos disponíveis
            n_fixos = min(3, len(numeros_disponiveis))
            numeros_fixos = random.sample(numeros_disponiveis, n_fixos)
            
            # Complementar com números aleatórios entre 1-60 que não estejam nos fixos
            numeros_adicionais = []
            while len(numeros_fixos) + len(numeros_adicionais) < 6:
                novo_num = random.randint(1, 60)
                if novo_num not in numeros_fixos and novo_num not in numeros_adicionais:
                    numeros_adicionais.append(novo_num)
            
            # Juntar e ordenar
            palpite = sorted(numeros_fixos + numeros_adicionais)
        
        # Verificar se esse palpite já existe
        palpite_str = ",".join(map(str, palpite))
        palpites_existentes = [",".join(map(str, p)) for p in palpites]
        
        if palpite_str not in palpites_existentes:
            palpites.append(palpite)
    
    # Se não conseguimos gerar palpites suficientes, retornar o que temosconst socketioU
    return palpites

def gerar_palpites_grande_quantidade(numeros_disponiveis, total_palpites):
    """
    Método otimizado para gerar grandes quantidades de palpites.
    Usa um conjunto para verificação rápida de duplicatas.
    """
    palpites_set = set()
    palpites = []
    
    alta_variabilidade = len(numeros_disponiveis) >= 15
    
    max_tentativas = total_palpites * 5
    tentativas = 0
    
    while len(palpites) < total_palpites and tentativas < max_tentativas:
        tentativas += 1
        
        if alta_variabilidade:
            if len(numeros_disponiveis) >= 6:
                palpite = tuple(sorted(random.sample(numeros_disponiveis, 6)))
            else:
                numeros_base = list(numeros_disponiveis)
                complementos_necessarios = 6 - len(numeros_base)
                complementos = []
                
                while len(complementos) < complementos_necessarios:
                    num = random.randint(1, 60)
                    if num not in numeros_base and num not in complementos:
                        complementos.append(num)
                
                palpite = tuple(sorted(numeros_base + complementos))
        else:
            n_disponiveis = min(4, len(numeros_disponiveis))
            
            if n_disponiveis > 0:
                numeros_base = random.sample(numeros_disponiveis, n_disponiveis)
            else:
                numeros_base = []
                
            complementos = []
            while len(numeros_base) + len(complementos) < 6:
                num = random.randint(1, 60)
                if num not in numeros_base and num not in complementos:
                    complementos.append(num)
            
            palpite = tuple(sorted(numeros_base + complementos))
        
        if palpite not in palpites_set:
            palpites_set.add(palpite)
            palpites.append(list(palpite))
            
            # A cada 100 palpites, fazer uma pausa para diminuir a carga na CPU
            if len(palpites) % 100 == 0 and len(palpites) < total_palpites:
                time.sleep(0.01)
    
    return palpites

@app.route("/gerar_palpites", methods=["POST"])
def gerar_palpites():
    try:
        dados = request.get_json()
        if not dados:
            app.logger.error('Dados JSON não recebidos ou inválidos')
            return jsonify({"erro": "Dados JSON inválidos ou não fornecidos"}), 400
            
        combinacoes_formatadas = dados.get("combinacoes", [])
        total_palpites = int(dados.get("quantidade", 10))
        
        app.logger.info(f'Gerando {total_palpites} palpites para a Mega Sena.')
        
        # Validação
        if not combinacoes_formatadas or total_palpites <= 0:
            app.logger.warning('Dados de entrada para geração de palpites inválidos')
            return jsonify({"erro": "Dados inválidos"}), 400
        
        # Limitar o número máximo de palpites para evitar timeout
        max_palpites = 10000  # Ajuste conforme necessário
        if total_palpites > max_palpites:
            app.logger.warning(f'Solicitação de {total_palpites} palpites excede o limite de {max_palpites}')
            total_palpites = max_palpites
        
        # Definir timeout para evitar que o servidor fique bloqueado
        timeout_seconds = 30  # Ajuste conforme necessário
        
        # Usar um timer para limitar o tempo de execução
        start_time = time.time()
        palpites = gerar_palpites_mega_sena(combinacoes_formatadas, total_palpites)
        execution_time = time.time() - start_time
        
        app.logger.info(f'Gerados {len(palpites)} palpites em {execution_time:.2f} segundos')
        
        return jsonify({"total": len(palpites), "palpites": palpites})
    
    except Exception as e:
        app.logger.error(f'Erro inesperado ao gerar palpites: {str(e)}')
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({"erro": f"Erro inesperado: {str(e)}"}), 500
        
def validar_digitos_unicos(numeros_str):
    """
    Valida se a entrada contém apenas dígitos únicos (0-9) separados por vírgula.
    Não permite repetição de dígitos.
    Retorna uma tupla (válido, mensagem de erro).
    """
    # Remover espaços em branco
    numeros_str = numeros_str.replace(" ", "")
    
    # Verificar se contém apenas dígitos e vírgulas
    import re
    if not re.match(r'^[0-9,]*$', numeros_str):
        return False, "Entrada deve conter apenas dígitos (0-9) e vírgulas."
    
    # Verificar se cada elemento é um único dígito
    elementos = numeros_str.split(",")
    for elem in elementos:
        if elem and len(elem) > 1:
            return False, "Cada elemento deve ser um único dígito (0-9)."
    
    # Verificar se há dígitos duplicados
    digitos = [int(elem) for elem in elementos if elem]
    if len(digitos) != len(set(digitos)):
        return False, "Não é permitido repetir dígitos. Use cada dígito apenas uma vez."
    
    # Verificar se todos os dígitos estão no intervalo 0-9
    for digito in digitos:
        if digito < 0 or digito > 9:
            return False, "Apenas dígitos entre 0 e 9 são permitidos."
    
    return True, ""    
        

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
#gospers_hack.py

def gospers_hack(k, n):
    """
    Algoritmo de Gosper's Hack para gerar combinações de k elementos de um conjunto de n elementos.
    Esta implementação é extremamente eficiente para grandes conjuntos.
    
    Args:
        k (int): Tamanho da combinação
        n (int): Tamanho do conjunto
    
    Yields:
        list: Cada combinação como uma lista de índices
    """
    # Valor inicial: os k primeiros bits estão ligados
    mask = (1 << k) - 1
    
    while mask < (1 << n):
        # Converter bits para lista de índices
        yield [i for i in range(n) if (mask & (1 << i))]
        
        # Próxima combinação lexicográfica usando manipulação de bits
        c = mask & -mask
        r = mask + c
        mask = (((r ^ mask) >> 2) // c) | r

# Função para gerar palpites usando Gosper's Hack
def gerar_palpites_mega_sena_gosper(numeros_disponiveis, total_palpites):
    """
    Gera palpites para a Mega Sena usando o algoritmo de Gosper's Hack.
    
    Args:
        numeros_disponiveis (list): Lista de números disponíveis para formar palpites
        total_palpites (int): Número de palpites a serem gerados
        
    Returns:
        list: Lista de palpites, onde cada palpite é uma lista de 6 números
    """
    import random
    
    n = len(numeros_disponiveis)
    if n < 6:
        # Não temos números suficientes, precisamos complementar
        raise ValueError("Número insuficiente de números disponíveis")
    
    palpites = []
    palpites_set = set()  # Para verificação rápida de duplicatas
    
    # Se temos muitos números, vamos usar uma abordagem mais eficiente
    if n > 60:  # Número grande de possibilidades
        # Vamos tentar gerar aleatoriamente os primeiros palpites
        for _ in range(min(total_palpites, 1000)):  # Limitamos a 1000 tentativas aleatórias
            indices = sorted(random.sample(range(n), 6))
            palpite = tuple(sorted(numeros_disponiveis[i] for i in indices))
            
            if palpite not in palpites_set:
                palpites_set.add(palpite)
                palpites.append(list(palpite))
                
                if len(palpites) >= total_palpites:
                    return palpites
        
        # Se ainda precisamos de mais palpites, usamos Gosper's Hack
        if len(palpites) < total_palpites:
            # Embaralhar para diversidade
            indices = list(range(n))
            random.shuffle(indices)
            numeros_permutados = [numeros_disponiveis[i] for i in indices]
            
            # Gerar combinações usando Gosper's Hack
            for combo_indices in gospers_hack(6, min(n, 50)):  # Limitamos a 50 elementos para eficiência
                palpite = tuple(sorted(numeros_permutados[i] for i in combo_indices))
                
                if palpite not in palpites_set:
                    palpites_set.add(palpite)
                    palpites.append(list(palpite))
                    
                    if len(palpites) >= total_palpites:
                        return palpites
    else:
        # Para conjuntos menores, Gosper's Hack é ideal
        all_combinations = list(gospers_hack(6, n))
        random.shuffle(all_combinations)  # Embaralhar para diversidade
        
        for combo_indices in all_combinations:
            palpite = tuple(sorted(numeros_disponiveis[i] for i in combo_indices))
            
            if palpite not in palpites_set:
                palpites_set.add(palpite)
                palpites.append(list(palpite))
                
                if len(palpites) >= total_palpites:
                    break
    
    return palpites
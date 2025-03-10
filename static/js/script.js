// scripts.js
// Variáveis de controle para paginação
let paginaAtual = 1;
let totalPaginas = 1;
let carregandoPagina = false;
let todosOsPalpites = [];



// Função para formatar número no padrão brasileiro
function formatarNumeroParaBR(numero) {
    return numero.toLocaleString('pt-BR');
  }


// Inicializar a validação quando o documento estiver carregado
document.addEventListener("DOMContentLoaded", function() {
    validarEntradaDigitos();
    
    // Também adicionar mensagem de instrução inicial
    const inputDigitos = document.getElementById("numeros");
    inputDigitos.setAttribute("placeholder", "ex: 0,1,2,3,4,5,6");
    
    // Exibir a div de erro (inicialmente escondida)
    const errorDiv = document.getElementById("numerosError");
    if (!errorDiv) {
        // Se não existir, criar a div
        const div = document.createElement("div");
        div.id = "numerosError";
        div.className = "error-message";
        inputDigitos.parentNode.insertBefore(div, inputDigitos.nextSibling);
    }
});

// Função para calcular o número total de combinações possíveis
function calcularTotalCombinacoesPossiveis(n, r) {
  // Função para calcular fatorial (limita a números menores para evitar overflow)
  function fatorial(num) {
    if (num <= 1) return 1;
    let resultado = 1;
    for (let i = 2; i <= num; i++) {
      resultado *= i;
    }
    return resultado;
  }
  
  // Para números grandes, usamos uma abordagem mais eficiente
  function calcularCombinacaoGrande(n, r) {
    let resultado = 1;
    // Calcular n! / (n-r)! diretamente
    for (let i = n - r + 1; i <= n; i++) {
      resultado *= i;
    }
    // Dividir por r!
    resultado /= fatorial(r);
    return Math.floor(resultado);
  }
  
  if (n < r) return 0;
  
  // Usar método apropriado baseado no tamanho dos números
  if (n > 20) {
    return calcularCombinacaoGrande(n, r);
  } else {
    return Math.floor(fatorial(n) / (fatorial(r) * fatorial(n - r)));
  }
}

// Função auxiliar para extrair números da lista de combinações formatadas
function extrairNumerosUnicos(combinacoes) {
  const numerosUnicos = new Set();
  
  for (const combinacao of combinacoes) {
    // Tentar extrair números de 2 dígitos da combinação
    let i = 0;
    while (i < combinacao.length) {
      if (i + 1 < combinacao.length) {
        try {
          const numStr = combinacao.substring(i, i+2);
          const numero = parseInt(numStr);
          if (numero >= 1 && numero <= 60) {
            numerosUnicos.add(numero);
          }
        } catch (e) {}
      }
      i += 2;
    }
  }
  
  return [...numerosUnicos];
}




// Função para calcular combinações
// Função para calcular combinações
async function calcularCombinacoes(event) {
    event.preventDefault();
    
    const numeros = document.getElementById("numeros").value;
    const tamanho = document.getElementById("tamanho").value;
    
    try {
        const response = await fetch("/calcular", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ numeros, tamanho })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Exibe o total
            document.getElementById("totalCombinacoes").style.display = "block";
            document.getElementById("total").textContent = data.total;
            
            // Exibe as combinações
            const combinacoesDiv = document.getElementById("combinacoes");
            
            // Verificar se deve usar formatação para Excel
            if (data.formatado_para_excel) {
                // Usar a função para criar a tabela formatada para Excel
                const tabela = criarTabelaCombinacoes(data.combinacoes);
                combinacoesDiv.innerHTML = ""; // Limpar conteúdo anterior
                combinacoesDiv.appendChild(tabela);
            } else {
                // Exibição simples como texto
                combinacoesDiv.innerHTML = data.combinacoes.join(" ");
            }
            
            document.getElementById("resultadoCard").style.display = "block";
            
            // Armazenar as combinações para uso posterior
            window.combinacoesGeradas = data.combinacoes;
            
            // Verificar se deve mostrar os controles de palpites
            const digitosInput = document.getElementById("numeros").value;
            const digitos = digitosInput.split(",").map(d => d.trim()).filter(d => d);
            const quantidadeDigitos = digitos.length;
            
            // Mostrar controles apenas se tivermos 4 ou mais dígitos
            const palpitesControle = document.getElementById("palpitesControle");
            if (quantidadeDigitos >= 4 && data.total >= 12) {
                palpitesControle.style.display = "block";
                
                // Calcular o total teórico de palpites possíveis
                // Primeiro extrair os números únicos das combinações geradas
                const numerosUnicosArray = extrairNumerosUnicos(data.combinacoes);
                console.log("Números únicos extraídos:", numerosUnicosArray);
                
                const totalTeorico = calcularTotalCombinacoesPossiveis(numerosUnicosArray.length, 6);
                console.log("Total teórico calculado:", totalTeorico);
                
                // Mostrar o total teórico na interface formatado no padrão brasileiro
                document.getElementById("totalTeorico").textContent = formatarNumeroParaBR(totalTeorico);
                
                // ALTERAÇÃO AQUI: Usar totalTeorico como limite máximo sem restrição de 1000
                const limiteMaximo = Math.max(1, totalTeorico);
                const rangeInput = document.getElementById("quantidadePalpites");
                rangeInput.max = limiteMaximo;
                rangeInput.value = Math.min(10, limiteMaximo);
                document.getElementById("valorQuantidadePalpites").textContent = formatarNumeroParaBR(parseInt(rangeInput.value));
                
                // Atualizar o texto do máximo formatado no padrão brasileiro
                document.getElementById("valorMaximo").textContent = formatarNumeroParaBR(limiteMaximo);
            } else {
                palpitesControle.style.display = "none";
                // Esconder o container de palpites caso esteja visível
                document.getElementById("palpitesCard").style.display = "none";
            }
        } else {
            alert(data.erro || "Erro ao calcular combinações");
        }
    } catch (error) {
        alert("Erro ao comunicar com o servidor");
        console.error(error);
    }
}



async function gerarPalpitesMegaSena() {
    // Verificar se temos combinações geradas
    if (!window.combinacoesGeradas || window.combinacoesGeradas.length === 0) {
        alert("Por favor, gere as combinações primeiro.");
        return;
    }
    
    // Obter a quantidade desejada de palpites
    const quantidadePalpites = parseInt(document.getElementById("quantidadePalpites").value);
    
    // Reiniciar estado de paginação
    paginaAtual = 1;
    totalPaginas = 1;
    todosOsPalpites = [];
    carregandoPagina = false;
    
    // Mostrar indicador de carregamento
    document.getElementById("palpitesCard").style.display = "block";
    document.getElementById("palpites").innerHTML = 
        `<div class="alert alert-info">
            <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Carregando...</span>
            </div>
            Gerando palpites (página 1)...
        </div>`;
    
    // Carregar a primeira página
    await carregarPaginaPalpites(quantidadePalpites, 1);
    
    // Adicionar evento de scroll para carregamento infinito
    const palpitesContainer = document.getElementById("palpites");
    palpitesContainer.addEventListener("scroll", function() {
        if (!carregandoPagina && paginaAtual < totalPaginas) {
            // Verificar se estamos próximos do fim do scroll
            if (palpitesContainer.scrollHeight - palpitesContainer.scrollTop - palpitesContainer.clientHeight < 200) {
                carregarProximaPagina(quantidadePalpites);
            }
        }
    });
    
    try {
        // Após adicionar a tabela ao div palpites:
        const palpitesDiv = document.getElementById("palpites"); // Certificar-se de que o div está selecionado corretamente
        const table = document.createElement("table"); // Criando tabela caso necessário
        palpitesDiv.appendChild(table);
        
        // Adicionar botão de cópia
        const botaoCopiar = document.createElement('button');
        botaoCopiar.className = 'btn btn-sm btn-outline-primary mt-2';
        botaoCopiar.innerHTML = 'Copiar palpites para área de transferência';
        botaoCopiar.onclick = function() {
            copiarPalpitesParaClipboard(window.combinacoesGeradas);
        };
        
        palpitesDiv.appendChild(botaoCopiar);
        
    } catch (error) {
        console.error("Erro ao gerar palpites:", error);
    }
}



async function carregarPaginaPalpites(quantidadePalpites, pagina, itens_por_pagina = 100) {
    try {
        console.log("Iniciando carregamento da página", pagina);
        carregandoPagina = true;
        
        // Adicionar indicador de carregamento
        document.getElementById("paginaInfo").textContent = `Carregando página ${pagina}...`;
        
        if (pagina > 1) {
            const loadingElement = document.createElement("div");
            loadingElement.id = "carregando-mais";
            loadingElement.className = "text-center p-3";
            loadingElement.innerHTML = `
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <span class="ms-2">Carregando página ${pagina}...</span>
            `;
            document.getElementById("palpites").appendChild(loadingElement);
        } else {
            // Para a primeira página, mostrar indicador de carregamento no conteúdo
            document.getElementById("palpites").innerHTML = `
                <div class="alert alert-info" id="carregando-inicial">
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    Gerando palpites (página 1)...
                </div>
            `;
        }
        
        // Definir um timeout para a requisição
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos
        
        console.log("Enviando requisição para página", pagina);
        // Fazer requisição para a API
        const response = await fetch("/gerar_palpites", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                combinacoes: window.combinacoesGeradas,
                quantidade: quantidadePalpites,
                pagina: pagina,
                itens_por_pagina: itens_por_pagina
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log("Resposta recebida:", response.status);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Dados recebidos:", data);
        
        // Atualizar contadores de paginação
        paginaAtual = data.pagina_atual || pagina;
        totalPaginas = data.total_paginas || 1;
        
        // Remover indicador de carregamento
        const carregandoElement = document.getElementById("carregando-mais");
        if (carregandoElement) {
            carregandoElement.remove();
        }
        
        const carregandoInicial = document.getElementById("carregando-inicial");
        if (carregandoInicial) {
            carregandoInicial.remove();
        }
        
        // Atualizar o total de palpites
        
		// document.getElementById("totalPalpites").textContent = data.total;
		
		// Exibe o total de palpites formatado no padrão brasileiro
		document.getElementById("totalPalpites").textContent = formatarNumeroParaBR(data.total);
        
		//document.getElementById("paginaInfo").textContent = `Página ${paginaAtual} de ${totalPaginas}`;
		atualizarStatusPaginacao(`Página ${paginaAtual} de ${totalPaginas}`);
        
        // Adicionar novos palpites à lista
        todosOsPalpites = todosOsPalpites.concat(data.palpites);
        
        // Limpar o conteúdo se for a primeira página
        if (pagina === 1) {
            const palpitesDiv = document.getElementById("palpites");
            
            // Criar tabela
            const table = document.createElement("table");
            table.id = "tabelaPalpites";
            table.className = "table table-striped";
            
            const thead = document.createElement("thead");
            const headerRow = document.createElement("tr");
            
            // Cabeçalho numerado de 1 a 6
            for (let i = 1; i <= 6; i++) {
                const th = document.createElement("th");
                th.textContent = `Nº ${i}`;
                headerRow.appendChild(th);
            }
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // Corpo da tabela
            const tbody = document.createElement("tbody");
            tbody.id = "corpoPalpites";
            table.appendChild(tbody);
            
            // Limpar conteúdo atual e adicionar a tabela
            palpitesDiv.innerHTML = "";
            palpitesDiv.appendChild(table);
        }
        
        // Adicionar novos palpites à tabela
        const tbody = document.getElementById("corpoPalpites");
        if (!tbody) {
            console.error("Elemento corpoPalpites não encontrado!");
            return;
        }
        
        data.palpites.forEach((palpite) => {
            const row = document.createElement("tr");
            
            // Cada número do palpite em uma célula
            palpite.forEach(numero => {
                const cell = document.createElement("td");
                cell.textContent = numero;
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
        
        // Adicionar botão "Carregar Mais" se houver mais páginas
        if (paginaAtual < totalPaginas) {
            const loadMoreBtn = document.createElement("div");
            loadMoreBtn.id = "carregarMaisBtn";
            loadMoreBtn.className = "text-center p-3";
            loadMoreBtn.innerHTML = `
                <button class="btn btn-outline-primary" onclick="carregarProximaPagina(${quantidadePalpites})">
                    Carregar mais palpites
                </button>
                <div class="text-muted small mt-1">Mostrando ${todosOsPalpites.length} de ${data.total} palpites</div>
            `;
            document.getElementById("palpites").appendChild(loadMoreBtn);
        }
        
    } catch (error) {
        console.error("Erro ao carregar palpites:", error);
        
        // Mostrar mensagem de erro
        const errorElement = document.createElement("div");
        errorElement.className = "alert alert-danger mt-3";
        errorElement.innerHTML = `
            <strong>Erro ao carregar palpites:</strong> ${error.message}
            <button class="btn btn-sm btn-outline-danger mt-2" onclick="carregarPaginaPalpites(${quantidadePalpites}, ${pagina})">
                Tentar novamente
            </button>
        `;
        
        // Remover indicador de carregamento se existir
        const carregandoElement = document.getElementById("carregando-mais");
        if (carregandoElement) {
            carregandoElement.replaceWith(errorElement);
        } else {
            document.getElementById("palpites").appendChild(errorElement);
        }
    } finally {
        carregandoPagina = false;
    }
}

function carregarProximaPagina(quantidadePalpites) {
    if (!carregandoPagina && paginaAtual < totalPaginas) {
        // Remover botão "Carregar Mais" se existir
        const loadMoreBtn = document.getElementById("carregarMaisBtn");
        if (loadMoreBtn) {
            loadMoreBtn.remove();
        }
        
        // Carregar próxima página
        carregarPaginaPalpites(quantidadePalpites, paginaAtual + 1);
    }
}


document.addEventListener("DOMContentLoaded", function() {
    const rangeInput = document.getElementById("quantidadePalpites");
    const valorSpan = document.getElementById("valorQuantidadePalpites");
    
    if (rangeInput && valorSpan) {
        rangeInput.addEventListener("input", function() {
            valorSpan.textContent = formatarNumeroParaBR(parseInt(this.value));
        });
    }
});

// Funções para o modal da tabela completa
function formatarNumero(numero) {
  return numero.toLocaleString('pt-BR');
}

function abrirModal() {
  const modal = document.getElementById('modalTabelaCompleta');
  const tbody = document.getElementById('tabelaCompletaBody');
  
  // Limpar conteúdo anterior
  tbody.innerHTML = '';
  
  // Preencher com dados de 2 a 60
  for (let digitos = 2; digitos <= 60; digitos++) {
    // Calcular agrupamentos de 2
    const agrupamentos = digitos * (digitos - 1);
    
    // Calcular palpites para Mega Sena
    let palpites;
    if (digitos < 6) {
      // Valores especiais para menos de 6 dígitos
      palpites = digitos === 2 ? "-" : digitos === 3 ? "1" : digitos === 4 ? "2" : "3";
    } else {
      // Para 6 ou mais dígitos, usamos C(n,6)
      const valor = calcularTotalCombinacoesPossiveis(digitos, 6);
      palpites = valor > 999 ? formatarNumero(valor) : valor;
    }
    
    // Criar a linha da tabela
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${digitos}</td>
      <td>${formatarNumero(agrupamentos)}</td>
      <td>${palpites}</td>
    `;
    
    tbody.appendChild(tr);
  }
  
  // Exibir o modal
  modal.style.display = 'block';
}

function fecharModal() {
  document.getElementById('modalTabelaCompleta').style.display = 'none';
}

// Fechar o modal quando o usuário clicar fora dele
window.onclick = function(event) {
  const modal = document.getElementById('modalTabelaCompleta');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
}

// Fechar o modal quando pressionar ESC
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    document.getElementById('modalTabelaCompleta').style.display = 'none';
  }
});

// Certifique-se de que esta variável global é inicializada
window.combinacoesGeradas = [];



// Função para validar entrada de dígitos
function validarEntradaDigitos() {
    const inputDigitos = document.getElementById("numeros");
    const errorDiv = document.getElementById("numerosError");
    
    // Validar o padrão enquanto o usuário digita
    inputDigitos.addEventListener("input", function(e) {
        const valor = e.target.value;
        
        // Remover espaços em branco
        const valorSemEspacos = valor.replace(/\s/g, "");
        
        // Verificar se contém apenas dígitos (0-9) e vírgulas
        const regex = /^[0-9,]*$/;
        if (!regex.test(valorSemEspacos)) {
            errorDiv.textContent = "Por favor, insira apenas dígitos (0-9) separados por vírgulas.";
            errorDiv.style.display = "block";
            return;
        }
        
        // Verificar se tem números de dois dígitos (sem vírgula entre eles)
        const digitos = valorSemEspacos.split(",");
        for (const digito of digitos) {
            if (digito.length > 1) {
                errorDiv.textContent = "Cada dígito deve ser separado por vírgula. Insira apenas um dígito por vez (0-9).";
                errorDiv.style.display = "block";
                return;
            }
        }
        
        // Verificar dígitos duplicados e se estão no intervalo 0-9
        const digitosNumericos = digitos.filter(d => d !== "").map(d => parseInt(d, 10));
        const digitosUnicos = new Set(digitosNumericos);
        
        if (digitosNumericos.length > digitosUnicos.size) {
            errorDiv.textContent = "Não é permitido repetir dígitos. Use cada dígito apenas uma vez.";
            errorDiv.style.display = "block";
            return;
        }
        
        // Verificar se todos os dígitos estão no intervalo 0-9
        for (const digito of digitosNumericos) {
            if (digito < 0 || digito > 9) {
                errorDiv.textContent = "Apenas dígitos entre 0 e 9 são permitidos.";
                errorDiv.style.display = "block";
                return;
            }
        }
        
        // Se passou em todas as validações
        errorDiv.style.display = "none";
    });
    
    // Validar também no evento de submissão do formulário
    document.getElementById("formCombinacoes").addEventListener("submit", function(e) {
        const valor = inputDigitos.value;
        const valorSemEspacos = valor.replace(/\s/g, "");
        
        // Verificar se contém apenas dígitos (0-9) e vírgulas
        const regex = /^[0-9,]*$/;
        if (!regex.test(valorSemEspacos)) {
            e.preventDefault();
            errorDiv.textContent = "Por favor, insira apenas dígitos (0-9) separados por vírgulas.";
            errorDiv.style.display = "block";
            return false;
        }
        
        // Verificar se tem números de dois dígitos (sem vírgula entre eles)
        const digitos = valorSemEspacos.split(",");
        for (const digito of digitos) {
            if (digito.length > 1) {
                e.preventDefault();
                errorDiv.textContent = "Cada dígito deve ser separado por vírgula. Insira apenas um dígito por vez (0-9).";
                errorDiv.style.display = "block";
                return false;
            }
        }
        
        // Verificar dígitos duplicados e se estão no intervalo 0-9
        const digitosNumericos = digitos.filter(d => d !== "").map(d => parseInt(d, 10));
        const digitosUnicos = new Set(digitosNumericos);
        
        if (digitosNumericos.length > digitosUnicos.size) {
            e.preventDefault();
            errorDiv.textContent = "Não é permitido repetir dígitos. Use cada dígito apenas uma vez.";
            errorDiv.style.display = "block";
            return false;
        }
        
        // Verificar se todos os dígitos estão no intervalo 0-9
        for (const digito of digitosNumericos) {
            if (digito < 0 || digito > 9) {
                e.preventDefault();
                errorDiv.textContent = "Apenas dígitos entre 0 e 9 são permitidos.";
                errorDiv.style.display = "block";
                return false;
            }
        }
        
        // Se passou em todas as validações
        return true;
    });
}

// Função para criar tabela formatada para Excel
function criarTabelaCombinacoes(combinacoes) {
    // Filtrar para remover completamente números acima de 60
    const combinacoesFiltradas = combinacoes.filter(comb => {
        const num = parseInt(comb);
        return num > 0 && num <= 60; // Garantir que esteja no intervalo 1-60
    });
    
    // Ordenar numericamente (não alfabeticamente)
    combinacoesFiltradas.sort((a, b) => parseInt(a) - parseInt(b));
    
    // Configurar tabela com exatos 6 números por linha (padrão Mega Sena)
    const numeroColunas = 6;
    const numeroLinhas = Math.ceil(combinacoesFiltradas.length / numeroColunas);
    
    const tabela = document.createElement('table');
    tabela.className = 'table table-bordered tabela-excel';
    
    const tbody = document.createElement('tbody');
    let index = 0;
    
    for (let i = 0; i < numeroLinhas; i++) {
        const row = document.createElement('tr');
        
        for (let j = 0; j < numeroColunas; j++) {
            const cell = document.createElement('td');
            
            if (index < combinacoesFiltradas.length) {
                const num = parseInt(combinacoesFiltradas[index]);
                
                // Formatar com zero à esquerda para números < 10
                cell.textContent = num < 10 ? `0${num}` : num;
                cell.className = 'celula-excel';
            } else {
                // Célula vazia para completar a linha
                cell.innerHTML = '&nbsp;';
            }
            
            row.appendChild(cell);
            index++;
        }
        
        tbody.appendChild(row);
    }
    
    tabela.appendChild(tbody);
    
    // Criar contêiner para a tabela e botão de cópia
    const divContainer = document.createElement('div');
    divContainer.className = 'tabela-container';
    
    const botaoCopiar = document.createElement('button');
    botaoCopiar.className = 'btn btn-sm btn-outline-primary mt-2';
    botaoCopiar.innerHTML = 'Copiar para área de transferência';
    botaoCopiar.onclick = function() {
        copiarTabelaParaClipboard(combinacoesFiltradas);
    };
    
    divContainer.appendChild(tabela);
    divContainer.appendChild(botaoCopiar);
    
    return divContainer;
}

// Função melhorada para copiar para a área de transferência
function copiarTabelaParaClipboard(combinacoes) {
    // Formatar para colar no Excel (tabs entre colunas, nova linha entre linhas)
    const numeroColunas = 6;
    let textoFormatado = '';
    
    for (let i = 0; i < combinacoes.length; i++) {
        const num = parseInt(combinacoes[i]);
        // Formatar com zero à esquerda para números < 10
        textoFormatado += (num < 10 ? `0${num}` : num);
        
        // Adicionar tab ou nova linha
        if ((i + 1) % numeroColunas === 0) {
            textoFormatado += '\n'; // Nova linha após cada 6 números
        } else {
            textoFormatado += '\t'; // Tab entre colunas
        }
    }
    
    // Método 1: Tenta usar a API Clipboard moderna
    if (navigator.clipboard && window.isSecureContext) {
        try {
            navigator.clipboard.writeText(textoFormatado)
                .then(() => mostrarMensagemSucesso())
                .catch((err) => {
                    console.error('Erro ao usar clipboard API:', err);
                    usarMetodoAlternativo();
                });
        } catch (err) {
            console.error('Exceção ao usar clipboard API:', err);
            usarMetodoAlternativo();
        }
    } else {
        // Método alternativo para navegadores sem suporte à API Clipboard
        usarMetodoAlternativo();
    }
    
    // Função para usar o método alternativo (textarea + execCommand)
    function usarMetodoAlternativo() {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = textoFormatado;
            textArea.style.position = 'fixed';
            textArea.style.left = '0';
            textArea.style.top = '0';
            textArea.style.opacity = '0';
            textArea.style.pointerEvents = 'none';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                mostrarMensagemSucesso();
            } else {
                mostrarAreaSelecao();
            }
        } catch (err) {
            console.error('Erro ao copiar usando execCommand:', err);
            mostrarAreaSelecao();
        }
    }
    
    // Função para mostrar área de seleção manual
    function mostrarAreaSelecao() {
        // Criar uma área de texto visível que o usuário pode selecionar manualmente
        const divSelecao = document.createElement('div');
        divSelecao.className = 'area-selecao mt-3 p-3 border bg-light';
        divSelecao.innerHTML = `
            <p class="mb-2">Não foi possível copiar automaticamente. Selecione o texto abaixo e use Ctrl+C para copiar:</p>
            <pre class="border p-2 bg-white" style="white-space: pre-wrap; word-break: break-all;">${textoFormatado}</pre>
            <button class="btn btn-sm btn-secondary mt-2" onclick="this.parentNode.remove()">Fechar</button>
        `;
        document.getElementById('combinacoes').appendChild(divSelecao);
    }
    
    // Função para mostrar mensagem de sucesso
    function mostrarMensagemSucesso() {
        const message = document.createElement('div');
        message.className = 'alert alert-success mt-2';
        message.textContent = 'Combinações copiadas para a área de transferência!';
        document.getElementById('combinacoes').appendChild(message);
        
        // Remover mensagem após 3 segundos
        setTimeout(() => {
            message.remove();
        }, 3000);
    }
}



document.addEventListener("DOMContentLoaded", function() {
    // Garantir que o tamanho do agrupamento seja fixo em 2
    const tamanhoInput = document.getElementById("tamanho");
    tamanhoInput.value = "2";
    tamanhoInput.setAttribute("readonly", "readonly");
    tamanhoInput.style.backgroundColor = "#f8f9fa"; // Fundo cinza para indicar que é somente leitura
    
    // Inicializar outras funções
    validarEntradaDigitos();
    
    // Também adicionar mensagem de instrução inicial
    const inputDigitos = document.getElementById("numeros");
    inputDigitos.setAttribute("placeholder", "ex: 0,1,2,3,4,5");
});


// Função para gerar palpites (modificada para suportar assíncrono e paginação)
async function gerarPalpitesMegaSena() {
    // Verificar se temos combinações geradas
    if (!window.combinacoesGeradas || window.combinacoesGeradas.length === 0) {
        alert("Por favor, gere as combinações primeiro.");
        return;
    }
    
    // Obter a quantidade desejada de palpites
    const quantidadePalpites = parseInt(document.getElementById("quantidadePalpites").value);
    
    // Reiniciar estado de paginação
    paginaAtual = 1;
    totalPaginas = 1;
    todosOsPalpites = [];
    carregandoPagina = false;
    
    // Mostrar indicador de carregamento
    document.getElementById("palpitesCard").style.display = "block";
    
    // Garantir que o elemento de informação de paginação existe
    const cardHeader = document.querySelector("#palpitesCard .card-header");
    if (!document.getElementById("paginaInfo")) {
        const paginaInfoElement = document.createElement("div");
        paginaInfoElement.id = "paginaInfo";
        paginaInfoElement.className = "badge bg-light text-dark";
        paginaInfoElement.textContent = "Carregando...";
        cardHeader.appendChild(paginaInfoElement);
    } else {
        document.getElementById("paginaInfo").textContent = "Carregando...";
    }
    
    // Mostrar indicador no conteúdo
    document.getElementById("palpites").innerHTML = 
        `<div class="alert alert-info">
            <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Carregando...</span>
            </div>
            Gerando palpites (página 1)...
        </div>`;
    
    try {
        // Adicionar um timeout maior para a requisição
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000);
        
        const response = await fetch("/gerar_palpites", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                combinacoes: window.combinacoesGeradas,
                quantidade: quantidadePalpites
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Limpar o timeout se a requisição completar antes
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Erro na resposta:", response.status, errorText);
            throw new Error(`Erro do servidor: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Exibe o total de palpites
        document.getElementById("totalPalpites").textContent = data.total;
        
        // Exibe os palpites
        const palpitesDiv = document.getElementById("palpites");
        palpitesDiv.innerHTML = "";
        
        // Criando tabela de palpites
        const table = document.createElement("table");
        table.className = "table table-striped";
        
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        
        // Cabeçalho numerado de 1 a 6
        for (let i = 1; i <= 6; i++) {
            const th = document.createElement("th");
            th.textContent = `Nº ${i}`;
            headerRow.appendChild(th);
        }
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement("tbody");
        
        // Adicionar cada palpite como uma linha
        data.palpites.forEach((palpite, index) => {
            const row = document.createElement("tr");
            
            // Cada número do palpite em uma célula
            palpite.forEach(numero => {
                const cell = document.createElement("td");
                cell.textContent = numero;
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        palpitesDiv.appendChild(table);
        
        // Exibe o card de palpites
        document.getElementById("palpitesCard").style.display = "block";
        
    } catch (error) {
        console.error("Erro completo:", error);
        
        // Mostrar uma mensagem de erro mais informativa
        const palpitesDiv = document.getElementById("palpites");
        palpitesDiv.innerHTML = `
            <div class="alert alert-danger">
                <strong>Erro ao gerar palpites:</strong> ${error.message || 'Erro de comunicação com o servidor'}
                <hr>
                <small>Tente reduzir o número de palpites solicitados ou tente novamente mais tarde.</small>
            </div>
        `;
        
        document.getElementById("palpitesCard").style.display = "block";
    }
}


// Função para polling (backup caso WebSockets não esteja disponível)
function iniciarPolling(taskId) {
    const intervalId = setInterval(async () => {
        try {
            const response = await fetch(`/verificar_tarefa/${taskId}`);
            const data = await response.json();
            
            // Simular atualização de WebSocket
            atualizarProgressoTarefa({
                status: data.status,
                progress: Math.floor((data.current / data.total) * 100),
                message: data.status,
                result: data.resultado
            });
            
            // Se concluído ou falhou, parar o polling
            if (data.status === 'concluído' || data.status === 'falha') {
                clearInterval(intervalId);
            }
        } catch (error) {
            console.error("Erro no polling:", error);
        }
    }, 2000); // Verificar a cada 2 segundos
}

// Função para exibir os palpites
function exibirPalpites(palpites) {
    const palpitesDiv = document.getElementById("palpites");
    palpitesDiv.innerHTML = "";
    
    // Criando tabela de palpites
    const table = document.createElement("table");
    table.className = "table table-striped";
    
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    
    // Cabeçalho numerado de 1 a 6
    for (let i = 1; i <= 6; i++) {
        const th = document.createElement("th");
        th.textContent = `Nº ${i}`;
        headerRow.appendChild(th);
    }
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement("tbody");
    
    // Adicionar cada palpite como uma linha
    palpites.forEach((palpite) => {
        const row = document.createElement("tr");
        
        // Cada número do palpite em uma célula
        palpite.forEach(numero => {
            const cell = document.createElement("td");
            cell.textContent = numero;
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    palpitesDiv.appendChild(table);
}

// Event handler para o botão de novo processamento
document.addEventListener("DOMContentLoaded", function() {
    const btnNovo = document.getElementById("btnNovoProcessamento");
    if (btnNovo) {
        btnNovo.addEventListener("click", function() {
            // Esconder o card de processamento
            document.getElementById("processamentoAssincrono").style.display = "none";
            // Limpar o task ID atual
            if (typeof currentTaskId !== 'undefined') {
                currentTaskId = null;
            }
        });
    }
});

function reiniciarPalpites() {
    // Limpar estado atual
    todosOsPalpites = [];
    paginaAtual = 1;
    totalPaginas = 1;
    carregandoPagina = false;
    
    // Obter a quantidade de palpites atual
    const quantidadePalpites = parseInt(document.getElementById("quantidadePalpites").value);
    
    // Reiniciar a visualização
    document.getElementById("paginaInfo").textContent = "Reiniciando...";
    document.getElementById("palpites").innerHTML = "";
    
    // Iniciar carregamento novamente
    carregarPaginaPalpites(quantidadePalpites, 1);
}
function atualizarStatusPaginacao(mensagem) {
    const paginaInfoElement = document.getElementById("paginaInfo");
    if (paginaInfoElement) {
        paginaInfoElement.textContent = mensagem;
    }
}


// Alternativa para copiar quando a API Clipboard não está disponível
function copiarTabelaAlternativo(combinacoes) {
    // Criar um elemento textArea temporário
    const textArea = document.createElement('textarea');
    
    // Formatar dados
    const numeroColunas = 6;
    let textoFormatado = '';
    
    for (let i = 0; i < combinacoes.length; i++) {
        const num = parseInt(combinacoes[i]);
        textoFormatado += (num < 10 ? `0${num}` : num);
        
        if ((i + 1) % numeroColunas === 0) {
            textoFormatado += '\n';
        } else {
            textoFormatado += '\t';
        }
    }
    
    // Configurar e adicionar textArea
    textArea.value = textoFormatado;
    document.body.appendChild(textArea);
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    
    // Selecionar e copiar
    textArea.select();
    document.execCommand('copy');
    
    // Remover o elemento
    document.body.removeChild(textArea);
    
    // Feedback
    alert('Combinações copiadas para a área de transferência!');
}
// Função para copiar palpites da Mega Sena para a área de transferência
function copiarPalpitesParaClipboard(palpites) {
    // Formatar para colar no Excel (tabs entre colunas, nova linha entre linhas)
    let textoFormatado = '';
    
    for (let i = 0; i < palpites.length; i++) {
        const palpite = palpites[i];
        
        // Para cada número no palpite
        for (let j = 0; j < palpite.length; j++) {
            const num = palpite[j];
            // Adicionar o número
            textoFormatado += num;
            
            // Adicionar tab ou nova linha
            if (j < palpite.length - 1) {
                textoFormatado += '\t'; // Tab entre números do mesmo palpite
            }
        }
        
        // Nova linha após cada palpite completo
        textoFormatado += '\n';
    }
    
    // Método 1: Tenta usar a API Clipboard moderna
    if (navigator.clipboard && window.isSecureContext) {
        try {
            navigator.clipboard.writeText(textoFormatado)
                .then(() => mostrarMensagemSucesso('palpites'))
                .catch((err) => {
                    console.error('Erro ao usar clipboard API:', err);
                    usarMetodoAlternativo();
                });
        } catch (err) {
            console.error('Exceção ao usar clipboard API:', err);
            usarMetodoAlternativo();
        }
    } else {
        // Método alternativo para navegadores sem suporte à API Clipboard
        usarMetodoAlternativo();
    }
    
    // Função para usar o método alternativo (textarea + execCommand)
    function usarMetodoAlternativo() {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = textoFormatado;
            textArea.style.position = 'fixed';
            textArea.style.left = '0';
            textArea.style.top = '0';
            textArea.style.opacity = '0';
            textArea.style.pointerEvents = 'none';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                mostrarMensagemSucesso('palpites');
            } else {
                mostrarAreaSelecao();
            }
        } catch (err) {
            console.error('Erro ao copiar usando execCommand:', err);
            mostrarAreaSelecao();
        }
    }
    
    // Função para mostrar área de seleção manual
    function mostrarAreaSelecao() {
        // Criar uma área de texto visível que o usuário pode selecionar manualmente
        const divSelecao = document.createElement('div');
        divSelecao.className = 'area-selecao mt-3 p-3 border bg-light';
        divSelecao.innerHTML = `
            <p class="mb-2">Não foi possível copiar automaticamente. Selecione o texto abaixo e use Ctrl+C para copiar:</p>
            <pre class="border p-2 bg-white" style="white-space: pre-wrap; word-break: break-all;">${textoFormatado}</pre>
            <button class="btn btn-sm btn-secondary mt-2" onclick="this.parentNode.remove()">Fechar</button>
        `;
        document.getElementById('palpites').appendChild(divSelecao);
    }
}

// Função para mostrar mensagem de sucesso (agora aceita um parâmetro para identificar o container)
function mostrarMensagemSucesso(container = 'combinacoes') {
    const message = document.createElement('div');
    message.className = 'alert alert-success mt-2';
    message.textContent = container === 'palpites' ? 
        'Palpites copiados para a área de transferência!' : 
        'Combinações copiadas para a área de transferência!';
    
    document.getElementById(container).appendChild(message);
    
    // Remover mensagem após 3 segundos
    setTimeout(() => {
        message.remove();
    }, 3000);
}
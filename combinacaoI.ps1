# Script PowerShell para configurar o ambiente do projeto
# Nome do arquivo: combinacaoI.ps1

# Definindo o caminho do projeto
$projectPath = "J:\Meu Drive\ProjetosPython\Loterias\Combinacoes\Combinacao-I"

# Criando a estrutura de diretórios
Write-Host "Criando estrutura de diretorios..." -ForegroundColor Green

# Lista de diretórios para criar
$diretorios = @(
    $projectPath,
    "$projectPath\templates",
    "$projectPath\static",
    "$projectPath\static\css",
    "$projectPath\static\js",
    "$projectPath\static\img",
    "$projectPath\logs",
    "$projectPath\venv"
)

# Criar cada diretório
foreach ($dir in $diretorios) {
    New-Item -Path $dir -ItemType Directory -Force
    Write-Host "Criado diretório: $dir" -ForegroundColor Cyan
}

# Conteúdo do arquivo requirements.txt
$requirementsContent = @'
flask==2.0.1
python-dotenv==0.19.0
Werkzeug==2.0.1
'@

# Conteúdo do arquivo .env
$envContent = @'
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=1
'@

# Conteúdo do arquivo Python principal (app.py)
$pythonContent = @'
from flask import Flask, render_template, request, jsonify
import itertools
from typing import List, Set
import logging
from logging.handlers import RotatingFileHandler
import os

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
app.logger.info('Iniciando aplicação de Combinações')

def gerar_combinacoes(numeros: List[int], tamanho: int) -> Set[tuple]:
    """Gera todas as combinações possíveis dos números dados."""
    return set(itertools.permutations(numeros, tamanho))

def formatar_numero(combinacao: tuple) -> str:
    """Formata uma combinação como uma string de dois dígitos."""
    return "".join(map(str, combinacao))

@app.route("/")
def index():
    return render_template("index.html")

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
        
        # Processamento dos números
        numeros = [int(n.strip()) for n in numeros_str.split(",")]
        
        # Cálculo das combinações
        combinacoes = gerar_combinacoes(numeros, tamanho)
        combinacoes_formatadas = [formatar_numero(c) for c in combinacoes]
        combinacoes_formatadas.sort()
        
        app.logger.info(f'Geradas {len(combinacoes)} combinações')
        
        return jsonify({
            "total": len(combinacoes),
            "combinacoes": combinacoes_formatadas
        })
        
    except ValueError as e:
        app.logger.error(f'Erro nos dados de entrada: {str(e)}')
        return jsonify({"erro": f"Erro nos dados de entrada: {str(e)}"}), 400
    except Exception as e:
        app.logger.error(f'Erro inesperado: {str(e)}')
        return jsonify({"erro": f"Erro inesperado: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)
'@

# Conteúdo do arquivo JavaScript principal
$jsContent = @'
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
            combinacoesDiv.innerHTML = data.combinacoes.join("<br>");
            document.getElementById("resultadoCard").style.display = "block";
        } else {
            alert(data.erro || "Erro ao calcular combinações");
        }
    } catch (error) {
        alert("Erro ao comunicar com o servidor");
        console.error(error);
    }
}
'@

# Conteúdo do arquivo CSS principal
$cssContent = @'
.resultado-box {
    max-height: 300px;
    overflow-y: auto;
    padding: 15px;
}

.numero {
    display: inline-block;
    padding: 5px 10px;
    margin: 2px;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
}

.error-message {
    color: #dc3545;
    margin-top: 5px;
    display: none;
}
'@

# Conteúdo do arquivo HTML template
$templateContent = @'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calculadora de Combinações</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="{{ url_for('static', filename='css/style.css') }}" rel="stylesheet">
</head>
<body>
    <div class="container mt-5">
        <h1 class="text-center mb-4">Calculadora de Combinações</h1>
        
        <div class="card">
            <div class="card-body">
                <form id="formCombinacoes" onsubmit="calcularCombinacoes(event)">
                    <div class="mb-3">
                        <label for="numeros" class="form-label">Digite os números (separados por vírgula):</label>
                        <input type="text" class="form-control" id="numeros" required>
                        <div class="error-message" id="numerosError"></div>
                    </div>
                    
                    <div class="mb-3">
                        <label for="tamanho" class="form-label">Tamanho do agrupamento:</label>
                        <input type="number" class="form-control" id="tamanho" min="1" required>
                        <div class="error-message" id="tamanhoError"></div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">Calcular Combinações</button>
                </form>
            </div>
        </div>

        <div class="mt-4">
            <div class="alert alert-info" id="totalCombinacoes" style="display: none;">
                Total de combinações: <span id="total"></span>
            </div>
            
            <div class="card mt-3" id="resultadoCard" style="display: none;">
                <div class="card-header">
                    Combinações Encontradas
                </div>
                <div class="card-body resultado-box">
                    <div id="combinacoes"></div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="{{ url_for('static', filename='js/script.js') }}"></script>
</body>
</html>
'@

# Criando os arquivos com seus conteúdos
Write-Host "Criando arquivos do projeto..." -ForegroundColor Green

# Criar arquivos principais
Set-Content -Path "$projectPath\app.py" -Value $pythonContent -Encoding UTF8
Set-Content -Path "$projectPath\templates\index.html" -Value $templateContent -Encoding UTF8
Set-Content -Path "$projectPath\static\js\script.js" -Value $jsContent -Encoding UTF8
Set-Content -Path "$projectPath\static\css\style.css" -Value $cssContent -Encoding UTF8
Set-Content -Path "$projectPath\requirements.txt" -Value $requirementsContent -Encoding UTF8
Set-Content -Path "$projectPath\.env" -Value $envContent -Encoding UTF8

# Criar e ativar ambiente virtual
Write-Host "`nConfigurando ambiente virtual..." -ForegroundColor Green
Set-Location -Path $projectPath
python -m venv venv
.\venv\Scripts\Activate

# Instalar dependências
Write-Host "`nInstalando dependências..." -ForegroundColor Green
pip install -r requirements.txt

Write-Host "`nProjeto configurado com sucesso!" -ForegroundColor Green
Write-Host "`nEstrutura criada:" -ForegroundColor Yellow
Write-Host $projectPath -ForegroundColor Cyan
Write-Host "├── static/" -ForegroundColor Cyan
Write-Host "│   ├── css/" -ForegroundColor Cyan
Write-Host "│   │   └── style.css" -ForegroundColor Cyan
Write-Host "│   ├── js/" -ForegroundColor Cyan
Write-Host "│   │   └── script.js" -ForegroundColor Cyan
Write-Host "│   └── img/" -ForegroundColor Cyan
Write-Host "├── templates/" -ForegroundColor Cyan
Write-Host "│   └── index.html" -ForegroundColor Cyan
Write-Host "├── app.py" -ForegroundColor Cyan
Write-Host "├── logs/" -ForegroundColor Cyan
Write-Host "├── venv/" -ForegroundColor Cyan
Write-Host "├── .env" -ForegroundColor Cyan
Write-Host "└── requirements.txt" -ForegroundColor Cyan

Write-Host "`nPara executar o programa:" -ForegroundColor Yellow
Write-Host "1. Certifique-se de estar no diretório do projeto: $projectPath" -ForegroundColor Yellow
Write-Host "2. Ative o ambiente virtual: .\venv\Scripts\Activate" -ForegroundColor Yellow
Write-Host "3. Execute com: python app.py" -ForegroundColor Yellow
Write-Host "4. Acesse: http://localhost:5000" -ForegroundColor Yellow
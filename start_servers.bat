@echo off
cls
echo ======== INICIANDO SERVIDORES EM ORDEM ========
echo.

@echo 1. Iniciando Redis...
@start cmd /k "redis-server.exe"
@timeout /t 5

echo 2. Iniciando Celery...
cd /d "J:\Meu Drive\ProjetosPython\Loterias\Combinacoes\Combinacao-I"
start cmd /k "call venv\scripts\activate && celery -A celery_config worker --loglevel=info --pool=solo"
timeout /t 5

echo 3. Iniciando Socket.IO...
cd /d "J:\Meu Drive\ProjetosPython\Loterias\Combinacoes\Combinacao-I"
start cmd /k "call venv\scripts\activate && python socketio_server.py"
timeout /t 5

echo 4. Iniciando Aplicação Flask...
cd /d "J:\Meu Drive\ProjetosPython\Loterias\Combinacoes\Combinacao-I"
start cmd /k "call venv\scripts\activate && python app.py"

echo ======== TODOS OS SERVIÇOS INICIADOS! ========
echo Para encerrar todos os processos, feche as janelas de comando.
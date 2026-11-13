@echo off
rem Inicia o banco (MariaDB do XAMPP, porta 8000) e a API Flask (porta 5000).
rem Nao precisa do painel do XAMPP. Feche esta janela (ou Ctrl+C) para parar a API.
setlocal
cd /d "%~dp0"

if "%XAMPP_DIR%"=="" set "XAMPP_DIR=c:\xampp"
set "MYSQLD=%XAMPP_DIR%\mysql\bin\mysqld.exe"
set "MYINI=%XAMPP_DIR%\mysql\bin\my.ini"

if not exist ".venv\Scripts\python.exe" (
  echo [erro] Ambiente Python nao encontrado. Rode primeiro:
  echo   python -m venv .venv
  echo   .venv\Scripts\python -m pip install -r backend\requirements.txt
  pause
  exit /b 1
)

call :banco_ativo
if not errorlevel 1 (
  echo [banco] MariaDB ja esta rodando na porta 8000.
  goto api
)

if not exist "%MYSQLD%" (
  echo [erro] Nao achei "%MYSQLD%". Ajuste a variavel XAMPP_DIR.
  pause
  exit /b 1
)

echo [banco] Iniciando MariaDB do XAMPP...
start "MariaDB (XAMPP) - porta 8000" /min "%MYSQLD%" --defaults-file="%MYINI%" --standalone --console

for /l %%i in (1,1,20) do (
  call :banco_ativo
  if not errorlevel 1 goto banco_ok
  ping -n 2 127.0.0.1 >nul
)
echo [erro] O MariaDB nao respondeu na porta 8000. Veja a janela "MariaDB (XAMPP)".
pause
exit /b 1

:banco_ok
echo [banco] Pronto.

:api
echo [api] Iniciando em http://localhost:5000
start "" http://localhost:5000
".venv\Scripts\python.exe" backend\app.py
exit /b %errorlevel%

:banco_ativo
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul
exit /b %errorlevel%

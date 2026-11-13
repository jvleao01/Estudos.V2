# Estudos

Webapp pessoal para controlar matérias, provas, trabalhos e tempo de estudo.

## Rodar

O XAMPP é usado **só como banco de dados** (MariaDB na porta **8000**; a 3306 é do MySQL 8).
O backend é a API Flask em `backend/app.py`, que também entrega o frontend.

**Atalho:** depois de fazer os passos 2 e 3 uma vez, basta dar dois cliques em `iniciar.bat`.
Ele liga o MariaDB do XAMPP (sem precisar do painel), inicia a API e abre http://localhost:5000.
Se o XAMPP não estiver em `c:\xampp`, defina a variável `XAMPP_DIR`.

Passo a passo manual:

1. Ligue o banco: no painel do XAMPP (só o **MySQL**, o Apache não é usado) ou direto:
   ```
   c:\xampp\mysql\bin\mysqld.exe --defaults-file=c:\xampp\mysql\bin\my.ini --standalone --console
   ```
2. Crie o banco (só na primeira vez) e, se quiser, carregue os dados de exemplo:
   ```
   c:\xampp\mysql\bin\mysql -uroot -h127.0.0.1 -P8000 < backend\sql\bd.sql
   c:\xampp\mysql\bin\mysql -uroot -h127.0.0.1 -P8000 estudos < backend\sql\seed.sql
   ```
3. Ambiente Python (só na primeira vez):
   ```
   python -m venv .venv
   .venv\Scripts\python -m pip install -r backend\requirements.txt
   ```
4. Inicie o servidor e abra http://localhost:5000
   ```
   .venv\Scripts\python backend\app.py
   ```

Configuração do banco por variáveis de ambiente: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

## Testes

```
.venv\Scripts\python -m pytest backend\tests -q
node --test "tests/*.test.js"
```
Os testes de API usam um banco separado (`estudos_test`), criado e apagado automaticamente.

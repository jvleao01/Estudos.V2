import os
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

os.environ["DB_NAME"] = "estudos_test"

import pymysql  # noqa: E402

from conexao.conexao import config_banco  # noqa: E402

TABELAS = ["sessoes_estudo", "trabalhos", "provas", "materias"]


def _conexao_servidor():
    cfg = config_banco()
    cfg.pop("database")
    return pymysql.connect(**cfg, autocommit=True)


def _executar_script(cur, sql):
    for comando in sql.split(";"):
        if comando.strip():
            cur.execute(comando)


@pytest.fixture(scope="session")
def banco_teste():
    try:
        con = _conexao_servidor()
    except pymysql.err.OperationalError as e:
        pytest.skip(f"MySQL indisponível para os testes: {e}")
    sql = (BACKEND / "sql" / "bd.sql").read_text(encoding="utf-8")
    sql = sql.replace("`estudos`", "`estudos_test`")
    with con.cursor() as cur:
        cur.execute("DROP DATABASE IF EXISTS `estudos_test`")
        _executar_script(cur, sql)
    yield con
    with con.cursor() as cur:
        cur.execute("DROP DATABASE IF EXISTS `estudos_test`")
    con.close()


@pytest.fixture
def db(banco_teste):
    """Conexão no banco de teste, com tabelas limpas a cada teste."""
    with banco_teste.cursor() as cur:
        cur.execute("USE `estudos_test`")
        cur.execute("SET FOREIGN_KEY_CHECKS = 0")
        for t in TABELAS:
            cur.execute(f"TRUNCATE TABLE {t}")
        cur.execute("SET FOREIGN_KEY_CHECKS = 1")
    return banco_teste


@pytest.fixture
def client(db):
    from app import create_app

    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()

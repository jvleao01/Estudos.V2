import pymysql
import pytest

from conftest import BACKEND, _executar_script


def _script_teste():
    sql = (BACKEND / "sql" / "bd.sql").read_text(encoding="utf-8")
    return sql.replace("`estudos`", "`estudos_test`")


def _materia(cur):
    cur.execute(
        "INSERT INTO materias (nome, semestre, cor, status) VALUES ('Cálculo', '2026.2', '#6c8cff', 'cursando')"
    )
    return cur.lastrowid


def test_provas_tem_concluido_padrao_falso(db):
    with db.cursor() as cur:
        mid = _materia(cur)
        cur.execute("INSERT INTO provas (materia_id, titulo, data) VALUES (%s, 'P1', '2026-12-01')", (mid,))
        cur.execute("SELECT concluido FROM provas WHERE id = %s", (cur.lastrowid,))
        assert cur.fetchone()[0] == 0


def test_entrega_obrigatoria(db):
    with db.cursor() as cur:
        mid = _materia(cur)
        # O XAMPP vem sem modo estrito (NOT NULL faltando vira só aviso); a regra da tabela é testada em modo estrito.
        cur.execute("SET SESSION sql_mode = 'STRICT_ALL_TABLES'")
        try:
            with pytest.raises((pymysql.err.IntegrityError, pymysql.err.OperationalError)):
                cur.execute("INSERT INTO trabalhos (materia_id, titulo) VALUES (%s, 'Lista')", (mid,))
        finally:
            cur.execute("SET SESSION sql_mode = DEFAULT")


def test_bd_sql_pode_rodar_de_novo_sem_perder_dados(db):
    with db.cursor() as cur:
        mid = _materia(cur)
        cur.execute("INSERT INTO provas (materia_id, titulo, data) VALUES (%s, 'P1', '2026-12-01')", (mid,))
        _executar_script(cur, _script_teste())
        cur.execute("SELECT COUNT(*) FROM provas")
        assert cur.fetchone()[0] == 1

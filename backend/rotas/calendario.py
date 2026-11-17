"""API do Calendário: semestres (datas e dias de aula), aulas desmarcadas e dados do mês."""
from datetime import date

from flask import Blueprint, jsonify, request

from conexao.conexao import get_conexao
from rotas.materias import RE_SEMESTRE
from rotas.validacao import ErroValidacao, erro, validar_data

bp = Blueprint("calendario", __name__, url_prefix="/api")

DIAS_VALIDOS = range(1, 7)  # 1 = segunda ... 6 = sábado
MAX_DIAS_SEMESTRE = 200


@bp.errorhandler(ErroValidacao)
def _validacao(e):
    return erro(str(e), 400)


def validar_semestre(semestre):
    if not RE_SEMESTRE.match(semestre):
        raise ErroValidacao("Semestre inválido. Use o formato 2026.1 ou 2026.2.")


def validar_dias(dias):
    if not isinstance(dias, list) or len(set(map(repr, dias))) != len(dias):
        raise ErroValidacao("Dia da semana inválido.")
    for d in dias:
        if isinstance(d, bool) or not isinstance(d, int) or d not in DIAS_VALIDOS:
            raise ErroValidacao("Dia da semana inválido.")
    return sorted(dias)


def buscar_semestre(cur, semestre):
    cur.execute("SELECT inicio, fim FROM semestres WHERE semestre = %s", (semestre,))
    linha = cur.fetchone()
    cur.execute("SELECT id, nome, cor, status FROM materias WHERE semestre = %s ORDER BY nome", (semestre,))
    materias = cur.fetchall()
    dias = {}
    if materias:
        ids = [m["id"] for m in materias]
        cur.execute(
            f"SELECT materia_id, dia_semana FROM aulas_semana WHERE materia_id IN ({','.join(['%s'] * len(ids))}) "
            "ORDER BY dia_semana", ids)
        for a in cur.fetchall():
            dias.setdefault(a["materia_id"], []).append(a["dia_semana"])
    return {
        "semestre": semestre,
        "inicio": linha["inicio"].isoformat() if linha else None,
        "fim": linha["fim"].isoformat() if linha else None,
        "materias": [{**m, "dias": dias.get(m["id"], [])} for m in materias],
    }


@bp.get("/semestres/<semestre>")
def ler_semestre(semestre):
    validar_semestre(semestre)
    with get_conexao() as con, con.cursor() as cur:
        return jsonify(buscar_semestre(cur, semestre))


@bp.put("/semestres/<semestre>")
def gravar_semestre(semestre):
    validar_semestre(semestre)
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        raise ErroValidacao("Envie os dados em JSON.")
    inicio = validar_data(dados.get("inicio"))
    fim = validar_data(dados.get("fim"))
    if inicio >= fim:
        raise ErroValidacao("O início deve ser antes do fim.")
    if (date.fromisoformat(fim) - date.fromisoformat(inicio)).days + 1 > MAX_DIAS_SEMESTRE:
        raise ErroValidacao(f"O semestre pode ter no máximo {MAX_DIAS_SEMESTRE} dias.")
    aulas = dados.get("aulas", {})
    if not isinstance(aulas, dict):
        raise ErroValidacao("Envie as aulas por matéria.")
    limpo = {}
    for chave, dias in aulas.items():
        limpo[chave] = validar_dias(dias)

    with get_conexao() as con, con.cursor() as cur:
        cur.execute("SELECT id FROM materias WHERE semestre = %s", (semestre,))
        do_semestre = {str(m["id"]): m["id"] for m in cur.fetchall()}
        if any(chave not in do_semestre for chave in limpo):
            raise ErroValidacao("Matéria não pertence a esse semestre.")
        # Tudo validado: grava numa transação só (a conexão é autocommit).
        con.begin()
        try:
            cur.execute(
                "INSERT INTO semestres (semestre, inicio, fim) VALUES (%s, %s, %s) "
                "ON DUPLICATE KEY UPDATE inicio = VALUES(inicio), fim = VALUES(fim)",
                (semestre, inicio, fim))
            for chave, dias in limpo.items():
                mid = do_semestre[chave]
                cur.execute("DELETE FROM aulas_semana WHERE materia_id = %s", (mid,))
                if dias:
                    cur.executemany("INSERT INTO aulas_semana (materia_id, dia_semana) VALUES (%s, %s)",
                                    [(mid, d) for d in dias])
            con.commit()
        except Exception:
            con.rollback()
            raise
        return jsonify(buscar_semestre(cur, semestre))

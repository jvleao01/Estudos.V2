"""API do Dashboard: /api/dashboard — mesmo formato do antigo getDashboardData() de exemplo."""
from datetime import date, timedelta

from flask import Blueprint, jsonify, request

from conexao.conexao import get_conexao
from rotas.validacao import ErroValidacao, erro, validar_data

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]


@bp.errorhandler(ErroValidacao)
def _validacao(e):
    return erro(str(e), 400)


@bp.get("")
def dashboard():
    inicio = date.fromisoformat(validar_data(request.args.get("inicio")))
    fim = inicio + timedelta(days=6)
    periodo = (inicio, fim)
    with get_conexao() as con, con.cursor() as cur:
        # Só matérias com tempo na semana (as outras ficam fora dos gráficos).
        cur.execute(
            """SELECT m.id, m.nome, m.cor, SUM(s.minutos) AS minutosSemana
               FROM sessoes_estudo s JOIN materias m ON m.id = s.materia_id
               WHERE DATE(s.inicio) BETWEEN %s AND %s
               GROUP BY m.id, m.nome, m.cor
               ORDER BY m.nome""",
            periodo,
        )
        materias = [{**m, "minutosSemana": int(m["minutosSemana"])} for m in cur.fetchall()]

        cur.execute(
            """SELECT DATE(inicio) AS dia, SUM(minutos) AS minutos
               FROM sessoes_estudo WHERE DATE(inicio) BETWEEN %s AND %s GROUP BY DATE(inicio)""",
            periodo,
        )
        por_data = {r["dia"]: int(r["minutos"]) for r in cur.fetchall()}
        por_dia = [{"dia": nome, "minutos": por_data.get(inicio + timedelta(days=i), 0)} for i, nome in enumerate(DIAS)]

        # Provas pendentes a partir do início da semana; o navegador filtra "de hoje em diante".
        cur.execute(
            """SELECT p.materia_id, p.titulo, p.data, m.nome, m.cor
               FROM provas p JOIN materias m ON m.id = p.materia_id
               WHERE NOT p.concluido AND p.data >= %s
               ORDER BY p.data, p.id""",
            (inicio,),
        )
        provas = [
            {"materiaId": p["materia_id"], "titulo": p["titulo"], "data": p["data"].isoformat(),
             "materia": {"nome": p["nome"], "cor": p["cor"]}}
            for p in cur.fetchall()
        ]

    return jsonify(
        semana={"inicio": inicio.isoformat(), "fim": fim.isoformat()},
        materias=materias, porDia=por_dia, provas=provas,
    )

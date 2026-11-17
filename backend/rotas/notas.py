"""API da página Notas: /api/notas (só leitura; as notas são lançadas por /api/provas e /api/trabalhos)."""
from flask import Blueprint, jsonify

from conexao.conexao import get_conexao
from rotas.validacao import pontos_json

bp = Blueprint("notas", __name__, url_prefix="/api/notas")

SQL_ITENS = """
SELECT * FROM (
  SELECT id, materia_id, 'prova' AS tipo, titulo, data, valor, nota, simulado, concluido FROM provas
  UNION ALL
  SELECT id, materia_id, 'trabalho' AS tipo, titulo, entrega AS data, valor, nota, 0 AS simulado, concluido
  FROM trabalhos
) i
WHERE i.materia_id IN ({marcadores})
ORDER BY i.data, i.tipo, i.id
"""


@bp.get("")
def listar():
    with get_conexao() as con, con.cursor() as cur:
        cur.execute(
            "SELECT id, nome, cor, nota_minima, nota_total FROM materias WHERE status = 'cursando' ORDER BY nome"
        )
        materias = [
            {"id": m["id"], "nome": m["nome"], "cor": m["cor"],
             "notaMinima": pontos_json(m["nota_minima"]), "notaTotal": pontos_json(m["nota_total"]), "itens": []}
            for m in cur.fetchall()
        ]
        if not materias:
            return jsonify([])
        por_id = {m["id"]: m for m in materias}
        cur.execute(SQL_ITENS.format(marcadores=",".join(["%s"] * len(por_id))), list(por_id))
        for i in cur.fetchall():
            por_id[i["materia_id"]]["itens"].append({
                "id": i["id"],
                "tipo": i["tipo"],
                "titulo": i["titulo"],
                "data": i["data"].isoformat(),
                "valor": pontos_json(i["valor"]),
                "nota": pontos_json(i["nota"]),
                "simulado": bool(i["simulado"]),
                "concluido": bool(i["concluido"]),
            })
        return jsonify(materias)

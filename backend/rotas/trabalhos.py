"""API de trabalhos: /api/trabalhos"""
from flask import Blueprint, jsonify, request

from conexao.conexao import get_conexao
from rotas.validacao import ErroValidacao, erro, materia_existe, validar_item

bp = Blueprint("trabalhos", __name__, url_prefix="/api/trabalhos")

# Pendentes primeiro, do prazo mais próximo (atrasados no topo); depois os entregues, do mais recente.
SQL_LISTA = """
SELECT t.id, t.materia_id, m.nome AS materia_nome, m.cor AS materia_cor, t.titulo, t.entrega, t.concluido
FROM trabalhos t JOIN materias m ON m.id = t.materia_id
{where}
ORDER BY t.concluido,
         IF(t.concluido, NULL, t.entrega),
         t.entrega DESC,
         t.id
"""


def formatar(linha):
    return {
        "id": linha["id"],
        "materiaId": linha["materia_id"],
        "materia": {"nome": linha["materia_nome"], "cor": linha["materia_cor"]},
        "titulo": linha["titulo"],
        "entrega": linha["entrega"].isoformat(),
        "concluido": bool(linha["concluido"]),
    }


def buscar(cur, where="", params=()):
    cur.execute(SQL_LISTA.format(where=where), params)
    return [formatar(linha) for linha in cur.fetchall()]


def buscar_um(cur, tid):
    lista = buscar(cur, "WHERE t.id = %s", (tid,))
    return lista[0] if lista else None


@bp.errorhandler(ErroValidacao)
def _validacao(e):
    return erro(str(e), 400)


@bp.get("")
def listar():
    with get_conexao() as con, con.cursor() as cur:
        return jsonify(buscar(cur))


@bp.post("")
def criar():
    dados = validar_item(request.get_json(silent=True), "entrega")
    with get_conexao() as con, con.cursor() as cur:
        if not materia_existe(cur, dados["materia_id"]):
            raise ErroValidacao("Matéria não encontrada.")
        cur.execute(
            "INSERT INTO trabalhos (materia_id, titulo, entrega) VALUES (%s, %s, %s)",
            (dados["materia_id"], dados["titulo"], dados["entrega"]),
        )
        return jsonify(buscar_um(cur, cur.lastrowid)), 201


@bp.patch("/<int:tid>")
def editar(tid):
    dados = validar_item(request.get_json(silent=True), "entrega", parcial=True)
    with get_conexao() as con, con.cursor() as cur:
        if buscar_um(cur, tid) is None:
            return erro("Trabalho não encontrado.", 404)
        if "materia_id" in dados and not materia_existe(cur, dados["materia_id"]):
            raise ErroValidacao("Matéria não encontrada.")
        if dados:
            colunas = ", ".join(f"{c} = %s" for c in dados)  # nomes vêm de validar_item(), não do usuário
            cur.execute(f"UPDATE trabalhos SET {colunas} WHERE id = %s", (*dados.values(), tid))
        return jsonify(buscar_um(cur, tid))


@bp.delete("/<int:tid>")
def excluir(tid):
    with get_conexao() as con, con.cursor() as cur:
        cur.execute("DELETE FROM trabalhos WHERE id = %s", (tid,))
        if cur.rowcount == 0:
            return erro("Trabalho não encontrado.", 404)
        return "", 204

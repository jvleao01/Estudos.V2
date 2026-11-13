"""API de provas: /api/provas"""
from flask import Blueprint, jsonify, request

from conexao.conexao import get_conexao
from rotas.validacao import ErroValidacao, erro, materia_existe, validar_item

bp = Blueprint("provas", __name__, url_prefix="/api/provas")

# Pendentes primeiro, do prazo mais próximo (as que já passaram no topo); depois as feitas, do mais recente.
SQL_LISTA = """
SELECT t.id, t.materia_id, m.nome AS materia_nome, m.cor AS materia_cor, t.titulo, t.data, t.concluido
FROM provas t JOIN materias m ON m.id = t.materia_id
{where}
ORDER BY t.concluido,
         IF(t.concluido, NULL, t.data),
         t.data DESC,
         t.id
"""


def formatar(linha):
    return {
        "id": linha["id"],
        "materiaId": linha["materia_id"],
        "materia": {"nome": linha["materia_nome"], "cor": linha["materia_cor"]},
        "titulo": linha["titulo"],
        "data": linha["data"].isoformat(),
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
    dados = validar_item(request.get_json(silent=True), "data")
    with get_conexao() as con, con.cursor() as cur:
        if not materia_existe(cur, dados["materia_id"]):
            raise ErroValidacao("Matéria não encontrada.")
        cur.execute(
            "INSERT INTO provas (materia_id, titulo, data) VALUES (%s, %s, %s)",
            (dados["materia_id"], dados["titulo"], dados["data"]),
        )
        return jsonify(buscar_um(cur, cur.lastrowid)), 201


@bp.patch("/<int:tid>")
def editar(tid):
    dados = validar_item(request.get_json(silent=True), "data", parcial=True)
    with get_conexao() as con, con.cursor() as cur:
        if buscar_um(cur, tid) is None:
            return erro("Prova não encontrada.", 404)
        if "materia_id" in dados and not materia_existe(cur, dados["materia_id"]):
            raise ErroValidacao("Matéria não encontrada.")
        if dados:
            colunas = ", ".join(f"{c} = %s" for c in dados)  # nomes vêm de validar_item(), não do usuário
            cur.execute(f"UPDATE provas SET {colunas} WHERE id = %s", (*dados.values(), tid))
        return jsonify(buscar_um(cur, tid))


@bp.delete("/<int:tid>")
def excluir(tid):
    with get_conexao() as con, con.cursor() as cur:
        cur.execute("DELETE FROM provas WHERE id = %s", (tid,))
        if cur.rowcount == 0:
            return erro("Prova não encontrada.", 404)
        return "", 204

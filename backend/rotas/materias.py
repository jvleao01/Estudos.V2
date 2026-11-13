"""API de matérias: /api/materias"""
import re

import pymysql
from flask import Blueprint, jsonify, request

from conexao.conexao import get_conexao
from rotas.validacao import ErroValidacao, erro

bp = Blueprint("materias", __name__, url_prefix="/api/materias")

PALETA = [
    "#6c8cff", "#2ec4b6", "#f4a261", "#e76f9a", "#b388ff",
    "#e9c46a", "#4cc9f0", "#90be6d", "#ff7b54", "#a0a7b8",
]
STATUS = ("cursando", "cursada")
RE_SEMESTRE = re.compile(r"^\d{4}\.[12]$")
RE_COR = re.compile(r"^#[0-9a-fA-F]{6}$")

SQL_LISTA = """
SELECT m.id, m.nome, m.semestre, m.cor, m.status,
       COALESCE((SELECT SUM(s.minutos) FROM sessoes_estudo s WHERE s.materia_id = m.id), 0) AS minutosTotais,
       (SELECT COUNT(*) FROM trabalhos t WHERE t.materia_id = m.id) AS trabalhos,
       (SELECT COUNT(*) FROM trabalhos t WHERE t.materia_id = m.id AND NOT t.concluido) AS trabalhosPendentes
FROM materias m
{where}
ORDER BY m.status = 'cursada', IF(m.status = 'cursada', m.semestre, '') DESC, m.nome
"""


def validar(dados, parcial=False):
    """Devolve só os campos válidos e normalizados; lança ErroValidacao."""
    if not isinstance(dados, dict):
        raise ErroValidacao("Envie os dados em JSON.")
    limpo = {}
    if "nome" in dados or not parcial:
        nome = dados.get("nome")
        nome = nome.strip() if isinstance(nome, str) else ""
        if not 1 <= len(nome) <= 80:
            raise ErroValidacao("O nome deve ter entre 1 e 80 caracteres.")
        limpo["nome"] = nome
    if "semestre" in dados or not parcial:
        semestre = dados.get("semestre")
        if not isinstance(semestre, str) or not RE_SEMESTRE.match(semestre):
            raise ErroValidacao("Semestre inválido. Use o formato 2026.1 ou 2026.2.")
        limpo["semestre"] = semestre
    if "status" in dados or not parcial:
        if dados.get("status") not in STATUS:
            raise ErroValidacao("Situação inválida. Use 'cursando' ou 'cursada'.")
        limpo["status"] = dados["status"]
    cor = dados.get("cor")
    if cor is not None:
        if not isinstance(cor, str) or not RE_COR.match(cor):
            raise ErroValidacao("Cor inválida. Use o formato #rrggbb.")
        limpo["cor"] = cor.lower()
    return limpo


def proxima_cor(cur):
    cur.execute("SELECT cor FROM materias")
    usadas = {r["cor"] for r in cur.fetchall()}
    livres = [c for c in PALETA if c not in usadas]
    if livres:
        return livres[0]
    cur.execute("SELECT COUNT(*) AS n FROM materias")
    return PALETA[cur.fetchone()["n"] % len(PALETA)]


def buscar(cur, where="", params=()):
    cur.execute(SQL_LISTA.format(where=where), params)
    materias = cur.fetchall()
    if not materias:
        return []
    ids = [m["id"] for m in materias]
    marcadores = ",".join(["%s"] * len(ids))
    cur.execute(
        f"SELECT materia_id, titulo, data FROM provas "
        f"WHERE materia_id IN ({marcadores}) AND data >= CURDATE() ORDER BY data, id",
        ids,
    )
    provas = {}
    for p in cur.fetchall():
        provas.setdefault(p["materia_id"], []).append(
            {"titulo": p["titulo"], "data": p["data"].isoformat()}
        )
    for m in materias:
        m["minutosTotais"] = int(m["minutosTotais"])
        m["trabalhos"] = int(m["trabalhos"])
        m["trabalhosPendentes"] = int(m["trabalhosPendentes"])
        m["provas"] = provas.get(m["id"], [])
    return materias


def buscar_uma(cur, mid):
    lista = buscar(cur, "WHERE m.id = %s", (mid,))
    return lista[0] if lista else None


@bp.errorhandler(ErroValidacao)
def _validacao(e):
    return erro(str(e), 400)


@bp.errorhandler(pymysql.err.IntegrityError)
def _duplicado(_e):
    return erro("Já existe uma matéria com esse nome nesse semestre.", 409)


@bp.get("")
def listar():
    status = request.args.get("status")
    if status is not None and status not in STATUS:
        raise ErroValidacao("Filtro de situação inválido.")
    with get_conexao() as con, con.cursor() as cur:
        if status:
            return jsonify(buscar(cur, "WHERE m.status = %s", (status,)))
        return jsonify(buscar(cur))


@bp.post("")
def criar():
    dados = validar(request.get_json(silent=True))
    with get_conexao() as con, con.cursor() as cur:
        if "cor" not in dados:
            dados["cor"] = proxima_cor(cur)
        cur.execute(
            "INSERT INTO materias (nome, semestre, cor, status) VALUES (%s, %s, %s, %s)",
            (dados["nome"], dados["semestre"], dados["cor"], dados["status"]),
        )
        return jsonify(buscar_uma(cur, cur.lastrowid)), 201


@bp.patch("/<int:mid>")
def editar(mid):
    dados = validar(request.get_json(silent=True), parcial=True)
    with get_conexao() as con, con.cursor() as cur:
        if buscar_uma(cur, mid) is None:
            return erro("Matéria não encontrada.", 404)
        if dados:
            colunas = ", ".join(f"{c} = %s" for c in dados)  # nomes vêm de validar(), não do usuário
            cur.execute(f"UPDATE materias SET {colunas} WHERE id = %s", (*dados.values(), mid))
        return jsonify(buscar_uma(cur, mid))


@bp.delete("/<int:mid>")
def excluir(mid):
    with get_conexao() as con, con.cursor() as cur:
        cur.execute("DELETE FROM materias WHERE id = %s", (mid,))
        if cur.rowcount == 0:
            return erro("Matéria não encontrada.", 404)
        return "", 204

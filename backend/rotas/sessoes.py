"""API de sessões de estudo (cronômetro): /api/sessoes"""
import re
from datetime import datetime

from flask import Blueprint, jsonify, request

from conexao.conexao import get_conexao
from rotas.validacao import ErroValidacao, erro, materia_existe, validar_data

bp = Blueprint("sessoes", __name__, url_prefix="/api/sessoes")

RE_DATA_HORA = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$")
MAX_MINUTOS = 24 * 60


def validar_sessao(dados):
    if not isinstance(dados, dict):
        raise ErroValidacao("Envie os dados em JSON.")
    mid = dados.get("materiaId")
    if not isinstance(mid, int) or isinstance(mid, bool):
        raise ErroValidacao("Matéria inválida.")
    inicio = dados.get("inicio")
    try:
        if not isinstance(inicio, str) or not RE_DATA_HORA.match(inicio):
            raise ValueError
        inicio = datetime.fromisoformat(inicio)
    except ValueError:
        raise ErroValidacao("Início inválido. Use o formato AAAA-MM-DDTHH:MM:SS.") from None
    minutos = dados.get("minutos")
    if not isinstance(minutos, int) or isinstance(minutos, bool) or not 1 <= minutos <= MAX_MINUTOS:
        raise ErroValidacao(f"Os minutos devem ser um número inteiro entre 1 e {MAX_MINUTOS}.")
    return mid, inicio, minutos


@bp.errorhandler(ErroValidacao)
def _validacao(e):
    return erro(str(e), 400)


@bp.post("")
def salvar():
    mid, inicio, minutos = validar_sessao(request.get_json(silent=True))
    with get_conexao() as con, con.cursor() as cur:
        if not materia_existe(cur, mid):
            raise ErroValidacao("Matéria não encontrada.")
        cur.execute(
            "INSERT INTO sessoes_estudo (materia_id, inicio, minutos) VALUES (%s, %s, %s)",
            (mid, inicio, minutos),
        )
        sessao = {"id": cur.lastrowid, "materiaId": mid, "inicio": inicio.isoformat(), "minutos": minutos}
        return jsonify(sessao), 201


@bp.get("/resumo")
def resumo():
    data = validar_data(request.args.get("data"))
    with get_conexao() as con, con.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(SUM(minutos), 0) AS minutos FROM sessoes_estudo WHERE DATE(inicio) = %s",
            (data,),
        )
        return jsonify(data=data, minutos=int(cur.fetchone()["minutos"]))

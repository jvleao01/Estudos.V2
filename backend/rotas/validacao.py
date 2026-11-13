"""Validação e respostas de erro compartilhadas pelas rotas da API."""
import re
from datetime import date

from flask import jsonify

RE_DATA = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class ErroValidacao(Exception):
    """Dados inválidos enviados pelo cliente (vira 400)."""


def erro(msg, status):
    return jsonify(erro=msg), status


def _data_iso(valor):
    if isinstance(valor, str) and RE_DATA.match(valor):
        try:
            return date.fromisoformat(valor).isoformat()
        except ValueError:
            pass
    raise ErroValidacao("Data inválida. Use o formato AAAA-MM-DD.")


def validar_item(dados, campo_data, parcial=False):
    """Valida um trabalho ou prova. Devolve só os campos válidos, já com os nomes das colunas."""
    if not isinstance(dados, dict):
        raise ErroValidacao("Envie os dados em JSON.")
    limpo = {}
    if "materiaId" in dados or not parcial:
        mid = dados.get("materiaId")
        if not isinstance(mid, int) or isinstance(mid, bool):
            raise ErroValidacao("Matéria inválida.")
        limpo["materia_id"] = mid
    if "titulo" in dados or not parcial:
        titulo = dados.get("titulo")
        titulo = titulo.strip() if isinstance(titulo, str) else ""
        if not 1 <= len(titulo) <= 120:
            raise ErroValidacao("A descrição deve ter entre 1 e 120 caracteres.")
        limpo["titulo"] = titulo
    if campo_data in dados or not parcial:
        limpo[campo_data] = _data_iso(dados.get(campo_data))
    if "concluido" in dados:
        if not isinstance(dados["concluido"], bool):
            raise ErroValidacao("O campo concluído deve ser verdadeiro ou falso.")
        limpo["concluido"] = dados["concluido"]
    return limpo


def materia_existe(cur, materia_id):
    cur.execute("SELECT 1 FROM materias WHERE id = %s", (materia_id,))
    return cur.fetchone() is not None

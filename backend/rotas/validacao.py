"""Validação e respostas de erro compartilhadas pelas rotas da API."""
import re
from datetime import date
from decimal import Decimal, InvalidOperation

from flask import jsonify

RE_DATA = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class ErroValidacao(Exception):
    """Dados inválidos enviados pelo cliente (vira 400)."""


def erro(msg, status):
    return jsonify(erro=msg), status


def validar_data(valor):
    if isinstance(valor, str) and RE_DATA.match(valor):
        try:
            return date.fromisoformat(valor).isoformat()
        except ValueError:
            pass
    raise ErroValidacao("Data inválida. Use o formato AAAA-MM-DD.")


PONTOS_MAX = Decimal("9999.9")
DECIMO = Decimal("0.1")


def validar_pontos(valor, rotulo, positivo=False):
    """Número de 0 a 9999,9 com até 1 casa decimal. Devolve Decimal."""
    msg = f"{rotulo} deve ser um número de 0 a 9999,9 com até 1 casa decimal."
    if isinstance(valor, bool) or not isinstance(valor, (int, float)):
        raise ErroValidacao(msg)
    try:
        d = Decimal(str(valor))
    except InvalidOperation:
        raise ErroValidacao(msg) from None
    if not d.is_finite() or d < 0 or d > PONTOS_MAX or d != d.quantize(DECIMO):
        raise ErroValidacao(msg)
    if positivo and d == 0:
        raise ErroValidacao(f"{rotulo} deve ser maior que zero.")
    return d.quantize(DECIMO)


def pontos_json(d):
    return None if d is None else float(d)


def fmt_pontos(d):
    d = Decimal(d).quantize(DECIMO)
    return str(int(d)) if d == d.to_integral_value() else str(d).replace(".", ",")


def validar_item(dados, campo_data, parcial=False, aceita_simulado=False):
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
        limpo[campo_data] = validar_data(dados.get(campo_data))
    if "concluido" in dados:
        if not isinstance(dados["concluido"], bool):
            raise ErroValidacao("O campo concluído deve ser verdadeiro ou falso.")
        limpo["concluido"] = dados["concluido"]
    if "valor" in dados or not parcial:
        limpo["valor"] = validar_pontos(dados.get("valor"), "O valor", positivo=True)
    if "nota" in dados:
        if not parcial:
            raise ErroValidacao("A nota só pode ser lançada depois de concluir.")
        nota = dados["nota"]
        limpo["nota"] = None if nota is None else validar_pontos(nota, "A nota")
    if aceita_simulado and "simulado" in dados:
        if not isinstance(dados["simulado"], bool):
            raise ErroValidacao("O campo simulado deve ser verdadeiro ou falso.")
        limpo["simulado"] = dados["simulado"]
    return limpo


def checar_nota(atual, dados):
    """Regras da nota para um PATCH. atual = item formatado; dados = colunas já validadas."""
    if "nota" not in dados and "valor" not in dados:
        return
    nota = dados["nota"] if "nota" in dados else atual["nota"]
    if nota is None:
        return
    nota = Decimal(str(nota))
    valor = dados["valor"] if "valor" in dados else atual["valor"]
    concluido = dados.get("concluido", atual["concluido"])
    if "nota" in dados:
        if not concluido:
            raise ErroValidacao("Só é possível lançar nota depois de concluir.")
        if valor is None:
            raise ErroValidacao("Defina o valor antes de lançar a nota.")
        if nota > Decimal(str(valor)):
            raise ErroValidacao(f"A nota não pode passar do valor ({fmt_pontos(Decimal(str(valor)))}).")
    elif nota > dados["valor"]:
        if not concluido:
            # Nota guardada de item desmarcado não aparece em nenhuma tela: descarta em vez de bloquear.
            dados["nota"] = None
            return
        raise ErroValidacao(f"O valor não pode ser menor que a nota já lançada ({fmt_pontos(nota)}).")


def materia_existe(cur, materia_id):
    cur.execute("SELECT 1 FROM materias WHERE id = %s", (materia_id,))
    return cur.fetchone() is not None

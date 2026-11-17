"""API do Calendário: semestres (datas e dias de aula), aulas desmarcadas e dados do mês."""
import re
from datetime import date

from flask import Blueprint, jsonify, request

from conexao.conexao import get_conexao
from rotas.materias import RE_SEMESTRE
from rotas.validacao import ErroValidacao, erro, materia_existe, validar_data

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


# ---------- aulas desmarcadas ----------

@bp.post("/aulas/desmarcadas")
def desmarcar():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        raise ErroValidacao("Envie os dados em JSON.")
    mid = dados.get("materiaId")
    data = validar_data(dados.get("data"))
    with get_conexao() as con, con.cursor() as cur:
        if isinstance(mid, bool) or not isinstance(mid, int) or not materia_existe(cur, mid):
            raise ErroValidacao("Matéria não encontrada.")
        cur.execute("INSERT IGNORE INTO aulas_desmarcadas (materia_id, data) VALUES (%s, %s)", (mid, data))
        return jsonify(materiaId=mid, data=data), 201


@bp.delete("/aulas/desmarcadas/<int:mid>/<data>")
def remarcar(mid, data):
    data = validar_data(data)
    with get_conexao() as con, con.cursor() as cur:
        cur.execute("DELETE FROM aulas_desmarcadas WHERE materia_id = %s AND data = %s", (mid, data))
        if cur.rowcount == 0:
            return erro("Aula desmarcada não encontrada.", 404)
        return "", 204


# ---------- dados do mês ----------

RE_MES = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")


def intervalo_mes(mes):
    """Primeiro dia do mês e primeiro dia do mês seguinte (intervalo semiaberto)."""
    m = RE_MES.match(mes or "")
    if not m:
        raise ErroValidacao("Mês inválido. Use o formato AAAA-MM.")
    ano, num = int(m.group(1)), int(m.group(2))
    if not 1 <= ano <= 9998:  # limites de datetime.date (o mês seguinte também precisa existir)
        raise ErroValidacao("Mês inválido. Use o formato AAAA-MM.")
    inicio = date(ano, num, 1)
    fim = date(ano + 1, 1, 1) if num == 12 else date(ano, num + 1, 1)
    return inicio, fim


def itens_do_mes(cur, tabela, coluna, inicio, fim, extra=""):
    cur.execute(
        f"SELECT t.id, t.materia_id, m.nome, m.cor, t.titulo, t.{coluna} AS data, t.concluido{extra} "
        f"FROM {tabela} t JOIN materias m ON m.id = t.materia_id "
        f"WHERE t.{coluna} >= %s AND t.{coluna} < %s ORDER BY t.{coluna}, t.id", (inicio, fim))
    return cur.fetchall()


@bp.get("/calendario")
def calendario():
    inicio, fim = intervalo_mes(request.args.get("mes"))
    with get_conexao() as con, con.cursor() as cur:
        cur.execute("SELECT semestre, inicio, fim FROM semestres WHERE inicio < %s AND fim >= %s ORDER BY inicio",
                    (fim, inicio))
        semestres = [{"semestre": s["semestre"], "inicio": s["inicio"].isoformat(), "fim": s["fim"].isoformat()}
                     for s in cur.fetchall()]
        # Todos os semestres com datas: a página decide o aviso "defina as datas" mesmo em mês fora do período.
        cur.execute("SELECT semestre FROM semestres ORDER BY semestre")
        definidos = [s["semestre"] for s in cur.fetchall()]
        aulas = []
        if semestres:
            nomes = [s["semestre"] for s in semestres]
            cur.execute(
                f"SELECT m.id, m.nome, m.cor, m.semestre, a.dia_semana FROM aulas_semana a "
                f"JOIN materias m ON m.id = a.materia_id WHERE m.semestre IN ({','.join(['%s'] * len(nomes))}) "
                f"ORDER BY m.nome, m.id, a.dia_semana", nomes)
            por_id = {}
            for linha in cur.fetchall():
                if linha["id"] not in por_id:
                    por_id[linha["id"]] = {"materiaId": linha["id"], "nome": linha["nome"], "cor": linha["cor"],
                                           "semestre": linha["semestre"], "dias": []}
                    aulas.append(por_id[linha["id"]])
                por_id[linha["id"]]["dias"].append(linha["dia_semana"])
        cur.execute("SELECT materia_id, data FROM aulas_desmarcadas WHERE data >= %s AND data < %s "
                    "ORDER BY data, materia_id", (inicio, fim))
        desmarcadas = [{"materiaId": d["materia_id"], "data": d["data"].isoformat()} for d in cur.fetchall()]

        def formatar(linha, simulado=None):
            item = {"id": linha["id"], "materiaId": linha["materia_id"],
                    "materia": {"nome": linha["nome"], "cor": linha["cor"]}, "titulo": linha["titulo"],
                    "data": linha["data"].isoformat(), "concluido": bool(linha["concluido"])}
            if simulado is not None:
                item["simulado"] = simulado
            return item

        provas = [formatar(p, bool(p["simulado"])) for p in itens_do_mes(cur, "provas", "data", inicio, fim, ", t.simulado")]
        trabalhos = [formatar(t) for t in itens_do_mes(cur, "trabalhos", "entrega", inicio, fim)]
        return jsonify(semestres=semestres, semestresDefinidos=definidos, aulas=aulas, desmarcadas=desmarcadas, provas=provas, trabalhos=trabalhos)

import pytest

SEM = "/api/semestres"


def materia(client, nome, semestre="2026.2"):
    r = client.post("/api/materias", json={
        "nome": nome, "semestre": semestre, "cor": "#6c8cff", "status": "cursando",
        "notaMinima": 60, "notaTotal": 100})
    return r.get_json()["id"]


def put(client, aulas, inicio="2026-08-03", fim="2026-12-12", semestre="2026.2"):
    return client.put(f"{SEM}/{semestre}", json={"inicio": inicio, "fim": fim, "aulas": aulas})


# ---------- semestres ----------

def test_semestre_sem_datas(client):
    mid = materia(client, "Cálculo")
    r = client.get(f"{SEM}/2026.2")
    assert r.status_code == 200
    assert r.get_json() == {"semestre": "2026.2", "inicio": None, "fim": None, "materias": [
        {"id": mid, "nome": "Cálculo", "cor": "#6c8cff", "status": "cursando", "dias": []}]}


def test_semestre_invalido(client):
    r = client.get(f"{SEM}/2026.3")
    assert (r.status_code, r.get_json()) == (400, {"erro": "Semestre inválido. Use o formato 2026.1 ou 2026.2."})


def test_put_grava_datas_e_dias(client):
    mid = materia(client, "Cálculo")
    r = put(client, {str(mid): [3, 1]})
    assert r.status_code == 200
    d = r.get_json()
    assert (d["inicio"], d["fim"], d["materias"][0]["dias"]) == ("2026-08-03", "2026-12-12", [1, 3])
    assert client.get(f"{SEM}/2026.2").get_json() == d


def test_put_substitui_dias_so_das_enviadas(client):
    a = materia(client, "A")
    b = materia(client, "B")
    put(client, {str(a): [1], str(b): [2, 4]})
    d = put(client, {str(a): []}).get_json()
    assert [m["dias"] for m in d["materias"]] == [[], [2, 4]]


def test_put_atualiza_datas_existentes(client):
    put(client, {})
    assert put(client, {}, fim="2026-12-20").get_json()["fim"] == "2026-12-20"


@pytest.mark.parametrize("dados, msg", [
    ({"inicio": "2026-12-12", "fim": "2026-08-03"}, "O início deve ser antes do fim."),
    ({"inicio": "2026-08-03", "fim": "2026-08-03"}, "O início deve ser antes do fim."),
    ({"inicio": "2026-08-01", "fim": "2027-02-17"}, "O semestre pode ter no máximo 200 dias."),
    ({"dias": [0]}, "Dia da semana inválido."),
    ({"dias": [7]}, "Dia da semana inválido."),
    ({"dias": ["1"]}, "Dia da semana inválido."),
    ({"dias": [True]}, "Dia da semana inválido."),
    ({"dias": [1, 1]}, "Dia da semana inválido."),
    ({"dias": 1}, "Dia da semana inválido."),
    ({"aulas": [1]}, "Envie as aulas por matéria."),
    ({"inicio": "2026-02-30"}, "Data inválida. Use o formato AAAA-MM-DD."),
])
def test_validacoes_put(client, dados, msg):
    mid = materia(client, "Cálculo")
    corpo = {"inicio": "2026-08-03", "fim": "2026-12-12", "aulas": {str(mid): dados.get("dias", [1])}}
    corpo.update({k: v for k, v in dados.items() if k != "dias"})
    r = client.put(f"{SEM}/2026.2", json=corpo)
    assert (r.status_code, r.get_json()) == (400, {"erro": msg})


def test_put_materia_de_outro_semestre(client):
    ok = materia(client, "Cálculo")
    outra = materia(client, "Antiga", semestre="2026.1")
    r = put(client, {str(ok): [1], str(outra): [2]})
    assert (r.status_code, r.get_json()) == (400, {"erro": "Matéria não pertence a esse semestre."})
    d = client.get(f"{SEM}/2026.2").get_json()
    assert d["inicio"] is None and d["materias"][0]["dias"] == []


def test_put_materia_inexistente(client):
    r = put(client, {"9999": [1]})
    assert (r.status_code, r.get_json()) == (400, {"erro": "Matéria não pertence a esse semestre."})
    r = put(client, {"abc": [1]})
    assert (r.status_code, r.get_json()) == (400, {"erro": "Matéria não pertence a esse semestre."})


# ---------- aulas desmarcadas ----------

DESM = "/api/aulas/desmarcadas"


def test_desmarcar_e_remarcar(client):
    mid = materia(client, "Cálculo")
    corpo = {"materiaId": mid, "data": "2026-11-16"}
    r = client.post(DESM, json=corpo)
    assert (r.status_code, r.get_json()) == (201, corpo)
    assert client.post(DESM, json=corpo).status_code == 201
    assert client.delete(f"{DESM}/{mid}/2026-11-16").status_code == 204
    r = client.delete(f"{DESM}/{mid}/2026-11-16")
    assert (r.status_code, r.get_json()) == (404, {"erro": "Aula desmarcada não encontrada."})


def test_desmarcar_materia_inexistente(client):
    r = client.post(DESM, json={"materiaId": 9999, "data": "2026-11-16"})
    assert (r.status_code, r.get_json()) == (400, {"erro": "Matéria não encontrada."})
    r = client.post(DESM, json={"materiaId": "1", "data": "2026-11-16"})
    assert (r.status_code, r.get_json()) == (400, {"erro": "Matéria não encontrada."})


def test_desmarcar_data_invalida(client):
    mid = materia(client, "Cálculo")
    r = client.post(DESM, json={"materiaId": mid, "data": "16/11/2026"})
    assert r.status_code == 400
    assert client.delete(f"{DESM}/{mid}/2026-02-30").status_code == 400


# ---------- mês ----------

CAL = "/api/calendario"


@pytest.mark.parametrize("q", ["", "?mes=2026-13", "?mes=2026-1", "?mes=abc"])
def test_mes_invalido(client, q):
    r = client.get(CAL + q)
    assert (r.status_code, r.get_json()) == (400, {"erro": "Mês inválido. Use o formato AAAA-MM."})


def test_calendario_do_mes(client):
    calc = materia(client, "Cálculo")
    fis = materia(client, "Física")
    put(client, {str(calc): [1, 3]})
    p = client.post("/api/provas", json={"materiaId": calc, "titulo": "P2", "data": "2026-11-18", "valor": 30}).get_json()
    client.post("/api/provas", json={"materiaId": calc, "titulo": "P3", "data": "2026-12-05", "valor": 30})
    t = client.post("/api/trabalhos", json={"materiaId": fis, "titulo": "Lista", "entrega": "2026-11-30", "valor": 10}).get_json()
    client.post(DESM, json={"materiaId": calc, "data": "2026-11-16"})
    client.post(DESM, json={"materiaId": calc, "data": "2026-12-07"})
    d = client.get(f"{CAL}?mes=2026-11").get_json()
    assert d["semestres"] == [{"semestre": "2026.2", "inicio": "2026-08-03", "fim": "2026-12-12"}]
    assert d["aulas"] == [{"materiaId": calc, "nome": "Cálculo", "cor": "#6c8cff", "semestre": "2026.2", "dias": [1, 3]}]
    assert d["desmarcadas"] == [{"materiaId": calc, "data": "2026-11-16"}]
    assert d["provas"] == [{"id": p["id"], "materiaId": calc, "materia": {"nome": "Cálculo", "cor": "#6c8cff"},
                            "titulo": "P2", "data": "2026-11-18", "concluido": False, "simulado": False}]
    assert d["trabalhos"] == [{"id": t["id"], "materiaId": fis, "materia": {"nome": "Física", "cor": "#6c8cff"},
                               "titulo": "Lista", "data": "2026-11-30", "concluido": False}]


def test_calendario_mes_fora_do_semestre(client):
    mid = materia(client, "Cálculo")
    put(client, {str(mid): [1]})
    d = client.get(f"{CAL}?mes=2027-03").get_json()
    assert (d["semestres"], d["aulas"]) == ([], [])


def test_semestre_que_termina_no_primeiro_dia_do_mes(client):
    mid = materia(client, "Cálculo")
    put(client, {str(mid): [2]}, inicio="2026-08-03", fim="2026-12-01")
    assert client.get(f"{CAL}?mes=2026-12").get_json()["semestres"][0]["fim"] == "2026-12-01"
    assert client.get(f"{CAL}?mes=2026-07").get_json()["semestres"] == []


def test_excluir_materia_limpa_aulas(client):
    mid = materia(client, "Cálculo")
    put(client, {str(mid): [1]})
    client.post(DESM, json={"materiaId": mid, "data": "2026-11-16"})
    assert client.delete(f"/api/materias/{mid}").status_code == 204
    r = client.get(f"{CAL}?mes=2026-11")
    assert r.status_code == 200
    assert (r.get_json()["aulas"], r.get_json()["desmarcadas"]) == ([], [])


def test_semestres_definidos_fora_do_mes(client):
    """Julho cai no semestre 2026.2 (pelo dia 15), que só começa em agosto: a página precisa saber que as datas existem."""
    mid = materia(client, "Cálculo")
    put(client, {str(mid): [1]})
    d = client.get(f"{CAL}?mes=2026-07").get_json()
    assert d["semestres"] == []
    assert d["semestresDefinidos"] == ["2026.2"]


@pytest.mark.parametrize("mes", ["0000-01", "9999-12"])
def test_mes_fora_do_intervalo(client, mes):
    r = client.get(f"{CAL}?mes={mes}")
    assert (r.status_code, r.get_json()) == (400, {"erro": "Mês inválido. Use o formato AAAA-MM."})

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

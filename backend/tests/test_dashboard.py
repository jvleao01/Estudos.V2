import pytest

URL = "/api/dashboard"
INICIO = "2026-11-09"  # segunda-feira
DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]


def materia(client, nome, cor="#6c8cff"):
    r = client.post("/api/materias", json={"nome": nome, "semestre": "2026.2", "cor": cor, "status": "cursando"})
    return r.get_json()["id"]


def sessao(client, mid, inicio, minutos):
    r = client.post("/api/sessoes", json={"materiaId": mid, "inicio": inicio, "minutos": minutos})
    assert r.status_code == 201


def prova(client, mid, titulo, data, feita=False):
    p = client.post("/api/provas", json={"materiaId": mid, "titulo": titulo, "data": data}).get_json()
    if feita:
        client.patch(f"/api/provas/{p['id']}", json={"concluido": True})


def dashboard(client, inicio=INICIO):
    return client.get(f"{URL}?inicio={inicio}")


def test_semana_vazia(client):
    d = dashboard(client).get_json()
    assert d["semana"] == {"inicio": "2026-11-09", "fim": "2026-11-15"}
    assert d["materias"] == []
    assert d["porDia"] == [{"dia": dia, "minutos": 0} for dia in DIAS]
    assert d["provas"] == []


def test_minutos_por_materia_e_dia(client):
    a = materia(client, "Álgebra", "#111111")
    b = materia(client, "Biologia", "#222222")
    sessao(client, a, "2026-11-09T08:00:00", 30)   # segunda
    sessao(client, a, "2026-11-11T10:00:00", 20)   # quarta
    sessao(client, b, "2026-11-15T23:59:00", 10)   # domingo, último minuto da semana
    sessao(client, b, "2026-11-16T00:01:00", 99)   # segunda seguinte: fora
    sessao(client, a, "2026-11-08T12:00:00", 50)   # domingo anterior: fora
    d = dashboard(client).get_json()
    assert d["materias"] == [
        {"id": a, "nome": "Álgebra", "cor": "#111111", "minutosSemana": 50},
        {"id": b, "nome": "Biologia", "cor": "#222222", "minutosSemana": 10},
    ]
    assert [p["minutos"] for p in d["porDia"]] == [30, 0, 20, 0, 0, 0, 10]


def test_materia_sem_tempo_fica_fora(client):
    a = materia(client, "Álgebra")
    materia(client, "Biologia")
    sessao(client, a, "2026-11-10T08:00:00", 15)
    assert [m["nome"] for m in dashboard(client).get_json()["materias"]] == ["Álgebra"]


def test_provas_pendentes_com_materia(client):
    a = materia(client, "Álgebra", "#111111")
    prova(client, a, "P3", "2026-11-20")
    prova(client, a, "P2", "2026-11-12")
    prova(client, a, "Feita", "2026-11-13", feita=True)
    prova(client, a, "Antiga", "2026-11-01")
    assert dashboard(client).get_json()["provas"] == [
        {"materiaId": a, "titulo": "P2", "data": "2026-11-12", "materia": {"nome": "Álgebra", "cor": "#111111"}},
        {"materiaId": a, "titulo": "P3", "data": "2026-11-20", "materia": {"nome": "Álgebra", "cor": "#111111"}},
    ]


@pytest.mark.parametrize("inicio", ["", "13/11/2026", "2026-02-30"])
def test_inicio_invalido(client, inicio):
    r = dashboard(client, inicio)
    assert (r.status_code, r.get_json()) == (400, {"erro": "Data inválida. Use o formato AAAA-MM-DD."})

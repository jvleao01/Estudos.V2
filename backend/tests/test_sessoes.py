import pytest

URL = "/api/sessoes"
MSG_MINUTOS = "Os minutos devem ser um número inteiro entre 1 e 1440."
MSG_INICIO = "Início inválido. Use o formato AAAA-MM-DDTHH:MM:SS."
MSG_DATA = "Data inválida. Use o formato AAAA-MM-DD."


def materia(client, nome="Cálculo"):
    r = client.post("/api/materias", json={"nome": nome, "semestre": "2026.2", "cor": "#6c8cff", "status": "cursando"})
    return r.get_json()["id"]


def salvar(client, mid, inicio="2026-11-13T14:05:00", minutos=56):
    return client.post(URL, json={"materiaId": mid, "inicio": inicio, "minutos": minutos})


def test_salvar_sessao(client):
    mid = materia(client)
    r = salvar(client, mid)
    assert r.status_code == 201
    s = r.get_json()
    assert s["id"] > 0
    assert (s["materiaId"], s["inicio"], s["minutos"]) == (mid, "2026-11-13T14:05:00", 56)


def test_sessao_soma_nas_materias(client):
    mid = materia(client)
    salvar(client, mid, minutos=56)
    salvar(client, mid, minutos=34)
    assert client.get("/api/materias").get_json()[0]["minutosTotais"] == 90


def test_resumo_do_dia(client):
    mid = materia(client)
    salvar(client, mid, "2026-11-13T08:00:00", 30)
    salvar(client, mid, "2026-11-13T23:59:00", 20)
    salvar(client, mid, "2026-11-14T00:01:00", 10)
    assert client.get(f"{URL}/resumo?data=2026-11-13").get_json() == {"data": "2026-11-13", "minutos": 50}
    assert client.get(f"{URL}/resumo?data=2026-11-14").get_json() == {"data": "2026-11-14", "minutos": 10}
    assert client.get(f"{URL}/resumo?data=2026-11-15").get_json() == {"data": "2026-11-15", "minutos": 0}


@pytest.mark.parametrize(
    "campos, msg",
    [
        ({"minutos": 0}, MSG_MINUTOS),
        ({"minutos": 1441}, MSG_MINUTOS),
        ({"minutos": "5"}, MSG_MINUTOS),
        ({"minutos": 5.5}, MSG_MINUTOS),
        ({"minutos": True}, MSG_MINUTOS),
        ({"minutos": None}, MSG_MINUTOS),
        ({"inicio": "2026-11-13 14:05"}, MSG_INICIO),
        ({"inicio": "2026-13-01T10:00:00"}, MSG_INICIO),
        ({"inicio": None}, MSG_INICIO),
        ({"materiaId": "1"}, "Matéria inválida."),
    ],
)
def test_validacao(client, campos, msg):
    dados = {"materiaId": materia(client), "inicio": "2026-11-13T14:05:00", "minutos": 10}
    dados.update(campos)
    dados = {k: v for k, v in dados.items() if v is not None}
    r = client.post(URL, json=dados)
    assert (r.status_code, r.get_json()) == (400, {"erro": msg})


def test_materia_inexistente(client):
    r = salvar(client, 9999)
    assert (r.status_code, r.get_json()) == (400, {"erro": "Matéria não encontrada."})


def test_sem_json(client):
    r = client.post(URL, data="x", content_type="text/plain")
    assert (r.status_code, r.get_json()) == (400, {"erro": "Envie os dados em JSON."})


@pytest.mark.parametrize("consulta", ["", "?data=13/11/2026", "?data=2026-02-30"])
def test_resumo_data_invalida(client, consulta):
    r = client.get(f"{URL}/resumo{consulta}")
    assert (r.status_code, r.get_json()) == (400, {"erro": MSG_DATA})

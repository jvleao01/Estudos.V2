from datetime import date, timedelta

import pytest

URL = "/api/trabalhos"


def dia(delta):
    return (date.today() + timedelta(days=delta)).isoformat()


def materia(client, nome="Cálculo"):
    r = client.post("/api/materias", json={"nome": nome, "semestre": "2026.2", "cor": "#6c8cff", "status": "cursando"})
    return r.get_json()["id"]


def criar(client, mid, titulo="Lista", entrega=None):
    return client.post(URL, json={"materiaId": mid, "titulo": titulo, "entrega": entrega or dia(5)})


def test_criar_e_listar(client):
    mid = materia(client)
    r = client.post(URL, json={"materiaId": mid, "titulo": "  Lista 3  ", "entrega": "2026-12-01"})
    assert r.status_code == 201
    t = r.get_json()
    assert t["id"] > 0
    assert (t["materiaId"], t["titulo"], t["entrega"], t["concluido"]) == (mid, "Lista 3", "2026-12-01", False)
    assert t["materia"] == {"nome": "Cálculo", "cor": "#6c8cff"}
    assert client.get(URL).get_json() == [t]


def test_ordem_pendentes_por_data_e_concluidos_no_fim(client):
    mid = materia(client)
    criar(client, mid, "A", dia(10))
    criar(client, mid, "B", dia(-2))
    c = criar(client, mid, "C", dia(1)).get_json()
    d = criar(client, mid, "D", dia(-5)).get_json()
    client.patch(f"{URL}/{c['id']}", json={"concluido": True})
    client.patch(f"{URL}/{d['id']}", json={"concluido": True})
    assert [t["titulo"] for t in client.get(URL).get_json()] == ["B", "A", "C", "D"]


def test_marcar_e_desmarcar(client):
    t = criar(client, materia(client)).get_json()
    assert client.patch(f"{URL}/{t['id']}", json={"concluido": True}).get_json()["concluido"] is True
    assert client.patch(f"{URL}/{t['id']}", json={"concluido": False}).get_json()["concluido"] is False


def test_editar_campos_parciais(client):
    mid = materia(client)
    t = criar(client, mid, "Lista", "2026-12-01").get_json()
    r = client.patch(f"{URL}/{t['id']}", json={"titulo": "Novo"})
    assert r.status_code == 200
    novo = r.get_json()
    assert (novo["titulo"], novo["entrega"], novo["materiaId"]) == ("Novo", "2026-12-01", mid)


def test_trocar_materia(client):
    t = criar(client, materia(client)).get_json()
    outra = materia(client, "Física")
    novo = client.patch(f"{URL}/{t['id']}", json={"materiaId": outra}).get_json()
    assert (novo["materiaId"], novo["materia"]["nome"]) == (outra, "Física")


def test_excluir(client):
    t = criar(client, materia(client)).get_json()
    assert client.delete(f"{URL}/{t['id']}").status_code == 204
    r = client.patch(f"{URL}/{t['id']}", json={"titulo": "x"})
    assert r.status_code == 404
    assert r.get_json() == {"erro": "Trabalho não encontrado."}
    assert client.delete(f"{URL}/{t['id']}").status_code == 404


MSG_TITULO = "A descrição deve ter entre 1 e 120 caracteres."
MSG_DATA = "Data inválida. Use o formato AAAA-MM-DD."
MSG_MATERIA = "Matéria inválida."


@pytest.mark.parametrize(
    "campos, msg",
    [
        ({"titulo": ""}, MSG_TITULO),
        ({"titulo": "   "}, MSG_TITULO),
        ({"titulo": "x" * 121}, MSG_TITULO),
        ({"titulo": None}, MSG_TITULO),
        ({"entrega": "2026-02-30"}, MSG_DATA),
        ({"entrega": "18/11/2026"}, MSG_DATA),
        ({"entrega": None}, MSG_DATA),
        ({"materiaId": "1"}, MSG_MATERIA),
        ({"materiaId": True}, MSG_MATERIA),
        ({"materiaId": None}, MSG_MATERIA),
        ({"concluido": "sim"}, "O campo concluído deve ser verdadeiro ou falso."),
    ],
)
def test_validacao(client, campos, msg):
    dados = {"materiaId": materia(client), "titulo": "Lista", "entrega": dia(3)}
    dados.update(campos)
    dados = {k: v for k, v in dados.items() if v is not None}
    r = client.post(URL, json=dados)
    assert r.status_code == 400
    assert r.get_json() == {"erro": msg}


def test_sem_json(client):
    r = client.post(URL, data="x", content_type="text/plain")
    assert r.status_code == 400
    assert r.get_json() == {"erro": "Envie os dados em JSON."}


def test_materia_inexistente(client):
    r = client.post(URL, json={"materiaId": 9999, "titulo": "Lista", "entrega": dia(3)})
    assert r.status_code == 400
    assert r.get_json() == {"erro": "Matéria não encontrada."}
    t = criar(client, materia(client)).get_json()
    r = client.patch(f"{URL}/{t['id']}", json={"materiaId": 9999})
    assert (r.status_code, r.get_json()) == (400, {"erro": "Matéria não encontrada."})


def test_validacao_no_patch(client):
    t = criar(client, materia(client)).get_json()
    r = client.patch(f"{URL}/{t['id']}", json={"entrega": "2026-13-01"})
    assert (r.status_code, r.get_json()) == (400, {"erro": MSG_DATA})


def test_data_passada_aceita(client):
    assert criar(client, materia(client), entrega=dia(-1)).status_code == 201


def test_trabalho_conta_nos_cards_de_materias(client):
    mid = materia(client)
    criar(client, mid)
    m = client.get("/api/materias").get_json()[0]
    assert (m["id"], m["trabalhos"], m["trabalhosPendentes"]) == (mid, 1, 1)

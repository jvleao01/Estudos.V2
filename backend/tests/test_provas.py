from datetime import date, timedelta

URL = "/api/provas"


def dia(delta):
    return (date.today() + timedelta(days=delta)).isoformat()


def materia(client, nome="Cálculo"):
    r = client.post("/api/materias", json={"nome": nome, "semestre": "2026.2", "cor": "#6c8cff", "status": "cursando"})
    return r.get_json()["id"]


def criar(client, mid, titulo="P1", data=None):
    return client.post(URL, json={"materiaId": mid, "titulo": titulo, "data": data or dia(5)})


def test_criar_e_listar(client):
    mid = materia(client)
    r = client.post(URL, json={"materiaId": mid, "titulo": " P2 ", "data": "2026-12-01"})
    assert r.status_code == 201
    p = r.get_json()
    assert (p["materiaId"], p["titulo"], p["data"], p["concluido"]) == (mid, "P2", "2026-12-01", False)
    assert p["materia"] == {"nome": "Cálculo", "cor": "#6c8cff"}
    assert "entrega" not in p
    assert client.get(URL).get_json() == [p]


def test_ordem_pendentes_por_data_e_concluidos_no_fim(client):
    mid = materia(client)
    criar(client, mid, "A", dia(10))
    criar(client, mid, "B", dia(-2))
    c = criar(client, mid, "C", dia(1)).get_json()
    d = criar(client, mid, "D", dia(-5)).get_json()
    client.patch(f"{URL}/{c['id']}", json={"concluido": True})
    client.patch(f"{URL}/{d['id']}", json={"concluido": True})
    assert [p["titulo"] for p in client.get(URL).get_json()] == ["B", "A", "C", "D"]


def test_marcar_e_desmarcar(client):
    p = criar(client, materia(client)).get_json()
    assert client.patch(f"{URL}/{p['id']}", json={"concluido": True}).get_json()["concluido"] is True
    assert client.patch(f"{URL}/{p['id']}", json={"concluido": False}).get_json()["concluido"] is False


def test_editar_data(client):
    p = criar(client, materia(client)).get_json()
    assert client.patch(f"{URL}/{p['id']}", json={"data": "2026-12-20"}).get_json()["data"] == "2026-12-20"


def test_excluir(client):
    p = criar(client, materia(client)).get_json()
    assert client.delete(f"{URL}/{p['id']}").status_code == 204
    r = client.patch(f"{URL}/{p['id']}", json={"titulo": "x"})
    assert (r.status_code, r.get_json()) == (404, {"erro": "Prova não encontrada."})


def test_validacao_data(client):
    r = criar(client, materia(client), data="2026-02-30")
    assert (r.status_code, r.get_json()) == (400, {"erro": "Data inválida. Use o formato AAAA-MM-DD."})


def test_materia_inexistente(client):
    r = criar(client, 9999)
    assert (r.status_code, r.get_json()) == (400, {"erro": "Matéria não encontrada."})

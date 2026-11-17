from datetime import date, timedelta

URL = "/api/notas"


def dia(delta):
    return (date.today() + timedelta(days=delta)).isoformat()


def materia(client, nome, status="cursando"):
    r = client.post("/api/materias", json={
        "nome": nome, "semestre": "2026.2", "cor": "#6c8cff", "status": status, "notaMinima": 60, "notaTotal": 100})
    return r.get_json()["id"]


def prova(client, mid, titulo, delta, simulado=False, valor=30):
    return client.post("/api/provas", json={
        "materiaId": mid, "titulo": titulo, "data": dia(delta), "valor": valor, "simulado": simulado}).get_json()


def trabalho(client, mid, titulo, delta, valor=20):
    return client.post("/api/trabalhos", json={
        "materiaId": mid, "titulo": titulo, "entrega": dia(delta), "valor": valor}).get_json()


def test_lista_vazia(client):
    assert client.get(URL).get_json() == []


def test_formato_e_ordem(client):
    b = materia(client, "B")
    a = materia(client, "A")
    materia(client, "C", status="cursada")
    t = trabalho(client, a, "Lista", 3)
    p = prova(client, a, "P1", 1)
    prova(client, a, "Sim", 2, simulado=True, valor=10)
    dados = client.get(URL).get_json()
    assert [m["nome"] for m in dados] == ["A", "B"]
    ma = dados[0]
    assert (ma["id"], ma["cor"], ma["notaMinima"], ma["notaTotal"]) == (a, "#6c8cff", 60.0, 100.0)
    assert [i["titulo"] for i in ma["itens"]] == ["P1", "Sim", "Lista"]
    assert [i["tipo"] for i in ma["itens"]] == ["prova", "prova", "trabalho"]
    assert [i["simulado"] for i in ma["itens"]] == [False, True, False]
    it = ma["itens"][2]
    assert it == {"id": t["id"], "tipo": "trabalho", "titulo": "Lista", "data": dia(3),
                  "valor": 20.0, "nota": None, "simulado": False, "concluido": False}
    assert isinstance(ma["itens"][0]["valor"], float)
    assert ma["itens"][0]["id"] == p["id"]
    assert dados[1] == {"id": b, "nome": "B", "cor": "#6c8cff", "notaMinima": 60.0, "notaTotal": 100.0, "itens": []}


def test_inclui_pendentes_e_concluidos(client):
    a = materia(client, "A")
    prova(client, a, "Pendente", 5)
    p = prova(client, a, "Feita", -5)
    client.patch(f"/api/provas/{p['id']}", json={"concluido": True, "nota": 22.5})
    itens = client.get(URL).get_json()[0]["itens"]
    assert [(i["titulo"], i["concluido"], i["nota"]) for i in itens] == [("Feita", True, 22.5), ("Pendente", False, None)]

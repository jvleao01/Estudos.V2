from datetime import date, timedelta

URL = "/api/provas"


def dia(delta):
    return (date.today() + timedelta(days=delta)).isoformat()


def materia(client, nome="Cálculo"):
    r = client.post("/api/materias", json={"nome": nome, "semestre": "2026.2", "cor": "#6c8cff", "status": "cursando", "notaMinima": 60, "notaTotal": 100})
    return r.get_json()["id"]


def criar(client, mid, titulo="P1", data=None):
    return client.post(URL, json={"valor": 30, "materiaId": mid, "titulo": titulo, "data": data or dia(5)})


def test_criar_e_listar(client):
    mid = materia(client)
    r = client.post(URL, json={"valor": 30, "materiaId": mid, "titulo": " P2 ", "data": "2026-12-01"})
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


# ---------- valor e nota ----------

def concluido_com_nota(client, nota=25):
    p = criar(client, materia(client)).get_json()
    return client.patch(f"{URL}/{p['id']}", json={"concluido": True, "nota": nota}).get_json()


def test_valor_volta_como_numero(client):
    p = criar(client, materia(client)).get_json()
    assert p["valor"] == 30.0 and isinstance(p["valor"], float)
    assert p["nota"] is None


def test_valor_obrigatorio(client):
    r = client.post(URL, json={"materiaId": materia(client), "titulo": "X", "data": dia(3)})
    assert (r.status_code, r.get_json()) == (
        400, {"erro": "O valor deve ser um número de 0 a 9999,9 com até 1 casa decimal."})
    r = client.post(URL, json={"valor": 0, "materiaId": materia(client, "B"), "titulo": "X", "data": dia(3)})
    assert (r.status_code, r.get_json()) == (400, {"erro": "O valor deve ser maior que zero."})


def test_nota_no_post_recusada(client):
    r = client.post(URL, json={"valor": 30, "nota": 10, "materiaId": materia(client), "titulo": "X", "data": dia(3)})
    assert (r.status_code, r.get_json()) == (400, {"erro": "A nota só pode ser lançada depois de concluir."})


def test_nota_em_item_pendente_recusada(client):
    p = criar(client, materia(client)).get_json()
    r = client.patch(f"{URL}/{p['id']}", json={"nota": 10})
    assert (r.status_code, r.get_json()) == (400, {"erro": "Só é possível lançar nota depois de concluir."})


def test_lancar_nota_depois_de_concluir(client):
    p = criar(client, materia(client)).get_json()
    client.patch(f"{URL}/{p['id']}", json={"concluido": True})
    r = client.patch(f"{URL}/{p['id']}", json={"nota": 25.5})
    assert r.status_code == 200
    assert r.get_json()["nota"] == 25.5


def test_concluir_e_lancar_no_mesmo_patch(client):
    assert concluido_com_nota(client, 20)["nota"] == 20.0


def test_desmarcar_com_nota_lancada(client):
    p = concluido_com_nota(client)
    r = client.patch(f"{URL}/{p['id']}", json={"concluido": False})
    assert r.status_code == 200
    assert (r.get_json()["concluido"], r.get_json()["nota"]) == (False, 25.0)


def test_desmarcar_e_lancar_juntos_recusado(client):
    p = concluido_com_nota(client)
    r = client.patch(f"{URL}/{p['id']}", json={"concluido": False, "nota": 5})
    assert (r.status_code, r.get_json()) == (400, {"erro": "Só é possível lançar nota depois de concluir."})


def test_nota_acima_do_valor(client):
    p = criar(client, materia(client)).get_json()
    r = client.patch(f"{URL}/{p['id']}", json={"concluido": True, "nota": 30.5})
    assert (r.status_code, r.get_json()) == (400, {"erro": "A nota não pode passar do valor (30)."})


def test_nota_invalida(client):
    p = criar(client, materia(client)).get_json()
    r = client.patch(f"{URL}/{p['id']}", json={"concluido": True, "nota": 7.55})
    assert (r.status_code, r.get_json()) == (
        400, {"erro": "A nota deve ser um número de 0 a 9999,9 com até 1 casa decimal."})


def test_apagar_nota(client):
    p = concluido_com_nota(client)
    assert client.patch(f"{URL}/{p['id']}", json={"nota": None}).get_json()["nota"] is None
    pendente = criar(client, p["materiaId"], "Outro").get_json()
    assert client.patch(f"{URL}/{pendente['id']}", json={"nota": None}).status_code == 200


def test_valor_menor_que_nota(client):
    p = concluido_com_nota(client)
    r = client.patch(f"{URL}/{p['id']}", json={"valor": 20})
    assert (r.status_code, r.get_json()) == (400, {"erro": "O valor não pode ser menor que a nota já lançada (25)."})
    assert client.patch(f"{URL}/{p['id']}", json={"valor": 25}).get_json()["valor"] == 25.0


def test_nota_em_item_antigo_sem_valor(client, db):
    p = criar(client, materia(client)).get_json()
    with db.cursor() as cur:
        cur.execute("UPDATE provas SET valor = NULL WHERE id = %s", (p["id"],))
    r = client.patch(f"{URL}/{p['id']}", json={"concluido": True, "nota": 5})
    assert (r.status_code, r.get_json()) == (400, {"erro": "Defina o valor antes de lançar a nota."})
    assert client.patch(f"{URL}/{p['id']}", json={"titulo": "Novo"}).status_code == 200


def test_criar_com_simulado(client):
    mid = materia(client)
    s = client.post(URL, json={"valor": 10, "simulado": True, "materiaId": mid, "titulo": "S1", "data": dia(3)}).get_json()
    assert s["simulado"] is True
    assert criar(client, mid).get_json()["simulado"] is False
    assert client.patch(f"{URL}/{s['id']}", json={"simulado": False}).get_json()["simulado"] is False
    r = client.patch(f"{URL}/{s['id']}", json={"simulado": "sim"})
    assert (r.status_code, r.get_json()) == (400, {"erro": "O campo simulado deve ser verdadeiro ou falso."})


def test_valor_menor_em_item_desmarcado_descarta_nota_guardada(client):
    p = concluido_com_nota(client)
    client.patch(f"{URL}/{p['id']}", json={"concluido": False})
    r = client.patch(f"{URL}/{p['id']}", json={"valor": 20})
    assert r.status_code == 200
    assert (r.get_json()["valor"], r.get_json()["nota"]) == (20.0, None)

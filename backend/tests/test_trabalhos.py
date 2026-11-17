from datetime import date, timedelta

import pytest

URL = "/api/trabalhos"


def dia(delta):
    return (date.today() + timedelta(days=delta)).isoformat()


def materia(client, nome="Cálculo"):
    r = client.post("/api/materias", json={"nome": nome, "semestre": "2026.2", "cor": "#6c8cff", "status": "cursando", "notaMinima": 60, "notaTotal": 100})
    return r.get_json()["id"]


def criar(client, mid, titulo="Lista", entrega=None):
    return client.post(URL, json={"valor": 30, "materiaId": mid, "titulo": titulo, "entrega": entrega or dia(5)})


def test_criar_e_listar(client):
    mid = materia(client)
    r = client.post(URL, json={"valor": 30, "materiaId": mid, "titulo": "  Lista 3  ", "entrega": "2026-12-01"})
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
    dados = {"valor": 30, "materiaId": materia(client), "titulo": "Lista", "entrega": dia(3)}
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
    r = client.post(URL, json={"valor": 30, "materiaId": 9999, "titulo": "Lista", "entrega": dia(3)})
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


# ---------- valor e nota ----------

def concluido_com_nota(client, nota=25):
    p = criar(client, materia(client)).get_json()
    return client.patch(f"{URL}/{p['id']}", json={"concluido": True, "nota": nota}).get_json()


def test_valor_volta_como_numero(client):
    p = criar(client, materia(client)).get_json()
    assert p["valor"] == 30.0 and isinstance(p["valor"], float)
    assert p["nota"] is None


def test_valor_obrigatorio(client):
    r = client.post(URL, json={"materiaId": materia(client), "titulo": "X", "entrega": dia(3)})
    assert (r.status_code, r.get_json()) == (
        400, {"erro": "O valor deve ser um número de 0 a 9999,9 com até 1 casa decimal."})
    r = client.post(URL, json={"valor": 0, "materiaId": materia(client, "B"), "titulo": "X", "entrega": dia(3)})
    assert (r.status_code, r.get_json()) == (400, {"erro": "O valor deve ser maior que zero."})


def test_nota_no_post_recusada(client):
    r = client.post(URL, json={"valor": 30, "nota": 10, "materiaId": materia(client), "titulo": "X", "entrega": dia(3)})
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
        cur.execute("UPDATE trabalhos SET valor = NULL WHERE id = %s", (p["id"],))
    r = client.patch(f"{URL}/{p['id']}", json={"concluido": True, "nota": 5})
    assert (r.status_code, r.get_json()) == (400, {"erro": "Defina o valor antes de lançar a nota."})
    assert client.patch(f"{URL}/{p['id']}", json={"titulo": "Novo"}).status_code == 200


def test_trabalho_ignora_simulado(client):
    r = client.post(URL, json={"valor": 10, "simulado": True, "materiaId": materia(client), "titulo": "L", "entrega": dia(3)})
    assert r.status_code == 201
    assert "simulado" not in r.get_json()


def test_valor_menor_em_item_desmarcado_descarta_nota_guardada(client):
    p = concluido_com_nota(client)
    client.patch(f"{URL}/{p['id']}", json={"concluido": False})
    r = client.patch(f"{URL}/{p['id']}", json={"valor": 20})
    assert r.status_code == 200
    assert (r.get_json()["valor"], r.get_json()["nota"]) == (20.0, None)

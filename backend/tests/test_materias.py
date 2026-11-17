from datetime import date, timedelta

import pytest

URL = "/api/materias"


def criar(client, **campos):
    dados = {"nome": "Cálculo", "semestre": "2026.2", "cor": "#6c8cff", "status": "cursando", "notaMinima": 60, "notaTotal": 100}
    dados.update(campos)
    return client.post(URL, json=dados)


def test_criar_cursando(client):
    r = criar(client)
    assert r.status_code == 201
    m = r.get_json()
    assert m["id"] > 0
    assert (m["nome"], m["semestre"], m["cor"], m["status"]) == ("Cálculo", "2026.2", "#6c8cff", "cursando")
    assert (m["minutosTotais"], m["trabalhos"], m["trabalhosPendentes"], m["provas"]) == (0, 0, 0, [])


def test_nome_com_espacos_e_acentos_emoji(client):
    m = criar(client, nome="  Introdução à Programação 🚀  ").get_json()
    assert m["nome"] == "Introdução à Programação 🚀"


def test_cursada_sem_cor_recebe_cor_da_paleta_nao_usada(client):
    from rotas.materias import PALETA

    criar(client, cor=PALETA[0])
    m = criar(client, nome="História", status="cursada", semestre="2025.1", cor=None).get_json()
    assert m["cor"] == PALETA[1]


@pytest.mark.parametrize(
    "campos",
    [
        {"nome": "   "},
        {"nome": "x" * 81},
        {"semestre": "2026.3"},
        {"semestre": "26.1"},
        {"cor": "red"},
        {"status": "aprovada"},
    ],
)
def test_validacao_400(client, campos):
    r = criar(client, **campos)
    assert r.status_code == 400
    assert r.get_json()["erro"]


def test_corpo_invalido_400(client):
    assert client.post(URL, data="nada", content_type="text/plain").status_code == 400


def test_duplicado_409_post_e_patch(client):
    criar(client)
    assert criar(client).status_code == 409
    outra = criar(client, nome="Física").get_json()
    r = client.patch(f"{URL}/{outra['id']}", json={"nome": "Cálculo"})
    assert r.status_code == 409


def test_mesmo_nome_outro_semestre_ok(client):
    criar(client)
    assert criar(client, semestre="2027.1").status_code == 201


def test_listar_filtra_e_ordena(client):
    criar(client, nome="Física")
    criar(client, nome="Álgebra")
    criar(client, nome="Química", status="cursada", semestre="2025.1")
    criar(client, nome="Inglês", status="cursada", semestre="2026.1")
    criar(client, nome="Artes", status="cursada", semestre="2026.1")

    cursando = client.get(f"{URL}?status=cursando").get_json()
    assert [m["nome"] for m in cursando] == ["Álgebra", "Física"]
    cursadas = client.get(f"{URL}?status=cursada").get_json()
    assert [(m["semestre"], m["nome"]) for m in cursadas] == [
        ("2026.1", "Artes"), ("2026.1", "Inglês"), ("2025.1", "Química")
    ]
    assert len(client.get(URL).get_json()) == 5
    assert client.get(f"{URL}?status=xyz").status_code == 400


def test_agregados(client, db):
    mid = criar(client).get_json()["id"]
    outra = criar(client, nome="Física").get_json()["id"]
    hoje = date.today()
    with db.cursor() as cur:
        cur.executemany(
            "INSERT INTO sessoes_estudo (materia_id, inicio, minutos) VALUES (%s, NOW(), %s)",
            [(mid, 90), (mid, 45), (outra, 500)],
        )
        cur.executemany(
            "INSERT INTO trabalhos (materia_id, titulo, concluido) VALUES (%s, %s, %s)",
            [(mid, "T1", 1), (mid, "T2", 0), (mid, "T3", 0)],
        )
        cur.executemany(
            "INSERT INTO provas (materia_id, titulo, data) VALUES (%s, %s, %s)",
            [
                (mid, "P3", hoje + timedelta(days=20)),
                (mid, "Passada", hoje - timedelta(days=1)),
                (mid, "Hoje", hoje),
            ],
        )
    m = next(x for x in client.get(URL).get_json() if x["id"] == mid)
    assert m["minutosTotais"] == 135
    assert (m["trabalhos"], m["trabalhosPendentes"]) == (3, 2)
    assert m["provas"] == [
        {"titulo": "Hoje", "data": hoje.isoformat()},
        {"titulo": "P3", "data": (hoje + timedelta(days=20)).isoformat()},
    ]


def test_finalizar_e_editar(client):
    mid = criar(client).get_json()["id"]
    r = client.patch(f"{URL}/{mid}", json={"status": "cursada"})
    assert r.status_code == 200
    assert r.get_json()["status"] == "cursada"
    r = client.patch(f"{URL}/{mid}", json={"nome": "Cálculo I", "cor": "#ffffff"})
    assert (r.get_json()["nome"], r.get_json()["cor"]) == ("Cálculo I", "#ffffff")
    assert client.patch(f"{URL}/{mid}", json={"semestre": "x"}).status_code == 400


def test_patch_e_delete_inexistente_404(client):
    assert client.patch(f"{URL}/999", json={"status": "cursada"}).status_code == 404
    assert client.delete(f"{URL}/999").status_code == 404


def test_delete_remove_dependentes(client, db):
    mid = criar(client).get_json()["id"]
    with db.cursor() as cur:
        cur.execute("INSERT INTO provas (materia_id, titulo, data) VALUES (%s, 'P', CURDATE())", (mid,))
    assert client.delete(f"{URL}/{mid}").status_code == 204
    assert client.get(URL).get_json() == []
    with db.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM provas")
        assert cur.fetchone()[0] == 0


def test_prova_feita_nao_aparece_nos_cards(client):
    mid = criar(client).get_json()["id"]
    amanha = (date.today() + timedelta(days=1)).isoformat()
    depois = (date.today() + timedelta(days=2)).isoformat()
    feita = client.post("/api/provas", json={"materiaId": mid, "titulo": "P1", "data": amanha}).get_json()
    client.post("/api/provas", json={"materiaId": mid, "titulo": "P2", "data": depois})
    client.patch(f"/api/provas/{feita['id']}", json={"concluido": True})
    m = client.get(URL).get_json()[0]
    assert m["provas"] == [{"titulo": "P2", "data": depois}]


MSG_TOTAL = "O total de pontos deve ser um número de 0 a 9999,9 com até 1 casa decimal."
MSG_MIN_TOTAL = "A nota mínima não pode passar do total."


def test_criar_com_minimo_e_total(client):
    r = criar(client)
    assert r.status_code == 201
    m = r.get_json()
    assert (m["notaMinima"], m["notaTotal"]) == (60.0, 100.0)
    assert isinstance(m["notaMinima"], float) and isinstance(m["notaTotal"], float)
    assert "nota_minima" not in m
    lista = client.get(URL).get_json()
    assert (lista[0]["notaMinima"], lista[0]["notaTotal"]) == (60.0, 100.0)


def test_minimo_e_total_obrigatorios_ao_criar(client):
    dados = {"nome": "Cálculo", "semestre": "2026.2", "status": "cursando", "notaMinima": 60}
    r = client.post(URL, json=dados)
    assert (r.status_code, r.get_json()) == (400, {"erro": MSG_TOTAL})


@pytest.mark.parametrize("valor", [-1, "60", True, 7.55, 10000])
def test_validacao_pontos(client, valor):
    r = criar(client, notaMinima=valor)
    assert (r.status_code, r.get_json()) == (
        400, {"erro": "A nota mínima deve ser um número de 0 a 9999,9 com até 1 casa decimal."})


def test_pontos_com_uma_casa_aceitos(client):
    m = criar(client, notaMinima=7.5, notaTotal=10).get_json()
    assert (m["notaMinima"], m["notaTotal"]) == (7.5, 10.0)


def test_total_zero_recusado(client):
    r = criar(client, notaMinima=0, notaTotal=0)
    assert (r.status_code, r.get_json()) == (400, {"erro": "O total de pontos deve ser maior que zero."})


def test_minimo_maior_que_total(client):
    r = criar(client, notaMinima=120, notaTotal=100)
    assert (r.status_code, r.get_json()) == (400, {"erro": MSG_MIN_TOTAL})


def test_patch_minimo_compara_com_total_gravado(client):
    mid = criar(client).get_json()["id"]
    r = client.patch(f"{URL}/{mid}", json={"notaMinima": 120})
    assert (r.status_code, r.get_json()) == (400, {"erro": MSG_MIN_TOTAL})
    r = client.patch(f"{URL}/{mid}", json={"notaMinima": 70, "notaTotal": 80})
    assert (r.get_json()["notaMinima"], r.get_json()["notaTotal"]) == (70.0, 80.0)


def test_materia_antiga_sem_valores_aceita_patch_parcial(client, db):
    with db.cursor() as cur:
        cur.execute(
            "INSERT INTO materias (nome, semestre, cor, status) VALUES ('Antiga', '2026.2', '#6c8cff', 'cursando')"
        )
        mid = cur.lastrowid
    r = client.patch(f"{URL}/{mid}", json={"nome": "Antiga 2"})
    assert r.status_code == 200
    assert (r.get_json()["notaMinima"], r.get_json()["notaTotal"]) == (None, None)
    r = client.patch(f"{URL}/{mid}", json={"notaMinima": 50})
    assert r.get_json()["notaMinima"] == 50.0

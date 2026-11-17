def test_index_servido(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Dashboard" in r.get_data(as_text=True)


def test_estatico_css(client):
    r = client.get("/assets/css/style.css")
    assert r.status_code == 200


def test_caminho_inexistente_404(client):
    assert client.get("/nao-existe.html").status_code == 404


def test_banco_indisponivel_503(monkeypatch):
    from app import create_app

    monkeypatch.setenv("DB_PORT", "1")
    app = create_app()
    r = app.test_client().get("/api/saude")
    assert r.status_code == 503
    assert "MySQL" in r.get_json()["erro"]


def test_saude_ok(client):
    r = client.get("/api/saude")
    assert r.status_code == 200
    assert r.get_json() == {"ok": True}


def test_index_da_raiz_tambem_em_index_html(client):
    r = client.get("/index.html")
    assert r.status_code == 200
    assert "Dashboard" in r.get_data(as_text=True)


def test_paginas_e_assets_sob_frontend(client):
    assert client.get("/frontend/pages/notas.html").status_code == 200
    assert client.get("/frontend/assets/css/style.css").status_code == 200


def test_nao_expoe_arquivos_do_repositorio(client):
    for caminho in ["/backend/app.py", "/frontend/../backend/app.py", "/README.md", "/.env"]:
        assert client.get(caminho).status_code == 404, caminho

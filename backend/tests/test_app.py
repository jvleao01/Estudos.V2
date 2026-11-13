def test_index_servido(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Dashboard" in r.get_data(as_text=True)


def test_estatico_css(client):
    r = client.get("/assetes/css/style.css")
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

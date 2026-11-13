"""Servidor do app de estudos: entrega o frontend e a API em localhost:5000.

Rodar:  .venv\\Scripts\\python backend\\app.py
"""
from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from conexao.conexao import BancoIndisponivel, get_conexao

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"


def create_app():
    app = Flask(__name__, static_folder=None)
    app.json.ensure_ascii = False
    app.json.sort_keys = False

    from rotas.materias import bp as materias_bp

    app.register_blueprint(materias_bp)

    @app.errorhandler(BancoIndisponivel)
    def banco_indisponivel(_e):
        return jsonify(erro="Banco de dados indisponível. O MySQL do XAMPP está ligado?"), 503

    @app.get("/api/saude")
    def saude():
        get_conexao().close()
        return jsonify(ok=True)

    @app.get("/")
    def index():
        return send_from_directory(FRONTEND, "index.html")

    @app.get("/<path:caminho>")
    def estatico(caminho):
        return send_from_directory(FRONTEND, caminho)

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5000, debug=True)

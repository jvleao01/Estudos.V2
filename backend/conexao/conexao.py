"""Conexão com o MySQL/MariaDB do XAMPP.

Configuração por variáveis de ambiente (padrões para o XAMPP desta máquina,
cujo MariaDB roda na porta 8000 porque a 3306 é usada pelo MySQL 8):
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
"""
import os

import pymysql
from pymysql.cursors import DictCursor


class BancoIndisponivel(Exception):
    """O servidor de banco não respondeu."""


def config_banco():
    return {
        "host": os.environ.get("DB_HOST", "127.0.0.1"),
        "port": int(os.environ.get("DB_PORT", "8000")),
        "user": os.environ.get("DB_USER", "root"),
        "password": os.environ.get("DB_PASSWORD", ""),
        "database": os.environ.get("DB_NAME", "estudos"),
        "charset": "utf8mb4",
    }


def get_conexao():
    try:
        return pymysql.connect(
            **config_banco(), autocommit=True, cursorclass=DictCursor, connect_timeout=3
        )
    except pymysql.err.OperationalError as e:
        raise BancoIndisponivel(str(e)) from e

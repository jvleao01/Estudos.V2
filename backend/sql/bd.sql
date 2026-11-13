-- Estrutura do banco. Rode uma vez (phpMyAdmin > Importar, ou:
--   c:\xampp\mysql\bin\mysql -uroot -P8000 < backend\sql\bd.sql)

CREATE DATABASE IF NOT EXISTS `estudos` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `estudos`;

CREATE TABLE IF NOT EXISTS materias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  semestre CHAR(6) NOT NULL,
  cor CHAR(7) NOT NULL,
  status ENUM('cursando', 'cursada') NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_materia_semestre (nome, semestre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessoes_estudo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  materia_id INT NOT NULL,
  inicio DATETIME NOT NULL,
  minutos INT NOT NULL,
  CONSTRAINT fk_sessao_materia FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trabalhos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  materia_id INT NOT NULL,
  titulo VARCHAR(120) NOT NULL,
  entrega DATE NULL,
  concluido BOOLEAN NOT NULL DEFAULT 0,
  CONSTRAINT fk_trabalho_materia FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS provas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  materia_id INT NOT NULL,
  titulo VARCHAR(120) NOT NULL,
  data DATE NOT NULL,
  CONSTRAINT fk_prova_materia FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

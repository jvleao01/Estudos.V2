-- Dados de exemplo (opcional). Rode depois do bd.sql:
--   c:\xampp\mysql\bin\mysql -uroot -h127.0.0.1 -P8000 estudos < backend\sql\seed.sql
-- Apaga os dados atuais!

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE sessoes_estudo;
TRUNCATE TABLE trabalhos;
TRUNCATE TABLE provas;
TRUNCATE TABLE materias;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO materias (id, nome, semestre, cor, status) VALUES
  (1, 'Cálculo II', '2026.2', '#6c8cff', 'cursando'),
  (2, 'Física I', '2026.2', '#2ec4b6', 'cursando'),
  (3, 'Programação Orientada a Objetos', '2026.2', '#f4a261', 'cursando'),
  (4, 'Química Geral', '2026.2', '#e76f9a', 'cursando'),
  (5, 'Cálculo I', '2026.1', '#b388ff', 'cursada'),
  (6, 'Algoritmos', '2026.1', '#e9c46a', 'cursada'),
  (7, 'Inglês Instrumental', '2025.2', '#4cc9f0', 'cursada');

INSERT INTO sessoes_estudo (materia_id, inicio, minutos) VALUES
  (1, NOW() - INTERVAL 1 DAY, 120), (1, NOW() - INTERVAL 3 DAY, 90), (1, NOW() - INTERVAL 8 DAY, 540),
  (2, NOW() - INTERVAL 2 DAY, 60), (2, NOW() - INTERVAL 5 DAY, 180),
  (3, NOW() - INTERVAL 1 DAY, 150), (3, NOW() - INTERVAL 4 DAY, 200);

INSERT INTO trabalhos (materia_id, titulo, entrega, concluido) VALUES
  (1, 'Lista 1', CURDATE() - INTERVAL 10 DAY, 1),
  (1, 'Lista 2', CURDATE() - INTERVAL 2 DAY, 1),
  (1, 'Lista 3', CURDATE() + INTERVAL 5 DAY, 0),
  (3, 'Projeto final', CURDATE() + INTERVAL 20 DAY, 0),
  (2, 'Relatório de laboratório', CURDATE() - INTERVAL 3 DAY, 0);

INSERT INTO provas (materia_id, titulo, data, concluido) VALUES
  (1, 'P2', CURDATE() + INTERVAL 2 DAY, 0),
  (1, 'P3', CURDATE() + INTERVAL 26 DAY, 0),
  (2, 'Prova 2', CURDATE() + INTERVAL 6 DAY, 0),
  (3, 'Avaliação prática', CURDATE() + INTERVAL 11 DAY, 0),
  (4, 'P1', CURDATE() - INTERVAL 3 DAY, 1);

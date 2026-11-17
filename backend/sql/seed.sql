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

INSERT INTO materias (id, nome, semestre, cor, status, nota_minima, nota_total) VALUES
  (1, 'Cálculo II', '2026.2', '#6c8cff', 'cursando', 60, 100),
  (2, 'Física I', '2026.2', '#2ec4b6', 'cursando', 70, 100),
  (3, 'Programação Orientada a Objetos', '2026.2', '#f4a261', 'cursando', 60, 100),
  (4, 'Química Geral', '2026.2', '#e76f9a', 'cursando', 60, 100),
  (5, 'Cálculo I', '2026.1', '#b388ff', 'cursada', NULL, NULL),
  (6, 'Algoritmos', '2026.1', '#e9c46a', 'cursada', NULL, NULL),
  (7, 'Inglês Instrumental', '2025.2', '#4cc9f0', 'cursada', NULL, NULL);

INSERT INTO sessoes_estudo (materia_id, inicio, minutos) VALUES
  (1, NOW() - INTERVAL 1 DAY, 120), (1, NOW() - INTERVAL 3 DAY, 90), (1, NOW() - INTERVAL 8 DAY, 540),
  (2, NOW() - INTERVAL 2 DAY, 60), (2, NOW() - INTERVAL 5 DAY, 180),
  (3, NOW() - INTERVAL 1 DAY, 150), (3, NOW() - INTERVAL 4 DAY, 200);

-- Cálculo II: aprovada só por causa do simulado (50 + 10 de bônus = 60).
-- Física I: lista entregue ainda sem nota. Química Geral: não dá mais para atingir o mínimo.
INSERT INTO trabalhos (materia_id, titulo, entrega, concluido, valor, nota) VALUES
  (1, 'Lista 1', CURDATE() - INTERVAL 10 DAY, 1, 10, 8),
  (1, 'Lista 2', CURDATE() - INTERVAL 2 DAY, 1, 10, 9),
  (1, 'Lista 3', CURDATE() + INTERVAL 5 DAY, 0, 10, NULL),
  (3, 'Projeto final', CURDATE() + INTERVAL 20 DAY, 0, 40, NULL),
  (2, 'Relatório de laboratório', CURDATE() - INTERVAL 3 DAY, 0, 20, NULL),
  (2, 'Lista de exercícios', CURDATE() - INTERVAL 8 DAY, 1, 10, NULL),
  (4, 'Relatório de titulação', CURDATE() - INTERVAL 6 DAY, 1, 30, 10);

INSERT INTO provas (materia_id, titulo, data, concluido, valor, nota, simulado) VALUES
  (1, 'P1', CURDATE() - INTERVAL 20 DAY, 1, 35, 33, 0),
  (1, 'Simulado 1', CURDATE() - INTERVAL 5 DAY, 1, 10, 10, 1),
  (1, 'P2', CURDATE() + INTERVAL 2 DAY, 0, 35, NULL, 0),
  (1, 'Simulado 2', CURDATE() + INTERVAL 26 DAY, 0, 10, NULL, 1),
  (2, 'Prova 1', CURDATE() - INTERVAL 15 DAY, 1, 40, 28, 0),
  (2, 'Prova 2', CURDATE() + INTERVAL 6 DAY, 0, 30, NULL, 0),
  (3, 'Avaliação prática', CURDATE() + INTERVAL 11 DAY, 0, 30, NULL, 0),
  (3, 'Simulado de POO', CURDATE() + INTERVAL 9 DAY, 0, 10, NULL, 1),
  (4, 'P1', CURDATE() - INTERVAL 3 DAY, 1, 40, 8, 0),
  (4, 'P2', CURDATE() + INTERVAL 15 DAY, 0, 30, NULL, 0);

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS products_db CHARACTER SET utf8mb4;

CREATE USER IF NOT EXISTS 'products_user'@'%' IDENTIFIED BY 'products_pass';
GRANT ALL PRIVILEGES ON products_db.* TO 'products_user'@'%';

USE products_db;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, price) VALUES
  ('Clavier mécanique', 49.90),
  ('Souris sans fil', 19.99),
  ('Écran 24 pouces', 129.00);

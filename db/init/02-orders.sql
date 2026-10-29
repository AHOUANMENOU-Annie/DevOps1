SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS orders_db CHARACTER SET utf8mb4;

CREATE USER IF NOT EXISTS 'orders_user'@'%' IDENTIFIED BY 'orders_pass';
GRANT ALL PRIVILEGES ON orders_db.* TO 'orders_user'@'%';

USE orders_db;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

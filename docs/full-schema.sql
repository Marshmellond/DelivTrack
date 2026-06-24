-- 外卖配送实时监控系统 — 完整建表 SQL
-- 执行方式: mysql -u root -p123456 < full-schema.sql

CREATE DATABASE IF NOT EXISTS delivery_dashboard DEFAULT CHARSET utf8mb4;
USE delivery_dashboard;

-- ============================================
-- 基础数据表（CRUD）
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(200),
    role ENUM('admin','user') DEFAULT 'user',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS merchants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    address VARCHAR(200),
    phone VARCHAR(20),
    status ENUM('active','closed') DEFAULT 'active',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS riders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    vehicle VARCHAR(20),
    status ENUM('online','offline','delivering') DEFAULT 'offline',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    merchant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(8,2) NOT NULL,
    stock INT DEFAULT 0,
    category VARCHAR(50),
    status ENUM('on_sale','off_sale') DEFAULT 'on_sale',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id),
    INDEX idx_merchant (merchant_id)
) ENGINE=InnoDB;

-- ============================================
-- 订单流水表（Flink 写入 + 前端只读）
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(32) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    merchant_id INT NOT NULL,
    rider_id INT,
    items JSON,
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(6,2) DEFAULT 5.00,
    distance DECIMAL(5,2),
    status ENUM('created','accepted','delivering','delivered','cancelled') DEFAULT 'created',
    city VARCHAR(50),
    district VARCHAR(50),
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    accept_time DATETIME,
    delivery_time DATETIME,
    finish_time DATETIME,
    INDEX idx_status (status),
    INDEX idx_city (city),
    INDEX idx_merchant (merchant_id),
    INDEX idx_create_time (create_time)
) ENGINE=InnoDB;

-- ============================================
-- 聚合结果表（Flink 5 秒窗口写入，前端大屏只读）
-- ============================================

CREATE TABLE IF NOT EXISTS dashboard_summary (
    id INT PRIMARY KEY DEFAULT 1,
    gmv DECIMAL(14,2) DEFAULT 0,
    order_count BIGINT DEFAULT 0,
    rider_online INT DEFAULT 0,
    rider_delivering INT DEFAULT 0,
    avg_delivery_time DECIMAL(6,2) DEFAULT 0,
    cancel_rate DECIMAL(5,2) DEFAULT 0,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO dashboard_summary (id, gmv, order_count, rider_online, rider_delivering, avg_delivery_time, cancel_rate)
VALUES (1, 0, 0, 0, 0, 0, 0)
ON DUPLICATE KEY UPDATE id=id;

CREATE TABLE IF NOT EXISTS dashboard_region (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(50) NOT NULL,
    district VARCHAR(50),
    order_count BIGINT DEFAULT 0,
    gmv DECIMAL(14,2) DEFAULT 0,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_region (city, district)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dashboard_merchant_rank (
    id INT AUTO_INCREMENT PRIMARY KEY,
    merchant_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    order_count BIGINT DEFAULT 0,
    gmv DECIMAL(14,2) DEFAULT 0,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_merchant (merchant_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dashboard_hourly (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    time_slot DATETIME NOT NULL,
    order_count INT DEFAULT 0,
    gmv DECIMAL(12,2) DEFAULT 0,
    avg_delivery_time DECIMAL(6,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_time (time_slot)
) ENGINE=InnoDB;

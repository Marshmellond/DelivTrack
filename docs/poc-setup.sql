-- POC Step 1: MySQL 建库建表
-- 在 Node_02 (192.168.157.122) 上执行：
--   mysql -u root -pItcast@2020 < docs/poc-setup.sql
-- 或手动逐条执行

CREATE DATABASE IF NOT EXISTS delivery_poc DEFAULT CHARSET utf8mb4;
USE delivery_poc;

-- POC 只用一张聚合表，Flink 算出来的 GMV 和订单数就写这里
CREATE TABLE IF NOT EXISTS dashboard_summary (
    id INT PRIMARY KEY DEFAULT 1,
    gmv DECIMAL(14,2) DEFAULT 0,
    order_count BIGINT DEFAULT 0,
    avg_order_amount DECIMAL(8,2) DEFAULT 0,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 插入初始行（Flink 用 REPLACE INTO 更新这一行）
INSERT INTO dashboard_summary (id, gmv, order_count, avg_order_amount) VALUES (1, 0, 0, 0)
ON DUPLICATE KEY UPDATE id=id;

-- 验证
SELECT * FROM dashboard_summary;

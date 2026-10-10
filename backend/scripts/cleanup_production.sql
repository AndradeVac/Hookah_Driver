-- Script para limpar dados de produção
-- Mantém: produtos, categorias, flavores, usuários (com login/senha)
-- Deleta: pedidos, histórico de pedidos, clientes, auditoria

BEGIN;

-- Resetar sequences para começar do 1 novamente
ALTER SEQUENCE orders_order_number_seq RESTART WITH 1;

-- Deletar order_status_history (referencia orders e users)
DELETE FROM order_status_history;

-- Deletar order_items (referencia orders e products)
DELETE FROM order_items;

-- Deletar orders (referencia customers)
DELETE FROM orders;

-- Deletar customers
DELETE FROM customers;

-- Deletar audit_logs
DELETE FROM audit_logs;

-- Mostrar contagem de registros restantes para confirmação
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'flavors', COUNT(*) FROM flavors
UNION ALL
SELECT 'brands', COUNT(*) FROM brands
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs;

COMMIT;

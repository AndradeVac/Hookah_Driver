# 🧪 Teste de Endpoints - Limpeza de Pedidos

## Status dos Servidores
- Backend: http://localhost:8000 ✓ (Rodando)
- Frontend: http://localhost:5173 ✓ (Rodando)

## Testes via cURL

### 1. Verificar saúde da API
```bash
curl -X GET "http://localhost:8000/health" -v
```

Esperado: HTTP 200 OK

### 2. Login (Obter Token)
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin","password":"senha123"}'
```

Esperado: Retorna token JWT

### 3. Listar Pedidos
```bash
curl -X GET "http://localhost:8000/orders?limit=10" \
  -H "Authorization: Bearer {TOKEN}" \
  -v
```

Esperado: HTTP 200 OK com lista de pedidos

### 4. Deletar Um Pedido
```bash
curl -X DELETE "http://localhost:8000/orders/{ORDER_ID}" \
  -H "Authorization: Bearer {TOKEN}" \
  -v
```

Esperado: HTTP 204 No Content

### 5. Deletar Todos os Pedidos
```bash
curl -X DELETE "http://localhost:8000/orders" \
  -H "Authorization: Bearer {TOKEN}" \
  -v
```

Esperado: HTTP 200 OK com `{"deleted_count": X}`

## Próximas Etapas
1. Fazer login na interface
2. Criar alguns pedidos de teste
3. Testar botão de deletar individual
4. Testar botão de limpar todos
5. Validar auditoria no banco

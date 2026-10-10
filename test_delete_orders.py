#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de teste completo para a funcionalidade de limpeza de pedidos.
"""

import requests
import json
from typing import Optional
import sys
import io

# Force UTF-8 output
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8000"
TOKEN: Optional[str] = None


def print_section(title: str):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


def print_success(msg: str):
    print(f"✅ {msg}")


def print_error(msg: str):
    print(f"❌ {msg}")


def print_info(msg: str):
    print(f"ℹ️  {msg}")


def test_health():
    """Teste 1: Verificar saúde da API"""
    print_section("1. TESTE DE SAÚDE DA API")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print_success(f"API está saudável: {data}")
            return True
        else:
            print_error(f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Erro ao conectar: {e}")
        return False


def test_login():
    """Teste 2: Fazer login"""
    global TOKEN
    print_section("2. TESTE DE LOGIN")
    
    try:
        credentials = {
            "username": "admin@admin",
            "password": "senha123"
        }
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data=credentials
        )
        
        if response.status_code == 200:
            data = response.json()
            TOKEN = data.get("access_token")
            print_success(f"Login bem-sucedido!")
            print_info(f"Token obtido: {TOKEN[:50]}...")
            return True
        else:
            print_error(f"Falha no login: {response.status_code}")
            print_info(f"Resposta: {response.text}")
            return False
    except Exception as e:
        print_error(f"Erro ao fazer login: {e}")
        return False


def get_headers():
    """Obter headers de autenticação"""
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }


def test_get_orders():
    """Teste 3: Listar pedidos"""
    print_section("3. LISTAR PEDIDOS")
    
    if not TOKEN:
        print_error("Não autenticado")
        return 0
    
    try:
        response = requests.get(
            f"{BASE_URL}/orders?limit=100",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            orders = response.json()
            print_success(f"Pedidos listados: {len(orders)} encontrados")
            
            if orders:
                for order in orders[:3]:
                    print_info(f"  - Pedido #{order.get('order_number')}: Status {order.get('status')}")
                if len(orders) > 3:
                    print_info(f"  ... e mais {len(orders) - 3}")
            
            return len(orders)
        else:
            print_error(f"Falha ao listar: {response.status_code}")
            return 0
    except Exception as e:
        print_error(f"Erro ao listar pedidos: {e}")
        return 0


def create_test_order():
    """Teste 4: Criar um pedido de teste"""
    print_section("4. CRIAR PEDIDO DE TESTE")
    
    if not TOKEN:
        print_error("Não autenticado")
        return None
    
    try:
        # Primeiro, obter um cliente
        response = requests.get(
            f"{BASE_URL}/customers?limit=1",
            headers=get_headers()
        )
        
        if response.status_code != 200 or not response.json():
            print_error("Nenhum cliente disponível para criar pedido")
            return None
        
        customer_id = response.json()[0]["id"]
        
        # Obter um produto
        response = requests.get(
            f"{BASE_URL}/products?limit=1",
            headers=get_headers()
        )
        
        if response.status_code != 200 or not response.json():
            print_error("Nenhum produto disponível")
            return None
        
        product_id = response.json()[0]["id"]
        
        # Criar pedido
        order_data = {
            "customer_id": customer_id,
            "payment_method": "CASH",
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 1,
                    "notes": "Teste"
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/orders",
            json=order_data,
            headers=get_headers()
        )
        
        if response.status_code == 201:
            order = response.json()
            print_success(f"Pedido criado: #{order.get('order_number')}")
            return order["id"]
        else:
            print_error(f"Falha ao criar pedido: {response.status_code}")
            print_info(f"Resposta: {response.text[:200]}")
            return None
    except Exception as e:
        print_error(f"Erro ao criar pedido: {e}")
        return None


def test_delete_single_order(order_id: str):
    """Teste 5: Deletar um pedido específico"""
    print_section("5. DELETAR PEDIDO ESPECÍFICO")
    
    if not TOKEN:
        print_error("Não autenticado")
        return False
    
    try:
        response = requests.delete(
            f"{BASE_URL}/orders/{order_id}",
            headers=get_headers()
        )
        
        if response.status_code == 204:
            print_success(f"Pedido {order_id} deletado com sucesso!")
            return True
        else:
            print_error(f"Falha ao deletar: {response.status_code}")
            print_info(f"Resposta: {response.text}")
            return False
    except Exception as e:
        print_error(f"Erro ao deletar pedido: {e}")
        return False


def test_delete_all_orders():
    """Teste 6: Deletar todos os pedidos"""
    print_section("6. DELETAR TODOS OS PEDIDOS")
    
    if not TOKEN:
        print_error("Não autenticado")
        return 0
    
    try:
        # Primeiro, contar quantos tem
        response = requests.get(
            f"{BASE_URL}/orders?limit=100",
            headers=get_headers()
        )
        
        if response.status_code != 200:
            print_error("Falha ao listar pedidos antes de deletar")
            return 0
        
        count_before = len(response.json())
        print_info(f"Pedidos antes da limpeza: {count_before}")
        
        # Deletar todos
        response = requests.delete(
            f"{BASE_URL}/orders",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            data = response.json()
            deleted_count = data.get("deleted_count", 0)
            print_success(f"Pedidos deletados: {deleted_count}")
            
            # Verificar se limpou
            response = requests.get(
                f"{BASE_URL}/orders?limit=100",
                headers=get_headers()
            )
            
            if response.status_code == 200:
                count_after = len(response.json())
                print_info(f"Pedidos após limpeza: {count_after}")
                
                if count_after == 0:
                    print_success("Todos os pedidos foram removidos!")
                    return deleted_count
                else:
                    print_error(f"Ainda há {count_after} pedidos")
                    return 0
        else:
            print_error(f"Falha ao deletar todos: {response.status_code}")
            print_info(f"Resposta: {response.text}")
            return 0
    except Exception as e:
        print_error(f"Erro ao deletar todos: {e}")
        return 0


def test_unauthorized_access():
    """Teste 7: Testar acesso sem autenticação"""
    print_section("7. TESTE DE ACESSO NÃO AUTORIZADO")
    
    try:
        response = requests.delete(
            f"{BASE_URL}/orders",
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 401:
            print_success("Acesso bloqueado corretamente (401 Unauthorized)")
            return True
        else:
            print_error(f"Segurança falhou: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Erro no teste: {e}")
        return False


def main():
    """Executar todos os testes"""
    print("\n")
    print("╔════════════════════════════════════════════════════════════════════╗")
    print("║                                                                    ║")
    print("║    🧪 TESTES DE LIMPEZA DE PEDIDOS - FUNCIONALIDADE GERENTE       ║")
    print("║                                                                    ║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    
    results = []
    
    # Teste 1: Saúde
    results.append(("Saúde da API", test_health()))
    
    if not results[0][1]:
        print_error("\nAPI não está respondendo. Interrompendo testes.")
        return
    
    # Teste 2: Login
    results.append(("Login", test_login()))
    
    if not results[1][1]:
        print_error("\nNão foi possível fazer login. Interrompendo testes.")
        return
    
    # Teste 3: Listar pedidos
    initial_count = test_get_orders()
    results.append(("Listar Pedidos", initial_count >= 0))
    
    # Teste 4: Criar pedido de teste
    test_order_id = create_test_order()
    results.append(("Criar Pedido de Teste", test_order_id is not None))
    
    # Teste 5: Deletar pedido específico (se foi criado)
    if test_order_id:
        results.append(("Deletar Pedido Específico", test_delete_single_order(test_order_id)))
    else:
        print_info("Pulando teste de deletar específico (sem pedido de teste)")
    
    # Teste 6: Deletar todos os pedidos
    deleted_count = test_delete_all_orders()
    results.append(("Deletar Todos os Pedidos", deleted_count > 0))
    
    # Teste 7: Segurança
    results.append(("Segurança (Acesso Não Autorizado)", test_unauthorized_access()))
    
    # Resumo
    print_section("📊 RESUMO DOS TESTES")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"  {status}: {test_name}")
    
    print(f"\n  Total: {passed}/{total} testes passaram")
    
    if passed == total:
        print("\n  🎉 TODOS OS TESTES PASSARAM! 🎉\n")
    else:
        print(f"\n  ⚠️  {total - passed} teste(s) falharam\n")


if __name__ == "__main__":
    main()

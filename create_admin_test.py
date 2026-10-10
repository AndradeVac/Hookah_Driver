#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Criar usuario admin para testes"""

import sys
import os

# Adicionar o backend ao path
backend_path = r"C:\Users\Vinícius\OneDrive\Documentos\INOVISION\Hookah Driver\codigo\backend"
sys.path.insert(0, backend_path)

from app.core.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from pwdlib import PasswordHash

# Criar tabelas se não existirem
Base.metadata.create_all(bind=engine)

# Criar sessão
db = SessionLocal()
password_hash = PasswordHash.recommended()

try:
    # Verificar se admin já existe
    existing = db.query(User).filter(User.email == "admin@admin").first()
    
    if existing:
        print(f"Admin já existe: {existing.email}")
    else:
        # Criar novo admin
        admin = User(
            email="admin@admin",
            name="Admin Teste",
            password_hash=password_hash.hash("senha123"),
            role=UserRole.ADMIN
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print(f"Admin criado com sucesso!")
        print(f"Email: admin@admin")
        print(f"Senha: senha123")
        print(f"Role: ADMIN")
        
finally:
    db.close()

"""Create the first administrator, or reset an existing user's password and make it ADMIN.

Usage (from backend/):
    python -m scripts.create_admin --email admin@lounge.com --name "Administrador"

The password is asked interactively. For non-interactive environments (e.g. a
Render shell job), set ADMIN_PASSWORD instead.
"""
from __future__ import annotations

import argparse
import getpass
import os
import sys

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.services.user import UserService

MIN_PASSWORD_LENGTH = 12


def read_password() -> str:
    password = os.getenv("ADMIN_PASSWORD")
    if password:
        return password
    password = getpass.getpass("Senha: ")
    if password != getpass.getpass("Confirme a senha: "):
        sys.exit("As senhas não conferem.")
    return password


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", default="Administrador")
    args = parser.parse_args()

    password = read_password()
    if len(password) < MIN_PASSWORD_LENGTH:
        sys.exit(f"A senha precisa ter pelo menos {MIN_PASSWORD_LENGTH} caracteres.")

    email = args.email.strip().lower()
    password_hash = UserService.password_hash.hash(password)
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            db.add(User(name=args.name, email=email, password_hash=password_hash, role=UserRole.ADMIN))
            action = "criado"
        else:
            user.password_hash = password_hash
            user.role = UserRole.ADMIN
            user.active = True
            action = "atualizado"
        db.commit()

    print(f"Administrador {email} {action}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

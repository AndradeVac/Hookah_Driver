from datetime import datetime, timezone
from uuid import uuid4

import jwt
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.core.security import create_access_token, require_roles
from app.models.user import User, UserRole


def build_user(role: UserRole) -> User:
    return User(
        id=uuid4(),
        name="User",
        email="user@example.com",
        password_hash="hash",
        role=role,
        active=True,
    )


def test_create_access_token_contains_identity_and_role():
    user = build_user(UserRole.ADMIN)

    token = create_access_token(user)
    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )

    assert payload["sub"] == str(user.id)
    assert payload["role"] == "ADMIN"
    assert payload["exp"] > datetime.now(timezone.utc).timestamp()


def test_admin_role_dependency_accepts_admin():
    user = build_user(UserRole.ADMIN)
    dependency = require_roles(UserRole.ADMIN)

    assert dependency(user) is user


def test_admin_role_dependency_rejects_operator():
    user = build_user(UserRole.OPERATOR)
    dependency = require_roles(UserRole.ADMIN)

    with pytest.raises(HTTPException) as error:
        dependency(user)

    assert error.value.status_code == 403

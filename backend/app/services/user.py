from sqlalchemy.orm import Session

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.core.exceptions import AuthenticationError
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserStatusUpdate
from pwdlib import PasswordHash


class UserService:
    password_hash = PasswordHash.recommended()

    def __init__(self, db: Session):
        self.repository = UserRepository(db)
        self.db = db

    def create(self, data: UserCreate) -> User:
        user = User(
            name=data.name,
            email=data.email.lower(),
            password_hash=self.password_hash.hash(data.password),
            role=data.role,
        )
        self.repository.create(user)
        self.db.commit()
        return user

    def get_by_id(self, user_id):
        user = self.repository.get_by_id(user_id)
        if user is None:
            raise NotFoundError("Usuário não encontrado.")
        return user

    def get_all(self) -> list[User]:
        return self.repository.get_all()

    def update_status(self, user_id, data: UserStatusUpdate, actor: User) -> User:
        user = self.repository.get_by_id(user_id, include_inactive=True)
        if user is None:
            raise NotFoundError("Usuário não encontrado.")
        if not data.active and user.id == actor.id:
            raise BusinessRuleError("Você não pode desativar a própria conta.")
        if not data.active and user.role is UserRole.ADMIN and self.repository.count_active_admins() <= 1:
            raise BusinessRuleError("O sistema precisa manter pelo menos um administrador ativo.")
        user.active = data.active
        self.repository.update(user)
        self.db.commit()
        return user

    def verify_password(self, plain_password: str, password_hash: str) -> bool:
        return self.password_hash.verify(plain_password, password_hash)

    def authenticate(self, email: str, password: str) -> User:
        user = self.repository.get_by_email(email.lower())
        if user is None or not self.verify_password(password, user.password_hash):
            raise AuthenticationError("E-mail ou senha inválidos.")
        return user

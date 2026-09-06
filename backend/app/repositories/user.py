from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        self.db.refresh(user)
        return user

    def get_by_id(self, user_id: UUID, include_inactive: bool = False) -> User | None:
        statement = select(User).where(User.id == user_id)
        if not include_inactive:
            statement = statement.where(User.active.is_(True))
        return self.db.scalar(statement)

    def get_by_email(self, email: str, include_inactive: bool = False) -> User | None:
        statement = select(User).where(User.email == email)
        if not include_inactive:
            statement = statement.where(User.active.is_(True))
        return self.db.scalar(statement)

    def get_all(self) -> list[User]:
        statement = select(User).order_by(User.name)
        return list(self.db.scalars(statement).all())

    def update(self, user: User) -> User:
        self.db.flush()
        self.db.refresh(user)
        return user

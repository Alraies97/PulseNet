from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field ,Relationship

class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    male = "male"
    female ="female"


class UserRoleLink(SQLModel, table=True):
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", primary_key=True)
    role_id: Optional[int] = Field(default=None, foreign_key="role.id", primary_key=True)


class RoleSchema(SQLModel):
     name: str = Field(..., min_length=1)
     desecription: Optional[str] = None
    
class Role(RoleSchema, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    users: List["User"] = Relationship(back_populates="roles", link_model=UserRoleLink)


class UserCreate(SQLModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    gender: Gender
    password: str = Field(..., min_length=4)
    role_ids: List[int] = Field(default_factory=list)


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    gender: Gender
    hashed_password: str = Field(...)
    roles: List[Role] = Relationship(back_populates="users", link_model=UserRoleLink)
    posts: List["Post"] = Relationship(back_populates="user")


class PostSchema(SQLModel):
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class Post(PostSchema, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    views: int = Field(default=0)
    user: User = Relationship(back_populates="posts")


class UserReadWithDetails(SQLModel):
    id: int
    first_name: str
    last_name: str
    gender: str
    
    roles: List[RoleSchema] = Field(default_factory=list)
    posts: List[PostSchema] = Field(default_factory=list)



class PostLike(SQLModel, table=True):
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    post_id: int = Field(foreign_key="post.id", primary_key=True)
    
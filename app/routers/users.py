from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from ..models import Role, User , UserCreate, UserReadWithDetails
from ..database import get_session
from ..utils import hash_password, create_access_token, verfiy_password
from fastapi.security import OAuth2PasswordRequestForm
router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
)


@router.get("", response_model=List[UserReadWithDetails])
async def fetch_users(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    return users


@router.post("",status_code=status.HTTP_201_CREATED, response_model=UserReadWithDetails)
async def create_user(user: UserCreate, session: Session=Depends(get_session)):

    encrypted_pwd = hash_password(user.password)

    db_user=User(
        first_name=user.first_name,
        last_name=user.last_name, 
        gender = user.gender,
        hashed_password=encrypted_pwd,
        roles=[]
        )
        
    if user.role_ids:
        statement=select(Role).where(Role.id.in_(user.role_ids))
        db_roles=session.exec(statement).all()

        if len(db_roles) != len(user.role_ids):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more role IDs are invalid")
        
        db_user.roles=db_roles
    
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user
        

@router.delete("/{user_id}")
async def delete_user(user_id:int, session: Session=Depends(get_session)):

    user=session.get(User,user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
    session.delete(user)
    session.commit()
    return {"message":"User deleted successfully"}


@router.get("/{user_id}", response_model=UserReadWithDetails)
async def fetch_by_id(user_id:int, session: Session=Depends(get_session)):

    user=session.get(User,user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
    return user


@router.put("/{user_id}", response_model=UserReadWithDetails)
async def update_user(user_id:int, updated_data: UserCreate, session: Session=Depends(get_session)):
    
    user=session.get(User,user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
    user_data = updated_data.model_dump(exclude_unset=True)
    password = user_data.pop("password", None)
    role_ids = user_data.pop("role_ids", None)

    if password:
        user.hashed_password = hash_password(password)

    for key, value in user_data.items():
        setattr(user, key, value)

    if role_ids is not None:
        statement = select(Role).where(Role.id.in_(role_ids))
        db_roles = session.exec(statement).all()
        if len(db_roles) != len(role_ids):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more role IDs are invalid")
        user.roles = db_roles

    session.add(user)
    session.commit()
    session.refresh(user)

    return user


@router.post("/login")
async def login(user_credentials: OAuth2PasswordRequestForm=Depends(), session: Session=Depends(get_session)):
    statement=select(User).where(User.first_name==user_credentials.username)
    db_user=session.exec(statement).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verfiy_password(user_credentials.password, db_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    token_data={"user_id": db_user.id}
    access_token = create_access_token(token_data)
    return {"access_token": access_token, "token_type": "Bearer"}
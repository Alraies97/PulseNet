from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.models import Role, RoleSchema

router=APIRouter(prefix="/api/v1/roles", tags=["Roles"])

@router.post("",response_model=Role, status_code=status.HTTP_201_CREATED)
async def create_role(role: RoleSchema, session: Session=Depends(get_session)):
    existing_role=session.exec(select(Role).where(Role.name==role.name)).first()
    if existing_role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Role with name '{role.name}' already exists")
    db_role=Role(name=role.name, desecription=role.desecription)
    session.add(db_role)
    session.commit()
    session.refresh(db_role)
    return db_role
@router.get("", response_model=List[Role])
async def fetch_roles(session: Session=Depends(get_session)):
    roles=session.exec(select(Role)).all()
    return roles
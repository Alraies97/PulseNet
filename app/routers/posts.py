from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.sql.functions import current_user
from sqlmodel import Session, select
from typing import List
from app.models import Post, PostSchema, User
from app.database import get_session
from app.dependcies import get_current_user

router = APIRouter(prefix="/api/v1/posts", tags=["posts"])

@router.post("", response_model=Post, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: PostSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):

    db_post = Post(title=post.title, content=post.content, user_id=current_user.id)


    session.add(db_post)
    session.commit()
    session.refresh(db_post)
    return db_post
    
@router.get("", response_model=List[Post])
async def fetch_posts(session: Session=Depends(get_session)):
    posts = session.exec(select(Post)).all()
    return posts


    
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.models import PostLike, Post, User
from app.dependcies import get_current_user

router = APIRouter(prefix="/api/v1/likes", tags=["Likes"])

@router.post("/{post_id}",status_code=status.HTTP_200_OK)
async def toggle_like(
      post_id: int,
      session: Session=Depends(get_session),
      current_user: User=Depends(get_current_user)
):

    post = session.get(Post,post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Post not found")

    statement= select(PostLike).where(
        PostLike.user_id==current_user.id,
        PostLike.post_id==post_id
        )

    existing_like=session.exec(statement).first()

    if existing_like:
        session.delete(existing_like)
        session.commit()
        return {"message": "Like removed successfully"}

    new_like=PostLike(user_id=current_user.id, post_id=post_id)
    session.add(new_like)
    session.commit()

    return {"message": "Like added successfully"}
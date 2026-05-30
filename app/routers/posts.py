from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from typing import List
from app.models import Post, PostSchema, PostRead, User, PostLike
from app.database import get_session
from app.dependcies import get_current_user

router = APIRouter(prefix="/api/v1/posts", tags=["posts"])


def _build_post_reads(posts: list[Post], session: Session) -> list[PostRead]:
    if not posts:
        return []

    post_ids = [p.id for p in posts]
    user_ids = list({p.user_id for p in posts})

    like_rows = session.exec(
        select(PostLike.post_id, func.count(PostLike.user_id))
        .where(PostLike.post_id.in_(post_ids))
        .group_by(PostLike.post_id)
    ).all()
    likes_map = {post_id: count for post_id, count in like_rows}

    users = session.exec(select(User).where(User.id.in_(user_ids))).all()
    users_map = {
        u.id: f"{u.first_name} {u.last_name}".strip()
        for u in users
    }

    return [
        PostRead(
            id=post.id,
            title=post.title,
            content=post.content,
            user_id=post.user_id,
            views=post.views or 0,
            likes_count=likes_map.get(post.id, 0),
            author_name=users_map.get(post.user_id, f"User #{post.user_id}"),
        )
        for post in posts
    ]


@router.post("", response_model=PostRead, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: PostSchema,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    db_post = Post(title=post.title, content=post.content, user_id=current_user.id)
    session.add(db_post)
    session.commit()
    session.refresh(db_post)
    return _build_post_reads([db_post], session)[0]


@router.get("", response_model=List[PostRead])
async def fetch_posts(session: Session = Depends(get_session)):
    posts = session.exec(select(Post)).all()
    return _build_post_reads(posts, session)

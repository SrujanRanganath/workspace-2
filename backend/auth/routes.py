from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from auth.schemas import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
)
from auth.service import (
    register_user,
    login_user,
)
from database import get_db
from models.user import User

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.get("/test")
def test_auth():
    return {
        "message": "Authentication module working!"
    }


@router.post(
    "/register",
    response_model=RegisterResponse
)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    try:
        register_user(
            db=db,
            name=request.name,
            email=request.email,
            password=request.password
        )

        return RegisterResponse(
            message="User registered successfully."
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.post(
    "/login",
    response_model=LoginResponse
)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    try:
        token = login_user(
            db=db,
            email=request.email,
            password=request.password
        )

        return LoginResponse(
            access_token=token["access_token"],
            token_type=token["token_type"]
        )

    except ValueError as e:
        raise HTTPException(
            status_code=401,
            detail=str(e)
        )


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email
    }
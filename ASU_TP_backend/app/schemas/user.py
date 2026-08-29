from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role_name: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str
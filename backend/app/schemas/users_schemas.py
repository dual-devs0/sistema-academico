from pydantic import BaseModel

class UserBase(BaseModel):
    username: str
    role: str

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int

<<<<<<< HEAD
    model_config = {"from_attributes": True}
=======
    class Config:
        orm_mode = True
>>>>>>> 5cf3462cf0a0a1b7e9c9ac03a2a5c248594d7758

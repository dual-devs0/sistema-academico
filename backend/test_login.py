from app.database import SessionLocal
from app.models.users import User
from app.security import verify_password

db = SessionLocal()
user = db.query(User).filter(User.username == "admin@uca.edu.py").first()
if user:
    print(f"Usuario encontrado: {user.username}, role: {user.role}")
    print(f"Password valida: {verify_password('Admin1234!', user.hashed_password)}")
else:
    print("Usuario NO encontrado")
db.close()

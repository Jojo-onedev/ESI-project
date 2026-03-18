from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import os
import sys

# Ajouter le parent au path pour les imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/api/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        from jose import JWTError, jwt
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(models.Operator).filter(models.Operator.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_supervisor(current_user: models.Operator = Depends(get_current_user)):
    """Middleware RBAC garantissant que seul un superviseur médical a accès."""
    if current_user.role != "supervisor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Accès refusé. Privilèges de superviseur requis."
        )
    return current_user

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.Operator).filter(models.Operator.username == form_data.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 🛡️ Vérification du verrouillage (Phase 7)
    if user.lockout_until and user.lockout_until > datetime.utcnow():
        retry_after = int((user.lockout_until - datetime.utcnow()).total_seconds() / 60)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Compte verrouillé suite à trop d'échecs. Réessayez dans {retry_after} minute(s)."
        )

    if not auth.verify_password(form_data.password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.lockout_until = datetime.utcnow() + timedelta(minutes=15)
            user.failed_login_attempts = 0
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Compte verrouillé pour 15 minutes suite à 5 tentatives infructueuses."
            )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Identifiants incorrects ({5 - user.failed_login_attempts} tentatives restantes)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Réinitialisation après succès
    user.failed_login_attempts = 0
    user.lockout_until = None
    db.commit()

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Intégrer le rôle directement dans la réponse du login
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@router.post("/register", response_model=schemas.Operator)
def register_operator(operator: schemas.OperatorCreate, db: Session = Depends(get_db)):
    # Endpoint pour créer facilement un utilisateur pour la démo
    db_user = db.query(models.Operator).filter(models.Operator.username == operator.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_pwd = auth.get_password_hash(operator.password)
    # Assigner un rôle validé
    secure_role = "supervisor" if operator.role == "supervisor" else "operator"
    new_op = models.Operator(username=operator.username, hashed_password=hashed_pwd, role=secure_role)
    db.add(new_op)
    db.commit()
    db.refresh(new_op)
    return new_op

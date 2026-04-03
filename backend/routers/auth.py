from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone

from database import get_db
import models
import schemas
import auth
from auth import log_audit

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
    if user.lockout_until and user.lockout_until > datetime.now(timezone.utc):
        retry_after = int((user.lockout_until - datetime.now(timezone.utc)).total_seconds() / 60)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Compte verrouillé suite à trop d'échecs. Réessayez dans {retry_after} minute(s)."
        )

    if not auth.verify_password(form_data.password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.lockout_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            user.failed_login_attempts = 0
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Compte verrouillé pour 15 minutes suite à 5 tentatives infructueuses."
            )
        db.commit()
        import time
        time.sleep(1) # 🛡️ Protection contre brute-force et timing attacks
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Identifiants incorrects ({5 - user.failed_login_attempts} tentatives restantes)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Réinitialisation après succès
    user.failed_login_attempts = 0
    user.lockout_until = None
    
    # 📝 Audit: Connexion Réussie
    log_audit(db, user.id, "LOGIN", f"IP: demo-session")
    
    db.commit()

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Intégrer le rôle directement dans la réponse du login
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@router.get("/me", response_model=schemas.Operator)
def read_users_me(current_user: models.Operator = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.Operator)
def update_user_profile(
    profile: schemas.Operator, # On utilise le schéma existant ou un partiel
    db: Session = Depends(get_db),
    current_user: models.Operator = Depends(get_current_user)
):
    current_user.full_name = profile.full_name
    current_user.specialty = profile.specialty
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/register", response_model=schemas.Operator)
def register_operator(
    operator: schemas.OperatorCreate,
    db: Session = Depends(get_db),
    supervisor: models.Operator = Depends(get_current_supervisor)
):
    # Endpoint pour créer facilement un utilisateur pour la démo
    db_user = db.query(models.Operator).filter(models.Operator.username == operator.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_pwd = auth.get_password_hash(operator.password)
    # Assigner un rôle validé
    secure_role = "supervisor" if operator.role == "supervisor" else "operator"
    new_op = models.Operator(
        username=operator.username, 
        hashed_password=hashed_pwd, 
        role=secure_role,
        full_name=operator.full_name,
        specialty=operator.specialty
    )
    db.add(new_op)
    db.commit()
    db.refresh(new_op)
    return new_op

# --- GESTION ADMINISTRATIVE DES UTILISATEURS (Phase 11) ---

@router.get("/users", response_model=list[schemas.Operator])
def list_users(
    db: Session = Depends(get_db),
    supervisor: models.Operator = Depends(get_current_supervisor)
):
    """Liste tous les opérateurs du système (Supervisor Only)."""
    return db.query(models.Operator).all()

@router.post("/users", response_model=schemas.Operator)
def create_user(
    user_in: schemas.OperatorCreate,
    db: Session = Depends(get_db),
    supervisor: models.Operator = Depends(get_current_supervisor)
):
    """Crée un nouvel opérateur ou superviseur (Supervisor Only)."""
    existing = db.query(models.Operator).filter(models.Operator.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet identifiant est déjà utilisé.")
    
    hashed_pwd = auth.get_password_hash(user_in.password)
    new_user = models.Operator(
        username=user_in.username,
        hashed_password=hashed_pwd,
        role=user_in.role if user_in.role in ["operator", "supervisor"] else "operator",
        full_name=user_in.full_name,
        specialty=user_in.specialty
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    log_audit(db, supervisor.id, "USER_CREATE", f"Création de l'utilisateur: {new_user.username}")
    return new_user

@router.put("/users/{user_id}", response_model=schemas.Operator)
def update_user(
    user_id: int,
    user_update: schemas.OperatorUpdate,
    db: Session = Depends(get_db),
    supervisor: models.Operator = Depends(get_current_supervisor)
):
    """Modifie les informations d'un utilisateur existant (Supervisor Only)."""
    user = db.query(models.Operator).filter(models.Operator.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
    
    if user_update.role: user.role = user_update.role
    if user_update.full_name: user.full_name = user_update.full_name
    if user_update.specialty: user.specialty = user_update.specialty
    if user_update.password:
        user.hashed_password = auth.get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(user)
    log_audit(db, supervisor.id, "USER_UPDATE", f"Modification de l'utilisateur: {user.username}")
    return user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    supervisor: models.Operator = Depends(get_current_supervisor)
):
    """Supprime un utilisateur du système (Supervisor Only)."""
    user = db.query(models.Operator).filter(models.Operator.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
    
    if user.id == supervisor.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte.")
        
    db.delete(user)
    db.commit()
    log_audit(db, supervisor.id, "USER_DELETE", f"Suppression de l'utilisateur: {user.username}")
    return {"message": "Utilisateur supprimé avec succès."}

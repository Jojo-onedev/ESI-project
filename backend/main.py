from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, triage

# Création des tables dans la base de données
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SAMU ESI Triage API", description="API pour la décision de triage ESI")

# Configuration CORS pour permettre au frontend React de communiquer avec l'API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routes
app.include_router(auth.router)
app.include_router(triage.router)

@app.get("/")
def read_root():
    return {"message": "SAMU ESI API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv

# Path to backend directory and .env file
BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BACKEND_DIR / ".env"

# Explicitly load .env from backend directory
load_dotenv(dotenv_path=ENV_PATH, override=True)

class Settings(BaseModel):
    APP_NAME: str = "ARIA - Automated Reconciliation & Intelligent Auditing"
    API_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:root@localhost:5432/aria_db"
    )
    
    # Groq API
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    # Qdrant
    QDRANT_STORAGE_PATH: str = os.getenv("QDRANT_STORAGE_PATH", "./qdrant_data")
    QDRANT_COLLECTION: str = "indian_tax_statutes"

settings = Settings()

def persist_env_var(key: str, value: str) -> None:
    """
    Updates the environment variable in-memory, updates settings instance,
    and permanently writes/updates the key in backend/.env.
    """
    cleaned_val = value.strip()
    os.environ[key] = cleaned_val
    if hasattr(settings, key):
        setattr(settings, key, cleaned_val)
        
    lines = []
    found = False
    
    if ENV_PATH.exists():
        try:
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except Exception:
            lines = []
            
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(f"{key}=") or stripped.startswith(f"{key} ="):
            new_lines.append(f"{key}={cleaned_val}\n")
            found = True
        else:
            new_lines.append(line)
            
    if not found:
        new_lines.append(f"{key}={cleaned_val}\n")
        
    try:
        with open(ENV_PATH, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
    except Exception as e:
        print(f"Warning: Failed to persist {key} to {ENV_PATH}: {e}")

def get_masked_groq_key() -> Optional[str]:
    """Returns a privacy-masked preview of the configured Groq API Key."""
    key = settings.GROQ_API_KEY.strip()
    if not key:
        return None
    if len(key) > 10:
        return f"{key[:6]}...{key[-4:]}"
    return "****"

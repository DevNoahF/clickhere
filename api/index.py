import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel
import datetime
import json
from urllib.request import urlopen

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./visitors.db")

if DATABASE_URL.startswith("postgres"):
    connect_args = {}
else:
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Visitor(Base):
    __tablename__ = "visitors"

    id = Column(Integer, primary_key=True, index=True)
    ip = Column(String, index=True)
    device_type = Column(String)
    user_agent = Column(String)
    city = Column(String, default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Snake Visitor Info API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VisitCreate(BaseModel):
    ip: str
    device_type: str
    user_agent: str = ""


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def is_private_ip(ip: str) -> bool:
    parts = ip.split(".")
    if len(parts) != 4:
        return True
    first = int(parts[0])
    return first == 10 or first == 127 or (first == 192 and parts[1] == "168") or (first == 172 and 16 <= int(parts[1]) <= 31)


def get_city_from_ip(ip: str) -> str:
    if is_private_ip(ip):
        return ""
    try:
        url = f"http://ip-api.com/json/{ip}?fields=city"
        with urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode())
            return data.get("city", "")
    except Exception:
        return ""


@app.post("/api/visit")
def create_visit(visit: VisitCreate, db: Session = Depends(get_db)):
    city = get_city_from_ip(visit.ip)
    db_visit = Visitor(
        ip=visit.ip,
        device_type=visit.device_type,
        user_agent=visit.user_agent,
        city=city,
        timestamp=datetime.datetime.utcnow(),
    )
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return {"message": "Visit recorded", "id": db_visit.id, "city": city}


@app.get("/api/visitors")
def get_visitors(db: Session = Depends(get_db)):
    visitors = db.query(Visitor).order_by(Visitor.timestamp.desc()).all()
    return [
        {
            "id": v.id,
            "ip": v.ip,
            "device_type": v.device_type,
            "user_agent": v.user_agent,
            "city": v.city or "",
            "timestamp": v.timestamp.isoformat(),
        }
        for v in visitors
    ]

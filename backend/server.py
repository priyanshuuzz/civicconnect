from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Query, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import json
import math
import asyncio
import requests as http_requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from passlib.context import CryptContext
import jwt as pyjwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT
JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "civicconnect"
storage_key_global = None

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="CivicConnect API")
api_router = APIRouter(prefix="/api")

# ========================
# CATEGORIES TAXONOMY
# ========================
CATEGORIES = {
    "roads_footpaths": {
        "name": "Roads & Footpaths",
        "subcategories": ["Pothole", "Road damage", "Footpath broken", "Encroachment"]
    },
    "sanitation_waste": {
        "name": "Sanitation & Waste",
        "subcategories": ["Garbage not collected", "Overflowing bin", "Open defecation", "Dead animal"]
    },
    "water_drainage": {
        "name": "Water & Drainage",
        "subcategories": ["Water supply failure", "Low pressure", "Waterlogging", "Broken pipe", "Sewage overflow"]
    },
    "electricity_lighting": {
        "name": "Electricity & Lighting",
        "subcategories": ["Streetlight not working", "Power outage", "Fallen wire", "Transformer issue"]
    },
    "parks_public_spaces": {
        "name": "Parks & Public Spaces",
        "subcategories": ["Broken equipment", "Encroachment", "Vandalism", "Overgrown vegetation"]
    },
    "stray_animals": {
        "name": "Stray Animals",
        "subcategories": ["Stray dogs", "Injured animal", "Animal menace"]
    },
    "noise_pollution": {
        "name": "Noise & Pollution",
        "subcategories": ["Noise complaint", "Air pollution", "Water body pollution"]
    },
    "other": {
        "name": "Other",
        "subcategories": ["Other"]
    }
}

# SLA FRAMEWORK (hours)
SLA_RULES = {
    "Fallen wire": {"ack_hours": 0.5, "resolution_hours": 4, "priority": "CRITICAL"},
    "Transformer issue": {"ack_hours": 0.5, "resolution_hours": 4, "priority": "CRITICAL"},
    "Water supply failure": {"ack_hours": 1, "resolution_hours": 24, "priority": "HIGH"},
    "Sewage overflow": {"ack_hours": 1, "resolution_hours": 48, "priority": "HIGH"},
    "Power outage": {"ack_hours": 1, "resolution_hours": 24, "priority": "HIGH"},
    "Broken pipe": {"ack_hours": 1, "resolution_hours": 48, "priority": "HIGH"},
    "Pothole": {"ack_hours": 2, "resolution_hours": 72, "priority": "MEDIUM"},
    "Road damage": {"ack_hours": 2, "resolution_hours": 72, "priority": "MEDIUM"},
    "Garbage not collected": {"ack_hours": 2, "resolution_hours": 48, "priority": "MEDIUM"},
    "Overflowing bin": {"ack_hours": 2, "resolution_hours": 48, "priority": "MEDIUM"},
    "Streetlight not working": {"ack_hours": 4, "resolution_hours": 168, "priority": "MEDIUM"},
    "default": {"ack_hours": 4, "resolution_hours": 336, "priority": "LOW"}
}

# ========================
# PYDANTIC MODELS
# ========================
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = ""
    role: Optional[str] = "citizen"

class UserLogin(BaseModel):
    email: str
    password: str

class TicketCreate(BaseModel):
    title: str
    description: str
    category: str
    subcategory: str
    latitude: float
    longitude: float
    address: Optional[str] = ""
    photos: Optional[List[str]] = []

class TicketStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = ""

class TicketAssign(BaseModel):
    assigned_to: str
    note: Optional[str] = ""

class MessageCreate(BaseModel):
    text: str

class CategorizationRequest(BaseModel):
    text: str

# ========================
# STORAGE HELPERS
# ========================
def init_storage():
    global storage_key_global
    if storage_key_global:
        return storage_key_global
    try:
        resp = http_requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key_global = resp.json()["storage_key"]
        return storage_key_global
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path, data, content_type):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = http_requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = http_requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ========================
# AUTH HELPERS
# ========================
def create_jwt_token(user_id: str, role: str, email: str):
    payload = {
        "user_id": user_id,
        "role": role,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc)
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str):
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_jwt_token(token)
    user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ========================
# SLA HELPERS
# ========================
def get_sla_for_subcategory(subcategory: str):
    return SLA_RULES.get(subcategory, SLA_RULES["default"])

def get_sla_percentage(created_at_str, sla_deadline_str):
    now = datetime.now(timezone.utc)
    created = datetime.fromisoformat(created_at_str)
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    deadline = datetime.fromisoformat(sla_deadline_str)
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    total = (deadline - created).total_seconds()
    elapsed = (now - created).total_seconds()
    if total <= 0:
        return 100
    return min(100, max(0, (elapsed / total) * 100))

# ========================
# AUDIT LOGGING
# ========================
async def create_audit_log(ticket_id: str, action: str, actor_id: str, details: str = ""):
    log = {
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "ticket_id": ticket_id,
        "action": action,
        "actor_id": actor_id,
        "details": details,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(log)

# ========================
# AUTH ROUTES
# ========================
@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    valid_roles = ["citizen", "officer", "admin"]
    role = data.role if data.role in valid_roles else "citizen"
    user_doc = {
        "user_id": user_id,
        "name": data.name,
        "email": data.email,
        "phone": data.phone or "",
        "password_hash": pwd_context.hash(data.password),
        "role": role,
        "picture": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_jwt_token(user_id, role, data.email)
    response.set_cookie("session_token", token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*3600)
    return {"user_id": user_id, "name": data.name, "email": data.email, "role": role, "token": token}

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not pwd_context.verify(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt_token(user["user_id"], user["role"], user["email"])
    response.set_cookie("session_token", token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*3600)
    return {"user_id": user["user_id"], "name": user["name"], "email": user["email"], "role": user["role"], "token": token}

@api_router.post("/auth/google-session")
async def google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    try:
        resp = http_requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}, timeout=10
        )
        resp.raise_for_status()
        google_data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google auth failed: {str(e)}")
    email = google_data.get("email")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        role = existing["role"]
        await db.users.update_one({"email": email}, {"$set": {
            "name": google_data.get("name", existing["name"]),
            "picture": google_data.get("picture", "")
        }})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        role = "citizen"
        await db.users.insert_one({
            "user_id": user_id,
            "name": google_data.get("name", ""),
            "email": email,
            "phone": "",
            "password_hash": "",
            "role": role,
            "picture": google_data.get("picture", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    token = create_jwt_token(user_id, role, email)
    response.set_cookie("session_token", token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*3600)
    return {"user_id": user_id, "name": google_data.get("name", ""), "email": email, "role": role, "token": token}

@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    return {
        "user_id": user["user_id"], "name": user["name"], "email": user["email"],
        "role": user["role"], "phone": user.get("phone", ""), "picture": user.get("picture", "")
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

# ========================
# CATEGORIES
# ========================
@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

# ========================
# AI CATEGORIZATION
# ========================
def fallback_categorize(text: str):
    text_lower = text.lower()
    keyword_map = {
        "roads_footpaths": ["pothole", "road", "footpath", "pavement", "crack", "broken road"],
        "sanitation_waste": ["garbage", "waste", "trash", "dump", "bin", "sanitation", "defecation"],
        "water_drainage": ["water", "drain", "flood", "sewage", "pipe", "leak", "waterlog"],
        "electricity_lighting": ["light", "electric", "power", "wire", "transformer", "streetlight"],
        "parks_public_spaces": ["park", "playground", "garden", "bench", "vandalism"],
        "stray_animals": ["dog", "animal", "stray", "cat", "monkey"],
        "noise_pollution": ["noise", "pollution", "loud", "smoke", "dust"]
    }
    best_cat = "other"
    best_score = 0
    for cat, words in keyword_map.items():
        score = sum(1 for w in words if w in text_lower)
        if score > best_score:
            best_score = score
            best_cat = cat
    cat_data = CATEGORIES.get(best_cat, CATEGORIES["other"])
    return {
        "category": best_cat,
        "subcategory": cat_data["subcategories"][0],
        "confidence": min(0.3 + best_score * 0.15, 0.75),
        "priority": get_sla_for_subcategory(cat_data["subcategories"][0])["priority"]
    }

@api_router.post("/ai/categorize")
async def categorize_complaint(data: CategorizationRequest):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"cat_{uuid.uuid4().hex[:8]}",
            system_message="""You are a civic issue categorization AI. Given a complaint, categorize it.
Categories: roads_footpaths, sanitation_waste, water_drainage, electricity_lighting, parks_public_spaces, stray_animals, noise_pollution, other.
Respond ONLY with valid JSON (no markdown): {"category": "key", "subcategory": "name", "confidence": 0.0-1.0, "priority": "LOW|MEDIUM|HIGH|CRITICAL"}"""
        )
        chat.with_model("openai", "gpt-5.2")
        msg = UserMessage(text=f"Categorize: {data.text}")
        resp_text = await chat.send_message(msg)
        clean = resp_text.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        result = json.loads(clean)
        # Store AI output for training
        await db.ai_outputs.insert_one({
            "input_text": data.text,
            "output": result,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return result
    except Exception as e:
        logger.error(f"AI categorization failed: {e}, using fallback")
        return fallback_categorize(data.text)

# ========================
# TICKET ROUTES
# ========================
@api_router.post("/tickets")
async def create_ticket(data: TicketCreate, request: Request):
    user = await get_current_user(request)
    # Rate limit: 10/day
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    count = await db.tickets.count_documents({"created_by": user["user_id"], "created_at": {"$gte": today_start}})
    if count >= 10:
        raise HTTPException(status_code=429, detail="Maximum 10 reports per day")

    # Duplicate detection within 50m
    duplicates = []
    try:
        pipeline = [
            {"$geoNear": {
                "near": {"type": "Point", "coordinates": [data.longitude, data.latitude]},
                "distanceField": "distance",
                "maxDistance": 50,
                "query": {"category": data.category, "status": {"$nin": ["resolved", "closed"]}},
                "spherical": True
            }},
            {"$project": {"_id": 0, "ticket_id": 1, "title": 1, "status": 1, "distance": 1, "category": 1}},
            {"$limit": 5}
        ]
        duplicates = await db.tickets.aggregate(pipeline).to_list(5)
    except Exception as e:
        logger.warning(f"Duplicate detection failed: {e}")

    sla_rule = get_sla_for_subcategory(data.subcategory)
    now = datetime.now(timezone.utc)
    ticket_id = f"TKT-{uuid.uuid4().hex[:8].upper()}"
    ticket = {
        "ticket_id": ticket_id,
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "subcategory": data.subcategory,
        "location": {"type": "Point", "coordinates": [data.longitude, data.latitude]},
        "address": data.address or "",
        "photos": data.photos or [],
        "status": "submitted",
        "priority": sla_rule["priority"],
        "sla_deadline": (now + timedelta(hours=sla_rule["resolution_hours"])).isoformat(),
        "sla_ack_deadline": (now + timedelta(hours=sla_rule["ack_hours"])).isoformat(),
        "escalation_level": 0,
        "assigned_to": None,
        "assigned_to_name": None,
        "created_by": user["user_id"],
        "created_by_name": user["name"],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "resolved_at": None,
        "reopen_count": 0
    }
    await db.tickets.insert_one(ticket)
    await create_audit_log(ticket_id, "created", user["user_id"], f"Ticket created: {data.title}")
    ticket.pop("_id", None)
    return {"ticket": ticket, "duplicates": duplicates}

@api_router.get("/tickets")
async def get_tickets(request: Request, status: Optional[str] = None, category: Optional[str] = None, page: int = 1, limit: int = 20):
    user = await get_current_user(request)
    query = {}
    if user["role"] == "citizen":
        query["created_by"] = user["user_id"]
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    skip = (page - 1) * limit
    total = await db.tickets.count_documents(query)
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for t in tickets:
        if t.get("status") not in ["resolved", "closed"]:
            t["sla_percentage"] = round(get_sla_percentage(t["created_at"], t["sla_deadline"]), 1)
        else:
            t["sla_percentage"] = 0
    return {"tickets": tickets, "total": total, "page": page, "pages": math.ceil(total / limit) if total > 0 else 1}

@api_router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, request: Request):
    user = await get_current_user(request)
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if user["role"] == "citizen" and ticket["created_by"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if ticket.get("status") not in ["resolved", "closed"]:
        ticket["sla_percentage"] = round(get_sla_percentage(ticket["created_at"], ticket["sla_deadline"]), 1)
    else:
        ticket["sla_percentage"] = 0
    messages = await db.messages.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    logs = await db.audit_logs.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return {"ticket": ticket, "messages": messages, "audit_logs": logs}

@api_router.patch("/tickets/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, data: TicketStatusUpdate, request: Request):
    user = await get_current_user(request)
    valid_statuses = ["submitted", "assigned", "in_progress", "resolved", "closed"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if user["role"] == "citizen" and data.status not in ["submitted", "closed"]:
        raise HTTPException(status_code=403, detail="Citizens can only reopen or close tickets")
    update = {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if data.status == "resolved":
        update["resolved_at"] = datetime.now(timezone.utc).isoformat()
    if data.status == "submitted" and ticket["status"] == "resolved":
        await db.tickets.update_one({"ticket_id": ticket_id}, {"$inc": {"reopen_count": 1}})
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": update})
    await create_audit_log(ticket_id, f"status_changed_to_{data.status}", user["user_id"], data.note or "")
    return {"message": "Status updated", "status": data.status}

@api_router.post("/tickets/{ticket_id}/assign")
async def assign_ticket(ticket_id: str, data: TicketAssign, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["officer", "admin"]:
        raise HTTPException(status_code=403, detail="Only officers and admins can assign tickets")
    officer = await db.users.find_one({"user_id": data.assigned_to}, {"_id": 0})
    if not officer:
        raise HTTPException(status_code=404, detail="Assignee not found")
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {
        "assigned_to": data.assigned_to,
        "assigned_to_name": officer["name"],
        "status": "assigned",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    await create_audit_log(ticket_id, "assigned", user["user_id"], f"Assigned to {officer['name']}. {data.note or ''}")
    return {"message": "Ticket assigned"}

# ========================
# MESSAGES
# ========================
@api_router.post("/tickets/{ticket_id}/messages")
async def create_message(ticket_id: str, data: MessageCreate, request: Request):
    user = await get_current_user(request)
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "ticket_id": ticket_id,
        "sender_id": user["user_id"],
        "sender_name": user["name"],
        "sender_role": user["role"],
        "text": data.text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(msg)
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}})
    msg.pop("_id", None)
    return msg

# ========================
# FILE UPLOAD
# ========================
@api_router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{user['user_id']}/{uuid.uuid4().hex}.{ext}"
    result = put_object(path, data, file.content_type or "application/octet-stream")
    file_record = {
        "file_id": f"file_{uuid.uuid4().hex[:12]}",
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "uploaded_by": user["user_id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(file_record)
    return {"file_id": file_record["file_id"], "path": result["path"]}

@api_router.get("/files/{path:path}")
async def download_file(path: str):
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=content_type)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")

# ========================
# PUBLIC MAP
# ========================
@api_router.get("/map/tickets")
async def get_map_tickets(category: Optional[str] = None, status: Optional[str] = None):
    query = {"status": {"$nin": ["closed"]}}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    projection = {
        "_id": 0, "ticket_id": 1, "title": 1, "category": 1, "subcategory": 1,
        "location": 1, "status": 1, "priority": 1, "created_at": 1, "sla_deadline": 1, "address": 1
    }
    tickets = await db.tickets.find(query, projection).sort("created_at", -1).to_list(500)
    for t in tickets:
        if t.get("status") not in ["resolved", "closed"]:
            t["sla_percentage"] = round(get_sla_percentage(t["created_at"], t["sla_deadline"]), 1)
        else:
            t["sla_percentage"] = 0
    return {"tickets": tickets}

# ========================
# ADMIN / ANALYTICS
# ========================
@api_router.get("/admin/dashboard")
async def admin_dashboard(request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["officer", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    total = await db.tickets.count_documents({})
    by_status = {}
    for s in ["submitted", "assigned", "in_progress", "resolved", "closed"]:
        by_status[s] = await db.tickets.count_documents({"status": s})
    by_category = {}
    for cat_key in CATEGORIES:
        by_category[cat_key] = await db.tickets.count_documents({"category": cat_key})
    by_priority = {}
    for p in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        by_priority[p] = await db.tickets.count_documents({"priority": p})
    now_iso = datetime.now(timezone.utc).isoformat()
    breached = await db.tickets.count_documents({
        "status": {"$nin": ["resolved", "closed"]},
        "sla_deadline": {"$lt": now_iso}
    })
    total_users = await db.users.count_documents({})
    officers_count = await db.users.count_documents({"role": {"$in": ["officer", "admin"]}})
    recent = await db.tickets.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    return {
        "total_tickets": total, "by_status": by_status, "by_category": by_category,
        "by_priority": by_priority, "sla_breached": breached, "total_users": total_users,
        "officers_count": officers_count, "recent_tickets": recent
    }

@api_router.get("/admin/users")
async def admin_users(request: Request, role: Optional[str] = None):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    query = {}
    if role:
        query["role"] = role
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(200)
    return {"users": users}

@api_router.patch("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, request: Request):
    admin = await get_current_user(request)
    if admin["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    body = await request.json()
    new_role = body.get("role")
    if new_role not in ["citizen", "officer", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": new_role}})
    return {"message": "Role updated"}

# ========================
# SLA ENGINE (background)
# ========================
async def sla_engine():
    while True:
        try:
            open_tickets = await db.tickets.find(
                {"status": {"$nin": ["resolved", "closed"]}}, {"_id": 0}
            ).to_list(1000)
            for ticket in open_tickets:
                pct = get_sla_percentage(ticket["created_at"], ticket["sla_deadline"])
                current_level = ticket.get("escalation_level", 0)
                new_level = current_level
                if pct >= 100 and current_level < 4:
                    new_level = 4
                elif pct >= 75 and current_level < 3:
                    new_level = 3
                elif pct >= 50 and current_level < 2:
                    new_level = 2
                if new_level > current_level:
                    labels = {2: "Ward Officer", 3: "Department Head", 4: "Municipal Commissioner"}
                    await db.tickets.update_one(
                        {"ticket_id": ticket["ticket_id"]},
                        {"$set": {"escalation_level": new_level, "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    await create_audit_log(
                        ticket["ticket_id"], "escalated", "system",
                        f"SLA at {pct:.0f}% - Escalated to {labels.get(new_level, 'Unknown')}"
                    )
        except Exception as e:
            logger.error(f"SLA engine error: {e}")
        await asyncio.sleep(60)

# ========================
# STARTUP
# ========================
@app.on_event("startup")
async def startup():
    try:
        await db.tickets.create_index([("location", "2dsphere")])
        await db.tickets.create_index("ticket_id", unique=True)
        await db.tickets.create_index("status")
        await db.tickets.create_index("created_by")
        await db.tickets.create_index("category")
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.audit_logs.create_index("ticket_id")
        await db.messages.create_index("ticket_id")
        logger.info("MongoDB indexes created")
    except Exception as e:
        logger.error(f"Index creation error: {e}")
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    # Seed admin
    admin = await db.users.find_one({"email": "admin@civicconnect.gov.in"}, {"_id": 0})
    if not admin:
        await db.users.insert_one({
            "user_id": f"user_admin_{uuid.uuid4().hex[:8]}",
            "name": "Admin",
            "email": "admin@civicconnect.gov.in",
            "phone": "",
            "password_hash": pwd_context.hash("admin123"),
            "role": "admin",
            "picture": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Admin user seeded")
    # Seed officer
    officer = await db.users.find_one({"email": "officer@civicconnect.gov.in"}, {"_id": 0})
    if not officer:
        await db.users.insert_one({
            "user_id": f"user_officer_{uuid.uuid4().hex[:8]}",
            "name": "Ward Officer",
            "email": "officer@civicconnect.gov.in",
            "phone": "",
            "password_hash": pwd_context.hash("officer123"),
            "role": "officer",
            "picture": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Officer user seeded")
    asyncio.create_task(sla_engine())
    logger.info("SLA engine started")

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

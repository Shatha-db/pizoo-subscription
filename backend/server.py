from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Security
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ===== Models =====

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone_number: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    trial_end_date: datetime
    subscription_status: str = "trial"  # trial, active, cancelled, expired
    terms_accepted: bool = False
    terms_accepted_at: Optional[datetime] = None
    profile_completed: bool = False


class Profile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    display_name: str  # اسم العرض أو الاسم المستعار
    bio: Optional[str] = None  # نبذة عن النفس
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None  # male, female, other
    height: Optional[int] = None  # بالسم
    looking_for: Optional[str] = None  # ماذا يبحث عنه
    interests: List[str] = []  # الهوايات
    photos: List[str] = []  # قائمة روابط الصور
    location: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    relationship_goals: Optional[str] = None  # serious, casual, friendship
    smoking: Optional[str] = None  # yes, no, sometimes
    drinking: Optional[str] = None  # yes, no, sometimes
    has_children: Optional[bool] = None
    wants_children: Optional[bool] = None
    languages: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Subscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    status: str  # trial, active, cancelled, expired
    start_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    trial_end_date: datetime
    next_payment_date: datetime
    annual_amount: float = 396.0  # CHF
    currency: str = "CHF"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PaymentMethod(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    payment_type: str  # card, paypal, bank_transfer
    card_last_four: Optional[str] = None
    card_brand: Optional[str] = None  # visa, mastercard, etc
    paypal_email: Optional[EmailStr] = None
    bank_account_country: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Swipe(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    swiped_user_id: str
    action: str  # like, pass, super_like
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Match(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user1_id: str
    user2_id: str
    matched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    unmatched: bool = False


class PremiumSubscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tier: str  # free, gold, platinum
    status: str  # active, expired, cancelled
    start_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_date: Optional[datetime] = None
    features: dict = Field(default_factory=lambda: {
        "unlimited_likes": False,
        "see_who_liked": False,
        "unlimited_rewinds": False,
        "super_likes_per_day": 1,
        "boosts_per_month": 0,
        "top_picks": False,
        "read_receipts": False,
        "profile_controls": False
    })
    auto_renew: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ===== Request/Response Models =====

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    phone_number: str
    password: str
    terms_accepted: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    subscription_status: str
    trial_end_date: datetime
    created_at: datetime


class SubscriptionStatus(BaseModel):
    status: str
    trial_end_date: datetime
    next_payment_date: Optional[datetime]
    days_remaining: int
    annual_amount: float
    currency: str


class ProfileCreateRequest(BaseModel):
    display_name: str
    bio: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    height: Optional[int] = None
    looking_for: Optional[str] = None
    interests: List[str] = []
    location: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    relationship_goals: Optional[str] = None
    smoking: Optional[str] = None
    drinking: Optional[str] = None
    has_children: Optional[bool] = None
    wants_children: Optional[bool] = None
    languages: List[str] = []


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    height: Optional[int] = None
    looking_for: Optional[str] = None
    interests: Optional[List[str]] = None
    location: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    relationship_goals: Optional[str] = None
    smoking: Optional[str] = None
    drinking: Optional[str] = None
    has_children: Optional[bool] = None
    wants_children: Optional[bool] = None
    languages: Optional[List[str]] = None


class PhotoUploadRequest(BaseModel):
    photo_data: str  # base64 encoded image


class SwipeRequest(BaseModel):
    swiped_user_id: str
    action: str  # like, pass, super_like


# ===== Helper Functions =====

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise credentials_exception
    return user


# ===== API Endpoints =====

@api_router.get("/")
async def root():
    return {"message": "Welcome to Subscription API"}


@api_router.post("/auth/register", response_model=TokenResponse)
async def register(request: RegisterRequest):
    # Validate terms accepted
    if not request.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="يجب الموافقة على الشروط والأحكام"
        )
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="البريد الإلكتروني مسجل مسبقاً"
        )
    
    # Create user
    trial_end_date = datetime.now(timezone.utc) + timedelta(days=14)
    user = User(
        name=request.name,
        email=request.email,
        phone_number=request.phone_number,
        password_hash=get_password_hash(request.password),
        trial_end_date=trial_end_date,
        subscription_status="trial",
        terms_accepted=True,
        terms_accepted_at=datetime.now(timezone.utc)
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['trial_end_date'] = user_dict['trial_end_date'].isoformat()
    user_dict['terms_accepted_at'] = user_dict['terms_accepted_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create subscription
    next_payment_date = trial_end_date
    subscription = Subscription(
        user_id=user.id,
        status="trial",
        trial_end_date=trial_end_date,
        next_payment_date=next_payment_date
    )
    
    subscription_dict = subscription.model_dump()
    subscription_dict['created_at'] = subscription_dict['created_at'].isoformat()
    subscription_dict['start_date'] = subscription_dict['start_date'].isoformat()
    subscription_dict['trial_end_date'] = subscription_dict['trial_end_date'].isoformat()
    subscription_dict['next_payment_date'] = subscription_dict['next_payment_date'].isoformat()
    
    await db.subscriptions.insert_one(subscription_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "subscription_status": user.subscription_status,
            "trial_end_date": user.trial_end_date.isoformat()
        }
    )


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    if not user or not verify_password(request.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="البريد الإلكتروني أو كلمة المرور غير صحيحة"
        )
    
    access_token = create_access_token(data={"sub": user['id']})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "subscription_status": user['subscription_status'],
            "trial_end_date": user['trial_end_date']
        }
    )


@api_router.get("/user/profile", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return UserProfile(
        id=current_user['id'],
        name=current_user['name'],
        email=current_user['email'],
        subscription_status=current_user['subscription_status'],
        trial_end_date=datetime.fromisoformat(current_user['trial_end_date']) if isinstance(current_user['trial_end_date'], str) else current_user['trial_end_date'],
        created_at=datetime.fromisoformat(current_user['created_at']) if isinstance(current_user['created_at'], str) else current_user['created_at']
    )


class AddPaymentRequest(BaseModel):
    payment_type: str  # card, paypal
    card_number: Optional[str] = None
    card_holder_name: Optional[str] = None
    card_expiry: Optional[str] = None
    card_cvv: Optional[str] = None
    paypal_email: Optional[EmailStr] = None


@api_router.post("/payment/add")
async def add_payment_method(request: AddPaymentRequest, current_user: dict = Depends(get_current_user)):
    # Check if payment method already exists
    existing_payment = await db.payment_methods.find_one({"user_id": current_user['id']}, {"_id": 0})
    
    if existing_payment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="طريقة دفع موجودة بالفعل"
        )
    
    # Create payment method
    payment_method_data = {
        "user_id": current_user['id'],
        "payment_type": request.payment_type,
        "is_active": True
    }
    
    if request.payment_type == "card" and request.card_number:
        payment_method_data["card_last_four"] = request.card_number[-4:]
        payment_method_data["card_brand"] = "visa"
    elif request.payment_type == "paypal" and request.paypal_email:
        payment_method_data["paypal_email"] = request.paypal_email
    
    payment_method = PaymentMethod(**payment_method_data)
    payment_dict = payment_method.model_dump()
    payment_dict['created_at'] = payment_dict['created_at'].isoformat()
    
    await db.payment_methods.insert_one(payment_dict)
    
    return {"message": "تم إضافة طريقة الدفع بنجاح"}


@api_router.get("/payment/status")
async def get_payment_status(current_user: dict = Depends(get_current_user)):
    payment = await db.payment_methods.find_one({"user_id": current_user['id']}, {"_id": 0})
    
    if not payment:
        return {"has_payment": False}
    
    return {
        "has_payment": True,
        "payment_type": payment.get('payment_type'),
        "card_last_four": payment.get('card_last_four'),
        "paypal_email": payment.get('paypal_email')
    }


@api_router.get("/subscription/status", response_model=SubscriptionStatus)
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    subscription = await db.subscriptions.find_one({"user_id": current_user['id']}, {"_id": 0})
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الاشتراك غير موجود"
        )
    
    trial_end = datetime.fromisoformat(subscription['trial_end_date']) if isinstance(subscription['trial_end_date'], str) else subscription['trial_end_date']
    days_remaining = max(0, (trial_end - datetime.now(timezone.utc)).days)
    
    next_payment = None
    if subscription['next_payment_date']:
        next_payment = datetime.fromisoformat(subscription['next_payment_date']) if isinstance(subscription['next_payment_date'], str) else subscription['next_payment_date']
    
    return SubscriptionStatus(
        status=subscription['status'],
        trial_end_date=trial_end,
        next_payment_date=next_payment,
        days_remaining=days_remaining,
        annual_amount=subscription['annual_amount'],
        currency=subscription['currency']
    )


@api_router.post("/profile/create")
async def create_profile(request: ProfileCreateRequest, current_user: dict = Depends(get_current_user)):
    # Check if profile already exists
    existing_profile = await db.profiles.find_one({"user_id": current_user['id']}, {"_id": 0})
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="الملف الشخصي موجود بالفعل"
        )
    
    # Create profile
    profile = Profile(
        user_id=current_user['id'],
        display_name=request.display_name,
        bio=request.bio,
        date_of_birth=request.date_of_birth,
        gender=request.gender,
        height=request.height,
        looking_for=request.looking_for,
        interests=request.interests,
        location=request.location,
        occupation=request.occupation,
        education=request.education,
        relationship_goals=request.relationship_goals,
        smoking=request.smoking,
        drinking=request.drinking,
        has_children=request.has_children,
        wants_children=request.wants_children,
        languages=request.languages
    )
    
    profile_dict = profile.model_dump()
    profile_dict['created_at'] = profile_dict['created_at'].isoformat()
    profile_dict['updated_at'] = profile_dict['updated_at'].isoformat()
    
    await db.profiles.insert_one(profile_dict)
    
    # Update user profile_completed status
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": {"profile_completed": True}}
    )
    
    # Remove non-serializable fields from response
    response_profile = {k: v for k, v in profile_dict.items() if k != '_id'}
    return {"message": "تم إنشاء الملف الشخصي بنجاح", "profile": response_profile}


@api_router.get("/profile/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user['id']}, {"_id": 0})
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الملف الشخصي غير موجود"
        )
    
    return profile


@api_router.put("/profile/update")
async def update_profile(request: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user['id']}, {"_id": 0})
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الملف الشخصي غير موجود"
        )
    
    # Update only provided fields
    update_data = {k: v for k, v in request.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.profiles.update_one(
        {"user_id": current_user['id']},
        {"$set": update_data}
    )
    
    return {"message": "تم تحديث الملف الشخصي بنجاح"}


@api_router.post("/profile/photo/upload")
async def upload_photo(request: PhotoUploadRequest, current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user['id']}, {"_id": 0})
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الملف الشخصي غير موجود"
        )
    
    # For now, store base64 data directly (in production, upload to cloud storage)
    photos = profile.get('photos', [])
    if len(photos) >= 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="الحد الأقصى 6 صور"
        )
    
    photos.append(request.photo_data)
    
    await db.profiles.update_one(
        {"user_id": current_user['id']},
        {"$set": {"photos": photos, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "تم رفع الصورة بنجاح", "photo_count": len(photos)}


@api_router.delete("/profile/photo/{index}")
async def delete_photo(index: int, current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user['id']}, {"_id": 0})
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="الملف الشخصي غير موجود"
        )
    
    photos = profile.get('photos', [])
    if index < 0 or index >= len(photos):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="رقم الصورة غير صحيح"
        )
    
    photos.pop(index)
    
    await db.profiles.update_one(
        {"user_id": current_user['id']},
        {"$set": {"photos": photos, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "تم حذف الصورة بنجاح"}


@api_router.get("/profiles/discover")
async def discover_profiles(current_user: dict = Depends(get_current_user), limit: int = 20):
    # Get current user's profile
    my_profile = await db.profiles.find_one({"user_id": current_user['id']}, {"_id": 0})
    
    if not my_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="يجب إكمال ملفك الشخصي أولاً"
        )
    
    # Get users already swiped
    swiped = await db.swipes.find({"user_id": current_user['id']}, {"_id": 0, "swiped_user_id": 1}).to_list(length=1000)
    swiped_ids = [s['swiped_user_id'] for s in swiped]
    
    # Get other profiles (exclude current user and already swiped)
    profiles = await db.profiles.find(
        {
            "user_id": {"$ne": current_user['id'], "$nin": swiped_ids}
        },
        {"_id": 0}
    ).limit(limit).to_list(length=limit)
    
    return {"profiles": profiles}


@api_router.post("/swipe")
async def swipe_action(request: SwipeRequest, current_user: dict = Depends(get_current_user)):
    # Save swipe
    swipe = Swipe(
        user_id=current_user['id'],
        swiped_user_id=request.swiped_user_id,
        action=request.action
    )
    
    swipe_dict = swipe.model_dump()
    swipe_dict['created_at'] = swipe_dict['created_at'].isoformat()
    
    await db.swipes.insert_one(swipe_dict)
    
    # Check for match if action is like or super_like
    is_match = False
    if request.action in ['like', 'super_like']:
        # Check if the other user also liked
        other_swipe = await db.swipes.find_one({
            "user_id": request.swiped_user_id,
            "swiped_user_id": current_user['id'],
            "action": {"$in": ['like', 'super_like']}
        })
        
        if other_swipe:
            # It's a match!
            is_match = True
            
            # Check if match already exists
            existing_match = await db.matches.find_one({
                "$or": [
                    {"user1_id": current_user['id'], "user2_id": request.swiped_user_id},
                    {"user1_id": request.swiped_user_id, "user2_id": current_user['id']}
                ]
            })
            
            if not existing_match:
                match = Match(
                    user1_id=current_user['id'],
                    user2_id=request.swiped_user_id
                )
                
                match_dict = match.model_dump()
                match_dict['matched_at'] = match_dict['matched_at'].isoformat()
                
                await db.matches.insert_one(match_dict)
    
    return {
        "success": True,
        "is_match": is_match,
        "action": request.action
    }


@api_router.get("/matches")
async def get_matches(current_user: dict = Depends(get_current_user)):
    # Get all matches
    matches = await db.matches.find({
        "$or": [
            {"user1_id": current_user['id']},
            {"user2_id": current_user['id']}
        ],
        "unmatched": False
    }, {"_id": 0}).to_list(length=100)
    
    # Get profiles for matches
    match_profiles = []
    for match in matches:
        other_user_id = match['user2_id'] if match['user1_id'] == current_user['id'] else match['user1_id']
        profile = await db.profiles.find_one({"user_id": other_user_id}, {"_id": 0})
        if profile:
            match_profiles.append({
                "match_id": match['id'],
                "matched_at": match['matched_at'],
                "profile": profile
            })
    
    return {"matches": match_profiles}


@api_router.get("/likes/sent")
async def get_sent_likes(current_user: dict = Depends(get_current_user)):
    # Get users I liked
    likes = await db.swipes.find({
        "user_id": current_user['id'],
        "action": {"$in": ['like', 'super_like']}
    }, {"_id": 0}).to_list(length=100)
    
    # Get profiles
    profiles = []
    for like in likes:
        profile = await db.profiles.find_one({"user_id": like['swiped_user_id']}, {"_id": 0})
        if profile:
            profiles.append(profile)
    
    return {"profiles": profiles}


@api_router.get("/likes/received")
async def get_received_likes(current_user: dict = Depends(get_current_user)):
    # Get users who liked me
    likes = await db.swipes.find({
        "swiped_user_id": current_user['id'],
        "action": {"$in": ['like', 'super_like']}
    }, {"_id": 0}).to_list(length=100)
    
    # Get profiles
    profiles = []
    for like in likes:
        profile = await db.profiles.find_one({"user_id": like['user_id']}, {"_id": 0})
        if profile:
            profiles.append(profile)
    
    return {"profiles": profiles}


@api_router.post("/seed/dummy-profiles")
async def create_dummy_profiles():
    """Create 50 diverse dummy profiles for testing"""
    
    photos_list = [
        ["https://images.unsplash.com/photo-1560250097-0b93528c311a"],
        ["https://images.unsplash.com/photo-1629425733761-caae3b5f2e50"],
        ["https://images.unsplash.com/photo-1657128344786-360c3f8e57e5"],
        ["https://images.unsplash.com/photo-1652471943570-f3590a4e52ed"],
        ["https://images.unsplash.com/photo-1563170446-9c3c0622d8a9"],
        ["https://images.unsplash.com/photo-1606143412458-acc5f86de897"],
        ["https://images.unsplash.com/photo-1557053910-d9eadeed1c58"],
        ["https://images.unsplash.com/photo-1580489944761-15a19d654956"],
        ["https://images.unsplash.com/photo-1557053908-4793c484d06f"],
        ["https://images.unsplash.com/photo-1592621385612-4d7129426394"],
        ["https://images.unsplash.com/photo-1573496359142-b8d87734a5a2"],
        ["https://images.unsplash.com/photo-1519085360753-af0119f7cbe7"],
        ["https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e"],
        ["https://images.unsplash.com/photo-1633037543479-a70452ea1e12"],
        ["https://images.pexels.com/photos/9504516/pexels-photo-9504516.jpeg"],
        ["https://images.pexels.com/photos/6925361/pexels-photo-6925361.jpeg"],
        ["https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg"],
        ["https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg"],
        ["https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg"],
        ["https://images.pexels.com/photos/2381069/pexels-photo-2381069.jpeg"]
    ]
    
    dummy_data = [
        {"name": "Sarah", "name_ar": "سارة", "bio": "Love traveling and photography 📸✈️", "bio_ar": "أحب السفر والتصوير 📸✈️", "gender": "female", "age": 28, "height": 165, "location": "New York, USA", "interests": ["السفر", "التصوير", "القراءة"], "occupation": "Graphic Designer", "photo_idx": 0},
        {"name": "Ahmed", "name_ar": "أحمد", "bio": "Engineer & fitness enthusiast 💪", "bio_ar": "مهندس ومهتم باللياقة 💪", "gender": "male", "age": 32, "height": 180, "location": "Dubai, UAE", "interests": ["الرياضة", "التكنولوجيا", "السفر"], "occupation": "Software Engineer", "photo_idx": 1},
        {"name": "Emily", "name_ar": "إيميلي", "bio": "Artist & coffee lover ☕🎨", "bio_ar": "فنانة ومحبة للقهوة ☕🎨", "gender": "female", "age": 26, "height": 168, "location": "Paris, France", "interests": ["الفن", "القهوة", "الموسيقى"], "occupation": "Artist", "photo_idx": 2},
        {"name": "Omar", "name_ar": "عمر", "bio": "Doctor passionate about helping people 🩺", "bio_ar": "طبيب شغوف بمساعدة الناس 🩺", "gender": "male", "age": 35, "height": 178, "location": "Cairo, Egypt", "interests": ["الطب", "القراءة", "الرياضة"], "occupation": "Doctor", "photo_idx": 3},
        {"name": "Sofia", "name_ar": "صوفيا", "bio": "Marketing specialist & foodie 🍕", "bio_ar": "متخصصة تسويق وعاشقة للطعام 🍕", "gender": "female", "age": 29, "height": 163, "location": "Barcelona, Spain", "interests": ["التسويق", "الطعام", "السفر"], "occupation": "Marketing Specialist", "photo_idx": 4},
        {"name": "Karim", "name_ar": "كريم", "bio": "Pilot exploring the world ✈️", "bio_ar": "طيار يستكشف العالم ✈️", "gender": "male", "age": 33, "height": 183, "location": "Riyadh, Saudi Arabia", "interests": ["الطيران", "السفر", "المغامرات"], "occupation": "Pilot", "photo_idx": 5},
        {"name": "Layla", "name_ar": "ليلى", "bio": "Writer & bookworm 📚✍️", "bio_ar": "كاتبة ومحبة للكتب 📚✍️", "gender": "female", "age": 27, "height": 160, "location": "Beirut, Lebanon", "interests": ["الكتابة", "القراءة", "الأدب"], "occupation": "Writer", "photo_idx": 6},
        {"name": "Marco", "name_ar": "ماركو", "bio": "Chef & food enthusiast 🍝👨‍🍳", "bio_ar": "طاهٍ ومحب للطعام 🍝👨‍🍳", "gender": "male", "age": 30, "height": 175, "location": "Rome, Italy", "interests": ["الطبخ", "الطعام", "السفر"], "occupation": "Chef", "photo_idx": 7},
        {"name": "Noor", "name_ar": "نور", "bio": "Teacher & nature lover 🌿", "bio_ar": "معلمة ومحبة للطبيعة 🌿", "gender": "female", "age": 25, "height": 162, "location": "Doha, Qatar", "interests": ["التعليم", "الطبيعة", "اليوغا"], "occupation": "Teacher", "photo_idx": 8},
        {"name": "Lucas", "name_ar": "لوكاس", "bio": "Entrepreneur & tech lover 💻", "bio_ar": "رائد أعمال ومحب للتقنية 💻", "gender": "male", "age": 31, "height": 179, "location": "London, UK", "interests": ["ريادة الأعمال", "التكنولوجيا", "الابتكار"], "occupation": "Entrepreneur", "photo_idx": 9},
        {"name": "Aisha", "name_ar": "عائشة", "bio": "Pharmacist & fitness lover 💊🏃‍♀️", "bio_ar": "صيدلانية ومحبة للرياضة 💊🏃‍♀️", "gender": "female", "age": 28, "height": 164, "location": "Manama, Bahrain", "interests": ["الصحة", "الرياضة", "التغذية"], "occupation": "Pharmacist", "photo_idx": 10},
        {"name": "David", "name_ar": "ديفيد", "bio": "Architect & design enthusiast 🏗️", "bio_ar": "مهندس معماري ومحب للتصميم 🏗️", "gender": "male", "age": 34, "height": 181, "location": "Sydney, Australia", "interests": ["الهندسة", "التصميم", "الفن"], "occupation": "Architect", "photo_idx": 11},
        {"name": "Mariam", "name_ar": "مريم", "bio": "Lawyer & justice seeker ⚖️", "bio_ar": "محامية وباحثة عن العدالة ⚖️", "gender": "female", "age": 30, "height": 167, "location": "Amman, Jordan", "interests": ["القانون", "القراءة", "العدالة"], "occupation": "Lawyer", "photo_idx": 12},
        {"name": "Alex", "name_ar": "أليكس", "bio": "Photographer capturing moments 📷", "bio_ar": "مصور يوثق اللحظات 📷", "gender": "male", "age": 29, "height": 176, "location": "Berlin, Germany", "interests": ["التصوير", "السفر", "الفن"], "occupation": "Photographer", "photo_idx": 13},
        {"name": "Yasmin", "name_ar": "ياسمين", "bio": "Journalist & storyteller 📰", "bio_ar": "صحفية وراوية قصص 📰", "gender": "female", "age": 27, "height": 161, "location": "Casablanca, Morocco", "interests": ["الصحافة", "الكتابة", "السفر"], "occupation": "Journalist", "photo_idx": 14},
        {"name": "Ryan", "name_ar": "رايان", "bio": "Personal trainer & health coach 🏋️", "bio_ar": "مدرب شخصي ومدرب صحة 🏋️", "gender": "male", "age": 28, "height": 182, "location": "Los Angeles, USA", "interests": ["اللياقة", "الصحة", "التغذية"], "occupation": "Personal Trainer", "photo_idx": 15},
        {"name": "Lara", "name_ar": "لارا", "bio": "Fashion designer & trendsetter 👗", "bio_ar": "مصممة أزياء ورائدة موضة 👗", "gender": "female", "age": 26, "height": 169, "location": "Milan, Italy", "interests": ["الموضة", "التصميم", "الفن"], "occupation": "Fashion Designer", "photo_idx": 16},
        {"name": "Hassan", "name_ar": "حسن", "bio": "Financial analyst & investor 📈", "bio_ar": "محلل مالي ومستثمر 📈", "gender": "male", "age": 33, "height": 177, "location": "Abu Dhabi, UAE", "interests": ["المال", "الاستثمار", "القراءة"], "occupation": "Financial Analyst", "photo_idx": 17},
        {"name": "Maya", "name_ar": "مايا", "bio": "Dentist with a bright smile 😁🦷", "bio_ar": "طبيبة أسنان بابتسامة مشرقة 😁🦷", "gender": "female", "age": 29, "height": 165, "location": "Toronto, Canada", "interests": ["طب الأسنان", "الصحة", "السفر"], "occupation": "Dentist", "photo_idx": 18},
        {"name": "Zaid", "name_ar": "زيد", "bio": "Data scientist & AI enthusiast 🤖", "bio_ar": "عالم بيانات ومحب للذكاء الاصطناعي 🤖", "gender": "male", "age": 30, "height": 174, "location": "Jeddah, Saudi Arabia", "interests": ["البيانات", "الذكاء الاصطناعي", "التكنولوجيا"], "occupation": "Data Scientist", "photo_idx": 19}
    ]
    
    dummy_users_data = []
    dummy_profiles_data = []
    
    for i, data in enumerate(dummy_data):
        user_id = f"dummy-user-{i}"
        
        # User
        dummy_users_data.append({
            "id": user_id,
            "name": data['name'],
            "email": f"dummy{i}@pizoo.com",
            "phone_number": f"+123456789{i:02d}",
            "password_hash": pwd_context.hash("dummy123"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "trial_end_date": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
            "subscription_status": "trial",
            "terms_accepted": True,
            "terms_accepted_at": datetime.now(timezone.utc).isoformat(),
            "profile_completed": True
        })
        
        # Profile
        photo_url = photos_list[data['photo_idx']][0] if data['photo_idx'] < len(photos_list) else ""
        
        dummy_profiles_data.append({
            "id": f"profile-{i}",
            "user_id": user_id,
            "display_name": data['name_ar'],
            "bio": data['bio_ar'],
            "date_of_birth": f"{1997 - data['age']}-06-15",
            "gender": data['gender'],
            "height": data['height'],
            "looking_for": "serious" if i % 2 == 0 else "casual",
            "interests": data['interests'],
            "photos": [photo_url] if photo_url else [],
            "location": data['location'],
            "occupation": data['occupation'],
            "education": "Bachelor's Degree" if i % 3 == 0 else "Master's Degree",
            "relationship_goals": "serious" if i % 2 == 0 else "casual",
            "smoking": "no",
            "drinking": "sometimes" if i % 3 == 0 else "no",
            "has_children": False,
            "wants_children": True if i % 2 == 0 else False,
            "languages": ["العربية", "English"] if i % 2 == 0 else ["English"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    dummy_users = dummy_users_data
    
    dummy_profiles = [
        {
            "id": f"profile-{i}",
            "user_id": f"dummy-user-{i}",
            "display_name": profile['name'],
            "bio": profile['bio'],
            "date_of_birth": profile['dob'],
            "gender": profile['gender'],
            "height": profile['height'],
            "looking_for": profile['looking_for'],
            "interests": profile['interests'],
            "location": profile['location'],
            "occupation": profile['occupation'],
            "education": profile['education'],
            "relationship_goals": profile['goals'],
            "smoking": "no",
            "drinking": "no",
            "has_children": False,
            "wants_children": True,
            "languages": ["العربية", "الإنجليزية"],
            "photos": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        for i, profile in enumerate([
            {"name": "سارة", "bio": "أحب السفر والقراءة والمغامرات الجديدة ☕📚✈️", "dob": "1995-05-15", "gender": "female", "height": 165, "looking_for": "علاقة جدية", "interests": ["السفر", "القراءة", "التصوير", "الطبخ"], "location": "جدة، السعودية", "occupation": "مصممة جرافيك", "education": "بكالوريوس", "goals": "serious"},
            {"name": "محمد", "bio": "رياضي ومهتم بالتكنولوجيا. أبحث عن شريكة حياة 💪🏋️", "dob": "1992-08-20", "gender": "male", "height": 180, "looking_for": "علاقة جدية", "interests": ["الرياضة", "التكنولوجيا", "السفر", "البرمجة"], "location": "الرياض، السعودية", "occupation": "مهندس برمجيات", "education": "ماجستير", "goals": "serious"},
            {"name": "لينا", "bio": "طبيبة وأحب مساعدة الناس. أحب الهدوء والطبيعة 🌸🌿", "dob": "1994-03-10", "gender": "female", "height": 168, "looking_for": "صداقة أولاً", "interests": ["الطب", "الطبيعة", "اليوغا", "القراءة"], "location": "دبي، الإمارات", "occupation": "طبيبة", "education": "دكتوراه", "goals": "serious"},
            {"name": "أحمد", "bio": "رائد أعمال ومحب للحياة والمغامرات 🚀💼", "dob": "1990-11-25", "gender": "male", "height": 178, "looking_for": "علاقة جدية", "interests": ["ريادة الأعمال", "السفر", "القراءة", "الرياضة"], "location": "أبوظبي، الإمارات", "occupation": "رائد أعمال", "education": "ماجستير", "goals": "serious"},
            {"name": "نور", "bio": "معلمة ومهتمة بالفن والثقافة. أحب التعرف على أشخاص جدد 🎨📖", "dob": "1996-07-12", "gender": "female", "height": 162, "looking_for": "صداقة", "interests": ["الفن", "الثقافة", "الموسيقى", "التعليم"], "location": "الدوحة، قطر", "occupation": "معلمة", "education": "بكالوريوس", "goals": "friendship"},
            {"name": "يوسف", "bio": "مصور فوتوغرافي أحب توثيق اللحظات الجميلة 📷✨", "dob": "1993-04-18", "gender": "male", "height": 175, "looking_for": "علاقة عابرة", "interests": ["التصوير", "السفر", "الفن", "الطبيعة"], "location": "الكويت، الكويت", "occupation": "مصور", "education": "بكالوريوس", "goals": "casual"},
            {"name": "ريم", "bio": "كاتبة ومدونة. أحب القصص والمغامرات ✍️💭", "dob": "1997-09-30", "gender": "female", "height": 160, "looking_for": "صداقة أولاً", "interests": ["الكتابة", "القراءة", "السفر", "الثقافة"], "location": "بيروت، لبنان", "occupation": "كاتبة", "education": "بكالوريوس", "goals": "friendship"},
            {"name": "عمر", "bio": "محامي ومهتم بالعدالة والقانون. أحب النقاشات العميقة ⚖️", "dob": "1991-12-05", "gender": "male", "height": 182, "looking_for": "علاقة جدية", "interests": ["القانون", "القراءة", "الشطرنج", "التاريخ"], "location": "القاهرة، مصر", "occupation": "محامي", "education": "ماجستير", "goals": "serious"},
            {"name": "مريم", "bio": "مهندسة معمارية أحب التصميم والإبداع 🏗️🎨", "dob": "1995-06-22", "gender": "female", "height": 167, "looking_for": "علاقة جدية", "interests": ["الهندسة", "التصميم", "الفن", "السفر"], "location": "عمّان، الأردن", "occupation": "مهندسة معمارية", "education": "بكالوريوس", "goals": "serious"},
            {"name": "خالد", "bio": "طيار ومحب للسماء والطيران ✈️☁️", "dob": "1989-02-14", "gender": "male", "height": 183, "looking_for": "علاقة جدية", "interests": ["الطيران", "السفر", "المغامرات", "الرياضة"], "location": "الرياض، السعودية", "occupation": "طيار", "education": "بكالوريوس", "goals": "serious"},
            {"name": "دانة", "bio": "صيدلانية ومهتمة بالصحة والرياضة 💊🏃‍♀️", "dob": "1996-10-08", "gender": "female", "height": 164, "looking_for": "صداقة أولاً", "interests": ["الصحة", "الرياضة", "التغذية", "القراءة"], "location": "المنامة، البحرين", "occupation": "صيدلانية", "education": "بكالوريوس", "goals": "friendship"},
            {"name": "فهد", "bio": "مدير تسويق ومحب للإبداع والابتكار 📊💡", "dob": "1992-03-28", "gender": "male", "height": 177, "looking_for": "علاقة عابرة", "interests": ["التسويق", "الإبداع", "التكنولوجيا", "السفر"], "location": "جدة، السعودية", "occupation": "مدير تسويق", "education": "ماجستير", "goals": "casual"},
            {"name": "ليلى", "bio": "مترجمة وأحب اللغات والثقافات المختلفة 🌍📚", "dob": "1994-08-15", "gender": "female", "height": 163, "looking_for": "صداقة", "interests": ["اللغات", "الترجمة", "السفر", "الثقافة"], "location": "الدار البيضاء، المغرب", "occupation": "مترجمة", "education": "ماجستير", "goals": "friendship"},
            {"name": "سلطان", "bio": "محلل مالي ومهتم بالاستثمار والأعمال 💰📈", "dob": "1990-05-20", "gender": "male", "height": 179, "looking_for": "علاقة جدية", "interests": ["المال", "الاستثمار", "القراءة", "الرياضة"], "location": "دبي، الإمارات", "occupation": "محلل مالي", "education": "ماجستير", "goals": "serious"},
            {"name": "جود", "bio": "طالبة طب أحلم بمساعدة الناس وتغيير العالم 🩺💗", "dob": "1998-11-11", "gender": "female", "height": 161, "looking_for": "صداقة أولاً", "interests": ["الطب", "التطوع", "القراءة", "الموسيقى"], "location": "الرياض، السعودية", "occupation": "طالبة طب", "education": "بكالوريوس", "goals": "friendship"},
            {"name": "ماجد", "bio": "مدرب رياضي ومحب للحياة الصحية 💪🏋️‍♂️", "dob": "1991-07-07", "gender": "male", "height": 181, "looking_for": "علاقة جدية", "interests": ["الرياضة", "اللياقة", "التغذية", "التحفيز"], "location": "أبوظبي، الإمارات", "occupation": "مدرب رياضي", "education": "بكالوريوس", "goals": "serious"}
        ])
    ]
    
    # Insert users and profiles
    try:
        await db.users.insert_many(dummy_users)
        await db.profiles.insert_many(dummy_profiles)
        return {
            "message": "تم إنشاء البروفايلات الوهمية بنجاح",
            "count": len(dummy_profiles)
        }
    except Exception as e:
        # Profiles might already exist
        return {
            "message": "البروفايلات موجودة بالفعل أو حدث خطأ",
            "error": str(e)
        }


@api_router.get("/terms")
async def get_terms():
    terms_content = """
# شروط وأحكام استخدام التطبيق

آخر تحديث: {date}

مرحباً بك في تطبيقنا. بتسجيلك في هذه الخدمة، فإنك توافق على الالتزام بالشروط والأحكام التالية. يرجى قراءتها بعناية.

---

## 1. القبول والموافقة

1.1 باستخدامك لهذا التطبيق، فإنك تقر بأنك قد قرأت وفهمت ووافقت على جميع الشروط والأحكام الواردة في هذه الوثيقة.

1.2 إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام التطبيق.

---

## 2. الاشتراك والفترة التجريبية

### 2.1 الفترة التجريبية المجانية
- يحصل جميع المستخدمين الجدد على **فترة تجريبية مجانية مدتها 14 يوماً** من تاريخ التسجيل
- خلال هذه الفترة، لن يتم خصم أي مبلغ من حسابك
- يمكنك إلغاء الاشتراك في أي وقت خلال الفترة التجريبية دون أي رسوم

### 2.2 الاشتراك السنوي
- **قيمة الاشتراك**: 396 فرنك سويسري (CHF) سنوياً
- **المعادل الشهري**: 33 فرنك سويسري شهرياً (وفر 20% مقارنة بالاشتراك الشهري)
- **الدفع التلقائي**: بعد انتهاء الفترة التجريبية البالغة 14 يوماً، سيتم خصم مبلغ 396 CHF تلقائياً من طريقة الدفع المسجلة لديك
- **التجديد التلقائي**: يتجدد الاشتراك تلقائياً كل عام ما لم يتم إلغاؤه قبل تاريخ التجديد بـ 7 أيام على الأقل

---

## 3. طرق الدفع

### 3.1 الطرق المقبولة
نقبل الدفع عبر:
- البطاقات البنكية (Visa, Mastercard, American Express)
- PayPal
- طرق دفع أخرى حسب البلد

### 3.2 إلزامية معلومات الدفع
- إضافة طريقة دفع صالحة **إلزامية** عند التسجيل، حتى خلال الفترة التجريبية
- يجب أن تكون معلومات الدفع صحيحة ومحدثة دائماً
- أنت مسؤول عن تحديث معلومات الدفع في حالة انتهاء صلاحية البطاقة

### 3.3 أمن المعلومات المالية
- جميع معلومات الدفع مشفرة ومحمية بأعلى معايير الأمان (PCI-DSS)
- لا نقوم بتخزين معلومات البطاقة الكاملة على خوادمنا
- نحتفظ فقط بالأربعة أرقام الأخيرة للتعريف

### 3.4 فشل الدفع
- في حالة فشل عملية الدفع التلقائي، سيتم إرسال إشعار لك عبر البريد الإلكتروني
- لديك 7 أيام لتحديث معلومات الدفع
- بعد 7 أيام، سيتم إيقاف الخدمة مؤقتاً حتى يتم تحديث معلومات الدفع

---

## 4. سياسة الإلغاء والاسترجاع

### 4.1 الإلغاء خلال الفترة التجريبية
- يمكنك إلغاء اشتراكك في **أي وقت خلال فترة الـ 14 يوماً** التجريبية
- لن يتم خصم أي مبلغ إذا تم الإلغاء قبل انتهاء الفترة التجريبية
- سيتوقف وصولك للخدمة فوراً عند الإلغاء

### 4.2 استرجاع كامل المبلغ
- بعد خصم المبلغ السنوي، يمكنك طلب استرجاع **كامل المبلغ خلال 7 أيام** من تاريخ الدفع
- سيتم معالجة طلب الاسترجاع خلال 7-10 أيام عمل
- سيعاد المبلغ إلى نفس طريقة الدفع المستخدمة

### 4.3 استرجاع جزئي
- بعد مرور 7 أيام من الدفع، يمكن طلب استرجاع جزئي
- يُحسب المبلغ المسترجع على أساس الفترة المتبقية من الاشتراك السنوي
- يُخصم رسوم إدارية 10% من المبلغ المسترجع

### 4.4 طريقة الإلغاء
- يمكن إلغاء الاشتراك من خلال **لوحة التحكم** الخاصة بك
- أو بالتواصل مع **فريق الدعم** عبر البريد الإلكتروني

### 4.5 استمرار الخدمة بعد الإلغاء
- عند إلغاء الاشتراك، ستستمر إمكانية الوصول للخدمة حتى **نهاية الفترة المدفوعة**
- لن يتم تجديد الاشتراك تلقائياً بعد انتهاء الفترة

---

## 5. التحقق من الهوية ومكافحة الاحتيال

### 5.1 المعلومات المطلوبة
للتسجيل في الخدمة، يجب تقديم:
- الاسم الكامل
- عنوان بريد إلكتروني صالح
- رقم هاتف للتواصل
- معلومات طريقة الدفع (بطاقة بنكية أو PayPal)

### 5.2 التحقق من الهوية
- قد نطلب منك تقديم وثائق إضافية للتحقق من هويتك في حالات معينة
- هذا يساعدنا في حماية حسابك ومنع الاحتيال
- المعلومات المقدمة تُستخدم فقط لأغراض التحقق ولن تُشارك مع أطراف ثالثة

### 5.3 حماية الحساب
- أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة المرور
- يجب إبلاغنا فوراً في حالة الاشتباه في استخدام غير مصرح به لحسابك

---

## 6. سياسة الخصوصية وحماية البيانات

### 6.1 جمع البيانات
نقوم بجمع المعلومات التالية:
- **معلومات شخصية**: الاسم، البريد الإلكتروني، رقم الهاتف
- **معلومات الدفع**: نوع طريقة الدفع، آخر 4 أرقام من البطاقة
- **بيانات الاستخدام**: تواريخ الدخول، نشاطات الحساب

### 6.2 استخدام البيانات
نستخدم بياناتك الشخصية لـ:
- تقديم وتحسين خدماتنا
- معالجة المدفوعات والاشتراكات
- التواصل معك بخصوص حسابك
- تحسين تجربة المستخدم
- الامتثال للمتطلبات القانونية

### 6.3 مشاركة البيانات
- **لن نبيع** معلوماتك الشخصية لأطراف ثالثة أبداً
- قد نشارك البيانات مع:
  - معالجي الدفع (لمعالجة المدفوعات فقط)
  - مقدمي الخدمات السحابية (لتخزين البيانات بشكل آمن)
  - السلطات القانونية (عند الطلب القانوني فقط)

### 6.4 أمن البيانات
- نستخدم تشفير SSL/TLS لجميع الاتصالات
- البيانات المالية مشفرة وفق معايير PCI-DSS
- الوصول للبيانات مقيد بالموظفين المصرح لهم فقط
- نجري فحوصات أمنية دورية

### 6.5 حقوقك
لديك الحق في:
- **الوصول**: الاطلاع على بياناتك الشخصية
- **التعديل**: تحديث أو تصحيح معلوماتك
- **الحذف**: طلب حذف حسابك وبياناتك
- **النقل**: الحصول على نسخة من بياناتك
- **الاعتراض**: الاعتراض على معالجة بياناتك في حالات معينة

### 6.6 الاحتفاظ بالبيانات
- نحتفظ ببياناتك طالما كان حسابك نشطاً
- بعد حذف الحساب، نحتفظ ببعض البيانات لمدة 90 يوماً للأغراض القانونية
- بعد ذلك، يتم حذف جميع البيانات بشكل دائم

### 6.7 ملفات تعريف الارتباط (Cookies)
- نستخدم cookies لتحسين تجربتك
- يمكنك تعطيل cookies من إعدادات المتصفح
- بعض الوظائف قد لا تعمل بدون cookies

---

## 7. شروط استخدام الخدمة

### 7.1 الأهلية
- يجب أن يكون عمرك **18 عاماً على الأقل** لاستخدام هذه الخدمة
- إذا كنت تمثل شركة، يجب أن يكون لديك السلطة لإلزام الشركة بهذه الشروط

### 7.2 الاستخدام المسموح
- يحق لك استخدام الخدمة للأغراض الشخصية أو التجارية المشروعة فقط
- يمكنك استخدام حساب واحد فقط لكل شخص
- جميع المحتويات والبيانات يجب أن تتوافق مع القوانين المحلية والدولية

### 7.3 الاستخدام المحظور
يُحظر استخدام الخدمة لـ:
- أي أنشطة غير قانونية أو احتيالية
- نشر محتوى مسيء، عنصري، أو يحرض على الكراهية
- إرسال رسائل غير مرغوب فيها (spam)
- محاولة اختراق الخدمة أو الوصول غير المصرح به
- انتهاك حقوق الملكية الفكرية للآخرين
- إساءة استخدام الخدمة بطريقة تؤثر على المستخدمين الآخرين

### 7.4 إنهاء الحساب
- يحق لنا إنهاء أو تعليق حسابك فوراً في حالة انتهاك هذه الشروط
- ستتلقى إشعاراً قبل 7 أيام من الإنهاء (ما لم يكن الانتهاك جسيماً)
- يمكنك حذف حسابك في أي وقت من لوحة التحكم

---

## 8. التغييرات على الشروط والأحكام

### 8.1 حقنا في التعديل
- نحتفظ بالحق في تعديل هذه الشروط في أي وقت
- سيتم إشعارك بأي تغييرات جوهرية قبل 30 يوماً من سريانها
- الإشعار سيكون عبر البريد الإلكتروني أو داخل التطبيق

### 8.2 قبول التعديلات
- استمرارك في استخدام الخدمة بعد التعديلات يعني موافقتك عليها
- إذا لم توافق على التعديلات، يمكنك إلغاء اشتراكك

---

## 9. إخلاء المسؤولية والضمانات

### 9.1 توفر الخدمة
- نبذل قصارى جهدنا لضمان توفر الخدمة 24/7
- قد تحدث انقطاعات مؤقتة للصيانة أو التحديثات
- نحن غير مسؤولين عن انقطاعات الخدمة خارج سيطرتنا

### 9.2 الضمانات
- الخدمة متاحة "كما هي" دون أي ضمانات صريحة أو ضمنية
- لا نضمن أن الخدمة ستكون خالية من الأخطاء أو الفيروسات
- لا نضمن أن الخدمة ستلبي احتياجاتك المحددة

### 9.3 حدود المسؤولية
- لا نتحمل المسؤولية عن:
  - أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام الخدمة
  - خسارة البيانات أو الأرباح
  - أي أضرار ناتجة عن انقطاع الخدمة
- المسؤولية القصوى تقتصر على المبلغ المدفوع خلال آخر 12 شهر

---

## 10. القانون الساري وحل النزاعات

### 10.1 القانون الساري
- تخضع هذه الشروط للقوانين السويسرية
- يتم تفسير أي بنود غامضة وفقاً للقانون السويسري

### 10.2 حل النزاعات
- في حالة نشوء أي نزاع، نشجعك على التواصل معنا أولاً لحله ودياً
- إذا لم يتم التوصل لحل، يُحال النزاع إلى **المحاكم السويسرية المختصة**
- مكان الاختصاص القضائي: زيورخ، سويسرا

---

## 11. الاتصال بنا

إذا كان لديك أي أسئلة أو استفسارات حول هذه الشروط والأحكام، يمكنك التواصل معنا:

📧 **البريد الإلكتروني**: support@example.com  
📞 **الهاتف**: +41 XX XXX XX XX  
🕐 **ساعات العمل**: الاثنين - الجمعة، 9:00 - 18:00 (توقيت زيورخ)

---

## 12. الإقرار النهائي

**بالتسجيل في خدمتنا، فإنك تقر وتوافق على ما يلي:**

✅ قرأت وفهمت جميع بنود هذه الشروط والأحكام  
✅ توافق على الالتزام بجميع الشروط المذكورة أعلاه  
✅ توافق على دفع رسوم الاشتراك السنوي (396 CHF) بعد انتهاء الفترة التجريبية  
✅ تفهم أنه سيتم خصم المبلغ تلقائياً من طريقة الدفع المسجلة  
✅ تفهم حقك في الإلغاء خلال الفترة التجريبية أو طلب استرجاع المبلغ  

---

*آخر تحديث: {date}*  
*رقم الإصدار: 1.0*
""".format(date=datetime.now().strftime("%d/%m/%Y"))
    
    return {"terms": terms_content}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

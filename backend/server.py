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


# ===== Request/Response Models =====

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    paypal_email: EmailStr
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
    
    # Create payment method
    payment_method = PaymentMethod(
        user_id=user.id,
        paypal_email=request.paypal_email
    )
    
    payment_dict = payment_method.model_dump()
    payment_dict['created_at'] = payment_dict['created_at'].isoformat()
    
    await db.payment_methods.insert_one(payment_dict)
    
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


@api_router.get("/terms")
async def get_terms():
    terms_content = """
# شروط وأحكام الخدمة

آخر تحديث: {date}

## 1. شروط الاشتراك السنوي

1.1 **نوع الاشتراك**: نقدم اشتراكاً سنوياً بقيمة 396 فرنك سويسري (CHF) يُدفع مرة واحدة سنوياً، وهو ما يعادل 33 فرنك سويسري شهرياً.

1.2 **الفترة التجريبية**: يحصل جميع المستخدمين الجدد على فترة تجريبية مجانية مدتها 14 يوماً من تاريخ التسجيل.

1.3 **الدفع التلقائي**: بعد انتهاء الفترة التجريبية البالغة 14 يوماً، سيتم خصم مبلغ 396 فرنك سويسري تلقائياً من طريقة الدفع المسجلة لديك.

1.4 **التجديد التلقائي**: يتجدد الاشتراك تلقائياً كل عام ما لم يتم إلغاؤه قبل تاريخ التجديد بـ 7 أيام على الأقل.

## 2. سياسة الاسترجاع والإلغاء

2.1 **الإلغاء خلال الفترة التجريبية**: يمكنك إلغاء اشتراكك في أي وقت خلال فترة الـ 14 يوماً التجريبية دون أي رسوم.

2.2 **سياسة الاسترجاع**: بعد خصم المبلغ السنوي، يمكنك طلب استرجاع كامل المبلغ خلال 7 أيام من تاريخ الدفع.

2.3 **الاسترجاع الجزئي**: بعد مرور 7 أيام من الدفع، يمكن طلب استرجاع جزئي محسوب على أساس الفترة المتبقية من الاشتراك السنوي.

2.4 **طريقة الإلغاء**: يمكن إلغاء الاشتراك من خلال لوحة التحكم الخاصة بك أو بالتواصل مع فريق الدعم.

2.5 **استمرار الخدمة**: عند إلغاء الاشتراك، ستستمر إمكانية الوصول للخدمة حتى نهاية الفترة المدفوعة.

## 3. شروط الدفع وطريقة الدفع

3.1 **طرق الدفع المقبولة**: نقبل الدفع عبر PayPal. يجب تقديم طريقة دفع صالحة عند التسجيل.

3.2 **إلزامية طريقة الدفع**: إضافة طريقة دفع صالحة إلزامية عند التسجيل حتى خلال الفترة التجريبية.

3.3 **تحديث معلومات الدفع**: أنت مسؤول عن الحفاظ على معلومات دفع صالحة ومحدثة في حسابك.

3.4 **فشل الدفع**: في حالة فشل عملية الدفع التلقائي، سيتم إرسال إشعار لك وسيتم إيقاف الخدمة مؤقتاً حتى يتم تحديث معلومات الدفع.

3.5 **العملة**: جميع المبالغ مذكورة بالفرنك السويسري (CHF).

## 4. سياسة الخصوصية الأساسية

4.1 **جمع البيانات**: نقوم بجمع المعلومات الضرورية فقط لتقديم الخدمة، بما في ذلك الاسم والبريد الإلكتروني ومعلومات الدفع.

4.2 **استخدام البيانات**: تُستخدم بياناتك الشخصية فقط لتقديم وتحسين خدماتنا ومعالجة المدفوعات.

4.3 **مشاركة البيانات**: لن نشارك معلوماتك الشخصية مع أطراف ثالثة إلا لمعالجة المدفوعات أو عند الطلب القانوني.

4.4 **أمن البيانات**: نستخدم تقنيات تشفير متقدمة لحماية بياناتك الشخصية والمالية.

4.5 **حقوقك**: لك الحق في الوصول إلى بياناتك الشخصية وتعديلها أو حذفها في أي وقت من خلال لوحة التحكم.

4.6 **ملفات تعريف الارتباط**: نستخدم ملفات تعريف الارتباط (cookies) لتحسين تجربة المستخدم وتحليل استخدام الموقع.

## 5. شروط استخدام الخدمة

5.1 **الأهلية**: يجب أن يكون عمرك 18 عاماً على الأقل لاستخدام هذه الخدمة.

5.2 **الاستخدام المسموح**: يحق لك استخدام الخدمة للأغراض الشخصية أو التجارية المشروعة فقط.

5.3 **الاستخدام المحظور**: يُحظر استخدام الخدمة لأي أنشطة غير قانونية أو ضارة أو مسيئة.

5.4 **مسؤولية المستخدم**: أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة المرور.

5.5 **التعديلات**: نحتفظ بالحق في تعديل هذه الشروط في أي وقت، وسيتم إخطارك بأي تغييرات جوهرية.

## 6. إخلاء المسؤولية

6.1 الخدمة متاحة "كما هي" دون أي ضمانات صريحة أو ضمنية.

6.2 لا نتحمل المسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام الخدمة.

## 7. القانون الساري

7.1 تخضع هذه الشروط للقوانين السويسرية.

7.2 أي نزاعات تنشأ عن هذه الشروط تُحال إلى المحاكم السويسرية المختصة.

## 8. الاتصال بنا

إذا كان لديك أي أسئلة حول هذه الشروط والأحكام، يرجى التواصل معنا عبر:
- البريد الإلكتروني: support@example.com
- الهاتف: +41 XX XXX XX XX

---

**بالتسجيل في خدمتنا، فإنك تقر بأنك قرأت وفهمت ووافقت على هذه الشروط والأحكام بالكامل.**
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

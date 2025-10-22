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

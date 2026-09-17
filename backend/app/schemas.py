from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import List, Optional

# Product Schemas
class ProductBase(BaseModel):
    name: str
    type: str
    max_quantity: int = Field(gt=0)
    price: int = Field(ge=0)  # ← فیلد جدید: قیمت به ریال (به ازای هر واحد، نه هر بسته)
    unit_name: str = Field(default="عدد", min_length=1, max_length=50)  # ← فیلد جدید: نام واحد (کیلوگرم، عدد، لیتر و ...)
    package_size: float = Field(default=1, gt=0)  # ← فیلد جدید: مقدار هر بسته به همان واحد
    description: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(BaseModel):
    # اسکیمای خروجی: بدون قید سخت‌گیرانه، طبق همان الگوی سایر موجودیت‌ها برای سازگاری با داده‌های قدیمی
    id: int
    name: str
    type: str
    max_quantity: int
    price: int = 0  # ← فیلد جدید: قیمت به ریال (به ازای هر واحد، نه هر بسته)
    unit_name: str = "عدد"  # ← فیلد جدید: نام واحد
    package_size: float = 1  # ← فیلد جدید: مقدار هر بسته به همان واحد
    is_active: bool = True  # ← فیلد جدید: فعال/غیرفعال
    description: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Service Location Schemas (← فیلد جدید: محل خدمت)
class ServiceLocationBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)

class ServiceLocationCreate(ServiceLocationBase):
    pass

class ServiceLocation(ServiceLocationBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Request Item Schemas
class RequestItemBase(BaseModel):
    product_id: int
    quantity: int = Field(ge=0)

class RequestItemCreate(RequestItemBase):
    pass

class RequestItem(RequestItemBase):
    id: int
    product: Product
    class Config:
        from_attributes = True

# Request Schemas
# نکته‌ی مهم: اسکیمای ورودی (RequestCreate/RequestUpdate) و خروجی (Request) عمداً کاملاً مستقل از هم تعریف شده‌اند.
# فیلدهای هویتی (نام، کدپرسنلی، محل خدمت، وضعیت خدمت) دیگر از کاربر گرفته نمی‌شوند و همیشه توسط
# سرور از روی جدول «افراد مجاز» و بر اساس کدملی واکشی می‌شوند تا امکان دستکاری توسط کاربر وجود نداشته باشد.
class RequestCreate(BaseModel):
    national_code: str = Field(pattern=r'^\d{10}$')  # کدملی ۱۰ رقمی
    phone_number: str = Field(pattern=r'^09\d{9}$')  # شماره موبایل ایران، الزامی
    items: List[RequestItemCreate]

    @model_validator(mode='after')
    def validate_has_product(self) -> 'RequestCreate':
        if not self.items or all(item.quantity == 0 for item in self.items):
            raise ValueError('شما هیچ محصولی انتخاب نکرده‌اید')
        return self

class RequestUpdate(BaseModel):
    current_phone_number: str  # شماره‌ی قبلاً ثبت‌شده، برای تأیید هویت هنگام ویرایش
    phone_number: str = Field(pattern=r'^09\d{9}$')  # شماره جدید (می‌تواند همان قبلی باشد)
    items: List[RequestItemCreate]

    @model_validator(mode='after')
    def validate_has_product(self) -> 'RequestUpdate':
        if not self.items or all(item.quantity == 0 for item in self.items):
            raise ValueError('شما هیچ محصولی انتخاب نکرده‌اید')
        return self

class RequestVerifyEdit(BaseModel):
    national_code: str
    phone_number: str

class Request(BaseModel):
    # اسکیمای خروجی/نمایش: عمداً بدون قید سخت‌گیرانه (min_length و ...) تعریف شده
    # تا داده‌های قدیمی‌ای که با قوانین قبلی ثبت شده‌اند هم همیشه به‌درستی نمایش داده شوند.
    id: int
    national_code: Optional[str] = None  # ← فیلد جدید: کدملی
    employee_code: str
    full_name: str
    phone_number: Optional[str] = None
    employment_status: str
    service_location_id: Optional[int] = None  # ← فیلد جدید: محل خدمت (قدیمی)
    service_location_text: Optional[str] = None  # ← فیلد جدید: محل خدمت (متن آزاد از افراد مجاز)
    admin_description: Optional[str] = None
    submitted_at: datetime
    updated_at: Optional[datetime]
    is_editable: bool
    items: List[RequestItem]
    service_location: Optional[ServiceLocation] = None  # ← فیلد جدید: محل خدمت (قدیمی)
    class Config:
        from_attributes = True

# Authorized Person Schemas (← فیلد جدید: افراد مجاز به ثبت درخواست)
# نکته: طبق همان الگوی Request، اسکیمای خروجی عمداً بدون قید سخت‌گیرانه تعریف شده
# تا داده‌های قدیمی‌تر همیشه به‌درستی نمایش داده شوند.
class AuthorizedPersonBase(BaseModel):
    national_code: str = Field(min_length=1, max_length=20)
    personnel_code: Optional[str] = Field(None, max_length=50)
    first_name: str = Field(min_length=1, max_length=255)
    last_name: str = Field(min_length=1, max_length=255)
    service_location: Optional[str] = None
    service_status: Optional[str] = None

class AuthorizedPersonCreate(AuthorizedPersonBase):
    pass

class AuthorizedPersonUpdate(BaseModel):
    national_code: Optional[str] = None
    personnel_code: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    service_location: Optional[str] = None
    service_status: Optional[str] = None

class AuthorizedPerson(BaseModel):
    id: int
    national_code: str
    personnel_code: Optional[str] = None
    first_name: str
    last_name: str
    service_location: Optional[str] = None
    service_status: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True

class AuthorizedPersonUploadResult(BaseModel):
    total_rows: int
    created: int
    updated: int
    errors: List[str]

# Admin Schemas
class AdminLogin(BaseModel):
    username: str
    password: str

class AdminToken(BaseModel):
    access_token: str
    token_type: str

# Settings Schemas
class SettingBase(BaseModel):
    edit_deadline: Optional[datetime]

class SettingUpdate(SettingBase):
    pass

class Setting(SettingBase):
    id: int
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, CheckConstraint, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(255), nullable=False)
    max_quantity = Column(Integer, nullable=False)
    price = Column(Integer, nullable=False, default=0)  # ← فیلد جدید: قیمت به ریال (به ازای هر واحد، نه هر بسته)
    unit_name = Column(String(50), nullable=False, default="عدد")  # ← فیلد جدید: نام واحد اندازه‌گیری (مثلاً کیلوگرم، عدد، لیتر)
    package_size = Column(Float, nullable=False, default=1)  # ← فیلد جدید: مقدار هر بسته به همان واحد (مثلاً ۲ برای بسته‌ی ۲ کیلوگرمی)
    is_active = Column(Boolean, nullable=False, default=True)  # ← فیلد جدید: فعال/غیرفعال (غیرفعال یعنی در فرم عمومی نمایش داده نشود)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Request(Base):
    __tablename__ = "requests"
    id = Column(Integer, primary_key=True, index=True)
    national_code = Column(String(10), unique=True, nullable=True, index=True)  # ← فیلد جدید: کدملی (شناسه‌ی اصلی جدید)
    employee_code = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=True)  # ← فیلد جدید
    employment_status = Column(String(20), nullable=False)
    service_location_id = Column(Integer, ForeignKey("service_locations.id", ondelete="SET NULL"), nullable=True)  # ← فیلد جدید: محل خدمت (قدیمی)
    service_location_text = Column(String(255), nullable=True)  # ← فیلد جدید: محل خدمت (متن آزاد از افراد مجاز)
    admin_description = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_editable = Column(Boolean, default=True)

    items = relationship("RequestItem", back_populates="request", cascade="all, delete-orphan")
    service_location = relationship("ServiceLocation")  # ← فیلد جدید: محل خدمت (قدیمی)

class RequestItem(Base):
    __tablename__ = "request_items"
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id", ondelete="CASCADE"))
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    quantity = Column(Integer, nullable=False, default=0)

    request = relationship("Request", back_populates="items")
    product = relationship("Product")

class ServiceLocation(Base):  # ← جدول جدید: محل خدمت
    __tablename__ = "service_locations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuthorizedPerson(Base):  # ← جدول جدید: افراد مجاز به ثبت درخواست
    __tablename__ = "authorized_persons"
    id = Column(Integer, primary_key=True, index=True)
    national_code = Column(String(20), unique=True, nullable=False, index=True)  # کدملی (کلید یکتا برای جایگزینی)
    personnel_code = Column(String(50), nullable=True, index=True)  # کدپرسنلی
    first_name = Column(String(255), nullable=False)  # نام
    last_name = Column(String(255), nullable=False)  # نام خانوادگی
    service_location = Column(String(255), nullable=True)  # محل خدمت (متن آزاد، مستقیم از فایل اکسل)
    service_status = Column(String(100), nullable=True)  # وضعیت خدمت (متن آزاد، مستقیم از فایل اکسل)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    edit_deadline = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
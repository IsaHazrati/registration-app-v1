# ========== مرحله ۱: ساخت فرانت‌اند ==========
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install --network-timeout=600000

COPY frontend/ .

RUN chmod +x node_modules/.bin/craco
RUN npx craco build

# ========== مرحله ۲: ساخت بک‌اند ==========
FROM python:3.11-slim

WORKDIR /app

# کپی وابستگی‌های بک‌اند
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# کپی کد بک‌اند
COPY backend/ .

# ====== کپی فایل‌های build شده از فرانت‌اند ======
COPY --from=frontend-builder /frontend/build /app/static

# ====== ساده‌سازی ساختار پوشه‌های static ======
RUN if [ -d "/app/static/static" ]; then \
        mv /app/static/static/* /app/static/ && \
        rmdir /app/static/static; \
    fi

# ====== ایجاد ادمین در زمان Build حذف شد! ======
# (ادمین در زمان startup با استفاده از @app.on_event ایجاد می‌شود)

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
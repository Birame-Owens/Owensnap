# 🚀 Complete Setup & Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Testing Admin Portal](#testing-admin-portal)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

---

## Prerequisites

### System Requirements
- **Node.js**: v18.0+ (for frontend)
- **Python**: 3.9+ (for backend)
- **PostgreSQL**: 12.0+ (for database)
- **npm**: v9.0+ (for package management)
- **pip**: Latest version (for Python packages)

### Software to Install
- Visual Studio Code (optional, for development)
- Git (for version control)
- PostgreSQL Server
- Postman (optional, for API testing)

---

## Backend Setup

### 1. Install Python Dependencies

```bash
cd photoevent-backend

# Create virtual environment (optional but recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 2. Environment Configuration

Create `.env` file in `photoevent-backend/` directory:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/photoevent
MONGODB_URL=mongodb://localhost:27017

# API Configuration
API_PORT=8000
API_HOST=0.0.0.0

# Security
SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# File Storage
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=50

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Face Recognition
FACE_RECOGNITION_ENABLED=true
FACE_RECOGNITION_MODEL=arcface
```

### 3. Update Configuration

Edit `app/core/config.py` to load from environment:

```python
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/photoevent")
    mongodb_url: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    api_port: int = int(os.getenv("API_PORT", 8000))
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key")
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### 4. Verify Dependencies

Ensure these packages are in `requirements.txt`:
- `fastapi==0.109.0`
- `uvicorn[standard]==0.27.0`
- `sqlalchemy==2.0.25`
- `psycopg2-binary==2.9.9`
- `passlib[bcrypt]==1.7.4`
- `python-jose[cryptography]==3.3.0`

---

## Frontend Setup

### 1. Install Node Dependencies

```bash
cd photoevent-frontend

# Install all packages including Tailwind
npm install

# Should install:
# - tailwindcss
# - postcss
# - autoprefixer
# - (all other existing dependencies)
```

### 2. Environment Configuration

Create `.env` file in `photoevent-frontend/` directory:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_UPLOADS_URL=http://localhost:8000/uploads
```

### 3. Update API Configuration

Update API calls in components if needed:

```typescript
// In admin components, API base is:
const API_BASE = 'http://localhost:8000/api/v1';
```

---

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE photoevent;

# Create admin user (optional)
CREATE USER photoevent_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE photoevent TO photoevent_user;

# Exit
\q
```

### 2. Create Admin Users Table

```bash
# Run the migration script
cd photoevent-backend/scripts

# Using psql
psql -U postgres -d photoevent -f create_admin_table.sql

# Or manually run the SQL commands from the file
```

### 3. Create Default Admin User

The migration script includes a default admin user:
- **Username**: `admin`
- **Password**: `admin123`
- **Hash**: `$2b$12$LQv3c1yqBWVHxkd0LHAkSuNYMhAg82FxBvH5QLX4qGSLnvvI/.PnS`

### 4. Verify Database Connection

```bash
# Test connection
psql -U postgres -d photoevent -c "\dt"

# Should show tables including admin_users
```

### 5. Initialize Other Tables (If Needed)

If not already created, run:
```bash
cd photoevent-backend/scripts
psql -U postgres -d photoevent -f init_postgres.sql
```

---

## Running the Application

### 1. Start Backend Server

```bash
cd photoevent-backend

# Activate virtual environment (if created)
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run the FastAPI server
python main.py

# Or with uvicorn directly:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### 2. Start Frontend Development Server

In a new terminal:
```bash
cd photoevent-frontend

# Start Vite dev server
npm run dev

# Expected output:
#   VITE v5.0.0  ready in 123 ms
#
#   ➜  Local:   http://localhost:5173/
#   ➜  press h to show help
```

### 3. Open Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger UI)
- **Admin Login**: http://localhost:5173/admin/login

---

## Testing Admin Portal

### Step 1: Navigate to Admin Login

Go to: `http://localhost:5173/admin/login`

### Step 2: Enter Credentials

- **Username**: `admin`
- **Password**: `admin123`

### Step 3: Verify Login

- Should redirect to `/admin/dashboard`
- Should see dashboard with stats
- Admin name should display in top bar

### Step 4: Test Features

#### Dashboard
- [ ] Sidebar navigation works
- [ ] Stats cards display correctly
- [ ] Recent events table shows data
- [ ] Responsive on mobile (hamburger menu)

#### Events
- [ ] View all events
- [ ] Create new event
- [ ] Generate event code
- [ ] Edit event details
- [ ] Delete event

#### Photos
- [ ] Select event from dropdown
- [ ] Upload photos (drag-drop or click)
- [ ] View photo grid
- [ ] Delete individual photos
- [ ] See upload progress

#### Statistics
- [ ] View all metrics
- [ ] See photos per event table
- [ ] View upload activity chart
- [ ] See recent uploads
- [ ] Calculate averages

#### Logout
- [ ] Logout button clears tokens
- [ ] Redirects to home page
- [ ] Cannot access admin pages without token

---

## Testing API Endpoints

### Using cURL

```bash
# 1. Admin Login
curl -X POST http://localhost:8000/api/v1/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Response should contain:
# {
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "token_type": "bearer",
#   "expires_in_minutes": 1440,
#   "admin_id": 1,
#   "admin_name": "Administrator"
# }

# 2. Get Dashboard Stats (replace TOKEN with actual token)
curl -X GET http://localhost:8000/api/v1/admin/stats \
  -H "Authorization: Bearer TOKEN"

# 3. List Events
curl -X GET http://localhost:8000/api/v1/events/ \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

1. Open Postman
2. Create new request
3. Set method to POST
4. URL: `http://localhost:8000/api/v1/auth/admin-login`
5. Body (JSON):
```json
{
  "username": "admin",
  "password": "admin123"
}
```
6. Send request
7. Copy `access_token` from response
8. Use token for other requests in Authorization header

---

## Troubleshooting

### Backend Issues

#### Port Already in Use
```bash
# Kill process on port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9
```

#### Database Connection Error
```
Error: could not connect to server: No such file or directory
```
**Solution**:
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists: `psql -l`
- Verify admin_users table exists: `psql -d photoevent -c "\dt"`

#### Module Not Found
```
ModuleNotFoundError: No module named 'sqlalchemy'
```
**Solution**:
- Activate virtual environment
- Run `pip install -r requirements.txt`
- Verify installation: `pip list | grep sqlalchemy`

#### JWT Token Invalid
```
HTTPException: 401 Unauthorized - Token invalid
```
**Solution**:
- Token may have expired (refresh login)
- Check SECRET_KEY matches in backend
- Verify token format: "Bearer {token}"

### Frontend Issues

#### Styles Not Showing (Tailwind)
```
Tailwind CSS classes not being applied
```
**Solution**:
1. Verify Tailwind installed: `npm list tailwindcss`
2. Check `tailwind.config.ts` content paths
3. Verify `src/index.css` has @tailwind directives
4. Restart dev server: `npm run dev`
5. Clear browser cache (Ctrl+Shift+Delete)

#### API Calls Failing
```
Failed to fetch from http://localhost:8000/api/v1/...
```
**Solution**:
- Verify backend is running
- Check CORS configuration
- Check API_BASE_URL in components
- Verify token is being sent
- Check browser console for actual error

#### Port 5173 Already in Use
```bash
# Use different port
npm run dev -- --port 3001

# Or kill process on 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:5173 | xargs kill -9
```

### Database Issues

#### Admin User Not Found
```sql
-- Verify user exists
SELECT * FROM admin_users WHERE username = 'admin';

-- If empty, insert default user
INSERT INTO admin_users (username, password_hash, full_name, is_active) 
VALUES ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkSuNYMhAg82FxBvH5QLX4qGSLnvvI/.PnS', 'Administrator', TRUE);
```

#### Table admin_users Doesn't Exist
```bash
# Run migration script
psql -U postgres -d photoevent -f scripts/create_admin_table.sql

# Verify table created
psql -U postgres -d photoevent -c "\dt admin_users"
```

---

## Production Deployment

### Backend (FastAPI)

#### 1. Prepare for Production

```bash
# Install production server
pip install gunicorn

# Update requirements.txt
pip freeze > requirements.txt
```

#### 2. Create Environment File

```bash
# Create .env.production
cp .env .env.production

# Update with production values:
# - Strong SECRET_KEY
# - Production database URL
# - Production CORS origins
# - Disable debug mode
```

#### 3. Build and Run with Gunicorn

```bash
# Run with Gunicorn (4 workers)
gunicorn -w 4 -b 0.0.0.0:8000 app.main:app

# With file logging
gunicorn -w 4 -b 0.0.0.0:8000 \
  --access-logfile logs/access.log \
  --error-logfile logs/error.log \
  app.main:app
```

#### 4. Using Docker (Optional)

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app/ app/
COPY main.py .

EXPOSE 8000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app.main:app"]
```

### Frontend (React + Vite)

#### 1. Build for Production

```bash
npm run build

# Output in dist/ directory
```

#### 2. Serve Static Files

```bash
# Using Vite preview
npm run preview

# Or deploy dist/ folder to:
# - Vercel
# - Netlify
# - AWS S3 + CloudFront
# - Nginx
# - Apache
```

#### 3. Nginx Configuration (Example)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/photoevent;
    index index.html;

    # Serve static files
    location / {
        try_files $uri /index.html;
    }

    # Proxy API calls
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Authorization $http_authorization;
    }

    # Proxy uploads
    location /uploads/ {
        proxy_pass http://localhost:8000/uploads/;
    }
}
```

#### 4. Environment for Production

Create `photoevent-frontend/.env.production`:
```env
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_UPLOADS_URL=https://yourdomain.com/uploads
```

#### 5. Build with Production Env

```bash
# Vite will use .env.production
npm run build
```

### Database for Production

#### 1. Backup Database

```bash
pg_dump -U photoevent_user -d photoevent > backup.sql
```

#### 2. Set Up Replication/Backup

- Configure automated backups
- Set up point-in-time recovery (PITR)
- Enable WAL archiving
- Monitor database performance

#### 3. Security

```sql
-- Restrict admin user permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO photoevent_user;

-- Create read-only backup user
CREATE USER backup_user WITH PASSWORD 'backup_password';
GRANT CONNECT ON DATABASE photoevent TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

---

## Monitoring & Maintenance

### Check Backend Health

```bash
# API health endpoint
curl http://localhost:8000/health

# API docs
http://localhost:8000/docs
```

### Monitor Logs

```bash
# Backend logs
tail -f logs/error.log
tail -f logs/access.log

# Frontend (browser console)
# Press F12 to open DevTools
```

### Database Maintenance

```bash
# Check database size
psql -U postgres -d photoevent -c "SELECT pg_size_pretty(pg_database_size('photoevent'));"

# Vacuum and analyze
psql -U postgres -d photoevent -c "VACUUM ANALYZE;"

# Check connections
psql -U postgres -d photoevent -c "SELECT * FROM pg_stat_activity;"
```

---

## Quick Start Summary

```bash
# 1. Backend Setup & Run
cd photoevent-backend
pip install -r requirements.txt
psql -U postgres -d photoevent -f scripts/create_admin_table.sql
python main.py

# 2. Frontend Setup & Run (new terminal)
cd photoevent-frontend
npm install
npm run dev

# 3. Access Application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# Admin Login: http://localhost:5173/admin/login
# Username: admin
# Password: admin123
```

---

## Support & Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **SQLAlchemy**: https://www.sqlalchemy.org/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Vite**: https://vitejs.dev/
- **React**: https://react.dev/

For issues or questions, check:
1. Backend logs in terminal
2. Browser DevTools (Ctrl+F12)
3. API response in Network tab
4. Database state with psql

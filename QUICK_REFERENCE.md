# 🎯 Quick Reference - Admin Portal

## 🔑 Default Login Credentials
```
URL: http://localhost:5173/admin/login
Username: admin
Password: admin123
```

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Start Backend
```bash
cd photoevent-backend
python main.py
```
Expected: `INFO: Uvicorn running on http://0.0.0.0:8000`

### Step 2: Start Frontend
```bash
cd photoevent-frontend
npm run dev
```
Expected: `Local: http://localhost:5173/`

### Step 3: Login
Open http://localhost:5173/admin/login
- Username: `admin`
- Password: `admin123`

### Step 4: Explore
- Dashboard with stats
- Create events
- Upload photos
- View analytics

---

## 📋 API Quick Reference

### Login
```bash
POST http://localhost:8000/api/v1/auth/admin-login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in_minutes": 1440,
  "admin_id": 1,
  "admin_name": "Administrator"
}
```

### Get Dashboard Stats
```bash
GET http://localhost:8000/api/v1/admin/stats
Authorization: Bearer {access_token}
```

### List Events
```bash
GET http://localhost:8000/api/v1/events/
Authorization: Bearer {access_token}
```

### Upload Photos
```bash
POST http://localhost:8000/api/v1/photos/upload
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

Files: [photo1.jpg, photo2.jpg, ...]
event_id: {event_id}
```

---

## 🗄️ Database Quick Reference

### Connect to Database
```bash
psql -U postgres -d photoevent
```

### Check Admin Table
```sql
SELECT * FROM admin_users;
```

### Add New Admin User
```sql
INSERT INTO admin_users (username, password_hash, full_name, is_active) 
VALUES ('newadmin', '[bcrypt_hash]', 'Full Name', TRUE);
```

### Generate Bcrypt Hash (Python)
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed = pwd_context.hash("password123")
print(hashed)
```

### Deactivate Admin
```sql
UPDATE admin_users SET is_active = FALSE WHERE username = 'admin';
```

### Delete Admin (Careful!)
```sql
DELETE FROM admin_users WHERE username = 'admin';
```

---

## 📂 File Structure Reference

### Backend
```
photoevent-backend/
├── app/
│   ├── api/
│   │   ├── auth.py          ← Auth endpoints
│   │   ├── events.py        ← Event endpoints
│   │   └── photos.py        ← Photo endpoints
│   ├── db/
│   │   └── models.py        ← Admin model
│   └── core/
│       └── config.py        ← Settings
├── scripts/
│   └── create_admin_table.sql  ← Admin table
├── main.py                  ← Entry point
└── requirements.txt         ← Dependencies
```

### Frontend
```
photoevent-frontend/
├── src/
│   ├── pages/
│   │   ├── AdminLogin.tsx          ← Login
│   │   ├── AdminDashboard.tsx      ← Dashboard
│   │   ├── AdminPhotos.tsx         ← Photo manager
│   │   ├── AdminEvents.tsx         ← Event manager
│   │   └── AdminStatistics.tsx     ← Analytics
│   ├── App.tsx              ← Router
│   ├── index.css            ← Tailwind directives
│   └── main.tsx             ← Entry point
├── tailwind.config.ts       ← Tailwind config
├── postcss.config.js        ← PostCSS config
├── vite.config.ts           ← Vite config
└── package.json             ← Dependencies
```

---

## 🔍 Debugging Tips

### Backend Logs
```bash
# Check API running
curl http://localhost:8000/docs  # Should show Swagger UI

# Check specific endpoint
curl -X POST http://localhost:8000/api/v1/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Frontend Console
```javascript
// In browser DevTools console:

// Check token
localStorage.getItem('admin_token')

// Check admin info
localStorage.getItem('admin_id')
localStorage.getItem('admin_name')

// Clear all tokens
localStorage.removeItem('admin_token')
localStorage.removeItem('admin_id')
localStorage.removeItem('admin_name')
```

### Database Check
```bash
# Login to database
psql -U postgres -d photoevent

# Check tables
\dt

# Check admin users
SELECT id, username, full_name, is_active FROM admin_users;

# Check admin specific user
SELECT * FROM admin_users WHERE username='admin' \g

# Exit
\q
```

---

## ⚙️ Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/photoevent
MONGODB_URL=mongodb://localhost:27017
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_UPLOADS_URL=http://localhost:8000/uploads
```

---

## 🎨 Tailwind CSS Cheat Sheet

### Responsive Grid
```jsx
// 1 col (mobile) → 2 cols (tablet) → 4 cols (desktop)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

### Flex Layouts
```jsx
// Horizontal with gap
<div className="flex gap-4">

// Vertical (column) with gap
<div className="flex flex-col gap-4">

// Center content
<div className="flex items-center justify-center">
```

### Common Classes
- Spacing: `p-4`, `m-4`, `gap-4`, `px-6 py-3`
- Text: `text-lg`, `font-bold`, `text-gray-700`
- Backgrounds: `bg-blue-600`, `bg-gray-100`
- Borders: `border`, `border-gray-300`, `rounded-lg`
- Shadows: `shadow`, `shadow-lg`, `shadow-2xl`
- Display: `block`, `hidden`, `flex`, `grid`
- Colors: `text-blue-600`, `bg-blue-50`
- Sizing: `w-full`, `h-64`, `min-h-screen`

---

## 🔒 Security Checklist

- [ ] Change default admin password in production
- [ ] Use strong SECRET_KEY in production
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly for production domain
- [ ] Set up database backups
- [ ] Enable database password on PostgreSQL
- [ ] Use environment variables for sensitive data
- [ ] Implement rate limiting on login endpoint
- [ ] Set up logging and monitoring
- [ ] Regular security updates

---

## 📞 Common Issues & Solutions

### Issue: "CORS error" when calling API
**Solution**: 
```python
# In app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: "Token invalid" on admin pages
**Solution**: 
```javascript
// Check localStorage
localStorage.getItem('admin_token')  // Should exist
// Re-login if expired
```

### Issue: Tailwind CSS not showing
**Solution**:
```bash
# Restart dev server
# npm run dev

# Or clear cache
rm -rf node_modules
npm install
npm run dev
```

### Issue: "Database connection refused"
**Solution**:
```bash
# Check PostgreSQL running
sudo service postgresql status

# Or check if already running on port 5432
netstat -an | grep 5432
```

---

## 📊 Performance Notes

### Frontend
- Tailwind builds only used styles (~30KB production)
- React chunks split per route
- No unnecessary re-renders with proper state management

### Backend
- JWT validation without database hit (except first login)
- Index on `username` for fast lookups
- Async operations where possible

### Database
- Simple schema with proper indexes
- Minimal queries per request
- Consider pagination for large tables

---

## 🚀 Production Checklist

### Code
- [ ] Remove console.log statements
- [ ] Update API_BASE URL to production
- [ ] Test all features in production mode
- [ ] Check error handling
- [ ] Verify security measures

### Environment
- [ ] Set production environment variables
- [ ] Configure production database
- [ ] Set strong SECRET_KEY
- [ ] Enable HTTPS
- [ ] Set proper CORS origins

### Deployment
- [ ] Build frontend: `npm run build`
- [ ] Deploy to hosting (Vercel, Netlify, etc.)
- [ ] Deploy backend with Gunicorn/Waitress
- [ ] Set up database backups
- [ ] Configure monitoring/logging

### Testing
- [ ] Test login with production credentials
- [ ] Test all admin functions
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] Verify database persistence

---

## 📱 Mobile Responsive Testing

### Chrome DevTools
1. Press `F12` to open DevTools
2. Click device icon (top-left) or `Ctrl+Shift+M`
3. Select device type: iPhone, iPad, etc.
4. Test all pages and interactions

### Test Widths
- Mobile: 375px (iPhone)
- Tablet: 768px (iPad)
- Desktop: 1024px+ (Desktop)

---

## 💾 Backup & Recovery

### Database Backup
```bash
pg_dump -U postgres photoevent > backup.sql
```

### Database Restore
```bash
psql -U postgres photoevent < backup.sql
```

### Code Backup
```bash
git init
git add .
git commit -m "Initial commit"
```

---

## 📚 Additional Resources

- **FastAPI**: https://fastapi.tiangolo.com
- **Tailwind**: https://tailwindcss.com
- **React**: https://react.dev
- **PostgreSQL**: https://www.postgresql.org/docs
- **Vite**: https://vitejs.dev

---

## ✅ Pre-Launch Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Database migrations run successfully
- [ ] Default admin user exists
- [ ] Login page loads
- [ ] Can login with admin/admin123
- [ ] Dashboard displays correctly
- [ ] Can create events
- [ ] Can upload photos
- [ ] Can view statistics
- [ ] Tailwind styles apply correctly
- [ ] Responsive design works
- [ ] No broken links
- [ ] No console errors
- [ ] No API errors

---

**Ready to launch!** 🎉

If everything checks out, your admin portal is ready for use.

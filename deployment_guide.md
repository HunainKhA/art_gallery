# Hostinger VPS Deployment Guide
This guide outlines the step-by-step process for deploying the decoupled Mainframe Art Gallery platform (FastAPI backend + public React website + admin React dashboard) on a Hostinger VPS under a **single domain/port** (e.g. `yourdomain.com`).

---

## 1. Directory Structure on VPS
Deploy all the build files and servers into `/var/www/html/` (or your preferred web directory) in the following clean structure:

```text
/var/www/html/
├── website/            # Built files from website/dist
├── dashboard/          # Built files from dashboard/dist
├── backend/            # Python backend directory
└── uploads/            # Shared media/image uploads directory
```

---

## 2. Generating Production Builds (Local Machine)
Before uploading, build the React applications locally using production endpoints:

### A. Public Website
1. Go to the `website` directory.
2. Create or edit a `.env` file and set the API production URL:
   ```env
   VITE_API_URL=https://api.yourdomain.com
   ```
   *(Note: If hosting backend and frontend on the same domain, you can use: `VITE_API_URL=/api`)*
3. Run the compiler:
   ```bash
   npm run build
   ```
4. Upload the generated `dist/` directory contents to `/var/www/html/website/` on your VPS.

### B. Admin Dashboard
1. Go to the `dashboard` directory.
2. Create or edit a `.env` file:
   ```env
   VITE_API_URL=https://api.yourdomain.com
   ```
3. Run the compiler:
   ```bash
   npm run build
   ```
4. Upload the generated `dist/` directory contents to `/var/www/html/dashboard/` on your VPS.

---

## 3. Nginx Single-Port / Single-Domain Configuration
On your Hostinger VPS, Nginx acts as the entry router. It will receive requests on port `80` (HTTP) or `443` (HTTPS) and serve the correct folder based on the URL path.

Edit your domain config file (usually located at `/etc/nginx/sites-available/default` or similar):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 1. Route to Public Website (Root)
    location / {
        root /var/www/html/website;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 2. Route to Admin Dashboard (/mfadashboard)
    location /mfadashboard {
        alias /var/www/html/dashboard;
        index index.html;
        try_files $uri $uri/ /mfadashboard/index.html;
    }

    # 3. Route to Python FastAPI Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 4. Route to Shared Uploads Directory
    location /uploads {
        alias /var/www/html/uploads;
        autoindex off;
        expires 30d;
    }
}
```

---

## 4. Setting up Python FastAPI Backend on VPS
To keep the Python server running permanently in the background:

1. Install requirements and packages on your VPS:
   ```bash
   cd /var/www/html/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. Create your `.env` file inside `/var/www/html/backend/.env`:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=YourSecureDBPassword
   DB_NAME=mf_db
   DB_PORT=3306
   UPLOAD_DIR=/var/www/html/uploads
   ALLOWED_ORIGINS=https://yourdomain.com
   ```
3. Use **PM2** or **systemd** to run uvicorn permanently:
   ```bash
   # Install PM2 globally
   npm install -g pm2
   
   # Start python backend
   pm2 start "venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000" --name "mainframe-backend"
   
   # Save list to reboot automatically
   pm2 save
   pm2 startup
   ```

Now your system will run forever, and both website and dashboard will be available on the **exact same domain and port**!

---

## 5. Safe Database Migration (Zero Data Loss)
To migrate your local MySQL database to the Hostinger VPS production server safely without losing any existing/old records:

### Step 1: Export Old Database (Backup)
Before doing anything, create a complete backup dump of your current local/existing database.
From your local MySQL terminal or Command Prompt, run:
```bash
mysqldump -u root -p mf_db > db_backup.sql
```
*(This creates a `db_backup.sql` containing all your existing artworks, contacts, categories, and inventory data safely.)*

### Step 2: Import Backup to Hostinger VPS Database
On your Hostinger VPS, create a fresh database (e.g., `mf_db`).
Import your backup file to load all the old records:
```bash
mysql -u root -p mf_db < db_backup.sql
```

### Step 3: Run Upgrade Additions (New Tables Only)
Run the upgrade scripts to create the newly added tables for the pricing calculator and order tracking.
Since these tables are new, they will **NOT** delete or affect any of your old records!

Run the SQL scripts in this exact order on your VPS database:
1. Run [create_sheet_sizes_table.sql](file:///d:/art_gallery/database/create_sheet_sizes_table.sql)
2. Run [create_additional_tables.sql](file:///d:/art_gallery/database/create_additional_tables.sql)

> [!CAUTION]
> In `create_additional_tables.sql`, the script contains `DROP TABLE IF EXISTS` for order tables. If you are running this migration for the first time on a fresh install, it is perfectly safe. However, **never run this file again after you have started receiving real orders on production**, or it will clear your production orders! Remove the `DROP TABLE` lines from the script for safety if you run it on a database that already has orders.


![Vocean Technologies](Voceantechnologies.png)

# YStudy Backend 

A secure, high-performance Node.js backend powering the yStudy platform. Built with a robust MVC architecture, this backend securely handles file uploads, chunk processing, encrypted SEO metadata, role-based access control, and strict user session timeouts.

## 🚀 Features

- **Robust Architecture**: Built with `routing-controllers`, enabling clean, declarative class-based endpoints.
- **Advanced File Uploads**: Chunked, resumable multipart uploads, backed by an asynchronous background task queue (`UploadQueue.ts`) so large files never block the main thread.
- **Role-Based Security**: Centralized `AdminMiddleware.ts` validating roles and issuing secure, stateless JWT tokens.
- **Active Idle Timeouts**: Deep tracking of user inactivity limits (configurable via `.env`), aggressively logging out idle sessions.
- **Edge Cryptography**: Intercepting middleware natively encrypts and decrypts sensitive JSON payloads (like SEO metadata) automatically before they reach the controller.
- **Bulletproof Error Logging**: Comprehensive `try/catch` boundaries natively tied to our custom `logger`, ensuring errors always note their exact module/method origin.

---

## 🛠️ Technology Stack
- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express + routing-controllers
- **Database**: MongoDB (via native `mongodb` driver with a custom `QueryBuilder`)
- **Authentication**: Stateless JSON Web Tokens (JWT)
- **Encryption**: AES-256-CBC natively backed by the Node.js `crypto` module.

---

## 💻 Local Setup (Development)

Follow these steps to spin up the server on your local machine.

### 1. Prerequisites
- Node.js (v18+)
- MongoDB running locally on `localhost:27017`

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/nodejs-ystudy-backend.git
cd nodejs-ystudy-backend

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```
Edit the `.env` file to match your local setup:
```env
PORT=4000
TIMEZONE=Asia/Kolkata
LOG_LEVEL=info
CRYPTO_SECRET_KEY=9318cd9b582062e4723131d497581c5965b29365c0c495a0d17076d48df8354d
MONGO_URI=mongodb://localhost:27017/ystudy
JWT_SECRET=78528cbfeb98939bf80b3d05557ab629c6c3f6297771414909c2f5d86bdeffd778b06d6c0a2800b84c51a8b43d104724f06728b99d5659cfd05679a202232f78
IDLE_TIMEOUT_MS=1800000 # 30 min
JWT_EXPIRES_IN_MS=7200000 # 2 hours
```

**👉 Generate CRYPTO_SECRET_KEY AND JWT_SECRET using:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run database seeders (optional):**
```bash
npm run seed
```

### 5. Running the Server
```bash
# Starts the backend in development mode with auto-reloading
npm run dev
```

---

## 🌐 Production Setup (Server)

Follow these steps to deploy the application to a live production Linux server.

### 1. Prerequisites
- Node.js (v18+) installed on the server.
- PM2 installed globally (`npm install -g pm2`).
- A production-ready MongoDB instance.

### 2. Installation & Build
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Build the TypeScript source code
npm run build
```

### 3. Environment Configuration
Ensure your production `.env` is securely created at the root of the project.
**CRITICAL**: Rotate your `CRYPTO_SECRET_KEY` and `JWT_SECRET` in production! Do not use development keys.

### 4. Running via PM2
PM2 ensures the server restarts automatically on crashes or server reboots.
```bash
# Start the production build using PM2
pm2 start dist/app.js --name "ystudy-backend"

# Save the PM2 process list to auto-start on server reboot
pm2 save
pm2 startup
```

### 5. Managing the Server
```bash
# View live logs
pm2 logs ystudy-backend

# Restart the server
pm2 restart ystudy-backend
```

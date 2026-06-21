<p align="center">
  <img src="./Voceantechnologies.png" alt="Vocean Technologies" width="500"/>
</p>

# nodejs-ystudy-backend
## 🚀 Node.js Encryption API Server & Scalable Media Uploader

This project is a comprehensive Node.js + Express + TypeScript backend. It features an automatic encryption/decryption layer and a highly scalable, robust Media Upload Module supporting chunked file uploads, local persistence, and background queue processing.

### 📦 Tech Stack
- Node.js
- Express.js
- TypeScript
- routing-controllers
- multer
- Crypto (AES-256-CBC)
- pm2 (for production)

---

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd nodejs-ystudy-backend
```

### 2. Environment Variables
Create a `.env` file in the root:
```env
PORT=4000
CRYPTO_SECRET_KEY=your_64_char_hex_key_here
TIMEZONE=Asia/Kolkata
LOG_LEVEL=info
JWT_SECRET=xxxx
MONGO_URI=xxxx
```
*(Tip: Generate secrets using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)*

---

## 💻 Local Development Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Run database seeders (optional):**
```bash
npm run seed
```

3. **Start the Development Server:**
```bash
npm run dev
```
*(The server will run on `http://localhost:4000` with hot-reloading enabled)*

---

## 🌍 Production Server Setup (PM2)

For production, the application should be compiled to JavaScript and managed by **PM2** to ensure it runs continuously and restarts automatically on failure.

1. **Install dependencies:**
```bash
npm install
```

2. **Install PM2 globally (if not already installed):**
```bash
npm install -g pm2
```

3. **Build the TypeScript code:**
```bash
npm run build
```

4. **Start the server with PM2:**
```bash
pm2 start dist/index.js --name "ystudy-backend"
```

5. **Useful PM2 Commands:**
- `pm2 status` - View running processes
- `pm2 logs ystudy-backend` - View live logs
- `pm2 restart ystudy-backend` - Restart the server
- `pm2 stop ystudy-backend` - Stop the server
- `pm2 save` - Save the PM2 process list to auto-start on server boot

---

## 📤 Scalable Media Upload Module

A state-of-the-art chunked uploading system that handles massive files gracefully.

### Features
- **Chunked Uploads:** Receives sliced files to prevent server memory overload.
- **In-Memory Queue System:** An efficient, event-driven internal queue (`UploadQueue`) that processes files asynchronously in the background.

### API Endpoints
Managed by `ImageController` (`/api/upload`):
- `POST /init` - Initialize an upload session
- `POST /chunk/:uploadId` - Receive chunk buffers sequentially
- `POST /complete/:uploadId` - Assembles chunks and delegates to the internal background queue
- `GET /status/:uploadId` - Poll status (uploading -> processing -> completed)
- `POST /pause/:uploadId`
- `POST /resume/:uploadId`
- `POST /cancel/:uploadId` - Cleans up partial files safely from the local `uploads` directory

---

## 🔐 Encryption System

✅ **Incoming Request**
If a request body contains `{"data": "ENCRYPTED_STRING"}`, it will be automatically decrypted by the built-in middleware.

✅ **Outgoing Response**
All responses are automatically wrapped and encrypted.

✅ **Raw Decrypt API (No Middleware)**
`POST /api/raw-decrypt` - Decrypt data manually (used for testing/debugging).

---

## 👨‍💻 Author
Ashish Sitaram Panicker / Vocean Technologies

## 📜 License
MIT License

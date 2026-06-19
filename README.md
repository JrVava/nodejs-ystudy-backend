# nodejs-ystudy-backend
## 🚀 Node.js Encryption API Server
### This project is a Node.js + Express + TypeScript API with:
```
•	🔐 Automatic request decryption
•	🔐 Automatic response encryption
•	⚡ Raw decrypt API for testing
•	🧩 Routing using routing-controllers
```

### 📦 Tech Stack
```
•	Node.js
•	Express.js
•	TypeScript
•	routing-controllers
•	Crypto (AES-256-CBC)
```

### ⚙️ Setup Instructions
1. Clone the Repository
```
git clone <your-repo-url>cd <project-folder>
```

2. Install Dependencies
npm install

3. Create .env File
Create a .env file in the root:
```
PORT=4000
CRYPTO_SECRET_KEY=your_64_char_hex_key_here
TIMEZONE=Asia/Kolkata
LOG_LEVEL=info
```
**👉 Generate CRYPTO_SECRET_KEY using:**
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Run the Project
Development
```
npm run dev
Production
npm run buildnpm start
```
🌐 Base URL
http://localhost:3000

🔐 How Encryption Works
✅ Incoming Request
If request body contains:
```
{  "data": "ENCRYPTED_STRING"}
```
👉 It will be automatically decrypted by middleware.

✅ Outgoing Response
All responses are automatically wrapped:
```
{  "data": "ENCRYPTED_RESPONSE"}
```

### 📡 API Endpoints

✅ 1. Test API

GET /api/test

Description: Basic test endpoint

Response (Encrypted)
```
{  "data": "ENCRYPTED_STRING"}
```

✅ 2. Raw Decrypt API (No Middleware)

POST /api/raw-decrypt

Description: Decrypt data manually (used for testing/debugging)

Request:
```
{  "data": "ENCRYPTED_STRING"}
```

**Response:
{  "success": true,  "decrypted": {    "your": "original data"  }}**

✅ 3. Server Status
GET /server-status
{  "status": "OK"}

✅ 4. Download Logs
GET /download
Downloads server log file.

⚠️ Important Notes
```
•	Encryption Algorithm: AES-256-CBC
•	Secret key must be 64 hex characters
•	IV is currently static (for testing only)
```
🔥 Future Improvements
```
•	🔐 Random IV for better security
•	🔁 Frontend auto encrypt/decrypt
•	⚡ Axios interceptor support
•	🧠 Role-based encryption
```

👨‍💻 Author
Ashish Sitaram Panicker / Vocean Technologies

📜 License
MIT License

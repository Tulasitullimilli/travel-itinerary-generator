# RoamAI - AI Travel Document Parser & Itinerary Planner

RoamAI is a MERN-based travel planning web application. It parses travel documents (tickets, hotel check-ins, transit receipts) using AI, extracts core parameters, and arranges them into an interactive, shareable, day-by-day travel itinerary.

---

## ✨ Features

- **JWT Authentication**: User registration and login flows.
- **Multimodal AI Parser**: Uses Google Gemini API (`gemini-1.5-flash`) to read text from PDFs and visual parameters from images.
- **Smart Mock Fallback (Demo Mode)**: Full functionality out of the box without API keys. It matches keywords (destination names, document types) and formats high-fidelity multi-day trip templates.
- **Timeline Editor**: Add, edit, or remove itinerary activities directly from the dashboard.
- **Public Share View**: Creates unique shareable links (`/share/:shareId`) for anyone to read. Optimizes print styling (`@media print`) for clean physical/PDF printing.
- **Trip Cloning**: Allows guests reading a shared trip to import/clone it directly into their logged-in accounts.
- **API Key Configuration**: Enter a custom Gemini API Key in the settings panel to switch from Demo Mode to Live AI.

---

## 📁 Directory Structure

```text
travel-itinerary-generator/
├── backend/
│   ├── src/
│   │   ├── config/             # DB Connection (Mongoose)
│   │   ├── controllers/        # Express handlers (auth, itinerary, uploads)
│   │   ├── middleware/         # Token authorization, Multer configs
│   │   ├── models/             # User and Itinerary Mongoose models
│   │   ├── routes/             # Route configurations
│   │   └── services/           # Gemini API integrations and Mock fallbacks
│   ├── uploads/                # Temp upload storage
│   ├── .env.example
│   ├── server.js               # Express entrypoint
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/         # Reusable components
    │   ├── context/            # AuthContext session hook
    │   ├── pages/              # Login, Register, Dashboard, ShareView
    │   ├── services/           # Axios HTTP client
    │   ├── App.jsx             # React router configuration
    │   ├── index.css           # Tailwind v4 import
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://localhost:27017`

### 1. Start the Backend
1. Go to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create your `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
3. Set your environment variables (optional: add `GEMINI_API_KEY` for live AI):
   ```text
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/travel-itinerary-generator
   JWT_SECRET=super_secret_key_12345
   GEMINI_API_KEY=
   ```
4. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```

### 2. Start the Frontend
1. Go to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the Vite React app:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173/`.

# RiskLens: AI Privacy Risk Analysis System

A modern, responsive frontend web application for analyzing privacy risks in AI inputs and documents.

## Project Structure
- **frontend/**: React + Vite web application source code.
- **backend/**: Placeholder for backend API services.
- **mlmodel/**: Placeholder for Machine Learning model files.

## Getting Started

To run RiskLens locally, you must run **both** the backend and the frontend in separate terminal windows.

### 1. Backend Setup (FastAPI & ML Core)
The backend expects Python 3.8+ and handles our Machine Learning pipeline.

**Note for Mac Users:** Always use `python3` instead of `python`!

```bash
# Open your first Terminal window
cd RiskLens/backend

# (Optional but Recommended) Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install the Python dependencies
pip install -r requirements.txt

# Start the server
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*If everything worked, you should see `Uvicorn running on http://127.0.0.1:8000`.*

> **IMPORTANT:** Because GitHub limits file sizes, the `risklens_enron_generalized` folder (250MB) is ignored. You must manually copy that model folder into the `backend/` directory from an external source before starting the Python server!
> You also need an active `GEMINI_API_KEY` defined inside `backend/.env`.

### 2. Frontend Setup (React & Vite)
The frontend requires Node.js (v18+) and npm.

```bash
# Open a completely NEW Terminal window
cd RiskLens/frontend

# Install node dependencies
npm install

# Start the React development server
npm run dev
```

### 3. Open the App
Go to your browser and open `http://localhost:5173`. 
The frontend will intelligently route all `/api/` traffic automatically to your Python server!

## Features
- **Privacy Risk Scan:** DistilBERT model inference for PII.
- **Explainable AI (XAI):** LIME feature scoring on inputs.
- **AI Chatbot:** Gemini-powered interactive assistant layer.
- **Firebase Persistence:** Live reports and history dashboard.

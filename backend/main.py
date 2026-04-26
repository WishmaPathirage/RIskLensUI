from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
from explainers import (
    hybrid_explain_with_recommendation,
    generate_lime_explanation,
    calculate_risk_score
)

app = FastAPI(title="RiskLens ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

    
class ScanRequest(BaseModel):
    type: str
    content: str

@app.post("/api/scan")
async def scan_risk(request: ScanRequest):
    if not request.content.strip():
        return {"riskScore": 0, "riskLevel": "Low", "confidence": 0, "explanations": ["No text provided"]}

    # Core XAI Pipeline
    xai_result = hybrid_explain_with_recommendation(request.content)
    
    # LIME Explanation
    lime_features = generate_lime_explanation(request.content)
    
    # Construct response based on Notebook models specific LEAK logic
    risk_score = calculate_risk_score(
        text=request.content,
        leak_probability=xai_result["leak_probability"],
        entities=xai_result["detected_entities"]
    )

    if risk_score >= 70:
        risk_level = "High"
    elif risk_score >= 40:
        risk_level = "Medium"
    else:
        risk_level = "Low"
    
    return {
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "confidence": int(xai_result["prediction_probability"] * 100),
        "explanation": xai_result["explanation"],
        "detectedEntities": xai_result["detected_entities"],
        "topImportantWords": xai_result["top_important_words"],
        "limeFeatures": lime_features,
        "recommendations": xai_result["recommendations"]
    }

class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    if not os.getenv("GEMINI_API_KEY"):
        return {"response": "Error: Gemini API key not configured on the server."}
    
    sys_prompt = "You are an intelligent privacy risk assistant for the RiskLens application. Provide clear, educational privacy advice without hallucinating strict legal mandates."
    if request.context:
        # Provide the scan results to Gemini to make it context-aware
        sys_prompt += f"\n\nThe user is asking about their recent text scan. Scan Result Context: Risk Score: {request.context.get('riskScore')}/100, Entities Detected: {request.context.get('detectedEntities', [])}. Model explanation: {request.context.get('explanation')}. Use this to inform your answers gently!"
        
    try:
        model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=sys_prompt)
        response = model.generate_content(request.message)
        return {"response": response.text}
    except Exception as e:
        return {"response": f"Sorry, there was an error processing your request with the AI: {str(e)}"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv
import google.generativeai as genai
import asyncio

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

    # Artificial delay to simulate deep scanning (20 seconds)
    await asyncio.sleep(20)

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
    
    # Domain-Specific Guardrail Filter
    ALLOWED_KEYWORDS = [
        "risklens", "privacy", "leak", "no_leak", "sensitive", "threat"
        "email", "phone", "nic", "id", "risk", "score", "scam", "identity" "bank card"
        "probability", "explanation", "xai", "detected", "card number"
        "entity", "scan", "data", "personal information",
        "hi", "hello", "hey" # Include basic greetings so it doesn't instantly block hello
    ]
    
    # If the user doesn't use a keyword, reject before it even hits the LLM
    user_msg_lower = request.message.lower()
    has_keyword = any(keyword in user_msg_lower for keyword in ALLOWED_KEYWORDS)
    
    if not has_keyword:
        return {"response": "I can only answer questions related to the RiskLens privacy risk analysis system."}
    
    # Strict System Prompt
    sys_prompt = "You are the RiskLens Assistant. You only answer questions related to the RiskLens project, privacy leak detection, detected sensitive entities, risk scores, explainable AI outputs, and safe privacy awareness. Do not answer unrelated questions such as general knowledge, coding unrelated to RiskLens, entertainment, personal advice, politics, or academic topics outside this project. If the user asks an unrelated question, politely respond: 'I can only answer questions related to the RiskLens privacy risk analysis system.' Keep answers short, simple, and user-friendly."
    
    if request.context:
        # Provide the scan results to Gemini to make it context-aware
        sys_prompt += f"\n\nContext for the current user's scan: Risk Score: {request.context.get('riskScore')}/100, Entities Detected: {request.context.get('detectedEntities', [])}. Explainability output: {request.context.get('explanation')}. Provide analysis based STRICTLY on this."
        
    try:
        model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=sys_prompt)
        response = model.generate_content(request.message)
        return {"response": response.text}
    except Exception as e:
        return {"response": f"Sorry, there was an error processing your request with the AI: {str(e)}"}

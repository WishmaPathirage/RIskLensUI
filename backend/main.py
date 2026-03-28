from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

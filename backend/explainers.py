import re
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from lime.lime_text import LimeTextExplainer

MODEL_DIR = "./risklens_enron_generalized"
device = torch.device("cpu") # ensure cpu mode for stability unless explicitly needed

print("Initializing Tokenizer and Model with attention output...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_DIR,
    local_files_only=True,
    output_attentions=True
)
model.to(device)
model.eval()

STOPWORDS = {
    "and", "is", "my", "the", "a", "an", "of", "to", "for", "at", "in", "on",
    "are", "was", "were", "be", "been", "being", "let", "pm", "am", "it", "this"
}

PHONE_RE = re.compile(r"\b(?:\+?\d{1,3}[- ]?)?(?:\d{10}|\d{3}[- ]\d{3}[- ]\d{4})\b")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
CARD_RE  = re.compile(r"\b(?:\d[ -]*?){13,19}\b")
BANK_RE  = re.compile(r"\b(account|acct|iban|swift|routing|bank)\b", re.IGNORECASE)
ADDR_RE  = re.compile(r"\b\d{1,5}\s+\w+(?:\s+\w+){0,4}\s+(street|st|road|rd|ave|avenue|lane|ln|blvd|drive|dr)\b", re.IGNORECASE)
ID_RE    = re.compile(r"\b(?:\d{12}|ssn|nic|passport|national id)\b", re.IGNORECASE)

ENTITY_MAP = {
    "ID_INFO": "ID Information",
    "BANK_INFO": "Bank Information",
    "EMAIL": "Email Address",
    "PHONE": "Phone Number",
    "ADDRESS": "Address",
    "CARD_NUMBER": "Card Number"
}

def detect_sensitive_entities_refined(text):
    entities = []
    if ID_RE.search(text): entities.append("ID_INFO")
    if EMAIL_RE.search(text): entities.append("EMAIL")
    if BANK_RE.search(text): entities.append("BANK_INFO")
    if ADDR_RE.search(text): entities.append("ADDRESS")
    if CARD_RE.search(text): entities.append("CARD_NUMBER")
    if PHONE_RE.search(text) and "ID_INFO" not in entities: entities.append("PHONE")
    return entities

def explain_prediction_refined(text, max_length=256, top_k=10):
    inputs = tokenizer(
        text, return_tensors="pt", truncation=True, padding="max_length", max_length=max_length
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs, output_attentions=True)

    logits = outputs.logits
    probs = torch.softmax(logits, dim=1)[0]

    pred_idx = int(torch.argmax(probs).item())
    pred_label = "LEAK" if pred_idx == 1 else "NO_LEAK"
    pred_prob = float(probs[pred_idx].item())
    leak_prob = float(probs[1].item())

    top_words = []
    if hasattr(outputs, 'attentions') and outputs.attentions is not None:
        last_attn = outputs.attentions[-1][0]
        mean_attn = last_attn.mean(dim=0)
        cls_attention = mean_attn[0].detach().cpu().numpy()

        input_ids = inputs["input_ids"][0].detach().cpu().tolist()
        tokens = tokenizer.convert_ids_to_tokens(input_ids)

        words = []
        current_word = ""
        current_score = 0

        for tok, score in zip(tokens, cls_attention):
            if tok in tokenizer.all_special_tokens or tok == "[PAD]": continue
            if tok.startswith("##"):
                current_word += tok[2:]
                current_score = max(current_score, score)
            else:
                if current_word: words.append((current_word, current_score))
                current_word = tok
                current_score = score
        if current_word: words.append((current_word, current_score))

        cleaned = []
        seen = set()
        for w, s in words:
            w = w.lower().strip()
            if len(w) < 2 or w in STOPWORDS or w.isdigit() or w in seen: continue
            seen.add(w)
            cleaned.append((w, float(s)))

        cleaned = sorted(cleaned, key=lambda x: x[1], reverse=True)
        top_words = cleaned[:top_k]

    raw_entities = detect_sensitive_entities_refined(text)
    entities = [ENTITY_MAP.get(e, e) for e in raw_entities]

    reasons = []
    if entities: reasons.append("Explicit sensitive patterns detected: " + ", ".join(entities))
    if top_words: reasons.append("Model focused on words like: " + ", ".join([w for w, _ in top_words[:5]]))

    explanation = f"Text is classified as {pred_label} with probability {abs(pred_prob):.2f}."
    if reasons: explanation += " Reasons: " + " | ".join(reasons)

    return {
        "text": text, "prediction": pred_label, "prediction_probability": pred_prob,
        "leak_probability": leak_prob, "detected_entities": entities,
        "top_important_words": top_words, "explanation": explanation
    }

def generate_recommendations(prediction, entities, text):
    recommendations = []
    if prediction == "NO_LEAK":
        recommendations.append("No critical privacy risk detected. Review the text once before sharing.")
        return recommendations

    if "PHONE" in entities: recommendations.append("Mask or remove the phone number before sharing.")
    if "EMAIL" in entities: recommendations.append("Replace the personal email address with a placeholder or generic contact.")
    if "BANK_INFO" in entities: recommendations.append("Avoid sharing banking or account-related information in plain text.")
    if "ID_INFO" in entities: recommendations.append("Remove or partially mask national ID, NIC, passport, or similar identifiers.")
    if "ADDRESS" in entities: recommendations.append("Avoid sharing exact address details unless absolutely necessary.")
    if "CARD_NUMBER" in entities: recommendations.append("Do not share card-like numbers in unprotected text.")

    if not entities:
        recommendations.append("Review the text and remove any personal or sensitive information before sharing.")
        recommendations.append("Consider replacing real details with masked or dummy values.")

    return recommendations

def hybrid_explain_with_recommendation(text, top_k=8):
    result = explain_prediction_refined(text, top_k=top_k)
    recommendations = generate_recommendations(result["prediction"], result["detected_entities"], text)
    result["recommendations"] = recommendations
    return result

import math

def calculate_risk_score(text, leak_probability, entities):
    entity_weights = {
        "Phone Number": 18,
        "Email Address": 15,
        "Address": 20,
        "ID Information": 30,
        "Bank Information": 28,
        "Card Number": 35,
    }

    # 1. model contribution
    model_score = leak_probability * 100

    # 2. entity severity contribution
    entity_score = 0
    for ent in entities:
        entity_score += entity_weights.get(ent, 10)
    entity_score = min(entity_score, 100)

    # 3. more sensitive items = more risk
    count_bonus = min(len(entities) * 8, 20)

    # 4. numeric-heavy text bonus
    digit_count = sum(ch.isdigit() for ch in text)
    digit_bonus = min(digit_count * 1.2, 15)

    final_score = (
        0.45 * model_score +
        0.40 * entity_score +
        0.10 * count_bonus +
        0.05 * digit_bonus
    )

    return max(0, min(100, round(final_score)))
# LIME Implementation
def predict_proba_lime(texts):
    enc = tokenizer(texts, truncation=True, padding=True, max_length=256, return_tensors="pt")
    enc = {k: v.to(device) for k, v in enc.items()}
    with torch.no_grad():
        outputs = model(**enc)
        probs = torch.softmax(outputs.logits, dim=1).cpu().numpy()
    return probs


class_names = ["NO_LEAK", "LEAK"]
explainer = LimeTextExplainer(class_names=class_names)

def generate_lime_explanation(text):
    exp = explainer.explain_instance(text, predict_proba_lime, num_features=5, num_samples=150)
    return exp.as_list()

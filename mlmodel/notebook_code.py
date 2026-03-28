# @title 1 - A1
#Cell 1

# Only install what's missing, don't touch torch/torchvision
!pip uninstall -y fastai
!pip install -q transformers==4.46.3 datasets evaluate scikit-learn accelerate seaborn

import os
os.kill(os.getpid(), 9)

# @title 3 - B1
from datasets import load_dataset, Dataset
import random

ds_stream = load_dataset("SALT-NLP/search_privacy_risk", split="test", streaming=True)

rows = []
MAX_DIALOGS = 3000
count_dialogs = 0

for ex in ds_stream:
    group_id = f"{ex['example_id']}_{ex['log_id']}"   # keep one convo together
    history = ex["eval"]["history"]

    for h in history:
        details = h.get("details") or {}
        body = details.get("body")

        evaluation = h.get("evaluation") or {}
        label = evaluation.get("label")

        if not body:
            continue

        y = 1 if label == "LEAK" else 0
        rows.append({"text": body, "label": y, "group_id": group_id})

    count_dialogs += 1
    if count_dialogs >= MAX_DIALOGS:
        break

ds_all = Dataset.from_list(rows).shuffle(seed=42)
print(ds_all)
print("Leak count:", sum(ds_all["label"]), "Total:", len(ds_all))


# @title 4 - B2
groups = list(set(ds_all["group_id"]))
random.seed(42)
random.shuffle(groups)

n = len(groups)
train_groups = set(groups[: int(0.8 * n)])
val_groups   = set(groups[int(0.8 * n): int(0.9 * n)])
test_groups  = set(groups[int(0.9 * n):])

def in_groups(example, group_set):
    return example["group_id"] in group_set

ds_train = ds_all.filter(lambda x: in_groups(x, train_groups))
ds_val   = ds_all.filter(lambda x: in_groups(x, val_groups))
ds_test  = ds_all.filter(lambda x: in_groups(x, test_groups))

print("Train:", len(ds_train), "Val:", len(ds_val), "Test:", len(ds_test))
print("Train leak:", sum(ds_train["label"]), "Val leak:", sum(ds_val["label"]), "Test leak:", sum(ds_test["label"]))


# @title 5 - B3
import numpy as np
import torch
import evaluate
from collections import Counter
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer, EarlyStoppingCallback

tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")

def tok(batch):
    return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=256)

train_tok = ds_train.map(tok, batched=True)
val_tok   = ds_val.map(tok, batched=True)
test_tok  = ds_test.map(tok, batched=True)


train_tok = train_tok.rename_column("label", "labels")
val_tok   = val_tok.rename_column("label", "labels")
test_tok  = test_tok.rename_column("label", "labels")

cols = ["input_ids", "attention_mask", "labels"]
train_tok.set_format(type="torch", columns=cols)
val_tok.set_format(type="torch", columns=cols)
test_tok.set_format(type="torch", columns=cols)

# class weights from TRAIN only
y_train = np.array(ds_train["label"])
counts = Counter(y_train)
neg, pos = counts.get(0, 0), counts.get(1, 0)
w1 = (neg / pos) if pos > 0 else 1.0
class_weights = torch.tensor([1.0, w1], dtype=torch.float)

class WeightedTrainer(Trainer):
    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.get("labels")
        outputs = model(**inputs)
        logits = outputs.get("logits")
        weights = class_weights.to(logits.device)
        loss_fct = torch.nn.CrossEntropyLoss(weight=weights)
        loss = loss_fct(logits.view(-1, model.config.num_labels), labels.view(-1))
        return (loss, outputs) if return_outputs else loss

metric_f1 = evaluate.load("f1")
metric_acc = evaluate.load("accuracy")

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy": metric_acc.compute(predictions=preds, references=labels)["accuracy"],
        "f1": metric_f1.compute(predictions=preds, references=labels)["f1"],
    }

model = AutoModelForSequenceClassification.from_pretrained("distilbert-base-uncased", num_labels=2)

args = TrainingArguments(
    output_dir="risklens_ft",
    eval_strategy="epoch",
    save_strategy="epoch",
    num_train_epochs=5,
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    weight_decay=0.01,
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    greater_is_better=True,
    report_to="none",
)

trainer = WeightedTrainer(
    model=model,
    args=args,
    train_dataset=train_tok,
    eval_dataset=val_tok,
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=2)]
)

trainer.train()
print("Best validation:", trainer.evaluate())


# @title 6 - B4
import numpy as np
from sklearn.metrics import confusion_matrix, classification_report, precision_recall_curve
import torch

pred = trainer.predict(test_tok)
logits = pred.predictions
y_true = pred.label_ids

probs = torch.softmax(torch.tensor(logits), dim=1).numpy()[:, 1]

precision, recall, thresholds = precision_recall_curve(y_true, probs)
f1_scores = (2 * precision * recall) / (precision + recall + 1e-12)

best_idx = np.argmax(f1_scores)
best_threshold = thresholds[best_idx] if best_idx < len(thresholds) else 0.5

y_pred = (probs >= best_threshold).astype(int)

print("Best threshold:", best_threshold)
print("Best F1:", f1_scores[best_idx])
print("Precision:", precision[best_idx], "Recall:", recall[best_idx])
print("Confusion Matrix:\n", confusion_matrix(y_true, y_pred))
print("\nReport:\n", classification_report(y_true, y_pred, digits=4))
trainer.save_model("risklens_pretrained")
tokenizer.save_pretrained("risklens_pretrained")



# @title 8 - C1
from datasets import load_dataset

enron = load_dataset("SetFit/enron_spam")
print(enron)
print(enron["train"][0].keys())
print(enron["train"][0])


# @title 9 - C2
import re
from datasets import DatasetDict

PHONE_RE = re.compile(r"(\+?\d{1,3}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
CARD_RE  = re.compile(r"\b(?:\d[ -]*?){13,19}\b")  # rough card-like
BANK_RE  = re.compile(r"\b(account|acct|iban|swift|routing)\b", re.IGNORECASE)
ADDR_RE  = re.compile(r"\b\d{1,5}\s+\w+(?:\s+\w+){0,4}\s+(street|st|road|rd|ave|avenue|lane|ln|blvd|drive|dr)\b", re.IGNORECASE)
ID_RE    = re.compile(r"\b(ssn|nic|passport|national id)\b", re.IGNORECASE)

def is_privacy_leak(text: str) -> int:
    if text is None:
        return 0
    t = text.strip()
    if len(t) < 10:
        return 0
    hits = 0
    hits += 1 if PHONE_RE.search(t) else 0
    hits += 1 if EMAIL_RE.search(t) else 0
    hits += 1 if CARD_RE.search(t) else 0
    hits += 1 if BANK_RE.search(t) else 0
    hits += 1 if ADDR_RE.search(t) else 0
    hits += 1 if ID_RE.search(t) else 0
    return 1 if hits >= 1 else 0  # start simple: any hit means leak

def make_privacy_labels(example):
    txt = example.get("text") or example.get("message") or example.get("email") or ""
    return {"text": txt, "label": is_privacy_leak(txt)}

# Apply on both train and test splits if available
splits = {}
for split in enron.keys():
    splits[split] = enron[split].map(make_privacy_labels)

enron_priv = DatasetDict(splits)
print(enron_priv)
print(enron_priv["train"][0])


# @title 10 - C3
from collections import Counter
print("Train label counts:", Counter(enron_priv["train"]["label"]))
if "test" in enron_priv:
    print("Test label counts:", Counter(enron_priv["test"]["label"]))


# @title 11 - C4
from datasets import DatasetDict

# Make validation split from train
tmp = enron_priv["train"].train_test_split(test_size=0.2, seed=42)
train_ds = tmp["train"]
val_ds   = tmp["test"]

# Use existing test if present, otherwise split from remaining
if "test" in enron_priv:
    test_ds = enron_priv["test"]
else:
    test_ds = val_ds

ds = DatasetDict({"train": train_ds, "validation": val_ds, "test": test_ds})
print(ds)


# @title 12 - D1
from transformers import AutoTokenizer, AutoModelForSequenceClassification

BASE_MODEL_DIR = "risklens_pretrained"  # from Cell B4 save

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_DIR, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(BASE_MODEL_DIR, local_files_only=True)

print("Loaded SALT-trained model:", BASE_MODEL_DIR)


# @title 13 - D2
from transformers import AutoTokenizer, AutoModelForSequenceClassification

BASE_MODEL_DIR = "risklens_pretrained"

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_DIR, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(BASE_MODEL_DIR, local_files_only=True)

print("Loaded:", BASE_MODEL_DIR)
print("Labels:", model.config.id2label)


# @title 14 - D3
def tok(batch):
    return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=256)

tokenized = ds.map(tok, batched=True)
tokenized = tokenized.rename_column("label", "labels")
tokenized.set_format(type="torch", columns=["input_ids", "attention_mask", "labels"])
print(tokenized)
print(tokenized["train"][0])


# @title 15 - D4
import numpy as np
import evaluate
from transformers import TrainingArguments, Trainer

acc = evaluate.load("accuracy")
f1  = evaluate.load("f1")

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy": acc.compute(predictions=preds, references=labels)["accuracy"],
        "f1": f1.compute(predictions=preds, references=labels, average="binary")["f1"],
    }

args = TrainingArguments(
    output_dir="risklens_enron_ft",
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    num_train_epochs=5,
    weight_decay=0.01,
    report_to="none"
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=tokenized["train"],
    eval_dataset=tokenized["validation"],
    compute_metrics=compute_metrics,
)

trainer.train()
trainer.evaluate()


# @title 16 - D5
import numpy as np
import torch
from sklearn.metrics import precision_recall_curve, confusion_matrix, classification_report

# 1) Get probs on validation
pred_val = trainer.predict(tokenized["validation"])
logits_val = pred_val.predictions
y_val = pred_val.label_ids

probs_val = torch.softmax(torch.tensor(logits_val), dim=1).numpy()[:, 1]

# 2) Find best threshold by F1
precision, recall, thresholds = precision_recall_curve(y_val, probs_val)
f1_scores = (2 * precision * recall) / (precision + recall + 1e-12)

best_idx = int(np.argmax(f1_scores))
best_threshold = float(thresholds[best_idx]) if best_idx < len(thresholds) else 0.5

print("Best threshold (by F1 on validation):", best_threshold)
print("Best F1:", float(f1_scores[best_idx]))
print("Precision:", float(precision[best_idx]), "Recall:", float(recall[best_idx]))


# @title 17 - D6
# Predict on test
pred_test = trainer.predict(tokenized["test"])
logits_test = pred_test.predictions
y_test = pred_test.label_ids

probs_test = torch.softmax(torch.tensor(logits_test), dim=1).numpy()[:, 1]
y_pred = (probs_test >= best_threshold).astype(int)

cm = confusion_matrix(y_test, y_pred)
print("Confusion Matrix:\n", cm)

print("\nClassification Report:\n")
print(classification_report(y_test, y_pred, digits=4))


# @title 18 - D7
import os, json
from datetime import datetime

SAVE_DIR = "risklens_enron_generalized"
os.makedirs(SAVE_DIR, exist_ok=True)

trainer.model.save_pretrained(SAVE_DIR)
tokenizer.save_pretrained(SAVE_DIR)

meta = {
    "saved_at": datetime.utcnow().isoformat() + "Z",
    "base_model": "distilbert-base-uncased",
    "fine_tuned_on": "SetFit/enron_spam + rule-based privacy labels",
    "best_threshold_val_f1": best_threshold,
    "val_metrics_last": {
        "eval_accuracy": 0.955233291298865,
        "eval_f1": 0.8614634146341463
    },
    "labels": { "0": "NO_LEAK", "1": "LEAK" },
    "notes": "Threshold tuned on validation split using PR curve F1."
}

meta_path = os.path.join(SAVE_DIR, "risklens_meta.json")
with open(meta_path, "w") as f:
    json.dump(meta, f, indent=2)

print("Saved model + tokenizer to:", SAVE_DIR)
print("Saved meta to:", meta_path)


# @title X1 - Load RiskLens model for XAI
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification

MODEL_DIR = "risklens_enron_generalized"   # change if needed

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_DIR,
    local_files_only=True,
    output_attentions=True
)

model.to(device)
model.eval()

print("Loaded model from:", MODEL_DIR)
print("Device:", device)
print("Labels:", model.config.id2label if hasattr(model.config, "id2label") else "No label map found")

# @title X2 - Improved Explain Prediction (clean tokens)
import numpy as np

def explain_prediction(text, max_length=256, top_k=10):
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=max_length
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    logits = outputs.logits
    probs = torch.softmax(logits, dim=1)[0]

    pred_idx = int(torch.argmax(probs).item())
    pred_label = "LEAK" if pred_idx == 1 else "NO_LEAK"
    pred_prob = float(probs[pred_idx].item())
    leak_prob = float(probs[1].item())

    # attention
    attentions = outputs.attentions
    last_attn = attentions[-1][0]
    mean_attn = last_attn.mean(dim=0)

    cls_attention = mean_attn[0].detach().cpu().numpy()

    input_ids = inputs["input_ids"][0].detach().cpu().tolist()
    tokens = tokenizer.convert_ids_to_tokens(input_ids)

    # merge subwords properly
    words = []
    current_word = ""
    current_score = 0

    for tok, score in zip(tokens, cls_attention):
        if tok in tokenizer.all_special_tokens or tok == "[PAD]":
            continue

        if tok.startswith("##"):
            current_word += tok[2:]
            current_score = max(current_score, score)
        else:
            if current_word:
                words.append((current_word, current_score))
            current_word = tok
            current_score = score

    if current_word:
        words.append((current_word, current_score))

    # clean tokens
    cleaned = []
    for w, s in words:
        if len(w.strip()) < 2:
            continue
        if w.isdigit():
            continue
        cleaned.append((w, float(s)))

    # sort by importance
    cleaned = sorted(cleaned, key=lambda x: x[1], reverse=True)

    return {
        "text": text,
        "prediction": pred_label,
        "prediction_probability": pred_prob,
        "leak_probability": leak_prob,
        "top_important_words": cleaned[:top_k]
    }

# @title X6 - Refined Hybrid XAI (fixed attention)
import re
import torch

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

def detect_sensitive_entities_refined(text):
    entities = []

    if ID_RE.search(text):
        entities.append("ID_INFO")
    if EMAIL_RE.search(text):
        entities.append("EMAIL")
    if BANK_RE.search(text):
        entities.append("BANK_INFO")
    if ADDR_RE.search(text):
        entities.append("ADDRESS")
    if CARD_RE.search(text):
        entities.append("CARD_NUMBER")
    if PHONE_RE.search(text) and "ID_INFO" not in entities:
        entities.append("PHONE")

    return entities

def explain_prediction_refined(text, max_length=256, top_k=10):
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=max_length
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
    if outputs.attentions is not None:
        last_attn = outputs.attentions[-1][0]      # [heads, seq_len, seq_len]
        mean_attn = last_attn.mean(dim=0)          # [seq_len, seq_len]
        cls_attention = mean_attn[0].detach().cpu().numpy()

        input_ids = inputs["input_ids"][0].detach().cpu().tolist()
        tokens = tokenizer.convert_ids_to_tokens(input_ids)

        words = []
        current_word = ""
        current_score = 0

        for tok, score in zip(tokens, cls_attention):
            if tok in tokenizer.all_special_tokens or tok == "[PAD]":
                continue

            if tok.startswith("##"):
                current_word += tok[2:]
                current_score = max(current_score, score)
            else:
                if current_word:
                    words.append((current_word, current_score))
                current_word = tok
                current_score = score

        if current_word:
            words.append((current_word, current_score))

        cleaned = []
        seen = set()

        for w, s in words:
            w = w.lower().strip()
            if len(w) < 2:
                continue
            if w in STOPWORDS:
                continue
            if w.isdigit():
                continue
            if w in seen:
                continue
            seen.add(w)
            cleaned.append((w, float(s)))

        cleaned = sorted(cleaned, key=lambda x: x[1], reverse=True)
        top_words = cleaned[:top_k]

    entities = detect_sensitive_entities_refined(text)

    reasons = []
    if entities:
        reasons.append("explicit sensitive patterns detected: " + ", ".join(entities))
    if top_words:
        reasons.append("model focused on words such as: " + ", ".join([w for w, _ in top_words[:5]]))

    if pred_label == "LEAK":
        explanation = f"This text is classified as LEAK with probability {leak_prob:.4f}."
    else:
        explanation = f"This text is classified as NO_LEAK with probability {1 - leak_prob:.4f}."

    if reasons:
        explanation += " Main reasons: " + " | ".join(reasons)

    return {
        "text": text,
        "prediction": pred_label,
        "prediction_probability": pred_prob,
        "leak_probability": leak_prob,
        "detected_entities": entities,
        "top_important_words": top_words,
        "explanation": explanation
    }

# @title X7 - Test refined hybrid XAI
samples = [
    "My phone number is 0771234567 and my email is wishma@gmail.com.",
    "Let's schedule the team meeting for tomorrow at 3 PM.",
    "My NIC is 200112345678 and my bank account details are attached."
]

for i, s in enumerate(samples, 1):
    result = explain_prediction_refined(s, top_k=8)

    print(f"\n--- Sample {i} ---")
    print("Text:", result["text"])
    print("Prediction:", result["prediction"])
    print("Prediction Probability:", round(result["prediction_probability"], 4))
    print("Leak Probability:", round(result["leak_probability"], 4))
    print("Detected Entities:", result["detected_entities"])
    print("Top Important Words:")
    for tok, score in result["top_important_words"]:
        print(f"  {tok}: {score:.4f}")
    print("Explanation:", result["explanation"])

# @title X8 - Backend-ready XAI response
def get_risklens_response(text):
    result = explain_prediction_refined(text, top_k=8)

    return {
        "input_text": result["text"],
        "prediction": result["prediction"],
        "prediction_probability": round(result["prediction_probability"], 4),
        "leak_probability": round(result["leak_probability"], 4),
        "detected_entities": result["detected_entities"],
        "top_important_words": [w for w, _ in result["top_important_words"]],
        "explanation": result["explanation"]
    }

# @title X9 - Test backend-ready output
sample_text = "My NIC is 200112345678 and my bank account details are attached."
response = get_risklens_response(sample_text)
response

# @title X10 - Recommendation engine integrated with hybrid XAI

def generate_recommendations(prediction, entities, text):
    recommendations = []

    if prediction == "NO_LEAK":
        recommendations.append("No critical privacy risk detected. Review the text once before sharing.")
        return recommendations

    if "PHONE" in entities:
        recommendations.append("Mask or remove the phone number before sharing.")
    if "EMAIL" in entities:
        recommendations.append("Replace the personal email address with a placeholder or generic contact.")
    if "BANK_INFO" in entities:
        recommendations.append("Avoid sharing banking or account-related information in plain text.")
    if "ID_INFO" in entities:
        recommendations.append("Remove or partially mask national ID, NIC, passport, or similar identifiers.")
    if "ADDRESS" in entities:
        recommendations.append("Avoid sharing exact address details unless absolutely necessary.")
    if "CARD_NUMBER" in entities:
        recommendations.append("Do not share card-like numbers in unprotected text.")

    # fallback recommendation if model predicts leak but regex found nothing
    if not entities:
        recommendations.append("Review the text and remove any personal or sensitive information before sharing.")
        recommendations.append("Consider replacing real details with masked or dummy values.")

    return recommendations


def hybrid_explain_with_recommendation(text, top_k=8):
    result = explain_prediction_refined(text, top_k=top_k)

    recommendations = generate_recommendations(
        prediction=result["prediction"],
        entities=result["detected_entities"],
        text=text
    )

    return {
        "text": result["text"],
        "prediction": result["prediction"],
        "prediction_probability": result["prediction_probability"],
        "leak_probability": result["leak_probability"],
        "detected_entities": result["detected_entities"],
        "top_important_words": result["top_important_words"],
        "explanation": result["explanation"],
        "recommendations": recommendations
    }

# @title X11 - Test recommendation engine
samples = [
    "My phone number is 0771234567 and my email is wishma@gmail.com.",
    "Let's schedule the team meeting for tomorrow at 3 PM.",
    "My NIC is 200112345678 and my bank account details are attached."
]

for i, s in enumerate(samples, 1):
    result = hybrid_explain_with_recommendation(s, top_k=8)

    print(f"\n--- Sample {i} ---")
    print("Text:", result["text"])
    print("Prediction:", result["prediction"])
    print("Prediction Probability:", round(result["prediction_probability"], 4))
    print("Leak Probability:", round(result["leak_probability"], 4))
    print("Detected Entities:", result["detected_entities"])
    print("Top Important Words:")
    for tok, score in result["top_important_words"]:
        print(f"  {tok}: {score:.4f}")
    print("Explanation:", result["explanation"])
    print("Recommendations:")
    for rec in result["recommendations"]:
        print(" -", rec)

# @title L1 - Install LIME
!pip -q install lime

# @title L2 - Load saved model and define LIME prediction function
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification

MODEL_DIR = "risklens_enron_generalized"   # change if needed

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR, local_files_only=True)
model.to(device)
model.eval()

def predict_proba_lime(texts):
    """
    texts: list of strings
    returns: numpy array of shape [n_samples, 2]
             columns = [NO_LEAK probability, LEAK probability]
    """
    enc = tokenizer(
        texts,
        truncation=True,
        padding=True,
        max_length=256,
        return_tensors="pt"
    )
    enc = {k: v.to(device) for k, v in enc.items()}

    with torch.no_grad():
        outputs = model(**enc)
        probs = torch.softmax(outputs.logits, dim=1).cpu().numpy()

    return probs

print("Model loaded for LIME.")

# @title L3 - Generate LIME explanation
from lime.lime_text import LimeTextExplainer

class_names = ["NO_LEAK", "LEAK"]
explainer = LimeTextExplainer(class_names=class_names)

sample_text = "My phone number is 0771234567 and my email is wishma@gmail.com."

exp = explainer.explain_instance(
    sample_text,
    predict_proba_lime,
    num_features=10,
    num_samples=1000
)

print("Predicted probabilities:", predict_proba_lime([sample_text])[0])
print("\nTop features for predicted class:\n")
for feature, weight in exp.as_list():
    print(f"{feature}: {weight:.4f}")

# @title L4A - Show LIME explanation in notebook
exp.show_in_notebook(text=True)

# @title X10 - ROC Curve & AUC
import torch
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, auc

# get predictions from test set
pred = trainer.predict(test_tok)
logits = pred.predictions
y_true = pred.label_ids

# convert logits → probabilities (for class 1 = LEAK)
probs = torch.softmax(torch.tensor(logits), dim=1).numpy()[:, 1]

# compute ROC
fpr, tpr, thresholds = roc_curve(y_true, probs)
roc_auc = auc(fpr, tpr)

print("AUC Score:", roc_auc)

# plot
plt.figure()
plt.plot(fpr, tpr, label=f"ROC curve (AUC = {roc_auc:.4f})")
plt.plot([0, 1], [0, 1], linestyle="--")  # random baseline
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curve - RiskLens")
plt.legend(loc="lower right")
plt.show()

# @title X11 - Training vs Validation Loss Curve
import matplotlib.pyplot as plt
import pandas as pd

log_df = pd.DataFrame(trainer.state.log_history)
print(log_df.head())

# training loss logs
train_logs = log_df[log_df["loss"].notna()].copy()
train_logs["x"] = range(1, len(train_logs) + 1)

# validation loss logs
val_logs = log_df[log_df["eval_loss"].notna()].copy()
val_logs["x"] = range(1, len(val_logs) + 1)

plt.figure(figsize=(10, 5))
plt.plot(train_logs["x"], train_logs["loss"], label="Training Loss", linewidth=2)
plt.plot(val_logs["x"], val_logs["eval_loss"], label="Validation Loss", linestyle="--", linewidth=2)

plt.title("Model Validation - Training vs Validation Loss")
plt.xlabel("Training Log Steps")
plt.ylabel("Loss")
plt.legend()
plt.grid(True, alpha=0.3)
plt.show()

# @title X13 - Smoothed Accuracy Trend Curve
import matplotlib.pyplot as plt
import pandas as pd

log_df = pd.DataFrame(trainer.state.log_history)
val_acc_logs = log_df[log_df["eval_accuracy"].notna()].copy().reset_index(drop=True)

val_acc_logs["round"] = range(1, len(val_acc_logs) + 1)
val_acc_logs["actual"] = val_acc_logs["eval_accuracy"] * 100
val_acc_logs["smoothed"] = val_acc_logs["actual"].rolling(window=2, min_periods=1).mean()

plt.figure(figsize=(10, 5))
plt.plot(val_acc_logs["round"], val_acc_logs["actual"], label="Actual", linewidth=2)
plt.plot(val_acc_logs["round"], val_acc_logs["smoothed"], label="Predicted Trend", linestyle="--", linewidth=2)

plt.title("Predicted vs Actual Accuracy Trend")
plt.xlabel("Evaluation Rounds")
plt.ylabel("Accuracy (%)")
plt.legend()
plt.grid(True, alpha=0.3)
plt.show()

# @title N1 - Load pretrained WNUT-2017 NER model
!pip -q install transformers torch

import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

NER_MODEL_NAME = "tner/bertweet-large-wnut2017"

device = 0 if torch.cuda.is_available() else -1

ner_tokenizer = AutoTokenizer.from_pretrained(NER_MODEL_NAME)
ner_model = AutoModelForTokenClassification.from_pretrained(NER_MODEL_NAME)

ner_pipe = pipeline(
    "token-classification",
    model=ner_model,
    tokenizer=ner_tokenizer,
    aggregation_strategy="simple",
    device=device
)

print("Loaded NER model:", NER_MODEL_NAME)
print("Device:", "GPU" if device == 0 else "CPU")

# @title N2 - Extract named entities from text
def extract_wnut_entities(text):
    raw_entities = ner_pipe(text)

    cleaned_entities = []
    for ent in raw_entities:
        cleaned_entities.append({
            "entity_group": ent.get("entity_group"),
            "word": ent.get("word"),
            "score": round(float(ent.get("score", 0.0)), 4),
            "start": ent.get("start"),
            "end": ent.get("end")
        })

    return cleaned_entities


def print_wnut_entities(text):
    entities = extract_wnut_entities(text)

    print("Text:", text)
    print("Detected Named Entities:")
    if not entities:
        print("  None")
    else:
        for ent in entities:
            print(
                f"  {ent['word']} | Type: {ent['entity_group']} | "
                f"Score: {ent['score']} | Span: ({ent['start']}, {ent['end']})"
            )

# @title N3 - Test pretrained WNUT-2017 NER
samples = [
    "My phone number is 0771234567 and my email is wishma@gmail.com.",
    "Let's schedule the team meeting for tomorrow at 3 PM.",
    "My NIC is 200112345678 and my bank account details are attached.",
    "John from Microsoft will visit Colombo next week.",
    "Please send the report to Kavindi at IIT."
]

for i, s in enumerate(samples, 1):
    print(f"\n--- Sample {i} ---")
    print_wnut_entities(s)

# @title N4 - Hybrid XAI + NER integration

def hybrid_full_explain(text, top_k=8):
    base = hybrid_explain_with_recommendation(text, top_k=top_k)

    ner_entities = extract_wnut_entities(text)

    # keep only useful ones
    filtered_ner = []
    for ent in ner_entities:
        if ent["entity_group"] in ["person", "location", "corporation"]:
            filtered_ner.append(ent)

    base["ner_entities"] = filtered_ner

    return base

# @title N5 - Test full hybrid system

samples = [
    "My phone number is 0771234567 and my email is wishma@gmail.com.",
    "John from Microsoft will visit Colombo next week.",
    "My NIC is 200112345678 and my bank account details are attached.",
    "Please contact Kavindi at IIT regarding the meeting."
]

for i, s in enumerate(samples, 1):
    result = hybrid_full_explain(s)

    print(f"\n--- Sample {i} ---")
    print("Text:", result["text"])
    print("Prediction:", result["prediction"])
    print("Detected Privacy Entities:", result["detected_entities"])
    print("Detected Named Entities (NER):")

    if not result["ner_entities"]:
        print("  None")
    else:
        for ent in result["ner_entities"]:
            print(f"  {ent['word']} ({ent['entity_group']})")

    print("Explanation:", result["explanation"])
    print("Recommendations:")
    for rec in result["recommendations"]:
        print(" -", rec)
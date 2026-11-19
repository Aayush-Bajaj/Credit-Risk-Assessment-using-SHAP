import json
from pathlib import Path
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
import xgboost as xgb
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent

ml_model = {}


def build_features(df: pd.DataFrame, fold: dict, num_cols, cat_cols) -> np.ndarray:
    """Same preprocessing as the training pipeline (impute + one-hot)."""
    num = df[num_cols].astype(float).to_numpy()
    medians = np.array(fold["medians"])
    num = np.where(np.isnan(num), medians, num)

    parts = [num]
    for col, cats in zip(cat_cols, fold["categories"]):
        values = df[col].fillna("missing").astype(str).to_numpy()
        parts.append(np.array([[1.0 if v == c else 0.0 for c in cats] for v in values]))
    return np.hstack(parts)


def predict_probability(df: pd.DataFrame) -> float:
    """Average of the 5 calibrated XGBoost models (same as CalibratedClassifierCV)."""
    probs = []
    for fold, booster in zip(ml_model["folds"], ml_model["boosters"]):
        X = build_features(df, fold, ml_model["num_cols"], ml_model["cat_cols"])
        raw = float(booster.inplace_predict(X)[0])
        calibrated = 1.0 / (1.0 + np.exp(fold["sigmoid_a"] * raw + fold["sigmoid_b"]))
        probs.append(calibrated)
    return float(np.mean(probs))


@asynccontextmanager
async def lifespan(app: FastAPI):
    with open(BASE_DIR / "credit_risk_portable.json", "r", encoding="utf-8") as f:
        bundle = json.load(f)

    boosters = []
    for fold in bundle["folds"]:
        booster = xgb.Booster()
        booster.load_model(bytearray(fold["booster"].encode("utf-8")))
        boosters.append(booster)

    ml_model["boosters"] = boosters
    ml_model["folds"] = bundle["folds"]
    ml_model["num_cols"] = bundle["numeric_cols"]
    ml_model["cat_cols"] = bundle["categorical_cols"]
    ml_model["threshold"] = bundle["threshold"]
    yield
    ml_model.clear()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# The only columns the user provides
class LoanApplication(BaseModel):
    person_age: int
    person_income: float
    person_home_ownership: str
    person_emp_length: float
    loan_intent: str
    loan_grade: str
    loan_amnt: float
    loan_int_rate: float
    loan_percent_income: float
    cb_person_default_on_file: str
    cb_person_cred_hist_length: int


@app.post("/predict")
def predict(data: LoanApplication):
    input_df = pd.DataFrame([data.model_dump()])

    probability = predict_probability(input_df)
    prediction = int(probability >= ml_model["threshold"])

    return {
        "default_probability": probability,
        "default_prediction": prediction,
        "threshold": ml_model["threshold"],
        "Result": "High Risk" if prediction == 1 else "Low Risk",
    }


# Serve the frontend only if a "static" folder exists (avoids a startup crash)
static_dir = BASE_DIR / "static"

app.mount(
    "/",
    StaticFiles(directory=static_dir, html=True),
    name="static"
)

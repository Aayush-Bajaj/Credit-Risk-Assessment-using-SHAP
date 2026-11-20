# Credit Risk Assessment using XGBoost, Calibration & SHAP

An end-to-end credit risk assessment application that estimates a loan applicant's probability of default and classifies the applicant as **Low Risk** or **High Risk**. The project combines a machine-learning experimentation notebook with a FastAPI prediction service and a browser-based interface.

**Live application:** https://credit-risk-assessment-using-shap-gaff.onrender.com  
**Repository:** https://github.com/Aayush-Bajaj/Credit-Risk-Assessment-using-SHAP

---

## Overview

The application accepts borrower and loan information, evaluates the profile using an ensemble of calibrated XGBoost models, and returns a default probability and risk classification.

The project focuses on three important aspects of practical credit-risk modelling:

- **Predictive modelling:** XGBoost is trained and evaluated against a Logistic Regression baseline.
- **Probability calibration:** sigmoid (Platt) calibration is used so predicted probabilities are more meaningful as risk estimates.
- **Model interpretability:** SHAP is used in the experimentation notebook to study global feature importance and individual prediction explanations.

This is an educational and portfolio project, not a production credit decision system.

## Key Features

- Credit-risk prediction through a web interface.
- Default probability returned alongside a Low Risk / High Risk result.
- Five-fold calibrated XGBoost ensemble used by the deployed API.
- Classification threshold stored with the model bundle and applied consistently during inference.
- SHAP global summary and local waterfall explanations explored in the notebook.
- FastAPI backend with a static HTML, CSS and JavaScript frontend served by the same application.
- Sample borrower profiles in the interface for trying the application.

## Application Preview

Open the live application:

**[Credit Risk Assessment – Live Demo](https://credit-risk-assessment-using-shap-gaff.onrender.com)**

Enter the applicant's financial and credit-history details, then run the assessment to view the estimated default probability and classification.

## Machine Learning Workflow

The experimentation notebook, `credit_risk.ipynb`, documents the modelling workflow.

1. **Data inspection and cleaning**
   - Load and inspect the credit-risk dataset.
   - Review missing values, distributions, outliers and class balance.
   - Remove duplicate records.
   - Prepare numerical and categorical features.

2. **Preprocessing**
   - Impute missing numerical values using median values.
   - Impute missing categorical values.
   - One-hot encode categorical variables.
   - Handle class imbalance during XGBoost training using `scale_pos_weight`.

3. **Baseline and model comparison**
   - Train Logistic Regression as a baseline.
   - Train an XGBoost classifier.
   - Compare models using stratified five-fold cross-validation.

4. **Hyperparameter tuning**
   - Use `RandomizedSearchCV` with five-fold stratified cross-validation.
   - Search over parameters including tree count, maximum depth, learning rate, subsampling, column sampling and gamma.
   - Select the estimator using F1 score as the refit metric.

5. **Threshold selection**
   - Examine the precision-recall curve.
   - Select a classification threshold based on F1 score rather than relying only on the default 0.5 cutoff.

6. **Probability calibration**
   - Apply sigmoid calibration using `CalibratedClassifierCV` with five-fold cross-validation.
   - Compare calibrated and uncalibrated probability curves.

7. **Explainability**
   - Use SHAP's `TreeExplainer` with the XGBoost model.
   - Generate a global SHAP summary plot.
   - Generate a local SHAP waterfall explanation for an individual test example.

## Model Evaluation

The notebook records the following five-fold cross-validation averages on the training split:

| Metric | Logistic Regression | XGBoost |
|---|---:|---:|
| ROC-AUC | 0.8705 | 0.9471 |
| Accuracy | 0.8116 | 0.9180 |
| Precision | 0.5448 | 0.8191 |
| Recall | 0.7781 | 0.7963 |
| F1-score | 0.6408 | 0.8073 |

The notebook also reports a separate held-out test evaluation for XGBoost after threshold adjustment:

| Metric | Reported result |
|---|---:|
| Decision threshold | 0.76 |
| Accuracy | 0.94 |
| Precision | 0.98 |
| Recall | 0.73 |
| F1-score | 0.83 |

**Evaluation note:** the notebook selects the threshold using the precision-recall curve calculated on the test split. Consequently, the threshold-adjusted test metrics should be treated as exploratory results, not as an unbiased final estimate of generalisation performance. A rigorous final evaluation should select the threshold on validation data or within cross-validation and reserve an untouched test set for the final report. The cross-validation figures above are the notebook's recorded results and are not a guarantee of live prediction performance.

## Explainability and Probability Calibration

### SHAP

The notebook uses SHAP to inspect:

- **Global explanations:** which input features have the greatest overall influence on model output.
- **Local explanations:** how individual features contribute to a particular model prediction.

The deployed prediction endpoint currently returns the calibrated probability, binary prediction, threshold and risk label. The website also presents a factor-oriented explanation in its interface; that frontend factor breakdown is presentation logic and should not be interpreted as a live SHAP-value calculation for each API prediction. The SHAP plots in the notebook are the model-based SHAP analysis.

### Calibration

The training workflow applies sigmoid calibration to the XGBoost estimator. The portable model bundle contains five calibrated fold models. At inference time, the API calculates each fold's calibrated probability and averages the five probabilities before applying the stored decision threshold.

## Tech Stack

| Area | Technologies |
|---|---|
| Language | Python, JavaScript |
| Data processing | NumPy, Pandas |
| Machine learning | XGBoost, scikit-learn |
| Explainability | SHAP |
| API | FastAPI, Pydantic |
| Frontend | HTML, CSS, JavaScript |
| Model serving | XGBoost native Booster |
| Deployment | Render |

## Repository Structure

```text
Credit-Risk-Assessment-using-SHAP/
│
├── credit_risk.ipynb          # Data analysis, training, evaluation, calibration and SHAP
├── credit_risk_portable.json  # Portable bundle containing the five model folds and metadata
├── main.py                    # FastAPI application and prediction endpoint
├── requirements.txt           # Python dependencies
├── runtime.txt                # Python runtime version
│
└── static/
    ├── index.html             # Web application interface
    ├── style.css              # Interface styling
    └── script.js              # Frontend interactions and API integration
```

## Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/Aayush-Bajaj/Credit-Risk-Assessment-using-SHAP.git
cd Credit-Risk-Assessment-using-SHAP
```

### 2. Create and activate a virtual environment

**Windows**

```bash
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux**

```bash
python -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Start the application

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000** in your browser.

The FastAPI application loads `credit_risk_portable.json` during startup and serves the frontend from the `static/` directory.

## API

### Prediction endpoint

`POST /predict`

The endpoint accepts the following JSON fields:

| Field | Type |
|---|---|
| `person_age` | integer |
| `person_income` | number |
| `person_home_ownership` | string |
| `person_emp_length` | number |
| `loan_intent` | string |
| `loan_grade` | string |
| `loan_amnt` | number |
| `loan_int_rate` | number |
| `loan_percent_income` | number |
| `cb_person_default_on_file` | string |
| `cb_person_cred_hist_length` | integer |

Example request:

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "person_age": 25,
    "person_income": 60000,
    "person_home_ownership": "RENT",
    "person_emp_length": 3,
    "loan_intent": "EDUCATION",
    "loan_grade": "B",
    "loan_amnt": 10000,
    "loan_int_rate": 11.5,
    "loan_percent_income": 0.17,
    "cb_person_default_on_file": "N",
    "cb_person_cred_hist_length": 4
  }'
```

The response contains:

- `default_probability`: averaged calibrated probability of default.
- `default_prediction`: binary classification (0 or 1).
- `threshold`: decision threshold loaded from the model bundle.
- `Result`: `Low Risk` or `High Risk`.

Interactive API documentation is available at **http://localhost:8000/docs** while the application is running.

## Important Notes

- The application is intended for learning, demonstration and portfolio purposes.
- A model-generated risk estimate is not a loan approval or rejection decision.
- Real lending decisions require appropriate validation, fairness testing, privacy safeguards, regulatory review and monitoring for data and model drift.
- The model's predictions depend on the data and preprocessing represented in the bundled model artefact.

## Author

**Aayush Bajaj**

GitHub: [Aayush-Bajaj](https://github.com/Aayush-Bajaj)

---

If you find this project useful, feel free to explore the repository and share your feedback.

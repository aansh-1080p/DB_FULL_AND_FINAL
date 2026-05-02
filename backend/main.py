from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pickle
import pandas as pd
import numpy as np
from pydantic import BaseModel
from sqlalchemy import create_engine

app = FastAPI()

# Enable CORS for your Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load your models
with open("xgboost_demand_model_sql.pkl", "rb") as f:
    model = pickle.load(f)
with open("model_features_sql.pkl", "rb") as f:
    features = pickle.load(f)

# Database connection
engine = create_engine("mysql+mysqlconnector://root:root123@localhost:3306/db_final")

class Row(BaseModel):
    data: list[dict]
    table_name: str = "demand_predictions_log"

@app.post("/predict")
def predict(body: Row):
    df = pd.DataFrame(body.data).reindex(columns=features, fill_value=0).astype(float)
    preds = model.predict(df).tolist()
    return {"predictions": [max(0, int(round(p))) for p in preds]}

@app.post("/push-to-db")
def push_to_db(body: Row):
    try:
        df = pd.DataFrame(body.data)

        # Rename camelCase cols
        df = df.rename(columns={
            "predictedDemand": "Predicted Demand",
            "restockVolume": "Restock Volume"
        })
        df = df.loc[:, ~df.columns.duplicated()]

        allowed_cols = [
            "Date", "Store ID", "Product ID", "Category", "Region",
            "Inventory Level", "Units Sold", "Units Ordered", "Price",
            "Discount", "Weather Condition", "Promotion", "Competitor Pricing",
            "Seasonality", "Epidemic", "Demand", "Year", "Month", "Day",
            "Weekday", "Discounted Price", "Sell Through Rate",
            "Predicted Demand", "Restock Volume"
        ]
        df = df[[c for c in allowed_cols if c in df.columns]]

        # Use filename-based table name
        table_name = body.table_name  

        # Check how many rows already exist
        try:
            existing = pd.read_sql(f"SELECT COUNT(*) as cnt FROM `{table_name}`", con=engine)
            existing_count = int(existing['cnt'].iloc[0])
        except:
            existing_count = 0  # table doesn't exist yet

        df.to_sql(name=table_name, con=engine, if_exists='append', index=False)

        return {
            "success": True,
            "rows_pushed": len(df),
            "table": table_name,
            "rows_already_existed": existing_count
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

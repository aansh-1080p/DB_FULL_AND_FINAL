import streamlit as st
import pandas as pd
import numpy as np
import pickle
from datetime import datetime
from sqlalchemy import create_engine
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns

st.set_page_config(page_title="Demand Forecasting Dashboard", layout="wide")
st.title("📈 Retail Demand Forecasting & Inventory Dashboard")

@st.cache_resource
def init_db_connection():
    engine = create_engine("mysql+mysqlconnector://root:root123@localhost:3306/db_final")
    return engine

@st.cache_resource
def load_ml_assets():
    try:
        with open("xgboost_demand_model_sql.pkl", "rb") as f:
            model = pickle.load(f)
        with open("model_features_sql.pkl", "rb") as f:
            features = pickle.load(f)
        return model, features
    except FileNotFoundError:
        st.error("Error: Model files not found. Ensure .pkl files are saved from your notebook!")
        st.stop()

engine = init_db_connection()
best_model, final_features = load_ml_assets()


st.sidebar.header("📁 Data Input")
uploaded_file = st.sidebar.file_uploader("Upload Demand Data (CSV)", type=["csv"])

# Load data into a global variable so both tabs can use it securely
df_raw = None
if uploaded_file is not None:
    df_raw = pd.read_csv(uploaded_file)

tab1, tab2 = st.tabs(["📁 Bulk Forecast (All Data)", "✍️ Category 'What-If' Analyzer"])

with tab1:
    st.header("Bulk Demand Forecasting")
    
    if df_raw is not None:
        df = df_raw.copy()
        st.subheader("Preview of Uploaded Data")
        st.dataframe(df.head())

        st.write("⚙️ Preprocessing data & Running Predictions...")
        
        # Date formatting
        df['Date'] = pd.to_datetime(df['Date'])
        df['Year'] = df['Date'].dt.year
        df['Month'] = df['Date'].dt.month
        df['Day'] = df['Date'].dt.day
        df['Weekday'] = df['Date'].dt.day_name()
        
        # Feature Engineering
        df['Discounted Price'] = df['Price'] * (1 - df['Discount'] / 100)
        df['Sell Through Rate'] = np.where(df['Inventory Level'] > 0, 
                                           df['Units Sold'] / df['Inventory Level'], 0)
        
        # One-Hot Encoding
        categorical_columns = ['Weekday', 'Seasonality', 'Weather Condition', 'Category', 'Region']
        df_encoded = pd.get_dummies(df, columns=categorical_columns)
        
        # Align features perfectly with training data using reindex
        X_input = df_encoded.reindex(columns=final_features, fill_value=0).astype(float)

        # Model Prediction
        predictions = best_model.predict(X_input)
        df['Predicted Demand'] = predictions.astype(int)

        # Metrics Calculation
        if 'Demand' in df.columns:
            mae = mean_absolute_error(df['Demand'], df['Predicted Demand'])
            rmse = np.sqrt(mean_squared_error(df['Demand'], df['Predicted Demand']))
            r2 = r2_score(df['Demand'], df['Predicted Demand'])
            
            mask = df['Demand'] != 0
            mape = np.mean(np.abs((df['Demand'][mask] - df['Predicted Demand'][mask]) / df['Demand'][mask])) * 100
            forecast_accuracy = 100 - mape
            
            st.subheader("🎯 Model Performance on Uploaded Data")
            col1, col2, col3, col4 = st.columns(4)
            col1.metric("RMSE (Error)", f"{rmse:.2f}")
            col2.metric("MAE (Error)", f"{mae:.2f}")
            col3.metric("R-Squared", f"{r2:.2f}")
            col4.metric("Forecast Accuracy", f"{forecast_accuracy:.2f}%")

            # Visualizations
            st.subheader("📊 Demand Visualization")
            fig, ax = plt.subplots(figsize=(12, 5))
            sns.lineplot(data=df, x=df.index, y='Demand', label='Actual Demand', color='blue', alpha=0.6)
            sns.lineplot(data=df, x=df.index, y='Predicted Demand', label='Predicted Demand', color='orange', linestyle='--')
            ax.set_title("Actual vs Predicted Demand")
            st.pyplot(fig)

        # Action Plan & Database Push
        st.subheader("🛒 Inventory Action Plan")
        df['Restock Volume'] = np.where(df['Predicted Demand'] > df['Inventory Level'],
                                        df['Predicted Demand'] - df['Inventory Level'], 0)
        
        action_df = df[['Product ID', 'Category', 'Inventory Level', 'Predicted Demand', 'Restock Volume']]
        st.dataframe(action_df[action_df['Restock Volume'] > 0].sort_values(by='Restock Volume', ascending=False))

        if st.button("Push Data to MySQL", type="primary"):
            try:
                df.to_sql(name='demand_predictions_log', con=engine, if_exists='append', index=False)
                st.success("✅ Successfully uploaded to 'db_final.demand_predictions_log' table!")
            except Exception as e:
                st.error(f"Failed to push data: {e}")
    else:
        st.info("👈 Please upload a CSV file in the left sidebar to generate forecasts.")

with tab2:
    st.header("Category 'What-If' Analyzer")
    st.markdown("Pick a category and tweak the parameters to forecast hypothetical future demand.")
    
    # LOCK TAB 2 IF NO CSV IS UPLOADED
    if df_raw is not None:
        
        # Dynamically pull Categories and Regions from the uploaded CSV
        cat_options = sorted(df_raw['Category'].unique().tolist()) if 'Category' in df_raw.columns else ['Electronics', 'Clothing', 'Groceries']
        reg_options = sorted(df_raw['Region'].unique().tolist()) if 'Region' in df_raw.columns else ['North', 'South', 'East', 'West']
        
        # --- Input fields arranged in columns ---
        colA, colB, colC = st.columns(3)
        
        with colA:
            st.subheader("Core Details")
            selected_date = st.date_input("Target Forecast Date", datetime.today().date())
            category = st.selectbox("Category", cat_options)
            region = st.selectbox("Region", reg_options) 
            seasonality = st.selectbox("Season", ['Winter', 'Spring', 'Summer', 'Autumn'])
            weather = st.selectbox("Weather Condition", ['Clear', 'Rainy', 'Snowy', 'Cloudy']) 
        
        with colB:
            st.subheader("Inventory & Sales")
            inventory = st.number_input("Current Inventory Level", min_value=0, value=150)
            expected_sales = st.number_input("Recent Units Sold (Velocity)", min_value=0, value=50)
            
            st.subheader("External Factors")
            promotion = st.selectbox("Active Promotion?", [0, 1], format_func=lambda x: "Yes" if x == 1 else "No")
            epidemic = st.selectbox("Epidemic/Crisis?", [0, 1], format_func=lambda x: "Yes" if x == 1 else "No")
            
        with colC:
            st.subheader("Pricing Strategy")
            price = st.number_input("Base Price ($)", min_value=0.0, value=50.0)
            discount = st.number_input("Discount (%)", min_value=0, max_value=100, value=0)
            comp_price = st.number_input("Competitor Price ($)", min_value=0.0, value=49.0)
            
        st.markdown("---")
        
        # --- Prediction Logic ---
        if st.button("Generate Future Forecast", type="primary", use_container_width=True):
            
            input_data = pd.DataFrame({
                'Inventory Level': [inventory],
                'Price': [price],
                'Discount': [discount],
                'Promotion': [promotion],
                'Competitor Pricing': [comp_price],
                'Epidemic': [epidemic],
                'Date': [pd.to_datetime(selected_date)],
                'Category': [category],
                'Region': [region],
                'Seasonality': [seasonality],
                'Weather Condition': [weather],
                'Units Sold': [expected_sales] 
            })

            input_data['Year'] = input_data['Date'].dt.year
            input_data['Month'] = input_data['Date'].dt.month
            input_data['Day'] = input_data['Date'].dt.day
            input_data['Weekday'] = input_data['Date'].dt.day_name()
            
            input_data['Discounted Price'] = input_data['Price'] * (1 - input_data['Discount'] / 100)
            input_data['Sell Through Rate'] = np.where(input_data['Inventory Level'] > 0, 
                                                       input_data['Units Sold'] / input_data['Inventory Level'], 0)

            input_data = input_data.drop(columns=['Date', 'Units Sold'])

            categorical_columns = ['Weekday', 'Seasonality', 'Weather Condition', 'Category', 'Region']
            input_encoded = pd.get_dummies(input_data, columns=categorical_columns)

            input_final = input_encoded.reindex(columns=final_features, fill_value=0).astype(float)

            prediction = best_model.predict(input_final)[0]
            final_demand = max(0, int(round(prediction))) 
            
            st.success(f"### Predicted Demand for {selected_date}: {final_demand} units")
            
            if final_demand > inventory:
                st.error(f"**Stockout Warning!** Predicted demand ({final_demand}) exceeds current inventory ({inventory}). You need to order at least {final_demand - inventory} more units.")
            else:
                st.info(f"**Healthy Stock Level.** Inventory is sufficient to meet forecasted demand. Projected surplus: {inventory - final_demand} units.")
                
    else:
        # THE LOCK - THIS SHOWS IF NO CSV IS UPLOADED
        st.warning("🔒 Please upload your Demand Data CSV in the left sidebar to unlock the Category Predictor.")
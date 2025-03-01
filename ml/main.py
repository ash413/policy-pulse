from fastapi import FastAPI
from pydantic import BaseModel
import joblib  #joblib instead of pickle - gcolab compatibility issues
import numpy as np
from schemas.schema import PredictionInput

#model
model = joblib.load("models/insurance_model.joblib")
preprocessor = joblib.load("models/preprocessor.joblib")

#fastapi app
app = FastAPI()

#prediction
@app.post("/predict")
def predict(input_data: PredictionInput):
    try:
        input_dict = {
            "age": input_data.age,
            "bmi": input_data.bmi,
            "smoker": input_data.smoker,
            "exercise_frequency": input_data.exercise_frequency,
            "diet": input_data.diet,
            "alcohol_consumption": input_data.alcohol_consumption,
            "sleep_quality": input_data.sleep_quality,
            "blood_pressure": input_data.blood_pressure,
            "cholesterol": input_data.cholesterol,
            "diabetes": input_data.diabetes,
            "gender": input_data.gender,
            "region": input_data.region,
            "driving_habits": input_data.driving_habits,
            "safety_device_usage": input_data.safety_device_usage,
        }

        #dictionary to dataframe (for preprocessor)
        import pandas as pd
        input_df = pd.DataFrame([input_dict])

        #preprocessing
        input_preprocessed = preprocessor.transform(input_df)

        #prediction
        prediction = model.predict(input_preprocessed)
        predicted_cost = float(prediction[0])

        #reward eligibility
        reward_eligibility = determine_reward_eligibility(input_data, predicted_cost)

        return {
            "predicted_cost": predicted_cost,
            "reward_eligibility": reward_eligibility,
            "message": "prediction successful!"
        }
    except Exception as e:
        return {
            "error": str(e),
            "message": "error making prediction"
        }

#health
@app.get("/")
def health_check():
    return {"message": "ml service is running!"}

# reward eligibility logic
def determine_reward_eligibility(input_data, predicted_cost):
    # example - reward users with healthy habits and low predicted costs
    if (
        input_data.exercise_frequency >= 3 and
        input_data.alcohol_consumption <= 2 and
        input_data.sleep_quality >= 7 and
        input_data.blood_pressure == "normal" and
        input_data.cholesterol == "normal" and
        not input_data.diabetes and
        input_data.driving_habits == "safe" and
        input_data.safety_device_usage and
        predicted_cost < 20000 #change later
    ):
        return "eligible for rewards!"
    else:
        return "not eligible for rewards"
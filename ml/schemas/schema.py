from pydantic import BaseModel

class PredictionInput(BaseModel):
    age: int
    bmi: float
    smoker: bool
    exercise_frequency: int  # Days per week
    diet: str 
    alcohol_consumption: int  # Drinks per week
    sleep_quality: int  # Hours per night
    blood_pressure: str 
    cholesterol: str
    diabetes: bool
    gender: str
    region: str 
    driving_habits: str  # e.g., "safe", "moderate", "risky"
    safety_device_usage: bool  # e.g., seatbelt, helmet
// src/components/PredictionForm.js
import React, { useState } from "react";
import axios from "axios";

const PredictionForm = () => {
  const [formData, setFormData] = useState({
    age: 25,
    bmi: 22.5,
    smoker: false,
    exercise_frequency: 3,
    diet: "vegetarian",
    alcohol_consumption: 1,
    sleep_quality: 7,
    blood_pressure: "normal",
    cholesterol: "normal",
    diabetes: false,
    gender: "female",
    region: "urban",
    driving_habits: "safe",
    safety_device_usage: true,
  });

  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setPrediction(null);

    try {
      const response = await axios.post("http://localhost:4000/predict", formData);
      setPrediction(response.data);
    } catch (err) {
      setError("Error making prediction. Please try again.");
    }
  };

  return (
    <div className="prediction-form">
      <h1>Insurance Cost Predictor</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Age:</label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>BMI:</label>
          <input
            type="number"
            name="bmi"
            value={formData.bmi}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Smoker:</label>
          <input
            type="checkbox"
            name="smoker"
            checked={formData.smoker}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Exercise Frequency (days/week):</label>
          <input
            type="number"
            name="exercise_frequency"
            value={formData.exercise_frequency}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Diet:</label>
          <select name="diet" value={formData.diet} onChange={handleChange}>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="omnivore">Omnivore</option>
          </select>
        </div>
        <div>
          <label>Alcohol Consumption (drinks/week):</label>
          <input
            type="number"
            name="alcohol_consumption"
            value={formData.alcohol_consumption}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Sleep Quality (hours/night):</label>
          <input
            type="number"
            name="sleep_quality"
            value={formData.sleep_quality}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Blood Pressure:</label>
          <select
            name="blood_pressure"
            value={formData.blood_pressure}
            onChange={handleChange}
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label>Cholesterol:</label>
          <select
            name="cholesterol"
            value={formData.cholesterol}
            onChange={handleChange}
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label>Diabetes:</label>
          <input
            type="checkbox"
            name="diabetes"
            checked={formData.diabetes}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Gender:</label>
          <select name="gender" value={formData.gender} onChange={handleChange}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label>Region:</label>
          <select name="region" value={formData.region} onChange={handleChange}>
            <option value="urban">Urban</option>
            <option value="rural">Rural</option>
          </select>
        </div>
        <div>
          <label>Driving Habits:</label>
          <select
            name="driving_habits"
            value={formData.driving_habits}
            onChange={handleChange}
          >
            <option value="safe">Safe</option>
            <option value="moderate">Moderate</option>
            <option value="risky">Risky</option>
          </select>
        </div>
        <div>
          <label>Safety Device Usage:</label>
          <input
            type="checkbox"
            name="safety_device_usage"
            checked={formData.safety_device_usage}
            onChange={handleChange}
          />
        </div>
        <button type="submit">Predict</button>
      </form>

      {prediction && (
        <div className="prediction-result">
          <h2>Prediction Result</h2>
          <p>Predicted Cost: ${prediction.predicted_cost.toFixed(2)}</p>
          <p>Reward Eligibility: {prediction.reward_eligibility}</p>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default PredictionForm;
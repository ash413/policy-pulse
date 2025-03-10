from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from sklearn.preprocessing import OneHotEncoder
from sklearn.neighbors import NearestNeighbors
import joblib
import os
import uvicorn
from datetime import datetime

app = FastAPI(
    title="Quest Recommendation Service"
)


# MODELS

class UserFeature(BaseModel):
    userId: str
    age: Optional[int] = None
    gender: Optional[str] = None
    pointsBalance: Optional[int] = 0

class UserActivity(BaseModel):
    userId: str
    questId: str
    activityType: str
    completed: bool
    duration: Optional[float] = None
    timestamp: Optional[datetime] = None

class TrainingData(BaseModel):
    userActivities: List[Dict[str, Any]]
    userFeatures: Optional[List[Dict[str, Any]]] = None

class RecommendationRequest(BaseModel):
    userId: str
    userFeatures: Dict[str, Any]
    allQuests: List[Dict[str, Any]]
    completedQuests: List[str]


# LOAD/CREATE MODELS

def load_create_models():
    if os.path.exists('recommendation_model.joblib'):
        return joblib.load('recommendation_model.joblib')
    else:
        model = NearestNeighbors(n_neighbors=1, algorithm='ball_tree')
        return model
    
model = load_create_models()
encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')


# ROUTES

@app.get('/')
def landing_page():
    return {"message": "Welcome to the ML service backend of policy-pulse!"}

@app.post("/train", status_code=200)
async def train_model(data: TrainingData):
    try:
        df = pd.DataFrame(data.userActivities)
        
        if df.empty:
            return {"status": "error", "message": "No user activity data provided"}
            
        if 'userId' not in df.columns or 'questId' not in df.columns or 'completed' not in df.columns:
            return {"status": "error", "message": "User activity data missing required columns (userId, questId, completed)"}
        
        combined_features = None
        
        try:
            user_quest_matrix = df.pivot_table(
                index='userId', 
                columns='questId',
                values='completed',
                aggfunc='mean',
                fill_value=0
            )
            
            combined_features = user_quest_matrix
            
            if data.userFeatures and len(data.userFeatures) > 0:
                user_features = pd.DataFrame(data.userFeatures)
                
                if 'userId' not in user_features.columns:
                    return {"status": "error", "message": "User features missing userId column"}
                    
                user_features.set_index('userId', inplace=True)
                
                categorical_features = user_features.select_dtypes(include=['object']).columns
                if not categorical_features.empty:
                    encoded_features = pd.DataFrame(
                        encoder.fit_transform(user_features[categorical_features]),
                        index=user_features.index,
                        columns=encoder.get_feature_names_out(categorical_features)
                    )
                    user_features = user_features.drop(columns=categorical_features)
                    user_features = pd.concat([user_features, encoded_features], axis=1)
                
                common_users = user_quest_matrix.index.intersection(user_features.index)
                
                if len(common_users) > 0:
                    combined_features = pd.concat(
                        [user_quest_matrix.loc[common_users], user_features.loc[common_users]], 
                        axis=1
                    )
                else:
                    combined_features = user_quest_matrix
                    
        except Exception as pivot_error:
            return {"status": "error", "message": f"Error processing data: {str(pivot_error)}"}
        
        if combined_features is None or combined_features.empty:
            return {"status": "error", "message": "Could not create feature matrix from provided data"}
        
        model.fit(combined_features.fillna(0).values)
        
        joblib.dump(model, 'recommendation_model.joblib')
        
        return {"status": "success", "message": "Model trained successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training Failed! {str(e)}")


@app.post('/recommend')
async def get_recommendations(request: RecommendationRequest):
    try:
        userId = request.userId
        user_features = request.userFeatures
        all_quests = request.allQuests
        user_completed_quests = request.completedQuests

        user_vector = create_user_vector(userId, user_features, all_quests, user_completed_quests)

        distances, indices = model.kneighbors([user_vector], n_neighbors=min(5, model.n_samples_fit_))

        recommended_quests = []

        for quest in all_quests:
            if quest["_id"] not in user_completed_quests:
                # in real implementation, you would calculate a recommendation score
                # based on similar users' completion patterns
                quest["recommendationScore"] = calculate_recommendation_score(quest, indices[0])
                recommended_quests.append(quest)

        recommended_quests = sorted(
            recommended_quests, 
            key=lambda x: x.get("recommendationScore", 0),
            reverse=True
        )[:5]
        
        return {
            "status": "success",
            "recommendations": recommended_quests
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")
    

def create_user_vector(userId, user_features, all_quests, completed_quests):
    vector = [0] * (len(all_quests) + len(user_features))

    for i, quest in enumerate(all_quests):
        if quest["_id"] in completed_quests:
            vector[i] = 1
    
    for i, (key, value) in enumerate(user_features.items()):
        try:
            vector[len(all_quests) + i] = float(value)
        except:
            vector[len(all_quests) + i] = 0
    
    return vector

def calculate_recommendation_score(quest, similar_user_indices):
    # placeholder for recommendation score calculation
    # in real implementation, you would use the similar users data
    # to calculate how likely this user is to enjoy this quest
    return 0.5  # Default score

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True, log_level="debug")

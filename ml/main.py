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

# Load encoder and model if they exist
def load_models():
    model = None
    encoder = None
    quest_ids = []
    
    if os.path.exists('recommendation_model.joblib'):
        model = joblib.load('recommendation_model.joblib')
    else:
        model = NearestNeighbors(n_neighbors=1, algorithm='ball_tree')
        
    if os.path.exists('encoder.joblib'):
        encoder = joblib.load('encoder.joblib')
    else:
        encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
        
    if os.path.exists('quest_ids.joblib'):
        quest_ids = joblib.load('quest_ids.joblib')
    
    return model, encoder, quest_ids

model, encoder, trained_quest_ids = load_models()


# ROUTES

@app.get('/')
def landing_page():
    return {"message": "Welcome to the ML service backend of policy-pulse!"}

@app.post("/train", status_code=200)
async def train_model(data: TrainingData):
    global model, encoder, trained_quest_ids
    
    try:
        df = pd.DataFrame(data.userActivities)
        
        if df.empty:
            return {"status": "error", "message": "No user activity data provided"}
            
        if 'userId' not in df.columns or 'questId' not in df.columns or 'completed' not in df.columns:
            return {"status": "error", "message": "User activity data missing required columns (userId, questId, completed)"}
        
        # Store quest IDs in sorted order for consistent vector creation
        trained_quest_ids = sorted(df['questId'].unique().tolist())
        joblib.dump(trained_quest_ids, 'quest_ids.joblib')
        
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
                
                # Identify categorical features
                categorical_features = user_features.select_dtypes(include=['object']).columns
                
                # Process categorical features if present
                if not categorical_features.empty:
                    encoder.fit(user_features[categorical_features])  # Fit encoder
                    encoded_features = pd.DataFrame(
                        encoder.transform(user_features[categorical_features]),
                        index=user_features.index,
                        columns=encoder.get_feature_names_out(categorical_features)
                    )
                    user_features = pd.concat([user_features.drop(columns=categorical_features), encoded_features], axis=1)
                
                # Save encoder
                joblib.dump(encoder, 'encoder.joblib')
                
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
        
        print(f"Training Data Shape: {combined_features.shape}")
        print(f"Feature columns: {combined_features.columns.tolist()}")
        
        model.fit(combined_features.fillna(0).values)
        print(f"Model trained with {model.n_features_in_} features")
        
        # Save model
        joblib.dump(model, 'recommendation_model.joblib')
        
        return {"status": "success", "message": "Model trained successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training Failed! {str(e)}")


@app.post('/recommend')
async def get_recommendations(request: RecommendationRequest):
    global model, encoder, trained_quest_ids
    
    try:
        userId = request.userId
        user_features = request.userFeatures
        all_quests = request.allQuests
        user_completed_quests = request.completedQuests
        
        # If model hasn't been trained yet
        if not os.path.exists('recommendation_model.joblib'):
            raise HTTPException(status_code=400, detail="Model not trained yet. Please train the model first.")
        
        # If quest_ids not available, handle the error
        if not trained_quest_ids:
            raise HTTPException(status_code=500, detail="No quest information from training. Please retrain the model.")
        
        user_vector = create_user_vector(userId, user_features, trained_quest_ids, user_completed_quests)
        
        distances, indices = model.kneighbors([user_vector], n_neighbors=min(5, model.n_samples_fit_))
        
        recommended_quests = []
        
        for quest in all_quests:
            if quest["_id"] not in user_completed_quests:
                # Calculate score based on similar users
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
    

def create_user_vector(userId, user_features, quest_ids, completed_quests):
    """
    Create a feature vector for a user that matches the format used during training.
    
    Args:
        userId: The user's ID
        user_features: Dictionary of user features
        quest_ids: List of quest IDs in the same order as during training
        completed_quests: List of quests the user has completed
        
    Returns:
        A feature vector matching the format expected by the model
    """
    # Initialize vector with quest completion information
    vector = []
    
    # First add quest completion info in the SAME order as during training
    for quest_id in quest_ids:
        vector.append(1 if quest_id in completed_quests else 0)
    
    # Handle user features exactly as we did during training
    if user_features:
        # First add numerical features (in a consistent order)
        numerical_features = ['age', 'pointsBalance'] 
        for feature in numerical_features:
            if feature in user_features:
                vector.append(float(user_features[feature]))
            else:
                vector.append(0)  # Default value if feature is missing
        
        # Then handle categorical features with the encoder
        categorical_features = ['gender']
        if encoder is not None and any(feature in user_features for feature in categorical_features):
            # Create a DataFrame for encoding
            categorical_df = pd.DataFrame(columns=categorical_features)
            for feature in categorical_features:
                if feature in user_features:
                    categorical_df.at[0, feature] = user_features[feature]
                else:
                    categorical_df.at[0, feature] = ''  # Default empty string
            
            # Encode and add to vector
            encoded_values = encoder.transform(categorical_df)
            vector.extend(encoded_values.flatten().tolist())
    
    # Debugging
    print(f"Vector length: {len(vector)}, Expected features: {model.n_features_in_}")
    
    # Ensure vector length matches the trained model
    if len(vector) != model.n_features_in_:
        # This should only happen if the training data structure changed
        raise ValueError(f"Feature mismatch! Expected {model.n_features_in_} but got {len(vector)}")
    
    return vector


def calculate_recommendation_score(quest, similar_user_indices):
    # In a real implementation, this would use data from similar users
    # For now, just return a random score
    return np.random.random()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True, log_level="debug")
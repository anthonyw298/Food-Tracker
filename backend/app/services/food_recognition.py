import requests
import base64
import os
from dotenv import load_dotenv
from typing import Dict, Any
import json

load_dotenv()

HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HUGGINGFACE_MODEL_API = os.getenv(
    "HUGGINGFACE_MODEL_API",
    "https://api-inference.huggingface.co/models/nutritious/food-classification"
)

# Fallback food database for common foods (in case API fails)
FOOD_DATABASE = {
    "apple": {"calories": 95, "protein": 0.5, "carbs": 25, "fats": 0.3},
    "banana": {"calories": 105, "protein": 1.3, "carbs": 27, "fats": 0.4},
    "chicken breast": {"calories": 165, "protein": 31, "carbs": 0, "fats": 3.6},
    "rice": {"calories": 130, "protein": 2.7, "carbs": 28, "fats": 0.3},
    "bread": {"calories": 79, "protein": 3, "carbs": 15, "fats": 1},
    "egg": {"calories": 70, "protein": 6, "carbs": 0.6, "fats": 5},
    "salmon": {"calories": 206, "protein": 22, "carbs": 0, "fats": 12},
    "broccoli": {"calories": 55, "protein": 3.7, "carbs": 11, "fats": 0.6},
    "pasta": {"calories": 131, "protein": 5, "carbs": 25, "fats": 1.1},
}

async def recognize_food(image_bytes: bytes, filename: str = None) -> Dict[str, Any]:
    """
    Recognize food from image using HuggingFace API
    Returns food name and estimated macros
    """
    try:
        # Prepare image for API
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Call HuggingFace API
        headers = {}
        if HUGGINGFACE_API_KEY:
            headers["Authorization"] = f"Bearer {HUGGINGFACE_API_KEY}"
        
        response = requests.post(
            HUGGINGFACE_MODEL_API,
            headers=headers,
            data=image_bytes,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Parse response (format varies by model)
            if isinstance(result, list) and len(result) > 0:
                food_label = result[0].get("label", "unknown food")
                confidence = result[0].get("score", 0)
                
                # Normalize food name
                food_name = normalize_food_name(food_label)
                
                # Get macros from database or estimate
                macros = get_food_macros(food_name)
                
                return {
                    "food_name": food_name,
                    "confidence": confidence,
                    "calories": macros["calories"],
                    "protein": macros["protein"],
                    "carbs": macros["carbs"],
                    "fats": macros["fats"],
                    "serving_size": "1 serving"
                }
        else:
            # API error, use fallback
            return get_fallback_response()
            
    except Exception as e:
        print(f"Recognition error: {str(e)}")
        return get_fallback_response()

def normalize_food_name(label: str) -> str:
    """Normalize food label to common name"""
    label_lower = label.lower()
    
    # Simple keyword matching for common foods
    for food, _ in FOOD_DATABASE.items():
        if food in label_lower or label_lower in food:
            return food.title()
    
    # Clean up label
    return label.replace("_", " ").title()

def get_food_macros(food_name: str) -> Dict[str, float]:
    """Get macros for a food item"""
    food_lower = food_name.lower()
    
    # Check database
    for food, macros in FOOD_DATABASE.items():
        if food in food_lower or food_lower in food:
            return macros.copy()
    
    # Default estimates (per serving)
    return {
        "calories": 100,
        "protein": 5,
        "carbs": 15,
        "fats": 2
    }

def get_fallback_response() -> Dict[str, Any]:
    """Return fallback response when recognition fails"""
    return {
        "food_name": "Unknown Food",
        "confidence": 0.5,
        "calories": 150,
        "protein": 5,
        "carbs": 20,
        "fats": 3,
        "serving_size": "1 serving",
        "note": "Unable to recognize food. Please edit manually."
    }


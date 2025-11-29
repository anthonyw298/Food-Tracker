from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    created_at: Optional[str] = None

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class FoodEntryCreate(BaseModel):
    food_name: str
    calories: float
    protein: float
    carbs: float
    fats: float
    serving_size: Optional[str] = None
    image_url: Optional[str] = None
    entry_date: Optional[date] = None

class FoodEntryResponse(BaseModel):
    id: int
    user_id: str
    food_name: str
    calories: float
    protein: float
    carbs: float
    fats: float
    serving_size: Optional[str] = None
    image_url: Optional[str] = None
    entry_date: str
    created_at: str

class MacroGoals(BaseModel):
    user_id: str
    calorie_goal: float
    protein_goal: float
    carb_goal: float
    fat_goal: float
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class MacroGoalsUpdate(BaseModel):
    calorie_goal: float
    protein_goal: float
    carb_goal: float
    fat_goal: float

class MacroSummary(BaseModel):
    date: str
    calories: float
    protein: float
    carbs: float
    fats: float
    calorie_goal: float
    protein_goal: float
    carb_goal: float
    fat_goal: float

class DailyLogResponse(BaseModel):
    date: str
    entries: list[FoodEntryResponse]
    totals: MacroSummary


from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, date
import os
from dotenv import load_dotenv

from app.auth import get_current_user, verify_token
from app.models import (
    UserResponse,
    FoodEntryCreate,
    FoodEntryResponse,
    DailyLogResponse,
    MacroGoals,
    MacroGoalsUpdate,
    MacroSummary,
    RegisterRequest,
    LoginRequest
)
from app.services.food_recognition import recognize_food
from app.services.supabase_client import get_supabase_client
from app.services.macro_calculator import calculate_macros
import logging

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Food Tracker API", version="1.0.0")

# Request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    import time
    start_time = time.time()
    logger.info(f"→ {request.method} {request.url.path}")
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"← {request.method} {request.url.path} - {response.status_code} ({process_time:.2f}s)")
    return response

# Log all requests
@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {request.method} {request.url} - Status: {response.status_code}")
    return response

# CORS configuration - include web ports
default_origins = "http://localhost:3000,http://localhost:8081,http://localhost:19006,exp://localhost:8081"
origins = os.getenv("CORS_ORIGINS", default_origins).split(",")
# Clean up any whitespace
origins = [origin.strip() for origin in origins]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

@app.get("/")
async def root():
    return {"message": "Food Tracker API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/health/db")
async def health_db():
    """Test database connection"""
    try:
        supabase = get_supabase_client()
        # Try a simple query
        result = supabase.table("users").select("count", count="exact").limit(1).execute()
        return {
            "status": "healthy",
            "database": "connected",
            "users_table": "exists"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "error",
            "error": str(e)
        }

@app.post("/test/supabase-auth")
async def test_supabase_auth():
    """Test Supabase Auth connection (for debugging)"""
    try:
        supabase = get_supabase_client()
        # Try to get auth settings (lightweight operation)
        # Just check if client is accessible
        return {
            "status": "success",
            "supabase_connected": True,
            "message": "Supabase client is accessible"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@app.post("/auth/register")
async def register(request: RegisterRequest):
    """Register a new user"""
    logger.info(f"=== REGISTRATION STARTED ===")
    logger.info(f"Registration attempt for email: {request.email}")
    logger.info(f"Request received successfully")
    
    try:
        logger.info("Getting Supabase client...")
        supabase = get_supabase_client()
        logger.info("Supabase client obtained")
        
        # Create user in Supabase Auth with timeout
        logger.info("Calling Supabase auth.sign_up...")
        import signal
        import threading
        
        def timeout_handler():
            logger.error("Supabase auth.sign_up TIMEOUT after 20 seconds!")
        
        # Set up timeout
        timer = threading.Timer(20.0, timeout_handler)
        timer.start()
        
        try:
            # Use service_role key for admin signup (bypasses email confirmation)
            response = supabase.auth.sign_up({
                "email": request.email,
                "password": request.password,
                "options": {
                    "data": {
                        "name": request.name
                    }
                }
            })
            timer.cancel()  # Cancel timeout if we get response
            logger.info(f"Supabase response received")
        except Exception as signup_error:
            timer.cancel()
            raise signup_error
            
            # Check response
            if not response:
                logger.error("No response from Supabase auth.sign_up")
                raise HTTPException(status_code=500, detail="No response from authentication service")
            
            # Handle case where user already exists
            if hasattr(response, 'user') and response.user is None:
                logger.warning("User creation returned None - might already exist")
                raise HTTPException(status_code=400, detail="User with this email may already exist")
            
            user_id = None
            if response.user:
                user_id = str(response.user.id)
                logger.info(f"User created with ID: {user_id}")
            elif hasattr(response, 'data') and response.data and hasattr(response.data, 'user'):
                user_id = str(response.data.user.id)
                logger.info(f"User created with ID from data: {user_id}")
            else:
                logger.error(f"Unexpected response structure: {response}")
                raise HTTPException(status_code=500, detail="Failed to get user ID from authentication response")
            
            if not user_id:
                raise HTTPException(status_code=400, detail="Failed to create user. Please try again.")
            
        except HTTPException:
            raise
        except Exception as auth_error:
            error_str = str(auth_error)
            logger.error(f"Supabase auth.sign_up error: {error_str}")
            
            # Handle specific Supabase errors
            if "already registered" in error_str.lower() or "already exists" in error_str.lower():
                raise HTTPException(status_code=400, detail="User with this email already exists")
            elif "invalid" in error_str.lower() or "password" in error_str.lower():
                raise HTTPException(status_code=400, detail="Invalid email or password format")
            else:
                raise HTTPException(status_code=500, detail=f"Authentication error: {error_str}")
        
        # Create user profile in database
        try:
            logger.info("Creating user profile in database...")
            result = supabase.table("users").insert({
                "id": user_id,
                "email": request.email,
                "name": request.name,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            logger.info("User profile created successfully")
        except Exception as db_error:
            error_str = str(db_error)
            logger.warning(f"Failed to create user profile: {error_str}")
            
            # If user already exists in database, that's okay
            if "duplicate key" in error_str.lower() or "already exists" in error_str.lower() or "violates unique constraint" in error_str.lower():
                logger.info("User profile already exists in database, continuing...")
            else:
                # Log but don't fail - user is created in auth
                logger.warning(f"Non-critical: Could not create user profile: {error_str}")
        
        logger.info("Registration successful")
        return {
            "message": "User created successfully",
            "user_id": user_id,
            "email": request.email
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Registration error: {error_msg}")
        # Handle common Supabase errors
        if "already registered" in error_msg.lower() or "user already exists" in error_msg.lower():
            raise HTTPException(status_code=400, detail="User with this email already exists")
        raise HTTPException(status_code=500, detail=f"Registration failed: {error_msg}")

@app.post("/auth/login")
async def login(request: LoginRequest):
    """Login and get access token"""
    supabase = get_supabase_client()
    
    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })
        
        if response.user and response.session:
            return {
                "access_token": response.session.access_token,
                "token_type": "bearer",
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                }
            }
        else:
            raise HTTPException(status_code=401, detail="Login failed - check your email for confirmation")
    except Exception as e:
        error_msg = str(e)
        if "Invalid login credentials" in error_msg or "Email not confirmed" in error_msg:
            raise HTTPException(status_code=401, detail="Invalid credentials or email not confirmed")
        raise HTTPException(status_code=401, detail=f"Login failed: {error_msg}")

@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    supabase = get_supabase_client()
    user_data = supabase.table("users").select("*").eq("id", current_user["id"]).execute()
    
    if user_data.data:
        return user_data.data[0]
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/food/recognize")
async def recognize_food_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Recognize food from image using HuggingFace"""
    try:
        # Read image file
        image_bytes = await file.read()
        
        # Recognize food
        food_data = await recognize_food(image_bytes, file.filename)
        
        return food_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Recognition failed: {str(e)}")

@app.post("/food/entries", response_model=FoodEntryResponse)
async def create_food_entry(
    entry: FoodEntryCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new food entry"""
    supabase = get_supabase_client()
    
    try:
        entry_data = {
            "user_id": current_user["id"],
            "food_name": entry.food_name,
            "calories": entry.calories,
            "protein": entry.protein,
            "carbs": entry.carbs,
            "fats": entry.fats,
            "serving_size": entry.serving_size,
            "image_url": entry.image_url,
            "entry_date": entry.entry_date.isoformat() if entry.entry_date else datetime.utcnow().date().isoformat(),
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("food_entries").insert(entry_data).execute()
        
        if result.data:
            return result.data[0]
        raise HTTPException(status_code=400, detail="Failed to create entry")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/food/entries", response_model=List[FoodEntryResponse])
async def get_food_entries(
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get food entries for the current user"""
    supabase = get_supabase_client()
    
    query = supabase.table("food_entries").select("*").eq("user_id", current_user["id"])
    
    if date:
        query = query.eq("entry_date", date)
    else:
        today = datetime.utcnow().date().isoformat()
        query = query.eq("entry_date", today)
    
    result = query.order("created_at", desc=True).execute()
    
    return result.data if result.data else []

@app.delete("/food/entries/{entry_id}")
async def delete_food_entry(
    entry_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a food entry"""
    supabase = get_supabase_client()
    
    # Verify ownership
    entry = supabase.table("food_entries").select("*").eq("id", entry_id).eq("user_id", current_user["id"]).execute()
    
    if not entry.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    supabase.table("food_entries").delete().eq("id", entry_id).execute()
    
    return {"message": "Entry deleted successfully"}

@app.get("/dashboard/summary", response_model=MacroSummary)
async def get_dashboard_summary(
    date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get daily macro summary for dashboard"""
    supabase = get_supabase_client()
    
    target_date = date if date else datetime.utcnow().date().isoformat()
    
    # Get entries for the date
    entries = supabase.table("food_entries").select("*").eq("user_id", current_user["id"]).eq("entry_date", target_date).execute()
    
    # Get user's macro goals
    goals = supabase.table("macro_goals").select("*").eq("user_id", current_user["id"]).execute()
    
    # Calculate totals
    totals = calculate_macros(entries.data if entries.data else [])
    
    # Get goals or use defaults
    goal_data = goals.data[0] if goals.data else None
    
    return {
        "date": target_date,
        "calories": totals["calories"],
        "protein": totals["protein"],
        "carbs": totals["carbs"],
        "fats": totals["fats"],
        "calorie_goal": goal_data["calorie_goal"] if goal_data else 2000,
        "protein_goal": goal_data["protein_goal"] if goal_data else 150,
        "carb_goal": goal_data["carb_goal"] if goal_data else 200,
        "fat_goal": goal_data["fat_goal"] if goal_data else 65,
    }

@app.get("/macro-goals", response_model=MacroGoals)
async def get_macro_goals(current_user: dict = Depends(get_current_user)):
    """Get user's macro goals"""
    supabase = get_supabase_client()
    
    result = supabase.table("macro_goals").select("*").eq("user_id", current_user["id"]).execute()
    
    if result.data:
        return result.data[0]
    
    # Return defaults if no goals set
    return {
        "user_id": current_user["id"],
        "calorie_goal": 2000,
        "protein_goal": 150,
        "carb_goal": 200,
        "fat_goal": 65,
    }

@app.post("/macro-goals", response_model=MacroGoals)
async def create_or_update_macro_goals(
    goals: MacroGoalsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Create or update macro goals"""
    supabase = get_supabase_client()
    
    goals_data = {
        "user_id": current_user["id"],
        "calorie_goal": goals.calorie_goal,
        "protein_goal": goals.protein_goal,
        "carb_goal": goals.carb_goal,
        "fat_goal": goals.fat_goal,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    # Check if goals exist
    existing = supabase.table("macro_goals").select("*").eq("user_id", current_user["id"]).execute()
    
    if existing.data:
        # Update
        result = supabase.table("macro_goals").update(goals_data).eq("user_id", current_user["id"]).execute()
    else:
        # Create
        goals_data["created_at"] = datetime.utcnow().isoformat()
        result = supabase.table("macro_goals").insert(goals_data).execute()
    
    if result.data:
        return result.data[0]
    raise HTTPException(status_code=400, detail="Failed to save goals")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


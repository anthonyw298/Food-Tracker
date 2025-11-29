from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

_supabase_client: Client = None

def get_supabase_client() -> Client:
    """Get or create Supabase client singleton"""
    global _supabase_client
    
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
        
        if not url or not key:
            raise ValueError("Supabase URL and KEY must be set in environment variables")
        
        _supabase_client = create_client(url, key)
    
    return _supabase_client


# Food Tracker Backend API

FastAPI backend for the Food Tracker mobile app with AI-powered food recognition.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Fill in your environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key (for admin operations)
- `HUGGINGFACE_API_KEY`: Your HuggingFace API key (optional, but recommended)
- `SECRET_KEY`: Random secret for JWT tokens
- `CORS_ORIGINS`: Comma-separated list of allowed origins

4. Set up Supabase database:
   - Run the SQL in `database/schema.sql` in your Supabase SQL editor
   - Create a storage bucket named `food-images` for image uploads

5. Run the server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get token
- `GET /auth/me` - Get current user info
- `POST /food/recognize` - Recognize food from image
- `POST /food/entries` - Create food entry
- `GET /food/entries` - Get food entries
- `DELETE /food/entries/{id}` - Delete food entry
- `GET /dashboard/summary` - Get daily macro summary
- `GET /macro-goals` - Get macro goals
- `POST /macro-goals` - Set macro goals

## Development

```bash
# Run with auto-reload
uvicorn main:app --reload

# Run production
uvicorn main:app --host 0.0.0.0 --port 8000
```


# Food Tracker Mobile App

React Native/Expo mobile app for tracking food intake with AI-powered recognition.

## Setup

1. Install dependencies:
```bash
npm install
# or
bun install
```

2. Update API configuration:
   - Edit `src/config/api.ts` and set your backend API URL

3. Start the development server:
```bash
npm start
# or
expo start
```

4. Run on your device:
   - Scan QR code with Expo Go app (iOS/Android)
   - Or press `a` for Android emulator
   - Or press `i` for iOS simulator

## Features

- ✅ Dashboard with macro tracking
- ✅ Camera and gallery image selection
- ✅ AI-powered food recognition
- ✅ Offline mode with SQLite caching
- ✅ User authentication
- ✅ Macro goals management

## Project Structure

```
frontend/
├── src/
│   ├── screens/
│   │   ├── DashboardScreen.tsx
│   │   ├── FoodEntryScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── store/
│   │   ├── authStore.ts
│   │   └── foodStore.ts
│   └── config/
│       └── api.ts
├── App.tsx
└── package.json
```

## Environment Variables

Create a `.env` file if needed for API configuration (or update `src/config/api.ts` directly):

```
API_BASE_URL=http://localhost:8000
```


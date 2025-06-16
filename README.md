# Socio.ly

A modern, real-time social app demo built with a clean full-stack TypeScript architecture.

## Features
- **User Roles:** Celebrity & Public (mock JWT login)
- **Real-Time Feed:** WebSocket + Redis Pub/Sub (backend)
- **Follow System:** Public users can follow/unfollow celebrities
- **Infinite Scroll:** Smooth, paginated feed
- **Responsive UI:** Mobile & desktop friendly, modern design
- **Image Upload:** Celebrities can post with images (base64 mock)
- **Like System:** Public users can like posts (persisted in localStorage)
- **Notifications:** Real-time new post badge for public users
- **No Comments:** Commenting feature is removed per requirements

## Project Structure
```
FEED/
├── backend/         # Node.js/Express/TypeScript/Redis backend
│   └── src/
│       └── index.ts
├── frontend/        # React/TypeScript frontend
│   └── src/
│       └── App.tsx
│       └── App.css
│       └── ...
├── package.json     # Root (for monorepo setups)
└── README.md        # This file
```

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Redis (for backend real-time features)

### 1. Install dependencies
```sh
cd backend && npm install
cd ../frontend && npm install
```

### 2. Start Redis
Make sure Redis is running locally (default port 6379).

### 3. Start the backend
```sh
cd backend
npm run dev
```

### 4. Start the frontend
```sh
cd ../frontend
npm start
```

### 5. Open the app
Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Clean Commit History
- Each feature and removal is committed separately for clarity.
- See commit log for details on real-time, UI, and feature changes.

## License
MIT

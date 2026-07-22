# Productive X 🚀

> "One Workspace. Every Goal."

Productive X is a complete, production-ready SaaS B.Tech project that serves as an all-in-one productivity platform. It combines multiple essential productivity tools into a single, beautifully designed, and highly interactive interface.

## 🌟 Features

- **Smart Task Manager (Kanban)**: Drag and drop tasks across To Do, In Progress, Review, and Completed columns.
- **Expense Tracker**: Keep track of income, expenses, and current balance.
- **Goal Tracker**: Define goals with deadlines and track percentage progress.
- **Habit Tracker**: Build streaks and track daily habits.
- **Notes**: Rich text notes with pinning and categorization.
- **Pomodoro Timer**: Built-in customizable focus timer.
- **Analytics Dashboard**: Visual charts for task completion and expense distribution using Chart.js.
- **Dark Mode SaaS Theme**: Modern UI with Glassmorphism, CSS animations, and responsive layout.
- **User Authentication**: Secure JWT-based auth with bcrypt password hashing.

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6 Modules), Chart.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JSON Web Tokens (JWT)

## 📁 Folder Structure

```
ProductiveX/
├── client/                 # Frontend Static Files
│   ├── css/
│   │   ├── style.css       # Global styles & variables
│   │   └── components.css  # Buttons, Cards, Glassmorphism
│   ├── js/
│   │   ├── api.js          # API service with JWT injection
│   │   ├── app.js          # Main SPA routing & dashboard logic
│   │   ├── auth.js         # Login & Registration logic
│   │   ├── components/     # UI utilities (Toasts)
│   │   └── pages/          # Logic for each module (Tasks, Goals, etc.)
│   ├── index.html          # Auth page
│   └── app.html            # Main Dashboard SPA container
├── server/                 # Backend REST API
│   ├── config/
│   │   └── db.js           # MongoDB connection setup
│   ├── controllers/        # Route logic (CRUD operations)
│   ├── middleware/
│   │   └── auth.js         # JWT verification middleware
│   ├── models/             # Mongoose Schemas (User, Task, Expense...)
│   ├── routes/             # Express Routers
│   ├── utils/              # Helper functions (Token generation)
│   └── server.js           # App entry point
├── .env                    # Environment variables
├── package.json            # Dependencies
└── README.md
```

## ⚙️ Setup & Installation

### 1. Prerequisites
- Node.js (v14 or higher)
- MongoDB account (Atlas Free Tier) or Local MongoDB instance

### 2. Clone/Setup Directory
Navigate to the `ProductiveX` directory where this project is located.

### 3. Install Dependencies
```bash
npm install
```

### 4. Environment Variables
The `.env` file is already created in the root directory. Update it if you want to use MongoDB Atlas:

```env
NODE_ENV=development
PORT=5000
# For local DB:
MONGO_URI=mongodb://localhost:27017/productiveX
# For MongoDB Atlas (replace with your URI):
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/productiveX?retryWrites=true&w=majority
JWT_SECRET=supersecretproductivexkey_change_in_production
```

### 5. Run the Application
Start the Node.js server (which also serves the frontend static files):
```bash
node server/server.js
```
*Alternatively, you can install `nodemon` globally (`npm i -g nodemon`) and run `nodemon server/server.js` for auto-reloading during development.*

The application will be available at: **http://localhost:5000**

## 🚀 Deployment Guide

### Backend (Render)
1. Push this repository to GitHub.
2. Go to [Render](https://render.com/), create a new **Web Service**.
3. Connect your repository.
4. Set Build Command to `npm install` and Start Command to `node server/server.js`.
5. Add your Environment Variables (`MONGO_URI`, `JWT_SECRET`, etc.) in the Render dashboard.

### Frontend (Vercel)
*Note: Our setup serves the frontend directly from the Express backend, so deploying the backend to Render deploys the whole app. However, if you want to deploy the frontend separately on Vercel:*
1. Create a Vercel project and point it to the `client/` folder.
2. Update the `API_URL` inside `client/js/api.js` to point to your live Render backend URL instead of relative `/api`.

### Database (MongoDB Atlas)
1. Create a free cluster on MongoDB Atlas.
2. Create a database user and whitelist your IP address (or `0.0.0.0/0` for Render).
3. Get the connection string and paste it in the `.env` file or Render dashboard.

## 📸 Screenshots

*(Add screenshots here for your B.Tech project documentation)*

- `![Dashboard view](placeholder)`
- `![Kanban Board](placeholder)`
- `![Expense Tracker](placeholder)`

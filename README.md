project-name/
│
├── src/
│   ├── config/                 # Configuration files (DB, environment, etc.)
│   │   └── db.js               # MongoDB connection setup
│   │
│   ├── controllers/            # Route handlers / business logic
│   │   └── userController.js
│   │
│   ├── models/                 # Mongoose schemas
│   │   └── userModel.js
│   │
│   ├── routes/                 # API routes
│   │   └── userRoutes.js
│   │
│   ├── middlewares/            # Middlewares (auth, error handling, logging)
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   │
│   ├── utils/                  # Helper functions, utilities
│   │   └── logger.js
│   │
│   ├── services/               # Business logic or external API calls
│   │   └── emailService.js
│   │
│   ├── app.js                  # Express app setup
│   └── server.js               # Starts server
│
├── .env                        # Environment variables (DB URI, PORT, secrets)
├── package.json
├── package-lock.json
└── README.md



Open PowerShell in your project folder (D:\hireability-platform) and run:

# 1. Create folder structure
mkdir src\config, src\controllers, src\models, src\routes, src\middlewares, src\utils, src\services

# 2. Create empty files
type nul > src\config\db.js
type nul > src\controllers\userController.js
type nul > src\models\userModel.js
type nul > src\routes\userRoutes.js
type nul > src\middlewares\authMiddleware.js
type nul > src\middlewares\errorMiddleware.js
type nul > src\utils\logger.js
type nul > src\services\emailService.js
type nul > src\app.js
type nul > src\server.js
type nul > .env
type nul > README.md

# 3. Initialize npm
npm init -y

# 4. Install dependencies
npm install express mongoose dotenv

# 5. Install dev dependencies
npm install --save-dev nodemon





npx nodemon src/server.js
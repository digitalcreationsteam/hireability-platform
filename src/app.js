const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const authRoutes = require("./routes/authRoutes");
const connectDB = require('./config/db');
require('dotenv').config();

// Connect DB
connectDB();

// Middleware
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);

app.use("/api/auth", authRoutes);


// Default route
app.get('/', (req, res) => {
    res.send('API is running...');
});

module.exports = app;

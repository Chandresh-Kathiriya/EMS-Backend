// routes/dashboardRoute.js

// import core modules and controllers
const express = require('express');
const dashboardRouter = express.Router();
const dashboard = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/jwtAuthMiddleware');

// All dashboard routes API
dashboardRouter.post('/', verifyToken, dashboard.getDashboard);

module.exports = dashboardRouter;
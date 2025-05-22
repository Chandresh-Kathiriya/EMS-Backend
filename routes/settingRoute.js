// routes/routes.js

// import core modules and controllers
const express = require('express');
const settingRouter = express.Router();
const setting = require('../controllers/settingController');
const { verifyToken } = require('../middleware/jwtAuthMiddleware');

settingRouter.post('/attendance', verifyToken, setting.attendance);
settingRouter.post('/smtp', verifyToken, setting.smtp);

module.exports = settingRouter;
// routes/routes.js

// import core modules and controllers
const express = require('express');
const commonRouter = express.Router();
const common = require('../controllers/commonController');
const { verifyToken } = require('../middleware/jwtAuthMiddleware');

// login APIs
// commonRouter.get('/getalluser', common.getAllUser);
commonRouter.post('/login', common.loginData);
commonRouter.post('/resetPasword', common.resetPassword);
commonRouter.post('/verifyPassword', common.verifyPassword);
commonRouter.post('/getPermission', verifyToken, common.getPermission);

module.exports = commonRouter;
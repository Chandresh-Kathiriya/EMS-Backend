// routes/profileRoute.js

// import core modules and controllers
const express = require('express');
const profileRouter = express.Router();
const profile = require('../controllers/profileController');
const { verifyToken } = require('../middleware/jwtAuthMiddleware')

// All profile routes API
profileRouter.get('/:id', verifyToken, profile.getProfileData);
profileRouter.put('/edit/:id', verifyToken, profile.editUserProfile);
profileRouter.put('/change-password/:id', verifyToken, profile.changePassword);

module.exports = profileRouter;
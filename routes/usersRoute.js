// routes/usersRoute.js

// import core modules and controllers
const express = require('express');
const usersRouter = express.Router();
const users = require('../controllers/usersController');
const { verifyToken } = require('../middleware/jwtAuthMiddleware')

// All users routes API
usersRouter.post('/getAllUsers', verifyToken, users.getAllUsers);
usersRouter.post('/getAllUsersForAttendanceReport', verifyToken, users.getAllUsersForAttendanceReport);
usersRouter.get('/edit/:id', verifyToken, users.getUser);
usersRouter.get('/getPermissionSchema', verifyToken, users.getPermissionSchema);
usersRouter.get('/getRoleData', verifyToken, users.getRoleData);
usersRouter.post('/getRoles', verifyToken, users.getRoles);
usersRouter.get('/getRole/:roleID', verifyToken, users.getRole);

usersRouter.post('/editUserById', verifyToken, users.editUserById);
usersRouter.post('/createUser', verifyToken, users.createUser);
usersRouter.post('/addNewRole', verifyToken, users.addNewRole);
usersRouter.post('/deleteRole/:id', verifyToken, users.deleteRole);
usersRouter.post('/updateRole/:roleID', verifyToken, users.updateRole);
usersRouter.post('/deleteUser', verifyToken, users.deleteUser);

module.exports = usersRouter;
// routes/leaveRoute.js

// import core modules and controllers
const express = require('express');
const leaveRouter = express.Router();
const leave = require('../controllers/leaveController');
const { verifyToken } = require('../middleware/jwtAuthMiddleware');

// All leave routes API.
leaveRouter.post('/getLeaveData', verifyToken, leave.getLeaveData);
leaveRouter.post('/deleteLeave', verifyToken, leave.deleteLeave);
leaveRouter.post('/getLeaveTypeData', verifyToken, leave.getLeaveTypeData);
leaveRouter.post('/createLeaveType', verifyToken, leave.createLeaveType);
leaveRouter.post('/updateLeaveType', verifyToken, leave.updateLeaveType);
leaveRouter.post('/deleteLeaveType', verifyToken, leave.deleteLeaveType);
leaveRouter.post('/approvePendingLeave', verifyToken, leave.approvePendingLeave);
leaveRouter.post('/rejectPendingLeave', verifyToken, leave.rejectPendingLeave);
leaveRouter.post('/newLeave', verifyToken, leave.newLeave);
leaveRouter.post('/updateLeaveBy', verifyToken, leave.updateLeaveBy);

module.exports = leaveRouter;
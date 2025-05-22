// routes/attendanceRoute.js

// import core modules and controllers
const express = require('express');
const attendanceRouter = express.Router();

const attendance = require('../controllers/attendanceController');
const { verifyToken } = require('../middleware/jwtAuthMiddleware');

// All attendance routes API
attendanceRouter.post('/getAttendanceData', verifyToken, attendance.getAttendanceData);
attendanceRouter.post('/getExportAttendanceData', verifyToken, attendance.getExportAttendanceData);
attendanceRouter.post('/getMissAttendanceData', verifyToken, attendance.getMissAttendanceData);
attendanceRouter.post('/getTodayAllAttendanceData', verifyToken, attendance.getTodayAllAttendanceData);
attendanceRouter.post('/getMonthAttendanceData', verifyToken, attendance.getMonthAttendanceData);
attendanceRouter.post('/getRegularizationData', verifyToken, attendance.getRegularizationData);
attendanceRouter.post('/createRegularization', verifyToken, attendance.createRegularization);
attendanceRouter.post('/regularization/approveByID/:id', verifyToken, attendance.regularizationApproveByID);
attendanceRouter.post('/regularization/rejectByID/:id', verifyToken, attendance.regularizationRejectByID);
attendanceRouter.post('/punch', verifyToken, attendance.markAttendance);

module.exports = attendanceRouter;
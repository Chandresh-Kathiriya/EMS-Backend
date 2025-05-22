// routes/leaveRoute.js

// import core modules and controllers
const express = require('express');
const masterRouter = express.Router();
const master = require('../controllers/masterController');
const { verifyToken } = require('../middleware/jwtAuthMiddleware');

// All leave routes API.
masterRouter.post('/getHolidays', verifyToken, master.getHolidays);
masterRouter.post('/addHoliday', verifyToken, master.addHoliday);
masterRouter.post('/updateHoliday/:holidayId', verifyToken, master.updateHoliday);
masterRouter.post('/deleteHoliday/:holidayId', verifyToken, master.deleteHoliday);

masterRouter.post('/addWeekOff', verifyToken, master.addWeekOff);
masterRouter.post('/getWeekOff', verifyToken, master.getWeekOff);
masterRouter.post('/getAllWeekOff', verifyToken, master.getAllWeekOff);
masterRouter.post('/deleteWeekOff', verifyToken, master.deleteWeekOff);
masterRouter.post('/editWeekOff', verifyToken, master.editWeekOff);

masterRouter.post('/createLocationMaster', verifyToken, master.createLocationMaster);
masterRouter.post('/editLocationMaster', verifyToken, master.editLocationMaster);
masterRouter.post('/getLocationMaster', verifyToken, master.getLocationMaster);
masterRouter.post('/deleteLocationMaster', verifyToken, master.deleteLocationMaster);

masterRouter.post('/createUserSalary', verifyToken, master.createUserSalary);
masterRouter.post('/editUserSalary', verifyToken, master.editUserSalary);
masterRouter.post('/getUserSalary', verifyToken, master.getUserSalary);
masterRouter.post('/deleteUserSalary', verifyToken, master.deleteUserSalary);

masterRouter.post('/getPayRoll', verifyToken, master.getPayRoll);
masterRouter.post('/updateStatusPayRoll', verifyToken, master.updateStatusPayRoll);

module.exports = masterRouter;
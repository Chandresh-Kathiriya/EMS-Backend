// routes/productivityRoute.js

const express = require('express');
const productivityRouter = express.Router();
const productivity = require('../controllers/productivityController');
const { verifyToken } = require('../middleware/jwtAuthMiddleware')

// All productivity-related routes API

// commen upload route API for (PROJECT, TASK_COMMENT, TASK_ATTECHMENT)
productivityRouter.post('/upload', verifyToken, productivity.upload.single('file'), productivity.uploadNewFile);
productivityRouter.get('/removeImageFromCloud', verifyToken, productivity.removeFileFromCloud);
productivityRouter.get('/removeFileAttechment', verifyToken, productivity.removeFileAttechment);

// Project Routes
productivityRouter.post('/project', verifyToken, productivity.getProjectData);
productivityRouter.post('/getAllProject', verifyToken, productivity.getAllProject);
productivityRouter.post('/getProject/:userId',  verifyToken, productivity.getProjectDataByUserId);
productivityRouter.post('/getAssignee/:projectId',  verifyToken, productivity.getAssigneeDataByProjectId);
productivityRouter.post('/getTaskDetails/:taskCode',  verifyToken, productivity.getTaskDetails);
productivityRouter.get('/ProjectDetails/:projectID', verifyToken, productivity.ProjectDetails);

productivityRouter.post('/addproject', verifyToken, productivity.addNewProject);
productivityRouter.post('/editProjectById/:projectId', verifyToken, productivity.editProjectById);
productivityRouter.post('/deleteProjectById/:projectId', verifyToken, productivity.deleteProjectById);
productivityRouter.post('/assignUserToProject/:projectId', verifyToken, productivity.assignUserToProject);
productivityRouter.post('/removeUserfromProject/:assignUserData', verifyToken, productivity.removeUserfromProject);

// Task Routes
productivityRouter.post('/getalltasks', verifyToken, productivity.getTaskData);
productivityRouter.post('/taskList', verifyToken, productivity.taskList);
productivityRouter.get('/getLastTaskCode', verifyToken, productivity.getLastTaskCode);
productivityRouter.get('/getTaskCodeById', verifyToken, productivity.getTaskCodeById);
productivityRouter.post('/checkEditNew', verifyToken, productivity.checkEditNew);

productivityRouter.post('/deleteTaskById/:taskId', verifyToken, productivity.deleteTaskById);
productivityRouter.post('/updateTaskStatus/:taskId', verifyToken, productivity.updateTaskStatus);
productivityRouter.post('/saveTask', verifyToken, productivity.addNewTask);
productivityRouter.post('/addTaskToDo', verifyToken, productivity.addTaskToDo);
productivityRouter.post('/updateTODO', verifyToken, productivity.updateTODO);
productivityRouter.post('/addComment', verifyToken, productivity.addComment);

// Task Timer Routes
productivityRouter.post('/getAllTaskTimer', verifyToken, productivity.getAllTaskTimer);
productivityRouter.post('/deleteTaskTimerById/:taskTimerId', verifyToken, productivity.deleteTaskTimerById);
productivityRouter.post('/startTaskTimer', verifyToken, productivity.startTaskTimer);
productivityRouter.post('/stopTaskTimer', verifyToken, productivity.stopTaskTimer);

module.exports = productivityRouter;
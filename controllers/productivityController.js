// Import required core modules and models
const sequelize = require('../config/dbConnection')
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const AssignUserProject = require('../models/AssignUserProject');
const multer = require('multer');
const TaskTimer = require('../models/TaskTimer');
const { Op, literal } = require('sequelize');
const { uploadFile, removeFile } = require('../components/cloudinary');
const TaskToDo = require('../models/TaskToDo');
const TaskComment = require('../models/TaskComment');

// --- Project Handlers ---

// Get Project data of all projects
const getProjectData = async (req, res) => {
  try {
    const { page = 1, per_page, status, user } = req.body;

    let projectWhere = {
      isDeleted: 0
    };

    let projectIds = [];

    // Filter by assigned user
    if (user) {
      const assignedProjects = await AssignUserProject.findAll({
        where: { userId: user },
        attributes: ['projectId'],
      });

      projectIds = assignedProjects.map(p => p.projectId);

      // If user has assigned projects, filter by those project IDs
      if (projectIds.length > 0) {
        projectWhere.id = { [Op.in]: projectIds };
      } else {
        // No assigned projects, return empty result
        return res.json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            per_page: parseInt(per_page) || 0,
            total_pages: 0
          }
        });
      }
    }

    // Apply status filter if provided
    if (status) {
      projectWhere.progress = status;
    }

    // Count total projects matching the filters
    const totalProjects = await Project.count({ where: projectWhere });

    // Apply pagination
    let limit, offset;
    if (per_page) {
      limit = parseInt(per_page);
      offset = (parseInt(page) - 1) * limit;
    }

    const projectQuery = {
      where: projectWhere,
      order: [['createdAt', 'DESC']],
    };

    if (limit !== undefined && offset !== undefined) {
      projectQuery.limit = limit;
      projectQuery.offset = offset;
    }

    const projects = await Project.findAll(projectQuery);

    res.json({
      success: true,
      data: projects,
      pagination: {
        total: totalProjects,
        page: parseInt(page),
        per_page: limit || totalProjects,
        total_pages: limit ? Math.ceil(totalProjects / limit) : 1
      }
    });

  } catch (error) {
    console.error('Error fetching project data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching project data',
      error: error.message
    });
  }
};


const getAllProject = async (req, res) => {
  try {
    const { user } = req.body;

    let projectWhere = {
      isDeleted: 0
    };

    // If a user filter is provided, find project IDs assigned to that user
    if (user) {
      const assignedProjects = await AssignUserProject.findAll({
        where: { userId: user },
        attributes: ['projectId'],
      });

      const projectIds = assignedProjects.map(p => p.projectId);

      if (projectIds.length > 0) {
        projectWhere.id = { [Op.in]: projectIds };
      } else {
        // No assigned projects for this user
        return res.json({
          success: true,
          data: []
        });
      }
    }

    const projects = await Project.findAll({
      where: projectWhere,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name']
    });

    res.json({
      success: true,
      data: projects
    });

  } catch (error) {
    console.error('Error fetching project data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching project data',
      error: error.message
    });
  }
};

// Get project details
const ProjectDetails = async (req, res) => {
  const projectID = req.params.projectID;

  try {
    // 1. Get Project Data
    const projectData = await Project.findOne({ where: { id: projectID } });

    // 2. Get Assigned Users with full_name
    const assignedUsersRaw = await AssignUserProject.findAll({
      where: { projectId: projectID },
      include: [{
        model: User,
        attributes: ['full_name'],
        required: true
      }]
    });

    const assignedUsers = assignedUsersRaw.map(item => ({
      ...item.dataValues,
      full_name: item.User.full_name
    }));

    // 3. Get Tasks by Project ID
    const tasks = await Task.findAll({
      attributes: ['id', 'status', 'endDate'],
      where: { projectId: projectID, isDeleted: 0 }
    });

    // Combine and respond
    return res.status(200).json({
      project: projectData,
      assignedUsers,
      tasks
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while fetching project details.'
    });
  }
};


// get Projects data based on user id
const getProjectDataByUserId = async (req, res) => {
  const userId = req.params.userId;

  try {
    const projectId = await AssignUserProject.findAll({
      attributes: [
        'projectId'
      ],
      where: {
        userId: userId
      },
    })

    const projectData = await Project.findAll({
      attributes: [
        'id',
        'name',
      ],
      where: {
        id: projectId.map(item => item.projectId)
      },
    })

    res.json({
      success: true,
      data: projectData,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while fetching the data.',
    });
  }
}

// get Assignee data based on project id
const getAssigneeDataByProjectId = async (req, res) => {
  const projectId = req.params.projectId;

  try {
    const assignees = await AssignUserProject.findAll({
      attributes: ['userId'],
      include: [
        {
          model: User,
          attributes: ['full_name'],
          where: {
            id: sequelize.col('AssignUserProject.userId')
          }
        }
      ],
      where: {
        projectId: projectId,
        isDeleted: 0
      },
      raw: true
    });

    // Transform the data to flatten the structure
    const result = assignees.map(item => ({
      userId: item.userId,
      assignee: item['User.full_name'] // or use 'full_name' if you prefer
    }));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while fetching the data.',
    });
  }
}

// get task all details
const getTaskDetails = async (req, res) => {
  const taskCode = req.params.taskCode;

  try {
    const [taskTimerData, taskCommentData, taskToDoData] = await Promise.all([
      TaskTimer.findAll({
        attributes: ['id', 'taskCode', 'userId', 'message', 'duration'],
        include: [
          {
            model: User,
            attributes: ['full_name'],
            where: {
              id: sequelize.col('taskTimer.userId'),
            },
          },
        ],
        where: {
          taskCode: taskCode,
          isDeleted: 0,
        },
      }),

      TaskComment.findAll({
        attributes: ['id', 'taskCode', 'text', 'imageURL', 'createdBy', 'isDeleted', 'createdAt'],
        include: [
          {
            model: User,
            attributes: ['full_name'],
            where: {
              id: sequelize.col('taskComment.createdBy'),
            },
          },
        ],
        where: {
          taskCode: taskCode,
          isDeleted: 0,
        },
      }),

      TaskToDo.findAll({
        attributes: ['id', 'taskCode', 'name', 'isDone', 'isDeleted', 'createdAt'],
        where: {
          taskCode: taskCode,
          isDeleted: 0,
        },
        order: [
          ['createdAt', 'DESC']  
        ]
      }),
    ]);

    res.json({
      success: true,
      data: {
        taskTimers: taskTimerData,
        taskComments: taskCommentData,
        taskToDos: taskToDoData,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while fetching the task details.',
    });
  }
};

// POST: Add a new Project
const addNewProject = async (req, res) => {
  const { filePath, projectName, projectStatus, projectProgress } = req.body;

  // Validate required fields
  if (!projectName || !projectStatus || !projectProgress) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const startDate = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

  try {
    // Create a new project record in the database
    const newProject = await Project.create({
      name: projectName,
      imageURL: filePath,
      status: projectStatus,
      progress: projectProgress,
      startdate: startDate,
    });

    return res.status(200).json({
      message: 'Project created successfully',
      data: newProject,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return res.status(500).json({
      message: 'Error creating project. Please try again later.',
    });
  }
};

// --- Task Handlers ---

// Get Task data of all tasks
const getTaskData = async (req, res) => {
  try {
    let { page, per_page, project, assignee, task, taskStatus, dateFrom, dateTo, user } = req.body;

    let limit = null;
    let offset = null;

    // Convert to numbers if provided
    page = parseInt(page);
    per_page = parseInt(per_page);

    if (page && per_page) {
      limit = per_page;
      offset = (page - 1) * per_page;
    }

    // Build the base query
    let query = {
      where: {
        isDeleted: 0
      },
      order: [
        ['createdAt', 'DESC']
      ],
      include: [
        {
          model: User,
          as: 'assigneeUser',
          attributes: ['id', 'full_name']
        },
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'full_name']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    };

    if (limit !== null) {
      query.limit = limit;
      query.offset = offset;
    }

    if (assignee) {
      query.where.assignee = assignee
    }

    if (project) {
      query.where.projectId = project
    }

    if (task) {
      query.where.code = task
    }

    if (taskStatus) {
      query.where.status = taskStatus
    }

    if (user) {
      query.where.createdBy = user;
    }

    if (dateFrom && dateTo) {
      query.where.startDate = {
        [Op.gte]: dateFrom
      };
      query.where.endDate = {
        [Op.lte]: dateTo
      };
    } else if (dateFrom) {
      query.where.startDate = {
        [Op.gte]: dateFrom
      };
    } else if (dateTo) {
      query.where.endDate = {
        [Op.lte]: dateTo
      };
    }

    // Get the data with count
    const { count, rows } = await Task.findAndCountAll(query);

    const formatTime = (seconds) => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return [hrs, mins, secs]
        .map(unit => String(unit).padStart(2, '0'))
        .join(':');
    };


    const flattenedRows = await Promise.all(rows.map(async task => {
      const taskData = task.toJSON();

      // Get total duration in seconds from MySQL
      const totalDuration = await TaskTimer.findOne({
        attributes: [
          [literal(`SUM(TIME_TO_SEC(duration))`), 'totalTaskTimeInSeconds']
        ],
        where: {
          taskCode: taskData.code,
          isDeleted: 0
        },
        raw: true
      });

      const totalSeconds = totalDuration?.totalTaskTimeInSeconds || 0;

      return {
        ...taskData,
        createdByName: taskData.createdByUser?.full_name || null,
        assigneeName: taskData.assigneeUser?.full_name || null,
        projectName: taskData.project?.name || null,
        totalTaskTime: formatTime(totalSeconds)
      };
    }));

    res.json({
      success: true,
      data: flattenedRows,
      pagination: limit !== null ? {
        total: count,
        page,
        per_page,
        total_pages: Math.ceil(count / per_page)
      } : null
    });

  } catch (error) {
    console.error('Error fetching task data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching task data',
      error: error.message
    });
  }
};

const taskList = async (req, res) => {
  const userId  = req.userId

  try {

    let query = {
      attributes: [ 'id', 'code', 'name'],
      where: {
        isDeleted: 0,
        status: 'In-Progress'
      },
      order: [
        ['createdAt', 'DESC']
      ]
    };

    if (userId  && userId !== 1) {
      query.where.createdBy = userId
    }

    const rows = await Task.findAll(query);
    res.json({
      success: true,
      data: rows,
    });

  } catch (error) {

  }
}

// Get last Task Code
const getLastTaskCode = async (req, res) => {
  try {
    const lastTask = await Task.findOne({
      order: [['code', 'DESC']], // Orders by taskID in descending order
      limit: 1, // Limits the result to 1
    });

    if (lastTask) {
      console.log('Last Task ID:', lastTask.code);
      return res.status(200).json(lastTask.code);; // Returns the last task's taskID
    } else {
      console.log('No tasks found.');
      return null; // Or handle as needed
    }
  } catch (error) {
    console.error('Error fetching last task ID:', error);
  }
}

// Get Task Code by Id
const getTaskCodeById = async (req, res) => {
  const id = req.query.id
  try {
    const lastTask = await Task.findOne({
      attributes: ['code'],
      where: { id }
    });

    if (lastTask) {
      console.log('Last Task ID:', lastTask.code);
      return res.status(200).json(lastTask.code); // Returns the last task's taskID
    } else {
      console.log('No tasks found.');
      return null; // Or handle as needed
    }
  } catch (error) {
    console.error('Error fetching last task ID:', error);
  }
}

// handle remove user from project
const removeUserfromProject = (req, res) => {
  const assignUserDataId = req.params.assignUserData
  console.log(assignUserDataId)

  try {
    const removeUser = AssignUserProject.destroy({
      where: {
        id: assignUserDataId
      }
    });
    return res.status(200).json({ message: 'User removed from project' });
  } catch (error) {
    console.log(error)
  }
}

// Edit Project By Id
const editProjectById = async (req, res) => {
  const projectId = req.params.projectId
  const { filePath, projectName, projectStatus, projectProgress } = req.body

  try {
    let project = await Project.findOne({ where: { id: projectId } });

    if (project) {
      project.imageURL = filePath;
      project.name = projectName;
      project.status = projectStatus;
      project.progress = projectProgress;

      // Save the updated task
      await project.save();

      // Respond with the updated task
      return res.status(200).json({
        message: "Project updated successfully",
        project
      });
    }
  } catch (error) {
    console.log(error)
  }
}

// Delete Project BY Id
const deleteProjectById = async (req, res) => {
  const projectId = req.params.projectId

  console.log(projectId)

  try {
    let project = await Project.findOne({ where: { id: projectId } });

    if (project) {
      project.isDeleted = 1;

      // Save the updated task
      await project.save();

      // Respond with the updated task
      return res.status(200).json({
        message: "Project Deleted",
        project
      });
    }
  } catch (error) {
    console.log(error)
  }
}

// Assign user to project
const assignUserToProject = async (req, res) => {
  const projectId = req.params.projectId
  const { userId, role } = req.body
  try {
    const AssignUser = await AssignUserProject.findOne({ where: { projectId: projectId, userID: userId } });
    if (AssignUser) {
      AssignUser.role = role;

      // Save the updated task
      await AssignUser.save();
      return res.status(200).json({
        message: "User assigned to project",
      });
    } else {
      const assignUser = AssignUserProject.create({ userId, role, projectId })
      return res.status(201).json({ message: 'User assigned to project' });
    }
  } catch (error) {
    console.log(error)
  }
}

// Delete task by ID
const deleteTaskById = async (req, res) => {
  const taskId = req.params.taskId

  try {
    let task = await Task.findOne({ where: { id: taskId } });

    if (task) {
      task.isDeleted = 1;

      await task.save();

      // Respond with the updated task
      return res.status(200).json({
        message: "Task Deleted",
        task
      });
    }
  } catch (error) {
    console.log(error)
  }
}

// Update Task Status
const updateTaskStatus = async (req, res) => {
  const taskId = req.params.taskId
  const { status, due } = req.body

  if (due === 'today' || due === 'over') {
    try {
      let endDate = ''
      if (due === 'today') {
        var datetime = new Date();
        endDate = (datetime.toISOString().slice(0, 10));
      } else if (due === 'over') {
        var datetime = new Date(Date.now() - 864e5);
        endDate = (datetime.toISOString().slice(0, 10));
      }
      let task = await Task.findOne({ where: { id: taskId } });

      if (task) {
        task.status = status;
        task.endDate = endDate;

        // Save the updated task
        await task.save();
        // Respond with the updated task
        return res.status(200).json({
          message: "Task updated successfully",
          task
        });
      }
    } catch (error) {
      console.log(error)
    }
  } else {
    try {
      let task = await Task.findOne({ where: { id: taskId } });

      if (task) {
        task.status = status;

        // Save the updated task
        await task.save();
        // Respond with the updated task
        return res.status(200).json({
          message: "Task updated successfully",
          task
        });
      }
    } catch (error) {
      console.log(error)
    }
  }
}

// Check Edit or new for task
const checkEditNew = async (req, res) => {
  const { taskId, userId } = req.body;

  if (!taskId || !userId) {
    return res.status(400).json({ success: false, message: 'Missing taskId or userId' });
  }

  try {
    const [task, created] = await Task.findOrCreate({
      where: { code: taskId, isDeleted: 0 },
      defaults: {
        status: 'In-Progress',
        createdBy: userId,
        users: [parseInt(userId)],
        assignee: userId
      }
    });

    // Reload with associations
    await task.reload({
      include: [
        {
          model: User,
          as: 'assigneeUser',
          attributes: ['id', 'full_name']
        },
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'full_name']
        }
      ]
    });

    let assignedUsers = [];

    if (task?.users && Array.isArray(task.users)) {
      const userIds = task.users;

      assignedUsers = await User.findAll({
        where: {
          id: userIds
        },
        attributes: ['id', 'full_name']
      });
    }

    return res.json({
      success: true,
      message: created ? 'New Task Created' : 'Task found',
      data: {
        ...task.toJSON(),
        createdByName: task.createdByUser?.full_name || null,
        assignedUsers
      }
    });

  } catch (error) {
    console.error('Error in checkEditNew:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// Add new task
const addNewTask = async (req, res) => {
  try {
    const { name, description, code, startDate, endDate, projectId, totalTime, status, assignee, imageURL, users } = req.body;
    // Check if a task with the same code already exists
    let task = await Task.findOne({ where: { code } });

    if (task) {

      // If task exists, update it
      task.name = name;
      task.description = description;
      task.projectId = projectId;
      task.startDate = startDate;
      task.endDate = endDate;
      task.totalTime = totalTime;
      task.status = status;
      task.assignee = assignee;
      task.users = users;

      if (imageURL) {
        // Check if task.imageURL is null or undefined and handle it
        let existingURLs = [];
      
        // If imageURL is null, set it to an empty array
        if (task.imageURL == null || task.imageURL == undefined) {
          existingURLs = [];
        } else {
          try {
            // If it's a string, parse it as a JSON array, otherwise use it as-is
            if (typeof task.imageURL === 'string') {
              existingURLs = JSON.parse(task.imageURL);
            } else if (Array.isArray(task.imageURL)) {
              existingURLs = task.imageURL;
            }
          } catch (e) {
            existingURLs = [];
          }
        }
      
        // Ensure it's an array
        if (!Array.isArray(existingURLs)) {
          existingURLs = [];
        }
      
        // Make sure imageURL is an array
        const newURLs = Array.isArray(imageURL) ? imageURL : [imageURL];
      
        // Merge and deduplicate the arrays
        const mergedURLs = [...new Set([...existingURLs, ...newURLs])];
      
        // Assign the merged image URLs back to the task
        task.imageURL = mergedURLs;
      }
      

      // Fetch project details using projectId
      if (projectId) {
        const project = await Project.findOne({ attributes: ['name'], where: { id: projectId } })
        task.projectName = project.name || '';  // Assuming the Project model has a 'name' field
      }


      // Save the updated task
      await task.save();

      // Respond with the updated task
      return res.status(200).json({
        message: "Task updated successfully",
        task
      });
    }

  } catch (error) {
    console.error("Error creating or updating task:", error);
    res.status(500).json({
      message: "Error creating or updating task",
      error: error.message
    });
  }
};

// Add task TODO
const addTaskToDo = async (req, res) => {
  const { name, code, user } = req.body

  try {
    const addTODO = TaskToDo.create({
      name,
      taskCode: code,
      createdBy: user
    })
    return res.status(200).json({
      message: "Task TODO added successfully",
      addTODO
    });
  } catch (error) {
    console.error("Error adding task TODO:", error);
    res.status(500).json({
      message: "Task TODO added Failed",
    })
  }
}

// update task TODO
const updateTODO = async (req, res) => {
  let { id, isDone, isDeleted = false, code, user } = req.body

  if (isDeleted === true) {
    isDeleted = 1
  }

  try {
    let findTODO = await TaskToDo.findOne({
      where: {
        taskCode: code,
        id: id
      }
    })

    if (!findTODO) {
      return res.status(404).json({
        message: "Task TODO not found",
      })
    }

    if (findTODO) {
      findTODO.isDone = isDone;
      findTODO.updatedBy = user;
      findTODO.isDeleted = isDeleted;

      // Save the updated task
      await findTODO.save();
      // Respond with the updated task
      return res.status(200).json({
        message: "Task TODO updated successfully",
        findTODO
      });
    }
  } catch (error) {
    console.log(error)
  }
}

// Add new Comment
const addComment = async (req, res) => {
  let { comment, files, user, taskCode } = req.body

  try {
    const response = await TaskComment.create({
      text: comment,
      imageURL: files,
      createdBy: user,
      taskCode: taskCode
    })
    return res.status(200).json({
      message: "Comment added successfully",
      response
    })
  } catch (error) {
    console.log(error, 'ERROR WHILE CREATING COMMENT')
  }
}

// --- Task Timer Handler ---

// Get all Task Timer data
const getAllTaskTimer = async (req, res) => {
  try {
    const {
      page = 1,
      per_page = 10,
      userId,
      taskCode,
      dateFrom,
      dateTo
    } = req.body;

    const offset = (page - 1) * per_page;

    // Build the base query
    let query = {
      include: [
        {
          model: User,
          attributes: ['full_name'], // Fetch only the 'full_name' from the User table
          required: true, // Ensures that only attendance records with matching users are returned
        },
      ],
      limit: parseInt(per_page),
      offset: offset,
      order: [
        ['createdAt', 'DESC']
      ],
      where: {
        isDeleted: 0
      }
    };

    if (userId) {
      query.where.userId = userId;
    }

    if (taskCode) {
      query.where.taskCode = taskCode;
    }

    if (dateFrom || dateTo) {
      query.where.createdAt = {};

      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        query.where.createdAt[Op.gte] = fromDate;
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.where.createdAt[Op.lte] = toDate;
      }
    }

    // Get the data with count
    const { count, rows } = await TaskTimer.findAndCountAll(query);

    // Format date
    const formatDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()} at ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    };

    // Process the data
    const processedData = rows.map(timer => {
      const startTime = timer.startTime;
      const endTime = timer.endTime;
      const status = endTime ? 'completed' : 'in-progress';

      return {
        id: timer.id,
        taskCode: timer.taskCode,
        userId: timer.userId,
        full_name: timer.User.full_name, // Directly include full_name
        startTime: formatDate(startTime),
        startTimeRaw: startTime,
        endTime: formatDate(endTime),
        endTimeRaw: endTime,
        duration: timer.duration,
        status,
        message: timer.message,
        isDeleted: timer.isDeleted,
        createdAt: timer.createdAt,
        updatedAt: timer.updatedAt
      };
    });

    res.json({
      success: true,
      data: processedData,
      pagination: {
        total: count,
        page: parseInt(page),
        per_page: parseInt(per_page),
        total_pages: Math.ceil(count / per_page)
      }

    });

  } catch (error) {
    console.error('Error fetching task timer data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching task timer data',
      error: error.message
    });
  }
};

// Delete Task Timer by id
const deleteTaskTimerById = async (req, res) => {
  const taskTimerId = req.params.taskTimerId

  try {
    const deleteTask = TaskTimer.update({ isDeleted: 1 }, {
      where: {
        id: taskTimerId
      }
    });
    return res.status(200).json({ message: 'Task Timer deleted' });
  } catch (error) {
    console.log(error)
  }
}

// Start Task Timer
const startTaskTimer = async (req, res) => {
  const { userId, taskCode, message } = req.body

  try {
    const today = new Date();

    // Options for date and time formatting
    const dateOptions = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const timeOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

    // Format time and date
    const time = today.toLocaleTimeString('en-IN', timeOptions).split('/').reverse().join('-');
    const date = today.toLocaleDateString('en-IN', dateOptions).split('/').reverse().join('-');

    const startTime = `${date} ${time}`;

    const startTimeTracker = TaskTimer.create({
      userId: userId,
      taskCode: taskCode,
      message: message,
      startTime: startTime
    })
    return res.status(200).json({ message: 'Task Timer started' });
  } catch (error) {
    console.log(error)
  }
}

// Stop Task Timer
const stopTaskTimer = async (req, res) => {
  const { userId, taskCode, hours, minutes, seconds, message } = req.body

  try {
    const today = new Date();

    // Options for date and time formatting
    const dateOptions = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const timeOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

    // Format time and date
    const time = today.toLocaleTimeString('en-IN', timeOptions).split('/').reverse().join('-');
    const date = today.toLocaleDateString('en-IN', dateOptions).split('/').reverse().join('-');

    const endTime = `${date} ${time}`;
    const duration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const response = await TaskTimer.update(
      {
        endTime: endTime,
        duration: duration
      },
      {
        where: {
          userId: userId,
          taskCode: taskCode
        }
      }
    );
    return res.status(200).json({ message: 'Task Timer Stoped.' });
  } catch (error) {

  }
}


// --- File Upload Logic ---

// Configure multer for file storage
const storage = multer.memoryStorage();

// Multer upload instance
const upload = multer({ storage });

// Uploading file function
const uploadNewFile = async (req, res) => {
  const fileFor = req.query.fileFor
  // const userId = req.query.userId

  if (fileFor === 'project') {
    folder = 'PROJECT_FILES'
    filePrefix = 'PROJECT_IMAGE'
  } else if (fileFor === 'task_attechment') {
    folder = 'TASK_FILES/TASK_ATTACHMENT'
    filePrefix = 'TASK_ATTACHMENT'
  } else if (fileFor === 'task_comment') {
    folder = 'TASK_FILES/COMMENT_ATTACHMENT'
    filePrefix = 'TASK_COMMENT_ATTACHMENT'
  } else if (fileFor === 'attendance') {
    folder = 'ATTENDANCE_FILES'
    filePrefix = `ATTENDANCE_ATTACHMENT`
  }

  // Validate if file is uploaded via multer
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const file = req.file;  // File is now available in memory

  try {
    const response = await uploadFile(file, folder, filePrefix)

    return res.status(200).json({
      success: true,
      message: 'Image Uploaded.',
      imageURL: response.secure_url,
      imageName: response.public_id
    });
  } catch (error) {
    console.error('Error creating record:' + error);
    return res.status(500).json({
      success: false,
      message: 'Error creating record.',
    });
  }
};

// Remove file from Cloudnary
const removeFileFromCloud = async (req, res) => {
  const fileName = req.query.fileName

  try {
    const response = await removeFile(fileName)
    if (response.result === 'ok' || response.result === 'not found') {
      return res.status(200).json({
        success: true,
        message: 'Image removed from cloudnary.',
      })
    }
  } catch (error) {
    console.error('Error removing image from cloudnary:', error);
  }
}

// remove file from DB
const removeFileAttechment = async (req, res) => {
  const fileName = req.query.fileName;
  const taskCode = req.query.taskCode;

  try {
    const findTask = await Task.findOne({
      attributes: ['id', 'imageURL'],
      where: { code: taskCode }
    });

    if (findTask && findTask.imageURL) {

      const updatedImageURLs = findTask.imageURL.filter(url => url !== fileName);

      findTask.imageURL = updatedImageURLs.length > 0 ? updatedImageURLs : null;

      // Save the updated task
      await findTask.save();

      // Send back the updated imageURL (or null)
      res.json({
        success: true,
        imageURL: findTask.imageURL,
      });

    } else {
      console.log("Task not found or imageURL is undefined");
      res.status(404).json({ success: false, message: "Task not found or imageURL missing" });
    }

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};



// Export the controller methods
module.exports = {
  upload, // Exporting the multer upload middleware for use in routes
  ProjectDetails,
  uploadNewFile,
  removeFileFromCloud,
  getAllProject,
  getLastTaskCode,
  getTaskCodeById,
  getProjectData,
  getTaskDetails,
  getProjectDataByUserId,
  getAssigneeDataByProjectId,
  addNewProject,
  getTaskData,
  taskList,
  getAllTaskTimer,
  addNewTask,
  addTaskToDo,
  updateTODO,
  addComment,
  checkEditNew,
  removeUserfromProject,
  assignUserToProject,
  deleteTaskById,
  updateTaskStatus,
  deleteTaskTimerById,
  startTaskTimer,
  editProjectById,
  deleteProjectById,
  stopTaskTimer,
  removeFileAttechment
};
// controllers/dashboardController.js

// import require core module and models
const AssignUserProject = require('../models/AssignUserProject');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { Op } = require('sequelize');

// Get DashBoard Details
exports.getDashboard = async (req, res) => {
  try {
    const { user } = req.body
    // Fetch the total counts from the database using Sequelize queries
    let querywhere = {};
    if (user) {
      // Fetch project assignments for the user
      const assignedProjects = await AssignUserProject.findAll({
        where: { userId: user },
        attributes: ['projectId'],
      });
    
      const projectIds = assignedProjects.map(p => p.projectId);
    
      // Only count projects that are assigned to the user
      totalProjects = await Project.count({
        where: {
          isDeleted: 0,
          id: projectIds.length > 0 ? { [Op.in]: projectIds } : 0 // prevent invalid SQL
        }
      });
    } else {
      // No user filter: count all projects
      totalProjects = await Project.count();
    }

    if (user) {
      querywhere.createdBy = user
    }

    const ongoingTasks = await Task.count({ where: { ...querywhere, status: 'In-Progress' } });

    // Fetch tasks due today, considering only today's date (midnight onwards)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Start of today
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999); // End of today

    const dueTodayTasks = await Task.count({
      where: {
        ...querywhere,
        endDate: {
          [Op.between]: [todayStart, todayEnd],
        },
        status: { [Op.notIn]: ['Completed', 'Done'] },
        isDeleted: 0
      },
    });

    // // Fetch overdue tasks that are not marked as completed
    const overdueTasks = await Task.count({
      where: {
        ...querywhere,
        endDate: {
          [Op.lt]: new Date(), // Tasks due before now
        },
        status: { [Op.notIn]: ['Completed', 'Done'] },
        isDeleted: 0
      },
    });

    // Return the data as a JSON response
    res.json({
      totalProjects,
      ongoingTasks,
      dueTodayTasks,
      overdueTasks,
    });
  } catch (error) {
    console.log(error)
    // Send a more descriptive error message with the stack trace for debugging
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  }
};
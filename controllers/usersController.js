// controllers/usersController.js

// import require core module and models
const User = require('../models/User');
const Role = require('../models/Role');
const PermissionSchema = require('../models/PermissionSchema');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const WeekOff = require('../models/WeekOff');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, per_page = 10, user, filterParams } = req.body;
    const offset = (page - 1) * per_page;

    // Build the base query
    let query = {
      attributes: [
        'id',
        'empCode',
        'full_name',
        'email',
        'role_id',
        'status',
        'is_deleted',
        'dateOfJoining',
        'dateOfBirth',
        'gender',
        'mobileNumber',
        'parent_id',
        'weekOffId'
      ],
      include: [
        {
          model: Role,
          attributes: ['name'],
          required: false
        },
        {
          model: User,
          as: 'reportingManager', // Match the alias from the association
          attributes: ['id', 'full_name'],
          required: false
        },
        {
          model: WeekOff,
          as: 'weekOff',
          required: false
        },
      ],
      limit: parseInt(per_page),
      offset: offset,
      where: {
        is_deleted: 0
      },
    };

    if (user) {
      query.where.id = user
    }

    if (filterParams?.name) {
      query.where.full_name = {
        [Op.like]: `%${filterParams.name}%`
      };
    }
    if (filterParams?.empCode) {
      query.where.empCode = {
        [Op.like]: `%${filterParams.empCode}%`
      };
    }
    if (filterParams?.role) {
      query.where.role_id = filterParams.role
    }
    if (filterParams?.reportingManager) {
      query.where.parent_id = filterParams.reportingManager
    }

    // Get the data with count
    const { count, rows } = await User.findAndCountAll(query);

    const processedData = rows.map(user => {
      return {
        id: user.id,
        empCode: user.empCode,
        full_name: user.full_name,
        email: user.email,
        role_id: user.role_id,
        status: user.status,
        is_deleted: user.is_deleted,
        role: user?.Role?.name ? user?.Role?.name: null,
        dateOfJoining: user.dateOfJoining,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        mobileNumber: user.mobileNumber,
        parent_id: user.parent_id,
        reportingManager: user.reportingManager?.full_name || null,
        weekOff: user.weekOff?.name || null,
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
    console.log(error, 'ERROR')
    console.error('Error fetching Users:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching holiday data',
      error: error.message
    });
  }
}

// GET ALL USERS FOR ATTENDANCE REPORT
exports.getAllUsersForAttendanceReport = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        'id',
        'full_name',
        'empCode'
      ],
      where: {
        is_deleted: 0
      }
    })

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching User data:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching User data',
    });
  }
}

// Get user for update
exports.getUser = async (req, res) => {
  const id = req.params.id; // Use const for variable declaration
  try {
    const user = await User.findOne({
      where: { id },
      attributes: ['full_name', 'id', 'email', 'role_id', 'status', 'is_deleted'] // Adjust attributes as needed
    });

    if (!user) {
      return res.status(404).json({ message: 'User  not found' });
    }

    return res.json({
      message: 'User  fetched successfully',
      user // Return the user object directly
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

// Update user by Id 
exports.editUserById = async (req, res) => {
  const { id, full_name, role, email, dateOfBirth, mobileNumber, gender, empCode, dateOfJoining, password, reportingManager, weekOff } = req.body;

  try {
    const user = await User.findOne({ where: { id } });
    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: 'User  not found' });
    }

    // Update the user with the new data
    const updateData = { };
    
    // Add password only if it exists
    if (password) {
      let hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }
    if (email) {
      updateData.email = email
    }
    if (full_name) {
      updateData.full_name = full_name
    }
    if (dateOfBirth) {
      updateData.dateOfBirth = dateOfBirth
    }
    if (mobileNumber) {
      updateData.mobileNumber = mobileNumber
    }
    if (gender) {
      updateData.gender = gender
    }
    if (empCode) {
      updateData.empCode = empCode
    }
    if (role) {
      updateData.role_id = role
    }
    if (dateOfJoining) {
      updateData.dateOfJoining = dateOfJoining
    }
    if (reportingManager) {
      updateData.parent_id = reportingManager
    }
    if (weekOff) {
      updateData.weekOffId = weekOff
    }
    
    await user.update(updateData);

    // Return a success response
    return res.status(200).json({
      message: 'User updated successfully',

    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Error updating user', error: error.message });
  }
}

// Create User
exports.createUser = async (req, res) => {
  const { email, password, full_name, role, reportingManager, dateOfBirth, mobileNumber, gender, empCode, dateOfJoining, weekOff } = req.body;
  
  try {
    const findEmail = await User.findOne({
      where: {
        email: email
      }
    })
    if (findEmail) {
      return res.status(200).json({
        message: 'User alredy exist.',
      });
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        email,
        password : hashedPassword,
        dateOfBirth,
        mobileNumber,
        gender,
        empCode,
        dateOfJoining,
        full_name,
        role_id : role,
        parent_id : reportingManager,
        weekOffId: weekOff
      });
    }
    // Return a success response
    return res.status(200).json({
      message: 'User created successfully.',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Error updating user', error: error.message });
  }
}

// Get permission Schema
exports.getPermissionSchema = async (req, res) => {
  try {
    const getData = await PermissionSchema.findAll({})
    return res.json({ getData })
  } catch (error) {
    console.error('Error while get permission data:', error);
    return res.status(500).json({ message: 'Error while get permission data', error: error.message });
  }
}

// get role all data
exports.getRoleData = async (req, res) => {
  try {
    const roles = await Role.findAll({});
    return res.json({ roles })
  } catch (error) {
    console.error('Error while get role data:', error);
    return res.status(500).json({ message: 'Error while get role data', error: error.message });
  }
}

// get roll data for particular attributes
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ['id', 'name'],
      where: {
        isDeleted: 0
      }
    });
    return res.json({ roles })
  } catch (error) {
    console.error('Error while get role data:', error);
    return res.status(500).json({ message: 'Error while get role data', error: error.message });
  }
}

// get role data by ID
exports.getRole = async (req, res) => {
  try {
    const id = req.params.roleID;
    const role = await Role.findOne({ where: { id: id } })
    return res.json({ role })
  } catch (error) {
    console.log(error)
  }
}

// add new role
exports.addNewRole = async (req, res) => {
  const { roleName, permissions } = req.body

  try {
    const addRole = await Role.create({
      name: roleName,
      permissions: permissions,
    })
    return res.status(200).json({
      message: 'Role created successfully',
      data: addRole,
    });
  } catch (error) {
    console.error('Error add new role:', error);
    return res.status(500).json({ message: 'Error add new role', error: error.message });
  }
}

// delete role 
exports.deleteRole = async (req, res) => {
  const roleID = req.params.id
  console.log(roleID)

  try {
    const role = await Role.findOne({ where: { id: roleID } })

    if (!role) {
      return res.status(404).json({ message: 'User  not found' });
    }

    await role.update({
      isDeleted: 1
    });

    // Return a success response
    return res.status(200).json({
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('Error delete role:', error);
    return res.status(500).json({ message: 'Error delete role', error: error.message });
  }
}

// update role by ID
exports.updateRole = async (req, res) => {
  const roleID = req.params.roleID
  const { roleName, permissions } = req.body
  console.log(roleID)
  try {
    const role = await Role.findOne({ where: { id: roleID } })

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Update the role
    await role.update({
      roleName: roleName,
      permissions: permissions
    });

    // Return a success response
    return res.status(200).json({
      message: 'Role updated successfully',
    });
  } catch (error) {
    console.error('Error updating role:', error);
    return res.status(500).json({ message: 'Error updating role', error: error.message });
  }
}

// Delete user 
exports.deleteUser = async (req, res) => {
  const { user } = req.body;

  try {
    const userData = await User.findOne({
      where: {
        id: user
      }
    });

    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }

    userData.is_deleted = 1;
    await userData.save();

    return res.status(200).json({ message: 'User deleted successfully!!' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};
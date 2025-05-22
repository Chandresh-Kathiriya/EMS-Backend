// controllers/profileController.js

// import require core module and models
const bcrypt = require('bcrypt')
const User = require('../models/User');
const Role = require('../models/Role');

// Get User data for Profile
exports.getProfileData = async (req, res) => {
  const id = req.params.id;

  try {
    const user = await User.findOne({
      where: { id: req.params.id },
      include: [{
        model: Role,
        as: 'Role', // This corresponds to the alias you set in the association
        attributes: ['name'], // Only retrieve the 'name' attribute from Role
      }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send back the user profile data
    res.json({
      userID: user.id,
      empCode: user.empCode,
      full_name: user.full_name,
      email: user.email,
      roleID: user.role_id, // Use role_id from user
      roleName: user.Role ? user.Role.name : null, // Access role name
      status: user.status,
      parentID: user.parent_id, // Use parent_id from user
      dateOfJoining: user.dateOfJoining,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      mobileNo: user.mobileNumber
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Upadate user profile
exports.editUserProfile = async (req, res) => {
  const id = req.params.id; // Get the user ID from the request parameters

  const { full_name, status } = req.body; // Destructure the request body

  try {
    // Find the user by ID
    const user = await User.findOne({ where: { id } });
    console.log('User found:', user);

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user with the new data
    await user.update({
      full_name,
      status,
    });

    // Return a success response
    return res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        full_name: user.full_name,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// Change User Password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { id } = req.params;

  try {
    // Find the user by ID
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the current password matches
    const isMatch = await user.comparePassword(currentPassword);  // Use the method here
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash the new password before saving
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Save the updated user object with the hashed password
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error changing password' });
  }
};
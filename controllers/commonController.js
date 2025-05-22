// controllers/commonController.js

// import require core module and models
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const ResetPassword = require('../models/ResetPassword');
const AttendanceSetting = require('../models/AttendanceSetting');
const SMTPSetting = require('../models/SMTPSetting');
const LocationMaster = require('../models/LocationMaster');

// Login logic
exports.loginData = async (req, res) => {
  // await checkDatabaseConnection();
  const { email, password } = req.body; // Get email and password from the request body

  try {
    // Fetch the user based on the user's email
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'full_name', 'empCode', 'email', 'password', 'role_id', 'is_deleted']
    });

    // If user not found in db
    if (!user) {
      return res.json({ message: 'Invalid Credentials' }); // 401 Unauthorized for invalid credentials
    }

    // Fetch the role based on the user's role_id
    const role = await Role.findOne({
      where: { id: user.role_id },
      attributes: ['name'] // Specify the attributes to retrieve
    });

    // Compare the provided password with the stored password
    const isPasswordValid = await bcrypt.compare(password, user.password); // Assuming user.password is hashed

    // Send response after password check
    if (isPasswordValid) {
      if (user.is_deleted === 1) {
        return res.json({ message: 'Your account has been deleted' });
      }

      const token = jwt.sign({ id: user.id, roleId: user.role_id }, process.env.JWT_SECRET || 'Hello12345', { expiresIn: '30d' });

      // Return successful login response
      return res.json({
        message: 'Login successful',
        user: {
          ...user.toJSON(),
          token: token,
          role: role ? role.name : null,
          userName: user.full_name,
          empCode: user.empCode,
          userEmail: user.email,
        },
      });
    } else {
      return res.json({ message: 'Password Not Match, Login Failed' }); // 401 Unauthorized if password doesn't match
    }
  } catch (error) {
    console.error('Error during login:' + error);
    return res.json({ message: 'Error occurred during login', error: error.message }); // 500 Internal Server Error for unexpected issues
  }
};

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes
const IV_LENGTH = 16;

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts[0], 'hex');
  const encryptedText = Buffer.from(textParts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function getSmtpDataFromDB() {
  const data = await SMTPSetting.findOne();
  if (data) {
    const decryptedPass = decrypt(data?.password)
    return {
      host: data.host,
      port: data.port,
      userEmail: data.userEmail,
      password: decryptedPass,
      fromName: data.fromName,
      emailFrom: data.emailFrom,
      bbcEmail: data.bbcEmail
    };
  }
  throw new Error('SMTP configuration not found');
}

// Function to send email
const sendMail = (transporter, mailOptions) => {
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return reject(error);
      }
      resolve(info);
    });
  });
};

exports.resetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'email', 'full_name']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    // Save reset token
    await ResetPassword.create({
      userId: user.id,
      token,
      isUsed: 0,
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    // Get SMTP config from DB
    const smtpData = await getSmtpDataFromDB();

    // Create a new transporter using DB credentials
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpData.userEmail,
        pass: smtpData.password,
      },
    });

    const mailOptions = {
      from: `${smtpData.emailFrom}`,
      to: email,
      bcc: smtpData.bbcEmail || undefined,
      subject: 'Reset Your Password - Action Required',
      html: `
        <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
          <p>Dear ${user.full_name || 'User'},</p>

          <p>We received a request to reset your password for your account. If you initiated this request, please click the link below to set a new password:</p>

          <p style="text-align: center; margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #338DB5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Reset Password
            </a>
          </p>

          <p>If you did not request this password reset, please ignore this email. The link will expire in 10 minutes for your security.</p>

          <p>Thank you,<br><strong>JiyanTech</strong></p>

          <hr style="margin-top: 30px;" />
          <small style="color: #888;">If the button above doesn't work, copy and paste the following link into your browser:</small>
          <p style="word-break: break-all;">
            <a href="${resetLink}" style="color: #007bff;">${resetLink}</a>
          </p>
        </div>
      `,
    };

    await sendMail(transporter, mailOptions);

    return res.status(200).json({ message: 'Password reset link sent successfully' });

  } catch (error) {
    console.error('Error in resetPassword:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.verifyPassword = async (req, res) => {
  const { password, token } = req.body;

  try {
    // 1. Find token in DB
    const tokenRecord = await ResetPassword.findOne({ where: { token } });

    if (!tokenRecord) {
      return res.json({ message: 'Token not found or invalid' });
    }

    // 2. Check if already used
    if (tokenRecord.isUsed) {
      return res.json({ message: 'Token has already been used' });
    }

    // 3. Check if expired
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      const user = await User.findByPk(userId);
      if (!user) return res.json({ message: 'User not found' });

      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      await user.save();

      tokenRecord.isUsed = 1;
      await tokenRecord.save();

      return res.json({ message: 'Password reset successful' });

    } catch (err) {
      return res.json({ message: 'Token expired or invalid' });
    }

  } catch (error) {
    console.error('Password reset error:', error);
    return res.json({ message: 'Server error' });
  }
};

exports.getPermission = async (req, res) => {
  const roleId = req.roleId
  try {
    const rolePermission = await Role.findOne({
      where: { id: roleId },
      attributes: ['name', 'permissions'] // Specify the attributes to retrieve
    });
    const punchPermission = await AttendanceSetting.findOne();
    const SMTPPermission = await SMTPSetting.findOne();
    const locationMasterPermission = await LocationMaster.findOne({
      where: {
        isDeleted : 0
      },
      order: [['createdAt', 'DESC']]
    })

    const displayPassword = decrypt(SMTPPermission.password)
    res.json({
      success: true,
      permission: rolePermission.permissions,
      punchPermission: punchPermission,
      smtpPermission: {
        ...SMTPPermission.toJSON(), // Sequelize models need .toJSON() to return plain object
        password: displayPassword // You should only return this if it's necessary
      },
      locationMasterPermission: locationMasterPermission
    });
  } catch (error) {
    console.log(error)
  }
}
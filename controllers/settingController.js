// controllers/settingController.js

// import require core module and models
const crypto = require('crypto');
const SMTPSetting = require('../models/SMTPSetting');
const AttendanceSetting = require('../models/AttendanceSetting');


const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts[0], 'hex');
  const encryptedText = Buffer.from(textParts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}


exports.attendance = async (req, res) => {
  try {
    const image = req.body.image;

    const imageValue = image ? 1 : 0;

    const existingAttendance = await AttendanceSetting.findOne();

    if (existingAttendance) {
      existingAttendance.image = imageValue;
      await existingAttendance.save();

      return res.status(200).json({
        message: 'Attendance settings updated successfully!',
        data: existingAttendance
      });
    } else {
      const attendanceData = await AttendanceSetting.create({ image: imageValue });

      return res.status(201).json({
        message: 'Attendance settings created successfully!',
        data: attendanceData
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while processing attendance settings.',
      error: error.message
    });
  }
};

exports.smtp = async (req, res) => {
  try {
    const { host, port, userEmail, password, fromName, emailFrom, bbcEmail } = req.body;

    const existingSMTP = await SMTPSetting.findOne();

    const savePassword = encrypt(password)

    if (existingSMTP) {
      existingSMTP.host = host;
      existingSMTP.port = port;
      existingSMTP.userEmail = userEmail;
      existingSMTP.password = savePassword;
      existingSMTP.fromName = fromName;
      existingSMTP.emailFrom = emailFrom;
      existingSMTP.bbcEmail = bbcEmail;
      await existingSMTP.save();

      return res.status(200).json({
        message: 'SMTP settings updated successfully!',
        data: existingSMTP
      });
    } else {
      const SMTPData = await SMTPSetting.create({
        host, port, userEmail, password : savePassword, fromName, emailFrom, bbcEmail
      });

      const displayPassword = decrypt(SMTPData.password)

      return res.status(201).json({
        message: 'SMTP settings created successfully!',
        data: {
          ...SMTPData.toJSON(), // Sequelize models need .toJSON() to return plain object
          password: displayPassword // You should only return this if it's necessary
        }
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while processing SMTP settings.',
      error: error.message
    });
  }
}

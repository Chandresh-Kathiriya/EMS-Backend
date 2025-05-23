// config/dbConnection.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  '',  // empty string if password is null
  {
    timezone: 'Asia/Kolkata',
    host: process.env.DB_HOST,
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
  }
);


module.exports = sequelize;

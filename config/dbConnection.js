// config/dbConnection.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, "", {
    timezone: 'Asia/Kolkata',
    host: process.env.DB_HOST,
    dialect: 'mysql',
});

module.exports = sequelize;

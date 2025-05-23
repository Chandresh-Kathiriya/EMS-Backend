// index.js

// Import core module
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

// const session = require('express-session')
const commonRoutes = require('./routes/commonRoute')
const attendanceRoutes = require('./routes/attendanceRoute')
const dashboardRoutes = require('./routes/dashboardRoute')
const productivityRoutes = require('./routes/productivityRoute')
const leaveRoutes = require('./routes/leaveRoute')
const profileRoutes = require('./routes/profileRoute')
const masterRoutes = require('./routes/masterRoute')
const usersRoutes = require('./routes/usersRoute')
const settingRoutes = require('./routes/settingRoute')
const { runCronWithRetry } = require('./controllers/cronJob');

// Make app using express
const app = express();
const PORT = process.env.PORT;

// app.use(cors({
//   origin: ['http://localhost:3000', 'http://192.168.1.4:3000'],
//   credentials: true
// }));

app.use(cors({
  origin: 'https://celebrated-conkies-f5f1a1.netlify.app/', // ✅ your Netlify domain
  credentials: true // ✅ allow credentials
}));

app.options('*', cors({ // ✅ allow preflight
  origin: 'https://celebrated-conkies-f5f1a1.netlify.app/',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/trigger-payroll', async (req, res) => {
  try {
    const result = await runCronWithRetry(0);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).send('Error triggering payroll population: ' + error.message);
  }
});

// app.use('/api', routes);
app.use('/attendance', attendanceRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/productivity', productivityRoutes);
app.use('/leave', leaveRoutes);
app.use('/profile', profileRoutes);
app.use('/users', usersRoutes);
app.use('/master', masterRoutes);
app.use('/common', commonRoutes);
app.use('/setting', settingRoutes);

const host = '0.0.0.0';  // Ensure it's accessible on your local network
app.listen(PORT, host, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Accessible at: http://192.168.1.4:${PORT}`);
});

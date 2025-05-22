const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  let token = req.headers['authorization']?.split(' ')[1];

  // console.log(token)

  // if (!token) return res.status(401).json({ message: 'Unauthorized - please log in' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.roleId = decoded.roleId
    req.userId = decoded.id
    next();
  } catch (error) {
    console.log(error, "ERROR")
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken };
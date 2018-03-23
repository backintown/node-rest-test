const jwt = require('jsonwebtoken');

checkUserType = (userType, user) => {
  return (req, res, next) => {
    try {
      //get token from auth header
      const token = req.headers.authorization.split(' ')[1] //auth header = 'Bearer abcd...sda
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      //store user information for use in other middlewares
      res.locals.userData = decoded;

      //for checking if a specific user role is required
      if (userType) {
        console.log('type checking')
        if (res.locals.userData.userType === userType) {
          next();
        } else {
          res.status(401).json({
            message: 'You\'re not allowed to access this'
          })
        }
      } else { //for just checking login
        next()
      }
    }
    catch (err) {
      console.log(err)
      return res.status(401).json({
        message: 'Auth failed'
      });
    }
  }
}

const validateUser = (userData, userId) => {
  //admins can access all routes
  if (userData.userType === 'admin') {
    return true;
    //validate if logged in user matches given user id
  } else if (userData.userId === userId) {
    return true;
  } else {
    return false;
  }
}
const requireLogin = checkUserType();
const requireAdmin = checkUserType('admin');

module.exports = { requireLogin, requireAdmin, validateUser }
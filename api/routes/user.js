const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const checkAuth = require('../middleware/check-auth');

const User = require('../../models/user');

router.get('/', checkAuth.requireAdmin, (req, res, next) => {
  User.find()
    .select('-__v')
    .exec()
    .then(result => {
      res.status(200).json({
        count: result.length,
        users: result.map(user => {
          return {
            userId: user._id,
            email: user.email,
            userType: user.userType
          }
        })
      });
    });
});
router.get('/:userId', checkAuth.requireLogin, (req, res, next) => {
  const id = req.params.userId;
  User.findById(id)
    .select('-__v')
    .exec()
    .then(result => {
      if (result) {
        if (checkAuth.validateUser(res.locals.userData, id)) {
          res.status(200).json({
            userId: result._id,
            email: result.email,
            request: {
              type: 'GET',
              url: `http://localhost:3000/user/${result._id}`
            }
          });
        } else {
          return res.status(401).json({
            message: 'You\'re not allowed to access this user'
          });
        }
      } else {
        res.status(404).json({
          message: 'User does not exist'
        })
      }
    })
    .catch(err => {
      res.status(500).json({
        error: 'Invalid user ID'
      })
    })
});

router.post('/signup', (req, res, next) => {
  User.find({ email: req.body.email })
    .exec()
    .then(user => {
      if (user.length > 0) {
        return res.status(409).json({
          message: 'email already exists'
        })
      } else {
        bcrypt.hash(req.body.password, 10, (err, hash) => {
          if (err) {
            return res.status(500).json({
              error: err
            });
          } else {
            const user = new User({
              email: req.body.email,
              password: hash,
              userType: req.body.userType
            });
            user.save()
              .then(result => {
                res.status(200).json({
                  message: "User created",
                  user: {
                    id: result._id,
                    email: result.email,
                    userType: result.userType,
                    request: {
                      type: 'GET',
                      url: `http://localhost:3000/user/${result._id}`
                    }
                  }
                })
              })
              .catch(err => {
                console.log(err)
                res.status(500).json({ error: err })
              });
          }
        });
      }
    })
});

router.post('/login', (req, res, next) => {
  User.find({ email: req.body.email })
    .select('-__v')
    .exec()
    .then(users => {
      //return auth failed if no users found, incorrect email
      if (users.length < 1) {
        return res.status(401).json({
          message: "Auth failed"
        });
      }
      bcrypt.compare(req.body.password, users[0].password, (err, result) => {
        //if error, auth failed
        if (err) {
          return res.status(401).json({
            message: 'Auth failed'
          });
        }
        //result = true or false
        if (result) { //return success if true
          console.log(users[0].userType)
          const token = jwt.sign(
            {
              email: users[0].email,
              userId: users[0]._id,
              userType: users[0].userType
            },
            process.env.JWT_KEY,
            {
              expiresIn: "1h"
            });
          return res.status(200).json({
            message: 'Auth successful',
            token
          });
        }
        //if no error and result is false, wrong password
        res.status(401).json({
          message: 'Auth failed'
        });
      });
    })
    .catch(err => {
      res.status(401).json({
        message: 'Auth failed'
      });
    })
})

router.delete('/:userId', checkAuth.requireLogin, (req, res, next) => {
  const id = req.params.userId;
  //find user and delete if the user is the logged in user
  User.findById(id)
    .exec()
    .then(result => {
      if (result) {
        if (checkAuth.validateUser(res.locals.userData, id)) {
          User.remove({ _id: id })
            .exec()
            .then(result => {
              res.status(200).json({
                message: `${id} deleted`
              });
            })
            .catch(err => {
              res.status(500).json({
                error: err
              });
            });
        } else {
          return res.status(401).json({
            message: 'You\'re not allowed to delete this user'
          })
        }
      } else {
        return res.status(404).json({
          message: 'User does not exist'
        })
      }
    })
});
module.exports = router;
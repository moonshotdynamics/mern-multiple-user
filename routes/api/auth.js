const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const validator = require("validator");
const isEmpty = require("lodash/isEmpty");
const key = require("../../config/dbSecretKeys");

// bring in user model
require("../../models/User");
const User = mongoose.model("users");

function validateInput(data) {
  let errors = {};

  if (validator.isEmpty(data.name)) {
    errors.name = "name is required";
  }
  if (validator.isEmpty(data.email)) {
    errors.email = "email is required";
  }
  if (!validator.isEmail(data.email)) {
    errors.email = "email is not valid";
  }
  if (validator.isEmpty(data.password)) {
    errors.password = "password is required";
  }
  if (validator.isEmpty(data.password2)) {
    errors.password2 = "confirm password is required";
  }
  if (!validator.equals(data.password, data.password2)) {
    errors.password2 = "confirm password did not match";
  }
  return {
    errors,
    isValid: isEmpty(errors)
  };
}

// POST | api/auth/register
// register process
router.post("/register", (req, res, next) => {
  const { errors, isValid } = validateInput(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  } else {
    User.findOne({ email: req.body.email }).then(user => {
      if (user) {
        errors.email = "Email already exists";
        return res.status(400).json(errors);
      } else {
        const newUser = new User({
          name: req.body.name,
          email: req.body.email,
          password: req.body.password
        });
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) {
              res.json({ success: false, msg: "Failed to register user" });
            } else {
              newUser.password = hash;
              newUser.save().then(user => {
                res.json({ success: true, msg: "User registered" });
              });
            }
          });
        });
      }
    });
  }
});

// POST | api/auth/login
// Login process
router.post("/login", (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  if (!req.body.email) {
    return res.json({ success: false, msg: "Email is required" });
  }
  if (!req.body.password) {
    return res.json({ success: false, msg: "Password is required" });
  } else {
    User.findOne({ email }).then(user => {
      // check for user
      if (!user) {
        return res.json({ success: false, msg: "User not found" });
      } else {
        // check password
        bcrypt.compare(password, user.password).then(isMatch => {
          if (isMatch) {
            // user matched
            const payload = {
              id: user.id,
              name: user.name,
              // email: user.email,
              role: user.role
            }; // create JWT payload
            // sign token
            jwt.sign(
              payload,
              key.secretOrKey,
              { expiresIn: 86400 },
              (err, token) => {
                res.json({
                  success: true,
                  token: "JWT " + token
                });
              }
            );
          } else {
            return res.json({ success: false, msg: "Password incorrect" });
          }
        });
      }
    });
  }
});

// test if the backend is secured
router.get(
  "/test",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({ message: "you are authorized" });
  }
);

module.exports = router;

const express = require('express');
const passport = require('passport');
const {BasicStrategy} = require('passport-http');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const {User} = require('./models');

const router = express.Router();

router.use(jsonParser);

const basicStrategy = new BasicStrategy((username, password, callback) => {
  let user;
  User
    .findOne({username: username}).exec()
    .then(_user => {
      user = _user;
      if (!user) {
        return callback(null, false, {message: "Incorrect username"});
      }
      return user.validatePassword(password);
     })
    .then(isValid => {
      if (!isValid) {
        return callback(null, false, {message: "Incorrect password"}); 
      }
      return callback(null, user);
  });
});

passport.use(basicStrategy);

router.use(passport.initialize());

router.post('/', (req, res) => {
  let {username, password, firstName, lastName} = req.body;

  if (!req.body) {
    return res.status(400).json({message: "No request body present"});
  }

  if (username === "" || username === " ") {
    return res.status(422).json({message: "no username defined"});
  }
  
  if (password === "" || password === " ") {
    return res.status(400).json({message: "no password defined"});
  }

  username = username.trim();
  password = password.trim();

  return User
    .find({username: username}) // example had just username
    .count()
    .exec()
    .then(count => {
      if (count > 0) {
        return res.status(422).json({message: "Account already exists"});
      } 
      return User.hashPassword(password);
    }).then(hash => {
      return User.create({
        firstName: firstName,
        lastName: lastName,
        username: username,
        password: hash
      });
    }).then(user => {
      return res.status(201).json(user.apiRepr());
    })
    .catch(error => {
      return res.status(500).json({message: "internal ooops *insert umbrella man"});
    });
});


const express = require('express');
const passport = require('passport');
const {BasicStrategy} = require('passport-http');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

const {User} = require('./models');

const router = express.Router();

router.use(jsonParser);


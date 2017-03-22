const mocha = require('mocha');
const chai = require('chai');
const faker = require('faker');
const chaiHttp = require('chai-http');

const should = chai.should();
chai.use(chaiHttp);

const {TEST_DATABASE_URL} = require('../config');
const {app, runServer, closeServer} = require('../server');
const {BlogPost} = require('../models');


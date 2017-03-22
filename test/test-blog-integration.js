const mocha = require('mocha');
const chai = require('chai');
const faker = require('faker');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const should = chai.should();

const {TEST_DATABASE_URL} = require('../config');
const {app, runServer, closeServer} = require('../server');
const {BlogPost} = require('../models');

mongoose.Promise = global.Promise;
chai.use(chaiHttp);

function fakePost(){
  return {
    title: faker.company.catchPhrase(),
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
    },
    content: faker.lorem.sentence()
  } 
}
function seedBlogData(){
  let fakeData = [];
  for(var i = 0; i<10; i++){
    fakeData.push(fakePost());
  }
  return BlogPost.insertMany(fakeData);
}
function tearDownDB(){
  console.warn("Deleting Database");
  return mongoose.connection.dropDatabase(); 
}
describe('Test BlogPost CRUD functions', function () {
  before(function () {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function () {
    return seedBlogData();
  });

  afterEach(function () {
    return tearDownDB();
  });

  after(function () {
    return closeServer();
  });

  describe('GET endpoint', function () {
    it('should return all posts', function () {
      let response;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          response = res;
          res.should.have.status(200);
          res.body.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(res) {
          response.body.should.have.length.of(res);
        })
    });
    it('should return posts with necessary fields', function () {
      let firstPost;
      return chai.request(app)
        .get('/posts')
        .then(function (res) {
          firstPost = res.body[0];
          res.body.should.be.an('array');
          res.should.be.json;
          res.body[0].should.include.keys('title', 'content', 'author', 'created', 'id');
          res.body[0].author.should.be.a('string');
          res.body[0].title.should.be.a('string');
          res.body[0].content.should.be.a('string');
          return chai.request(app)
          .get(`/posts/${firstPost.id}`)
          .then (function (res) {
            console.log(res.body);
            console.log(firstPost);
            res.body.title.should.equal(firstPost.title);
            res.body.content.should.equal(firstPost.content);
            res.body.author.should.equal(firstPost.author);
            res.body.created.should.equal(firstPost.created);
            res.body.id.should.equal(firstPost.id);
          });
        });
    });
  });

  // describe('POST endpoint', function () {

  // });

  // describe('PUT endpoint', function () {

  // });
  // describe('DELETE endpoint', function () {

  // });

})
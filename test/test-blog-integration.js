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
            res.body.title.should.equal(firstPost.title);
            res.body.content.should.equal(firstPost.content);
            res.body.author.should.equal(firstPost.author);
            res.body.created.should.equal(firstPost.created);
            res.body.id.should.equal(firstPost.id);
          });
        });
    });
  });

  describe('POST endpoint', function () {
    it('Should return a new post, and should match what we send', function(){      
      let newPost = fakePost();
      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res){
          res.should.have.status(201);
          res.body.should.be.an('object');
          res.body.title.should.equal(newPost.title);
          res.body.author.should.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);
          res.body.content.should.equal(newPost.content);
          res.body.should.include.keys('title', 'author', 'content', 'created', 'id');
          res.body.id.should.not.be.null;
          newPost.id = res.body.id;
          return BlogPost.findById(newPost.id)
        })
        .then(function(res){
          res.should.be.an('object');
          res.title.should.equal(newPost.title);
          res.author.firstName.should.equal(newPost.author.firstName);
          res.author.lastName.should.equal(newPost.author.lastName); 
          res.content.should.equal(newPost.content);
          // res.should.contain.keys('title', 'author', 'content', 'created', '_id');
          res._id.should.not.be.null;
        })
    })
  });

  describe('PUT endpoint', function () {
    it('should change the appropriate post', function () {
      let putData = {
        title: 'buhbuhblah',
        content: 'ipsumlorem',
        author: {
          firstName: 'No',
          lastName: 'Name'
        }
      }
      let firstData;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          putData.id = res.body[0].id;
          firstData = res.body[0];
          return chai.request(app)
            .put(`/posts/${res.body[0].id}`)
            .send(putData)
            .then(function(res) {
              res.should.have.status(201);
              res.should.be.json;
              res.body.should.be.an('object');
              res.body.title.should.equal(putData.title);
              res.body.content.should.equal(putData.content);
              res.body.author.should.equal(`${putData.author.firstName} ${putData.author.lastName}`);
              res.body.id.should.equal(firstData.id);
              res.body.created.should.equal(firstData.created);
            });
        });
    });
  });
  describe('DELETE endpoint', function () {
    it('should delete specified Blogpost', function(){
      let postId;
      return chai.request(app)
        .get('/posts')
        .then(function(res){
          postId = res.body[0].id;
          console.log(postId);
          return chai.request(app).delete(`/posts/${postId}`)
          .then(function(res) {
            res.should.have.status(204);
            return BlogPost.findById(postId).exec();
          })
          .then(function(res){
            console.log(res);
            should.not.exist(res);
          })
        })
    })
  });
})
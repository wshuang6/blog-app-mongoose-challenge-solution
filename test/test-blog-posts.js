const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout
// this module
const should = chai.should();

const {DATABASE_URL} = require('../config');
const {BlogPost} = require('../models');
const {User,  basicStrategy} = require('../Users');
const {closeServer, runServer, app} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

// this function deletes the entire database.
// we'll call it in an `afterEach` block below
// to ensure  ata from one test does not stick
// around for next one
function tearDownDb() {
  return new Promise((resolve, reject) => {
    console.warn('Deleting database');
    mongoose.connection.dropDatabase()
      .then(result => resolve(result))
      .catch(err => reject(err))
  });
}


// used to put randomish documents in db
// so we have data to work with and assert about.
// we use the Faker library to automatically
// generate placeholder values for author, title, content
// and then we insert that data into mongo
function seedBlogPostData() {
  console.info('seeding blog post data');
  const seedData = [];
  for (let i=1; i<=10; i++) {
    seedData.push({
      author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      },
      title: faker.lorem.sentence(),
      content: faker.lorem.text()
    });
  }
  // this will return a promise
  return BlogPost.insertMany(seedData);
}

function seedUser() {
  return User.create({
    "firstName": faker.name.firstName(),
    "lastName": faker.name.lastName(),
    "username": 'xav3x',
    "password": "$2a$10$KlEiLt91w38IgLjWCsX/FuVko01ekMBXiA6celeefbZFSCFLjfw8G"
  });
}

describe('blog posts API resource', function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedUser();
  });

  beforeEach(function() {
    return seedBlogPostData();
  });

  afterEach(function() {
    // tear down database so we ensure no state from this test
    // effects any coming after.
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  // note the use of nested `describe` blocks.
  // this allows us to make clearer, more discrete tests that focus
  // on proving something small
  describe('GET endpoint', function() {

    it('should return all existing posts', function() {
      // strategy:
      //    1. get back all posts returned by by GET request to `/posts`
      //    2. prove res has right status, data type
      //    3. prove the number of posts we got back is equal to number
      //       in db.
      let res;
      return chai.request(app)
        .get('/posts')
        .then(_res => {
          res = _res;
          res.should.have.status(200);
          // otherwise our db seeding didn't work
          res.body.should.have.length.of.at.least(1);

          return BlogPost.count();
        })
        .then(count => {
          // the number of returned posts should be same
          // as number of posts in DB
          res.body.should.have.length.of(count);
        });
    });

    it('should return posts with right fields', function() {
      // Strategy: Get back all posts, and ensure they have expected keys

      let resPost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {

          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('array');
          res.body.should.have.length.of.at.least(1);

          res.body.forEach(function(post) {
            post.should.be.a('object');
            post.should.include.keys('id', 'title', 'content', 'author', 'created');
          });
          // just check one of the posts that its values match with those in db
          // and we'll assume it's true for rest
          resPost = res.body[0];
          return BlogPost.findById(resPost.id).exec();
        })
        .then(post => {
          resPost.title.should.equal(post.title);
          resPost.content.should.equal(post.content);
          resPost.author.should.equal(post.authorName);
        });
    });
  });

  describe('POST endpoint', function() {
    const newPost = {
      title: faker.lorem.sentence(),
      author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
      },
      content: faker.lorem.text()
    };
    // strategy: make a POST request with data,
    // then prove that the post we get back has
    // right keys, and that `id` is there (which means
    // the data was inserted into db)
    it('should add a new blog post', function() {
      return chai.request(app)
        .post('/posts')
        .auth('xav3x', '123456')
        .send(newPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
            'id', 'title', 'content', 'author', 'created');
          res.body.title.should.equal(newPost.title);
          // cause Mongo should have created id on insertion
          res.body.id.should.not.be.null;
          res.body.author.should.equal(
            `${newPost.author.firstName} ${newPost.author.lastName}`);
          res.body.content.should.equal(newPost.content);
          return BlogPost.findById(res.body.id).exec();
        })
        .then(function(post) {
          post.title.should.equal(newPost.title);
          post.content.should.equal(newPost.content);
          post.author.firstName.should.equal(newPost.author.firstName);
          post.author.lastName.should.equal(newPost.author.lastName);
        })
    });
    it ('should have unauthorized error if wrong password', function () {
      return chai.request(app)
        .post('/posts')
        .auth('xav3x', 'WRONGPASS')
        .send(newPost)
        .catch(function(err){
          err.should.have.status(401);
          err.response.unauthorized.should.equal(true);
          err.response.error.text.should.equal('Unauthorized');
        });
    });
    it ('should have unauthorized error if wrong user', function () {
      return chai.request(app)
        .post('/posts')
        .auth('wronguser', '123456')
        .send(newPost)
        .catch(function(err){
          err.should.have.status(401);
          err.response.unauthorized.should.equal(true);
          err.response.error.text.should.equal('Unauthorized');
        });
    });
  });

  describe('PUT endpoint', function() {
      const updateData = {
        title: 'cats cats cats',
        content: 'dogs dogs dogs',
        author: {
          firstName: 'foo',
          lastName: 'bar'
        }
      };    
    // strategy:
    //  1. Get an existing post from db
    //  2. Make a PUT request to update that post
    //  3. Prove post returned by request contains data we sent
    //  4. Prove post in db is correctly updated
    it('should update fields you send over', function() {


      return BlogPost
        .findOne()
        .exec()
        .then(post => {
          updateData.id = post.id;

          return chai.request(app)
            .put(`/posts/${post.id}`)
            .auth('xav3x', '123456')
            .send(updateData);
        })
        .then(res => {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.title.should.equal(updateData.title);
          res.body.author.should.equal(
            `${updateData.author.firstName} ${updateData.author.lastName}`);
          res.body.content.should.equal(updateData.content);

          return BlogPost.findById(res.body.id).exec();
        })
        .then(post => {
          post.title.should.equal(updateData.title);
          post.content.should.equal(updateData.content);
          post.author.firstName.should.equal(updateData.author.firstName);
          post.author.lastName.should.equal(updateData.author.lastName);
        });
    });
    it ('should have unauthorized error if wrong password', function () {
      return BlogPost
        .findOne()
        .exec()
        .then(post => {
          updateData.id = post.id;
          return chai.request(app)
            .put(`/posts/${post.id}`)
            .auth('xav3x', 'WRONGPASS')
            .send(updateData)
            .catch(function(err){
              err.should.have.status(401);
              err.response.unauthorized.should.equal(true);
              err.response.error.text.should.equal('Unauthorized');
            });
        })
    });
    it ('should have unauthorized error if wrong user', function () {
      return BlogPost
        .findOne()
        .exec()
        .then(post => {
          updateData.id = post.id;
          return chai.request(app)
            .put(`/posts/${post.id}`)
            .auth('WRONGUSER', '123456')
            .send(updateData)
            .catch(function(err){
              err.should.have.status(401);
              err.response.unauthorized.should.equal(true);
              err.response.error.text.should.equal('Unauthorized');
            });
        })
    });
  });

  describe('DELETE endpoint', function() {
    // strategy:
    //  1. get a post
    //  2. make a DELETE request for that post's id
    //  3. assert that response has right status code
    //  4. prove that post with the id doesn't exist in db anymore
    it('should delete a post by id', function() {

      let post;

      return BlogPost
        .findOne()
        .exec()
        .then(_post => {
          post = _post;
          
          return chai.request(app).delete(`/posts/${post.id}`).auth('xav3x', '123456');
        })
        .then(res => {
          res.should.have.status(204);
          return BlogPost.findById(post.id);
        })
        .then(_post => {
          // when a variable's value is null, chaining `should`
          // doesn't work. so `_post.should.be.null` would raise
          // an error. `should.be.null(_post)` is how we can
          // make assertions about a null value.
          should.not.exist(_post);
        });
    });
    it('should not delete a post given wrong password', function() {
      let post;
      return BlogPost
        .findOne()
        .exec()
        .then(_post => {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`).auth('xav3x', '12!!xzciha56');
        })
        .catch(function(err){
          err.should.have.status(401);
          err.response.unauthorized.should.equal(true);
          err.response.error.text.should.equal('Unauthorized');
        });
    });
    it('should not delete a post given wrong username', function() {
      let post;
      return BlogPost
        .findOne()
        .exec()
        .then(_post => {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`).auth('OASJD', '123456');
        })
        .catch(function(err){
          err.should.have.status(401);
          err.response.unauthorized.should.equal(true);
          err.response.error.text.should.equal('Unauthorized');
        });
    });
  });
});

describe('users API', function () {
  const NEWUSER = {
    username: faker.company.catchPhrase(),
    firstName: faker.finance.currencyName(),
    lastName: faker.commerce.productName(),
    password: faker.company.bs()
  }
  function sendUser (user) {
    return user;
  }
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  afterEach(function() {
    // tear down database so we ensure no state from this test
    // effects any coming after.
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe('POST endpoint', function() {
    it('should correctly post user information', function () {
      return chai.request(app)
        .post('/users')
        .send(sendUser(NEWUSER))
        .then(function (res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.an('object');
          res.body.should.have.keys('username', 'firstName', 'lastName');
          res.body.username.should.equal(NEWUSER.username);
          res.body.firstName.should.equal(NEWUSER.firstName);
          res.body.lastName.should.equal(NEWUSER.lastName);
          return chai.request(app).get('/users')
        })
        .then(function (res) {
          res.body[0].username.should.equal(NEWUSER.username);
          res.body[0].firstName.should.equal(NEWUSER.firstName);
          res.body[0].lastName.should.equal(NEWUSER.lastName);
          res.body[0].password.should.be.a('string');
          res.body[0].password.should.not.equal(NEWUSER.password);
        })
    })
  })
})
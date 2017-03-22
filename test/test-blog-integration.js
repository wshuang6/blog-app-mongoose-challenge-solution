const mocha = require('mocha');
const chai = require('chai');
const faker = require('faker');
const chaiHttp = require('chai-http');

const should = chai.should();
chai.use(chaiHttp);

const {TEST_DATABASE_URL} = require('../config');
const {app, runServer, closeServer} = require('../server');
const {BlogPost} = require('../models');

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
function seedDatabase(){
  let fakeData = [];
  for(var i = 0; i<10; i++){
    fakeData.push(fakePost());
  }
  console.log(fakeData);
  return BlogPost.insertMany(fakeData);
}
function tearDownDB(){
  console.warn("Deleting Database");
  return mongoose.connection.dropDatabase(); 
}
describe('Test BlogPost CRUD functions', ()=>{
  before(()=>{
    return runServer(TEST_DATABASE_URL)
  })
  
})
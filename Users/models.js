const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.Promise = global.Promise;

let UserSchema = mongoose.Schema({
  username: {type: String, required: true, unique: true},
  firstName: {type: String},
  lastName: {type: String},
  password: {type: String, required: true}
});

UserSchema.methods.apiRepr = function () {
  return {
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName
  };
}

UserSchema.methods.validatePassword = function (password) {
  return bcrypt.compare(password, this.password);
}

UserSchema.statics.hashPassword = function(password) {
  return bcrypt.hash(password, 10);
}

const User = mongoose.model('users', UserSchema);

module.exports = {User};
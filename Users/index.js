const {User} = require('./models');
const {router} = require('./router');

module.exports = {userRouter: router, User: User};
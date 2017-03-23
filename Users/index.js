const {User} = require('./models');
const {router, basicStrategy} = require('./router');

module.exports = {userRouter: router, User: User, basicStrategy: basicStrategy};
exports.DATABASE_URL = process.env.DATABASE_URL ||
                       global.DATABASE_URL ||
                      'mongodb://localhost/blog-app';
exports.PORT = process.env.PORT || 8080;
exports.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'mongodb://username:username123@ds137340.mlab.com:37340/blogposts-asdfzxcv'
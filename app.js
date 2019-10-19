const express = require('express');
const codeRoutes = require('./routes/code');
const authRoutes = require('./routes/auth');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const app = express();
require('dotenv').config();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.set('view engine', 'ejs');
app.set('views, views');

app.use(bodyParser.urlencoded({ extended: true }));

//Change the secret to a longer string
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // cookie: {
  //   maxAge: 5 * 60 * 1000
  // },
  // cookie: {
  //   path: '/',
  //   httpOnly: true,
  //   maxAge: null
  // },
  store: new MongoStore({
    mongooseConnection: mongoose.connection,
    stringify: false
  })
}));

//To add csrf protection

app.use(authRoutes);
app.use(codeRoutes);

(async function () {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });
    await app.listen(process.env.PORT || 3000);
    console.log(`Listening on port ${process.env.PORT}`);
  }
  catch (e) {
    throw Error(`Unable to connect to DB or listen on port ${process.env.PORT}` + e);
  }
})();

//To add 404 error page and controllers and generic error handlers
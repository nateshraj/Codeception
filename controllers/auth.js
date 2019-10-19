const User = require('../models/user');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const sendgrid = require('@sendgrid/mail');
const crypto = require('crypto');
const mongoose = require('mongoose')

exports.postSignup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors.array());
      return res.status(422).render('index', {
        pageTitle: 'Codeception',
        activeCard: 'signup',
        errorMessage: errors.array()[0].msg
      });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    const token = crypto.randomBytes(32).toString('hex');
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      verificationToken: token,
      verificationTokenExpiration: Date.now() + 3600000
    });
    await user.save();
    console.log('User has been created');

    //To change the message and provide an activation link to confirm user
    //Change localhost to hosted place before deploying
    const message = {
      to: req.body.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Welcome to Codeception',
      text: `Welcome ${req.body.username}, thanks for signing up dont`,
      html: `
        <p><strong>Welcome ${req.body.username}, thanks for signing up!</strong>
        <br>Please click this link to <a href="http://localhost:3000/verify/${token}"> verify your account.</a>
        </p>
        `
    };

    sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
    sendgrid.send(message);
    res.render('index', {
      pageTitle: 'Signup Testing',
      activeCard: 'login',
      isLoggedIn: req.session.isLoggedIn
    });
  } catch (e) {
    if (e.name === 'MongoError' && e.code === 11000) {
      const fields = ['Username', 'Email'];
      const duplicateField = fields.find(field => e.errmsg.includes(field.toLowerCase()));
      console.log(`${duplicateField} already exists`);
      // Re-render the index page with signup card with the above error message
      // throw Error('test');
    } else {
      throw Error(`Unable to register the user` + e);
    }
  }
}

exports.postLogin = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors.array());
      return res.status(422).render('index', {
        pageTitle: 'Codeception',
        activeCard: 'login',
        errorMessage: errors.array()[0].msg,
        isLoggedIn: req.session.isLoggedIn
      });
    }

    //Validate credentials
    const usernameOrEmail = req.body.usernameOrEmail
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
    });
    if (!user) {
      //Add error flash message or do something else
      throw Error('User not found');
    }
    const match = await bcrypt.compare(req.body.password, user.password);
    if (match) {
      req.session.isLoggedIn = true;
      req.session.user = user;
      console.log('Logged in successfully');
      // To redirect or render a different page here
      // res.render('dashboard', {
      //   pageTitle: 'Dashboard',
      // });
      return res.redirect('/dashboard');


    }
    else {
      throw Error('Credentials don\'t match');
    }


    // res.render('index', {
    //   pageTitle: 'Signup Testing',
    //   activeCard: 'login'
    // });
  } catch (e) {
    throw Error(`Unable to login` + e);
  }
}


exports.getVerify = async (req, res, next) => {
  try {
    const verificationToken = req.params.verificationToken;
    const user = await User.findOne({
      verificationToken: verificationToken,
      verificationTokenExpiration: { $gt: Date.now() }
    });
    if (!user) {
      //Add flash message or do something else
      throw Error('User not found');
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiration = undefined;
    await user.save();

    //To change page titles everywhere
    res.render('index', {
      pageTitle: 'Signup Testing',
      activeCard: 'login',
      isLoggedIn: req.session.isLoggedIn
    });
  }
  catch (e) {
    throw Error(e);
  }
}

exports.postReset = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors.array());
      // Change to show the error message in the modal itself
      // return res.status(422).render('index', {
      //   pageTitle: 'Codeception',
      //   activeCard: 'signup',
      //   errorMessage: errors.array()[0].msg
      // });
    }
    const usernameOrEmail = req.body.resetUsernameOrEmail
    const resetToken = crypto.randomBytes(32).toString('hex');
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
    });
    if (!user) {
      //Add error flash message or do something else
      throw Error('User not found');
    }
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000;
    await user.save();
    console.log('A mail has been sent to reset your password');

    //To change the message and provide an activation link to reset pass
    //Change localhost to hosted place before deploying
    const message = {
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Reset password for ${user.username}`,
      text: `Hi ${user.username}, Follow these steps to reset`,
      html: `
        <p><strong>Hello ${user.username},</strong>
        <br>Please click this link to <a href="http://localhost:3000/reset/${resetToken}"> reset your password.</a>
        </p>
        `
    };

    sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
    sendgrid.send(message);
    res.render('index', {
      pageTitle: 'Signup Testing',
      activeCard: 'login',
      isLoggedIn: req.session.isLoggedIn
    });
  } catch (e) {
    throw Error(`Unable to reset password` + e);
  }
}

exports.getResetPassword = async (req, res, next) => {
  try {
    const resetToken = req.params.resetToken;
    const user = await User.findOne({
      resetToken: resetToken,
      resetTokenExpiration: { $gt: Date.now() }
    });
    if (!user) {
      //Add flash message or do something else
      throw Error('User not found or time expired');
    }


    // user.resetToken = undefined;
    // user.resetTokenExpiration = undefined;
    // await user.save();

    //To change page titles everywhere
    res.render('reset-password', {
      pageTitle: 'Reset Password',
      userId: user._id.toString(),
      resetToken: resetToken
    });
  }
  catch (e) {
    throw Error(e);
  }
}


exports.postResetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors.array());
      // Change to show the error message in the reset password page
      // return res.status(422).render('index', {
      //   pageTitle: 'Codeception',
      //   activeCard: 'signup',
      //   errorMessage: errors.array()[0].msg
      // });
    }
    const user = await User.findOne({
      resetToken: req.body.resetToken,
      resetTokenExpiration: { $gt: Date.now() },
      _id: req.body.userId
    });
    if (!user) {
      //Add flash message or do something else
      throw Error('User not found or time expired');
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();

    //To change page titles everywhere
    res.render('index', {
      pageTitle: 'Signup Testing',
      activeCard: 'login',
      isLoggedIn: req.session.isLoggedIn
    });
  }
  catch (e) {
    throw Error(e);
  }
}

exports.postLogout = async (req, res, next) => {
  try {
    await req.session.destroy();
    res.redirect('/')
  }
  catch (e) {
    throw Error('Unable to logout' + e);
  }
}

exports.getDeleteSession = async (req, res, next) => {
  const collection = await mongoose.connection.db.collection('sessions');
  await collection.deleteMany({});
  console.log('Emptied sessions collection');


  // mongoose.connection.db.collection('sessions', function (error, collection) {
  //   if (error) {
  //     console.error('Problem retrieving sessions collection:', error);
  //   } else {
  //     collection.deleteMany({}, function (error) {
  //       if (error) {
  //         console.error('Problem emptying sessions collection:', error);
  //       } else {
  //         console.log('Emptied sessions collection');
  //       }
  //     });
  //   }
  // });
}

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
        errorMessage: errors.array()[0].msg,
        isLoggedIn: req.session.isLoggedIn
      });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    const token = crypto.randomBytes(32).toString('hex');
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      verificationToken: token
    });
    await user.save();
    console.log('User has been created');

    sendMail(req.body.email, req.body.username, token, 'verify');

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

      return res.redirect('/problems');
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
      verificationToken: verificationToken
    });
    if (!user) {
      //Add flash message or do something else
      throw Error('User not found');
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    req.session.user = user;

    if (req.session.isLoggedIn) {
      res.redirect('/problems');
    } else {
      //To change page titles everywhere
      res.render('index', {
        pageTitle: 'Signup Testing',
        activeCard: 'login',
        isLoggedIn: req.session.isLoggedIn
      });
    }
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
    await user.save();
    console.log('A mail has been sent to reset your password');

    sendMail(user.email, user.username, resetToken, 'reset');

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
      resetToken: resetToken
    });
    if (!user) {
      //Add flash message or do something else
      throw Error('User not found');
      // Show an alert to say invalid request and redirect to homepage
    }


    // user.resetToken = undefined;
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
      _id: req.body.userId
    });
    if (!user) {
      //Add flash message or do something else
      throw Error('User not found');
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    user.password = hashedPassword;
    user.resetToken = undefined;
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

exports.postResendVerification = async (req, res, next) => {
  sendMail(req.session.user.email, req.session.user.username, req.session.user.verificationToken, 'verify');
  res.redirect('/problems');
}

async function sendMail(mailTo, username, token, type) {
  //To change the message and provide an activation link to confirm user
  //Change localhost to hosted place before deploying
  const message = {
    to: mailTo,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: type === 'reset' ? 'Reset your Codeception password' : 'Welcome to Codeception!',
    text: type === 'reset' ? `Hi ${username}, Follow these steps to reset` : `Welcome ${username}, thanks for signing up`,
    html: type === 'reset' ?
      `
        <p><strong>Hello ${username},</strong>
        <br>Please click this link to <a href="http://localhost:3000/reset/${token}"> reset your password.</a>
        </p>
    ` :
      `
        <p><strong>Welcome ${username}, thanks for signing up!</strong>
        <br>Please click this link to <a href="http://localhost:3000/verify/${token}"> verify your account.</a>
        </p>
        `
  };

  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
  await sendgrid.send(message);
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

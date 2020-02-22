const User = require('../models/user');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const sendgrid = require('@sendgrid/mail');
const crypto = require('crypto');
const mongoose = require('mongoose')

exports.postSignup = async (req, res) => {
  const form = {
    username: req.body.username,
    email: req.body.email,
    password: req.body.password
  };
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors.array());
      return res.status(400).render('index', {
        pageTitle: 'Codeception',
        activeCard: 'signup',
        error: errors.array()[0],
        isLoggedIn: req.session.isLoggedIn,
        form: form
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

    sendMail(user, 'Verify');

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
      return res.status(400).render('index', {
        pageTitle: 'Codeception',
        activeCard: 'signup',
        error: {
          msg: `${duplicateField} already exists`,
          param: `${duplicateField.toLowerCase()}`
        },
        isLoggedIn: req.session.isLoggedIn,
        form: form
      });
    } else {
      throw Error(`Unable to register the user` + e);
    }
  }
}

exports.postLogin = async (req, res) => {
  try {
    const form = {
      usernameOrEmail: req.body.usernameOrEmail
    };
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors.array());
      return res.status(400).render('index', {
        pageTitle: 'Codeception',
        activeCard: 'login',
        error: errors.array()[0],
        isLoggedIn: req.session.isLoggedIn,
        form: form
      });
    }

    const usernameOrEmail = req.body.usernameOrEmail
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
    });
    if (!user) {
      return res.status(400).render('index', {
        pageTitle: 'Login',
        activeCard: 'login',
        isLoggedIn: req.session.isLoggedIn,
        error: {
          msg: 'Invalid user',
          param: 'usernameOrEmail'
        },
        form: form
      });
    }
    const match = await bcrypt.compare(req.body.password, user.password);
    if (match) {
      req.session.isLoggedIn = true;
      req.session.userId = user._id;
      req.session.save(function (err) {
        res.redirect('/problems');
      })
    }
    else {
      return res.status(400).render('index', {
        pageTitle: 'Login',
        activeCard: 'login',
        isLoggedIn: req.session.isLoggedIn,
        error: {
          msg: 'Invalid credentials',
          param: 'password'
        },
        form: form
      });
    }
  } catch (e) {
    throw Error(`Unable to login` + e);
  }
}

exports.getVerify = async (req, res) => {
  try {
    const verificationToken = req.params.verificationToken;
    const user = await User.findOne({
      verificationToken: verificationToken
    });
    if (!user) {
      return res.status(400).render('index', {
        pageTitle: 'Codeception',
        activeCard: 'login',
        error: {
          msg: 'Invalid token. Please verify your email again.',
          param: 'verificationToken'
        },
        isLoggedIn: req.session.isLoggedIn
      });
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

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

exports.postReset = async (req, res) => {
  try {
    const form = {
      resetUsernameOrEmail: req.body.resetUsernameOrEmail
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors.array());
      return res.status(400).render('index', {
        pageTitle: 'Codeception',
        activeCard: 'login',
        error: errors.array()[0],
        isLoggedIn: req.session.isLoggedIn,
        form: form
      });
    }
    const usernameOrEmail = req.body.resetUsernameOrEmail
    const resetToken = crypto.randomBytes(32).toString('hex');
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
    });
    if (!user) {
      return res.status(400).render('index', {
        pageTitle: 'Codeception',
        activeCard: 'login',
        error: {
          msg: 'Invalid user or email',
          param: 'resetUsernameOrEmail'
        },
        form: form,
        isLoggedIn: req.session.isLoggedIn
      });
    }
    user.resetToken = resetToken;
    await user.save();

    sendMail(user, 'Reset');

    res.render('index', {
      pageTitle: 'Signup Testing',
      activeCard: 'login',
      isLoggedIn: req.session.isLoggedIn
    });
  } catch (e) {
    throw Error(`Unable to reset password` + e);
  }
}

exports.getResetPassword = async (req, res) => {
  try {
    const resetToken = req.params.resetToken;
    const user = await User.findOne({
      resetToken: resetToken
    });
    if (!user) {
      return res.status(400).render('index', {
        pageTitle: 'Codeception',
        activeCard: 'login',
        error: {
          msg: 'Invalid token. Please reset your password again.',
          param: 'resetToken'
        },
        isLoggedIn: req.session.isLoggedIn
      });
    }

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

exports.postResetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors.array());
      return res.status(400).render('reset-password', {
        pageTitle: 'Reset Password',
        userId: req.body.userId,
        resetToken: req.body.resetToken,
        error: errors.array()[0]
      });
    }
    const user = await User.findOne({
      resetToken: req.body.resetToken,
      _id: req.body.userId
    });
    if (!user) {
      return res.status(400).render('index', {
        pageTitle: 'Codeception',
        activeCard: 'login',
        error: {
          msg: 'Invalid token. Please reset your password again.',
          param: 'resetToken'
        },
        isLoggedIn: req.session.isLoggedIn
      });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.isVerified = true;
    user.verificationToken = undefined;
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

exports.postLogout = async (req, res) => {
  try {
    await req.session.destroy();
    res.redirect('/')
  }
  catch (e) {
    throw Error('Unable to logout' + e);
  }
}

exports.postResendVerification = async (req, res) => {
  const user = await User.findById(req.session.userId);
  sendMail(user, 'Verify');
  res.redirect('/problems');
}

async function sendMail(user, type) {
  const { email, username, verificationToken, resetToken } = user;

  const templateData = type === 'Verify' ? {
    subject: 'Codeception - Welcome!',
    text: `Hi ${username}, thanks for signing up! Please click the button below to verify your email.`,
    buttonText: `${type} email`,
    link: `http://codeception.herokuapp.com/verify/${verificationToken}`
  } : {
      subject: 'Codeception - Reset Password',
      text: `Hi ${username}, please click the button below to reset your password.`,
      buttonText: `${type} password`,
      link: `http://codeception.herokuapp.com/reset/${resetToken}`
    };

  const message = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    templateId: 'd-2c292e6f2ba94f409e9e51b7d03cbd19',
    dynamic_template_data: templateData
  };

  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
  await sendgrid.send(message);
}

exports.getDeleteSession = async (req, res) => {
  const collection = await mongoose.connection.db.collection('sessions');
  await collection.deleteMany({});
  console.log('Emptied sessions collection');
}
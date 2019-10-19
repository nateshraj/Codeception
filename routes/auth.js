const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { body } = require('express-validator/check');

router.post(
  '/signup',
  [
    body('username', 'Username should contain text and numbers and atleast 3 characters')
      .isLength({ min: 3 })
      .isAlphanumeric(),
    body('email', 'Please enter a valid Email')
      .isEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password should contain atleast 8 characters'),
    // To add regex to validate special characters later
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw Error('Password and confirm password doesn\'t match');
      }
      return true;
    })
  ],
  authController.postSignup
);

router.post(
  '/login',
  [
    body('usernameOrEmail', 'Please enter a valid username or email')
      .isLength({ min: 3 }),
    body('password')
      .exists()
      .withMessage('Please enter the password')
  ],
  authController.postLogin
);

router.get('/verify/:verificationToken', authController.getVerify);

router.post(
  '/reset',
  body('resetUsernameOrEmail', 'Please enter a valid username or email')
    .isLength({ min: 3 }),
  authController.postReset
);

router.get('/reset/:resetToken', authController.getResetPassword);

router.post(
  '/reset-password',
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password should contain atleast 8 characters'),
    // To add regex to validate special characters later
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw Error('Password and confirm password doesn\'t match');
      }
      return true;
    })
  ],
  authController.postResetPassword
);

router.post('/logout', authController.postLogout);


// Temporaray path to delete all sesssions
router.get('/delete', authController.getDeleteSession);


module.exports = router;
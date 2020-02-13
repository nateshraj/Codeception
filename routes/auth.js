const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { body } = require('express-validator');

router.post(
  '/signup',
  [
    body('username', 'Username should contain text or numbers and atleast 3 characters')
      .isLength({ min: 3 })
      .isAlphanumeric(),
    body('email', 'Please enter a valid Email')
      .isEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password should contain atleast 6 characters'),
    // To add regex to validate special characters later
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw Error('Password and confirm password does not match');
      }
      return true;
    })
  ],
  authController.postSignup
);

router.post(
  '/login',
  [
    body('usernameOrEmail', 'Please enter a valid username or email').isLength({ min: 3 }),
    body('password', 'Please enter the password').not().isEmpty()
  ],
  authController.postLogin
);

router.get('/verify/:verificationToken', authController.getVerify);

router.post(
  '/reset',
  body('resetUsernameOrEmail', 'Please enter a valid username or email').isLength({ min: 3 }),
  authController.postReset
);

router.get('/reset/:resetToken', authController.getResetPassword);

router.post(
  '/reset-password',
  [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password should contain atleast 6 characters'),
    // To add regex to validate special characters later
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password and confirm password does not match');
      }
      return true;
    })
  ],
  authController.postResetPassword
);

router.post('/logout', authController.postLogout);

router.post('/resend', authController.postResendVerification);

// Temporaray path to delete all sesssions
router.get('/delete', authController.getDeleteSession);

module.exports = router;
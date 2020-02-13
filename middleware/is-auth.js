module.exports = async (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.render('index', {
      pageTitle: 'Login',
      activeCard: 'login',
      isLoggedIn: req.session.isLoggedIn,
      error: '',
      form: {}
    });
  }
  await next();
}
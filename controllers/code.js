const Problem = require('../models/problem');
const fs = require('fs');
const path = require('path');
const rp = require('request-promise-native');

exports.getIndex = (req, res, next) => {
  if (req.session.isLoggedIn) {
    return res.redirect('/dashboard');
  }
  res.render('index', {
    pageTitle: 'Codeception',
    activeCard: 'signup',
    isLoggedIn: req.session.isLoggedIn
  });
};

exports.getDashboard = (req, res, next) => {
  res.render('dashboard', {
    pageTitle: 'Dashboard',
    isLoggedIn: req.session.isLoggedIn,
    user: req.session.user
  });
};

exports.getProblem = async (req, res, next) => {
  const problem = await Problem.findById(req.params.problemId);
  try {
    const startingCode = await fs.readFileSync(path.join(__dirname, '..', 'problems', `${problem.name}.txt`), 'utf-8');
    res.render('problem', {
      pageTitle: 'Problem',
      isLoggedIn: req.session.isLoggedIn,
      problem: problem,
      user: req.session.user,
      startingCode: startingCode,
      mode: '',
      testCase: '',
      actualOutput: ''
    });
  }
  catch (e) {
    throw Error(`Unable to read the starting code for ${problem.name}` + e);
  }
};

exports.getProblemList = async (req, res, next) => {
  const problems = await Problem.find({});
  console.log(problems);
  res.render('problem-list', {
    pageTitle: 'Problems',
    isLoggedIn: req.session.isLoggedIn,
    problems: problems,
    user: req.session.user
  });
};

exports.getAddProblem = (req, res, next) => {
  res.render('add-problem', {
    pageTitle: 'Add Problem',
    isLoggedIn: req.session.isLoggedIn,
    user: req.session.user
  });
};

exports.getProfile = (req, res, next) => {
  res.render('profile', {
    pageTitle: 'Profile',
    isLoggedIn: req.session.isLoggedIn,
    user: req.session.user
  });
};


exports.postAddProblem = async (req, res, next) => {
  const problem = new Problem({
    name: req.body.problemName,
    description: req.body.problemDesc
  });
  await problem.save();
  console.log('Problem has been added');
};

exports.postRunCode = async (req, res, next) => {
  const problem = await Problem.findById(req.body.problemId);
  const testCase = problem.testCases[0];
  const code = req.body.editorContent.replace('replace', testCase.input);
  const program = {
    script: code,
    language: "nodejs",
    versionIndex: "2",
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
  };
  const response = await rp({
    url: process.env.PROGRAM_API,
    method: "POST",
    json: program
  });
  console.log(response);
  const actualOutput = response.output.replace('\n', '');
  const result = actualOutput === testCase.output;
  console.log(result);
  res.render('problem', {
    pageTitle: 'Problem',
    isLoggedIn: req.session.isLoggedIn,
    problem: problem,
    user: req.session.user,
    startingCode: req.body.editorContent,
    mode: 'run',
    testCase: testCase,
    actualOutput: actualOutput
  });




};




exports.postSubmitCode = async (req, res, next) => {
  const problem = await Problem.findById(req.body.problemId);
  // const actualOutputs = [];
  // const expectedOutputs = [];
  const results = [];
  for (let testCase of problem.testCases) {
    // console.log(testCase);
    // expectedOutputs.push(testCase.output);
    const code = req.body.editorContent.replace('replace', testCase.input);
    // console.log(code);
    const program = {
      script: code,
      language: "nodejs",
      versionIndex: "2",
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET
    };
    const response = await rp({
      url: process.env.PROGRAM_API,
      method: "POST",
      json: program
    });
    // console.log(response);
    const actualOutput = response.output.replace('\n', '');
    // actualOutputs.push(actualOutput);
    results.push(actualOutput === testCase.output ? true : false);

  }
  // console.log(expectedOutputs);
  // console.log(actualOutputs);
  console.log(results);

  


  res.render('problem', {
    pageTitle: 'Problem',
    isLoggedIn: req.session.isLoggedIn,
    problem: problem,
    user: req.session.user,
    startingCode: req.body.editorContent,
    mode: 'submit',
    testCase: '',
    actualOutput: '',
    results: results
  });




  // const program = {
  //   script: req.body.editorContent,
  //   language: "nodejs",
  //   versionIndex: "2",
  //   clientId: process.env.CLIENT_ID,
  //   clientSecret: process.env.CLIENT_SECRET
  // };
  // request({
  //   url: process.env.PROGRAM_API,
  //   method: "POST",
  //   json: program
  // }, function (error, response, body) {
  //   console.log('error:', error);
  //   console.log('statusCode:', response && response.statusCode);
  //   console.log('body:', body);
  // });


};
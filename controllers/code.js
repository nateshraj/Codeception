const Problem = require('../models/problem');
const User = require('../models/user');
const fs = require('fs').promises;
const path = require('path');
const rp = require('request-promise-native');

exports.getIndex = (req, res, next) => {
  if (req.session.isLoggedIn) {
    return res.redirect('/problems');
  }
  res.render('index', {
    pageTitle: 'Codeception',
    activeCard: 'signup',
    isLoggedIn: req.session.isLoggedIn
  });
};

exports.getProblem = async (req, res, next) => {
  const problem = await Problem.findById(req.params.problemId);
  try {
    const startingCode = await fs.readFile(path.join(__dirname, '..', 'problems', 'Starting Code', `${problem.name}.txt`), 'utf-8');

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

exports.getProfile = async (req, res, next) => {
  const problems = [];
  for (const solvedProblem of req.session.user.solvedProblems) {
    const problem = await Problem.findById(solvedProblem.problemId);
    problems.push(problem);
  }

  res.render('profile', {
    pageTitle: 'Profile',
    isLoggedIn: req.session.isLoggedIn,
    user: req.session.user,
    solvedProblems: problems
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
  const functioName = req.body.editorContent.split(' ')[1];
  const code = req.body.editorContent + `\nconsole.log(${functioName}(${testCase.input}));`;
  console.log('----------------');
  console.log(code);
  console.log('----------------');
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
  // const actualOutput = response.output.replace('\n', '');
  let actualOutput = response.output.replace(new RegExp('\n$'), '');
  // console.log(actualOutput);
  actualOutput = actualOutput.replace('\n', ' ')
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
  const functioName = req.body.editorContent.split(' ')[1];
  let code = req.body.editorContent;
  let functionCalls = '';
  const results = [];
  const expectedOutputs = [];

  for (let testCase of problem.testCases) {
    let arguments = '';
    for (let [index, input] of testCase.input.entries()) {
      if (typeof input === 'string') {
        arguments += `'${input}'`;
      } else {
        arguments += `${input}`;
      }
      if (index !== testCase.input.length - 1) {
        arguments += ',';
      }
    }

    functionCalls += `\nconsole.log(${functioName}(${arguments}));`;


    expectedOutputs.push(testCase.output);
  }

  code += functionCalls;
  console.log('@@@@@@@@@@@@@@@@@@');
  console.log(code);
  console.log('@@@@@@@@@@@@@@@@@@');
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
  console.log('###########');
  console.log(response);
  console.log('###########');

  let actualOutputs = response.output.replace(new RegExp('\n$'), '');
  actualOutputs = actualOutputs.split('\n');
  console.log('&&&&&&&&&&&&&&&');
  console.log(actualOutputs);
  console.log('&&&&&&&&&&&&&&&');

  console.log('%%%%%%%%%%%%%');
  console.log(expectedOutputs);
  console.log('%%%%%%%%%%%%%');

  if (actualOutputs.length === expectedOutputs.length) {
    expectedOutputs.forEach((expectedOutput, index) => {
      results.push(expectedOutput === actualOutputs[index]);
    })
  } else {
    expectedOutputs.forEach(output => results.push(false));
  }

  const toSubmit = results.every(result => result);
  if (toSubmit) {
    try {
      await fs.stat(path.join(__dirname, '..', 'problems', 'Submissions', `${req.session.user._id.toString()}`));
    } catch (e) {
      if (e.code === 'ENOENT') {
        await fs.mkdir(path.join(__dirname, '..', 'problems', 'Submissions', `${req.session.user._id.toString()}`));
      } else {
        throw Error(e);
      }
    }
    fs.writeFile(path.join(__dirname, '..', 'problems', 'Submissions', `${req.session.user._id.toString()}`, `${problem.name}.txt`), req.body.editorContent);
    const currentUser = await User.findById(req.session.user._id);
    if (!currentUser.solvedProblems.find(solvedProblem => solvedProblem.problemId === problem._id.toString())) {
      currentUser.solvedProblems.push({ problemId: problem._id });
    }
    await currentUser.save();
    req.session.user = currentUser;
  }

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


};

exports.getLeaderboard = async (req, res, next) => {
  const users = await User.find({}).lean();

  const getProblemPoints = difficulty => {
    switch (difficulty) {
      case "easy":
        return 10;
      case "medium":
        return 20;
      case "hard":
        return 30;
      default:
        throw Error(`Invalid case - ${difficulty}`);
    }
  }

  const getUserPoints = async user => {
    let userPoints = 0;
    if (user.solvedProblems) {
      for (const solvedProblem of user.solvedProblems) {
        const problem = await Problem.findById(solvedProblem.problemId);
        const problemPoints = getProblemPoints(problem.difficulty);
        userPoints += problemPoints;
      }
    }
    return userPoints;
  }

  for (const user of users) {
    const userPoints = await getUserPoints(user);
    user.points = userPoints;
  }

  users.sort((a, b) => b.points - a.points);

  res.render('leaderboard', {
    pageTitle: 'Leaderboard',
    isLoggedIn: req.session.isLoggedIn,
    user: req.session.user,
    users: users
  });
};

exports.postLastSubmission = async (req, res, next) => {
  const problem = JSON.parse(req.body.problem);
  const lastSubmittedCode = await fs.readFile(path.join(__dirname, '..', 'problems', 'Submissions', `${req.session.user._id}`, `${problem.name}.txt`), 'utf-8');

  res.render('problem', {
    pageTitle: 'Problem',
    isLoggedIn: req.session.isLoggedIn,
    problem: problem,
    user: req.session.user,
    startingCode: lastSubmittedCode,
    mode: '',
    testCase: '',
    actualOutput: ''
  });

};
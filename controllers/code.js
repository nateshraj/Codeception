const Problem = require('../models/problem');
const User = require('../models/user');
const fs = require('fs').promises;
const path = require('path');
const rp = require('request-promise-native');

exports.getIndex = (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect('/problems');
  }
  res.render('index', {
    pageTitle: 'Codeception',
    activeCard: 'signup',
    isLoggedIn: req.session.isLoggedIn
  });
};

exports.getProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.problemId);
    const startingCode = await fs.readFile(path.join(__dirname, '..', 'problems', `${problem.name}.txt`), 'utf-8');
    const user = await User.findById(req.session.userId);

    res.render('problem', {
      pageTitle: 'Problem',
      isLoggedIn: req.session.isLoggedIn,
      problem: problem,
      user: user,
      startingCode: startingCode
    });
  }
  catch (e) {
    throw Error(`Unable to read the starting code for ${problem.name}` + e);
  }
};

exports.getProblemList = async (req, res) => {
  const problems = await Problem.find({});
  const user = await User.findById(req.session.userId);
  res.render('problem-list', {
    pageTitle: 'Problems',
    isLoggedIn: req.session.isLoggedIn,
    problems: problems,
    user: user,
    activeNav: 'problems'
  });
};

exports.getProfile = async (req, res) => {
  const problems = [];
  const user = await User.findById(req.session.userId);
  for (const solvedProblem of user.solvedProblems) {
    const problem = await Problem.findById(solvedProblem.problemId);
    problems.push(problem);
  }

  res.render('profile', {
    pageTitle: 'Profile',
    isLoggedIn: req.session.isLoggedIn,
    user: user,
    solvedProblems: problems,
    activeNav: 'profile'
  });
};

exports.postRunCode = async (req, res) => {
  const problem = await Problem.findById(req.body.problemId);
  const user = await User.findById(req.session.userId);
  const functioName = req.body.editorContent.split(' ')[1];
  const testCase = problem.testCases[0];
  const arguments = await getArguments(testCase);
  const code = req.body.editorContent + `\nconsole.log(${functioName}(${arguments}));`;
  console.log('----------------');
  console.log(code);
  console.log('----------------');
  const output = await runCode(code);
  console.log(output);
  // const actualOutput = output.replace('\n', '');
  let actualOutput = output.replace(new RegExp('\n$'), '');
  // console.log(actualOutput);
  actualOutput = actualOutput.replace('\n', ' ')
  const result = actualOutput === testCase.output;
  console.log(result);
  res.render('problem', {
    pageTitle: 'Problem',
    isLoggedIn: req.session.isLoggedIn,
    problem: problem,
    user: user,
    startingCode: req.body.editorContent,
    mode: 'run',
    testCase: testCase,
    actualOutput: actualOutput
  });
};

const getArguments = async (testCase) => {
  try {
    let arguments = '';
    for (let [index, input] of testCase.input.entries()) {
      if (typeof input === 'string') {
        arguments += `'${input}'`;
      } else if (Array.isArray(input)) {
        arguments += `[${input}]`;
      } else {
        arguments += `${input}`;
      }
      if (index !== testCase.input.length - 1) {
        arguments += ',';
      }
    }
    return arguments;
  } catch (e) {
    console.log(`Unable to get arguments - ${e}`);
  }
}

const runCode = async (code) => {
  try {
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
    return response.output;
  } catch (e) {
    console.log(`Unable to run code - ${e}`);
  }
}

exports.postSubmitCode = async (req, res) => {
  const problem = await Problem.findById(req.body.problemId);
  const user = await User.findById(req.session.userId);
  const functioName = req.body.editorContent.split(' ')[1];
  let code = req.body.editorContent;
  let functionCalls = '';
  const results = [];
  const expectedOutputs = [];

  for (let testCase of problem.testCases) {
    const arguments = await getArguments(testCase);
    functionCalls += `\nconsole.log(${functioName}(${arguments}));`;
    expectedOutputs.push(testCase.output);
  }

  code += functionCalls;
  console.log('@@@@@@@@@@@@@@@@@@');
  console.log(code);
  console.log('@@@@@@@@@@@@@@@@@@');

  const output = await runCode(code);
  // console.log(output);

  let actualOutputs = output.replace(new RegExp('\n$'), '');
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
    const solvedAlready = user.solvedProblems.find(solvedProblem => solvedProblem.problemId === problem._id.toString());
    if (!solvedAlready) {
      user.solvedProblems.push({ problemId: problem._id, code: req.body.editorContent });
    } else {
      user.solvedProblems.forEach(solvedProblem => {
        if (solvedProblem.problemId === problem._id.toString()) {
          solvedProblem.code = req.body.editorContent;
        }
      });
    }
    await user.save();
  }

  console.log(results);

  res.render('problem', {
    pageTitle: 'Problem',
    isLoggedIn: req.session.isLoggedIn,
    problem: problem,
    user: user,
    startingCode: req.body.editorContent,
    mode: 'submit',
    results: results
  });
};

exports.getLeaderboard = async (req, res) => {
  const users = await User.find({}).lean();
  const currentUser = await User.findById(req.session.userId);
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
    user: currentUser,
    users: users,
    activeNav: 'leaderboard'
  });
};

exports.postLastSubmission = async (req, res) => {
  const problem = JSON.parse(req.body.problem);
  const user = await User.findById(req.session.userId);
  const lastSubmittedCode = user.solvedProblems.find(solvedProblem => solvedProblem.problemId === problem._id).code;

  res.render('problem', {
    pageTitle: 'Problem',
    isLoggedIn: req.session.isLoggedIn,
    problem: problem,
    user: user,
    startingCode: lastSubmittedCode
  });
};
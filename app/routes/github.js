var express = require('express');
var router = express.Router();
const fs = require('fs');
var qs = require('qs');
var redmineService = require('./../modules/redmine')
const key = process.env;
var redmine = new redmineService.Redmine(key.KEY_REDMINE)
var axios = require('axios')
const keyGithub = key.KEY_GITHUB;
var dbo = require('./../modules/db')
var Result = dbo.mongoose.model('results', dbo.anySchema, 'results')

router.post('/', async function (req, res, next) {

  let needAssign = !req.query.assign ? false : req.query.assign
  let event = req.header('X-GitHub-Event')
  let payload = JSON.parse(req.body.payload)

  switch (event) {
    case 'push':
    case 'pull_request':
    case 'pull_request_review':
      break;
    default:
      return
  }
  
  let action = payload.action
  console.log("Event: " + event + ", Action: " + action)

  let commits = false
  if (event == "pull_request" || event == "review_requested") {
    try {
      commits = await axios(payload.pull_request.commits_url.replace('api.github.com', keyGithub + '@api.github.com'))
    } catch (error) {
      console.log(error.response.status, error.response.statusText)
    }  
  }
  let taskNumbers = getTasks(commits, payload)

  let logDb = {
    date: new Date(),
    author: payload.sender.login,
    tasks: taskNumbers.join(),
    project: payload.pull_request.head ? payload.pull_request.head.repo.name : '',
    event: event,
    action: action,
    needAssign: needAssign
  }
  res.json(action);  

  switch (event) {
    case 'push':
      redmine.setStatusWork(taskNumbers, "", needAssign)
      break;
    case 'pull_request':
      switch (action) {
        // case 'opened':
        // case 'synchronize':
          // redmine.setStatusWork(taskNumbers, "", needAssign)
          // break
        case 'review_requested':
          redmine.setStatusReviewAndTl(taskNumbers, "", needAssign)
          break;
        case 'closed':
          redmine.checkTaskStatus(taskNumbers)
          redmine.setStatusReadyBuild(taskNumbers)
          break;
        default:
      }
      break
    case 'pull_request_review':
      switch (action) {
        case 'changes_requested':
          redmine.setStatusWork(taskNumbers, payload.review.body, needAssign)
          break;
        default:
      }
      break
    default:
  }

  Result.create(logDb, function (err, doc) {
    if (err) throw err;
  })
  fs.appendFile('./log-result.txt', JSON.stringify(logDb)+ "\r\n\n", ()=>{})  
});

function getTasks(commits, payload) {
  let taskNumbers = []

  if (commits.data) {
    for (let value of commits.data) {
      let tasks = value.commit.message.replace('pull request #', '').match(/#\d+/g)
      if (tasks) {
        taskNumbers += tasks.join([])
      }
    }
  }
  let task = payload.pull_request.head.ref.split('feature/')[1].match(/\d+/g);
  let featureTask = task[0];

  if (featureTask) {
    featureTask = '#' + featureTask
    taskNumbers += featureTask
  }
  if (taskNumbers.length !== 0) {
    taskNumbers = taskNumbers.split('#').filter((v, i, a) => v && a.indexOf(v) === i)
  }  
  return taskNumbers
}

module.exports = router;

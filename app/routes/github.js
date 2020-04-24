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

  let needAssign = !req.query.assign ? false : (req.query.assign == 'true')
  let event = req.header('X-GitHub-Event')
  let payload = JSON.parse(req.body.payload)

  switch (event) {
    case 'push':
    case 'pull_request':
    case 'pull_request_review':
      break;
    default:
      res.json({})
      return
  }
  
  let action = payload.action
  let author = payload.sender.login
  var assignTo = null

  let commits = false
  let taskNumbers = []
  if (event == "pull_request") {
    try {
      commits = await axios(payload.pull_request.commits_url.replace('api.github.com', keyGithub + '@api.github.com'))
      commits = commits.data
      for (let value of commits) {
        let tasks = value.commit.message.replace('pull request #', '').match(/#\d+/g)
        if (tasks) {
          taskNumbers += tasks.join([])
        }
      }
      let task = payload.pull_request.head.ref.split('feature/')[1].match(/\d+/g);
      let featureTask = task[0];
      if (featureTask) {
        featureTask = '#' + featureTask
        taskNumbers += featureTask
      }      
    } catch (error) {
      console.log(error.response.status, error.response.statusText)
    }  
  } else if (event == "push") {
    commits = payload.commits
    for (let commit of commits) {
      let tasks = commit.message.match(/#\d+/g)
      if (tasks) {
        taskNumbers += tasks.join([])
      }      
    }

    let task = payload.ref.split('feature/')[1].match(/\d+/g);
    let featureTask = task[0];
    if (featureTask) {
      featureTask = '#' + featureTask
      taskNumbers += featureTask
    }     
  }
  if (taskNumbers.length !== 0) {
    taskNumbers = taskNumbers.split('#').filter((v, i, a) => v && a.indexOf(v) === i)
  }  

  let logDb = {
    date: new Date(),
    author: author,
    tasks: taskNumbers.join(),
    project: payload.pull_request ? payload.pull_request.head.repo.name : '',
    event: event,
    action: action,
    needAssign: needAssign
  }
  console.log(logDb);
  res.json(logDb);  

  switch (event) {
    case 'push':
      if (needAssign == true) {
        assignTo = author
      }
      redmine.setStatusWork(taskNumbers, "", assignTo)
      break;
    case 'pull_request':
      switch (action) {
        case 'review_requested':
          if (needAssign == true) {
            assignTo = payload.pull_request.requested_reviewers[0].login
          }
          redmine.setStatusReviewAndTl(taskNumbers, "", assignTo)
          break;
        default:
      }
      break
    case 'pull_request_review':
      action = payload.review.state
      switch (action) {
        case 'changes_requested':
          redmine.setStatusWork(taskNumbers, payload.review.body, needAssign)
          break;
        case 'approved':
          redmine.checkTaskStatus(taskNumbers)
          redmine.setStatusReadyBuild(taskNumbers)
          break;
        default:
      }
      break
    default:
  }

  Result.create(logDb, function (err, doc) {
    if (err) throw err;
  })
  //fs.appendFile('./log-result.txt', JSON.stringify(logDb)+ "\r\n\n", ()=>{})  
});

module.exports = router;

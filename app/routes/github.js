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

  let needAssign = !req.query.assign ? true : (req.query.assign == 'true')
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
  if (event == "pull_request" || event == 'pull_request_review') {
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
      // Делаем replace чтоб достать номер задачи из смердженной ветки
      let message = commit.message.replace('from Heads-and-Hands/feature/', '#').replace('_', ' ') 
      console.log(message)
      let tasks = message.match(/#\d+/g)

      if (tasks) {
        taskNumbers += tasks.join([])
      }      
    }

    let branchs = payload.ref.split('feature/')
    if (branchs.length > 1) {
      let task = branchs[1].match(/\d+/g);
      let featureTask = task[0];
      if (featureTask) {
        featureTask = '#' + featureTask
        taskNumbers += featureTask
      }     
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
      if (payload.ref == 'refs/heads/develop'){
        redmine.setStatusReadyBuild(taskNumbers, assignTo)
      } else {
        redmine.setStatusWork(taskNumbers, payload.head_commit.message, assignTo)
      }
      
      break;
    case 'pull_request':
      switch (action) {
        case 'review_requested':
          if (needAssign == true) {
            assignTo = payload.pull_request.requested_reviewers[0].login
          }
          redmine.setStatusReview(taskNumbers, "", assignTo)
          break;
        default:
      }
      break;
    case 'pull_request_review':
      state = payload.review.state
      switch (state) {
        case 'changes_requested':
          if (needAssign == true) {
            assignTo = payload.pull_request.user.login
          }          
          redmine.setStatusWork(taskNumbers, payload.review.body, assignTo)
          break;
        case 'approved':
          // Не понятно зачем это
          //redmine.checkTaskStatus(taskNumbers)          
          
          // не надо. Будет делать это по пушу в develop
          // if (needAssign == true) { assignTo = payload.pull_request.user.login }          
          // redmine.setStatusReadyBuild(taskNumbers, assignTo)
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

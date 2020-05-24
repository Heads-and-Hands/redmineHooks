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
  let logDb = {
    date: new Date(),
    type: '',
    author: '',
    tasks: '',
    project: ''
  }
  res.send(req.body.pull_request);
  if (req.body.pull_request !== undefined) {
    fs.appendFile('./log-request.txt', new Date() + "\r\n" + req.url + ' ' + JSON.stringify(req.body) + "\r\n\n", () => {
    });
    let commits = false
    try {
      commits = await axios(req.body.pull_request.commits_url.replace('api.github.com', keyGithub + '@api.github.com'))
    } catch (error) {
      console.log(error.response.status, error.response.statusText)
    }

    let needAssign = !req.query.assign ? false : req.query.assign

    let taskNumbers = []
    if (commits.data) {
      for (let value of commits.data) {
        let tasks = value.commit.message.replace('pull request #', '').match(/#\d+/g)
        if (tasks) {
          taskNumbers += tasks.join([])
        }
      }
    }

    let branchs = payload.ref.split('feature/') 
    if (branchs.length > 0) {
      let task = payload.ref.split('feature/')[1].match(/\d+/g);
      let featureTask = task[0];
      if (featureTask) {
        featureTask = '#' + featureTask
        taskNumbers += featureTask
      }
    }

    if (taskNumbers.length !== 0) {
      taskNumbers = taskNumbers.split('#').filter((v, i, a) => v && a.indexOf(v) === i)
      logDb.tasks = taskNumbers.join()
      logDb.project = req.body.pull_request.head.repo.name
      if (req.body.action === 'opened' || req.body.action === 'synchronize') {
        logDb.type = 'pr ' + req.body.action
        redmine.setStatusReviewAndTl(taskNumbers, "", needAssign)
      } else if (req.body.action === 'closed') {
        logDb.type = 'pr closed'
        redmine.checkTaskStatus(taskNumbers)
        redmine.setStatusReadyBuild(taskNumbers)
      } else if (req.body.action === 'submitted' && req.body.review.user.login !== 'handhci') {
        logDb.type = 'pr submitted'
        redmine.setStatusWork(taskNumbers, req.body.review.body, needAssign)
      }
    } else {
      logDb.type = 'no found task number'
    }
    if (!logDb.type) {
      logDb.type = 'pr ' + req.body.action + ' (no action)'
    }
    try {
      logDb.author = req.body.hasOwnProperty('user') ? req.body.review.user.login : req.body.sender.login
    } catch (error) {

    }
    Result.create(logDb, function (err, doc) {
      if (err) throw err;
    })
  } else {

  }

  fs.appendFile('./log-result.txt', log + "\r\n\n", ()=>{})
  res.send('end github')
});

module.exports = router;

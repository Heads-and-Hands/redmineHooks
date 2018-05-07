var express = require('express');
var router = express.Router();
const fs = require('fs');
var qs = require('qs');
var redmineService = require('./../modules/redmine')
const key = require('./../key.js').key
var redmine = new redmineService.Redmine(key.redmine)
var axios = require('axios')
const keyGithub = key.github
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
  if (req.body.pull_request !== undefined) {
    fs.appendFile('./log-request.txt', new Date() + "\r\n" + req.url + ' ' + JSON.stringify(req.body) + "\r\n\n", () => {
    });
    let commits = false
    try {
      commits = await axios(req.body.pull_request.commits_url.replace('api.github.com', keyGithub + '@api.github.com'))
    } catch (error) {
      console.log(error.response.status, error.response.statusText)
    }

    let taskNumbers = []
    if (commits.data) {
      for (let value of commits.data) {
        let tasks = value.commit.message.replace('pull request #', '').match(/#\d+/g)
        if (tasks) {
          taskNumbers += tasks.join([])
        }
      }
    }

    let featureTask = req.body.pull_request.head.ref.match(/feature\/\d+/g)

    if (featureTask) {
      featureTask = featureTask.join([]).replace('feature/', '#')
      taskNumbers += featureTask
    }

    if (taskNumbers.length !== 0) {
      taskNumbers = taskNumbers.split('#').filter((v, i, a) => v && a.indexOf(v) === i)
      logDb.tasks = taskNumbers.join()
      logDb.project = req.body.pull_request.head.repo.name
      if (req.body.action === 'opened' || req.body.action === 'synchronize') {
        logDb.type = 'pr ' + req.body.action
        redmine.setStatusReviewAndTl(taskNumbers)
      } else if (req.body.action === 'closed') {
        logDb.type = 'pr closed'
        redmine.setStatusReadyBuild(taskNumbers)
      } else if (req.body.action === 'submitted' && req.body.review.user.login !== 'handhci') {
        logDb.type = 'pr submitted'
        redmine.setStatusWork(taskNumbers, req.body.review.body)
      }
    } else {
      logDb.type = 'no found task number'
    }
    if (!logDb.type) {
      logDb.type = 'pr ' + req.body.action + ' (no action)'
    }
    logDb.author = req.body.review.user.login
    Result.create(logDb, function (err, doc) {
      if (err) throw err;
    })
  } else {

  }

  //fs.appendFile('./log-result.txt', log + "\r\n\n", ()=>{})
  res.send('end github')
});

module.exports = router;

var express = require('express');
var router = express.Router();
const fs = require('fs');
var qs = require('qs');
var redmineService = require('./../modules/redmine')
const key = require('./../key.js').key
var redmine = new redmineService.Redmine(key.redmine)
var axios = require('axios')
const keyGithub = key.github

router.post('/', async function (req, res, next) {
  let log = new Date() + "\r\n"
  if (req.body.pull_request !== undefined) {
    fs.appendFile('./log-request.txt', new Date() + "\r\n" + req.url + ' ' + JSON.stringify(req.body) + "\r\n\n", ()=>{});
    let commits = false
    try {
      commits = await axios(req.body.pull_request.commits_url.replace('api.github.com', keyGithub + '@api.github.com'))
    } catch (error) {
      console.log(error.response.status, error.response.statusText)
    }

    let taskNumbers = []
    if(commits.data){
      for(let value of commits.data){
        let tasks = value.commit.message.match(/#\d+/g)
        if(tasks){
          taskNumbers += tasks.join([])
        }
      }
    }
    taskNumbers = taskNumbers.split('#').filter((v, i, a) => v && a.indexOf(v) === i)
    if (taskNumbers) {
      if (req.body.action === 'opened' || req.body.action === 'synchronize') {
        log += 'pr opened or sync'
        redmine.setStatusReviewAndTl(taskNumbers)
      } else if (req.body.action === 'closed') {
        log += 'pr closed'
        redmine.setStatusReadyBuild(taskNumbers)
      } else if (req.body.action === 'submitted') {
        log += 'pr submitted'
        redmine.setStatusWork(taskNumbers, req.body.review.body)
      }
    } else {
      log += 'no found task number'
    }
  } else {
    log += 'no pull request'
  }
  fs.appendFile('./log-result.txt', log + "\r\n\n", ()=>{})
  res.send(log +' end github')
});

module.exports = router;

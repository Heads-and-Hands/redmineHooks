var express = require('express');
var router = express.Router();
const fs = require('fs');
var qs = require('qs');
var redmineService = require('./../modules/redmine')
const key = require('./../key.js').key
var redmine = new redmineService.Redmine(key)

router.post('/', function (req, res, next) {
  console.log(req.body)
  let reqParsed = qs.parse(req.body)
  reqParsed = JSON.parse(reqParsed.payload)
  fs.appendFile('./log.txt',
    new Date() + "\r\n" + req.url + ' ' + req.body + "\r\n\n", function (err) {}
  );
  if (reqParsed.pull_request !== undefined) {
    let taskNumber = reqParsed.pull_request.title.match(/\d+/g)
    if(taskNumber){
      taskNumber = taskNumber.join([])
      console.log(taskNumber)
      if (reqParsed.action === 'opened' || reqParsed.action === 'synchronize') {
        console.log('opened or sync')
        redmine.setStatusReviewAndTl(taskNumber)
      } else if (reqParsed.action === 'closed') {
        console.log('closed')
        redmine.setStatusReadyBuild(taskNumber)
      } else if (reqParsed.action === 'submitted') {
        console.log('submitted')
        redmine.setStatusWork(taskNumber, reqParsed.review.body)
      }
    } else {
      console.log('no found task number')
    }


  } else {
     res.send('no pull request');
  }
  res.send('end github');
});

module.exports = router;

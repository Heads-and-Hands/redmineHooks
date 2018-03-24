var express = require('express');
var router = express.Router();
const fs = require('fs');
var qs = require('qs');
var redmineService = require('./../modules/redmine')
const key = require('./../key.js').key
var redmine = new redmineService.Redmine(key)

router.post('/', function(req, res, next) {
  let q = qs.parse(req.url.split('?')[1])
  let reqParsed = req.body
  fs.appendFile('./log.txt',
    new Date() + "\r\n" + req.url + ' ' + JSON.stringify(reqParsed) + "\r\n\n", function (err) {}
  );
  if (reqParsed.build_status === 1 && reqParsed.git.src_branch === 'develop' && reqParsed.git.dst_branch === 'develop') {
    console.log('bitrise build ' + q.project + ' ' +  reqParsed.build_number)
    redmine.bitriseHook(q.project, reqParsed.build_number)
  } else {
    console.log('bitrise not now')
  }
  res.send('bitrise end');
});

module.exports = router;

var express = require('express')
var router = express.Router()
const fs = require('fs')
var qs = require('qs')
var redmineService = require('./../modules/redmine')
const key = process.env;
var redmine = new redmineService.Redmine(key.KEY_REDMINE)

var dbo = require('./../modules/db')
var Result = dbo.mongoose.model('results', dbo.anySchema, 'results')

router.post('/', async function (req, res, next) {
  let q = qs.parse(req.url.split('?')[1])
  let reqParsed = req.body
  let logDb = {
    date: new Date(),
    type: '',
    project: '',
    buildNumber: ''
  }
  fs.appendFile('./log-bitrise.txt', new Date() + "\r\n" + req.url + ' ' + JSON.stringify(reqParsed) + "\r\n\n", () => {})
  if (reqParsed.build_status === 1 && reqParsed.git.src_branch === 'develop' && reqParsed.git.dst_branch === 'develop') {
    logDb.type = 'bitrise build'
    logDb.project = q.project
    logDb.buildNumber = reqParsed.build_number
    let tasks = await redmine.bitriseHook(q.project, reqParsed.build_number)
    logDb.tasks = tasks.join()
    Result.create(logDb, function (err, doc) {
      if (err) throw err;
    })
  } else {

  }

  //fs.appendFile('./log-bitrise.txt', log + "\r\n\n", () => {})
  res.send('bitrise end')
})

module.exports = router

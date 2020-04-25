var express = require('express')
var router = express.Router()
const fs = require('fs')
var qs = require('qs')
var redmineService = require('../modules/redmine')
const key = process.env;
var redmine = new redmineService.Redmine(key.KEY_REDMINE)

var dbo = require('../modules/db')
var Result = dbo.mongoose.model('results', dbo.anySchema, 'results')

router.post('/', async function (req, res, next) {
    let payload = JSON.parse(req.body)
    console.log(payload)
    res.json({})

    let q = qs.parse(req.url.split('?')[1])
    let reqParsed = req.body
    let logDb = {
        date: new Date(),
        type: '',
        project: '',
        buildNumber: ''
    }
    if (reqParsed.build_status === 1 && (reqParsed.git.src_branch === 'develop' && reqParsed.git.dst_branch === 'develop') || (reqParsed.git.dst_branch.split("/")[0] === 'release' && reqParsed.git.src_branch.split("/")[0] === 'release')) {
        logDb.type = 'bitrise build'
        logDb.project = q.project
        logDb.buildNumber = reqParsed.build_number
        let needAssign = !req.query.assign ? false : req.query.assign
        //let tasks = await redmine.bitriseHook(q.project, reqParsed.build_number, needAssign)
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

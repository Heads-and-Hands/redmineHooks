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
    let logDb = {
        date: new Date(),
        type: '',
        project: '',
        buildNumber: ''
    }

    let project = req.query.project
    let reqParsed = req.body
    console.log("bitrise")
    console.log(reqParsed)
    if (reqParsed.build_status === 1 && (reqParsed.git.src_branch === 'develop' && reqParsed.git.dst_branch === 'develop') 
    || (reqParsed.git.dst_branch.split("/")[0] === 'release' && reqParsed.git.src_branch.split("/")[0] === 'release')) {
        logDb.type = 'bitrise build'
        logDb.project = project
        logDb.buildNumber = reqParsed.build_number
        let needAssign = !req.query.assign ? true : (req.query.assign == 'true')
        let tasks = await redmine.setStatusComplete(project, reqParsed.build_number, needAssign)
        logDb.tasks = tasks.join()
    } else {

    }
    
    res.json(logDb); 
    console.log(logDb);
    Result.create(logDb, function (err, doc) {
        if (err) throw err;
    })    
    // fs.appendFile('./log-bitrise.txt', new Date() + "\r\n" + req.url + ' ' + JSON.stringify(reqParsed) + "\r\n\n", () => {
    // })   
})

module.exports = router

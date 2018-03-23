const http = require('http');
const fs = require('fs');
var qs = require('qs');

var redmineService = require('./redmine.js')
const key = require('./key.js').key
var redmine = new redmineService.Redmine(key)


let server = new http.Server(function (req, res) {
  var request = '';
  res.setHeader('Content-Type', 'application/json');
  req.on('data', (data) => {
    request += data;
  });

  req.on('end', () => {
    fs.appendFile('./log.txt',
      new Date() + "\r\n" + req.connection.remoteAddress + ' ' + req.url + ' ' + request + "\r\n\n", function (err) {}
    );
    //console.log(req.connection.remoteAddress)

    try {
      if (request.indexOf('payload=') !== -1) {
        let reqParsed = qs.parse(request)
        reqParsed = JSON.parse(reqParsed.payload)
        if (reqParsed.pull_request !== undefined) {
          let taskNumber = reqParsed.pull_request.title.match(/\d+/g).join([])
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
          console.log('no pull request')
        }

      } else if(request.indexOf('build_slug') !== -1) {
        console.log('bitrise')
        let q = qs.parse(req.url.split('?')[1])
        let reqParsed = JSON.parse(request)
        if (reqParsed.build_status === 1 && reqParsed.git.src_branch === 'develop' && reqParsed.git.dst_branch === 'develop') {
          redmine.bitriseHook(q.project, reqParsed.build_number)
        } else {
          console.log('bitrise not now')
        }
      } else {
        console.log('bad request')
      }
    } catch (error) {
      console.log('parse error')
    }
    res.end('complete');
  });
});

server.listen(8001, '0.0.0.0');

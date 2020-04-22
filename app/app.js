var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')
var stylus = require('stylus')
var bodyParser = require('body-parser')
const basicAuth = require('express-basic-auth')
const key = process.env;

var indexRouter = require('./routes/index')
var githubRouter = require('./routes/github')
var bitriseRouter = require('./routes/bitrise')
var resultsRouter = require('./routes/result')

var app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(cookieParser())
app.use(stylus.middleware(path.join(__dirname, 'public')))
app.use(express.static(path.join(__dirname, 'public')))

// app.use(function (req, res, next) {
//   let remoteIp = req.client.remoteAddress
//   if (
//     req.originalUrl.indexOf('github') !== -1 && process.env.DEBUG === undefined &&
//     (!ip.cidrSubnet('192.30.252.0/22').contains(remoteIp) && !ip.cidrSubnet('185.199.108.0/22').contains(remoteIp))
//   ) {
//     res.status(500).send('azaza')
//   } else {
//     next()
//   }
// })

app.use('/', indexRouter)
app.use('/github', githubRouter)
app.use('/bitrise', bitriseRouter)

let users = {}
users[key.ADMIN_NAME] = key.ADMIN_PASS
app.use(basicAuth({
  users: users,
  challenge: true
}))
app.use('/results', resultsRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app

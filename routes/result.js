var express = require('express')
var router = express.Router()
var dbo = require('./../modules/db')

router.get('/', async function (req, res, next) {
  let Result = dbo.mongoose.model('results', dbo.anySchema, 'results')
  Result.find({}).sort({'date': -1}).limit(50).lean().exec(function (err, docs) {
    res.render('results', {title: 'Операции', data: docs})
  })
})

module.exports = router

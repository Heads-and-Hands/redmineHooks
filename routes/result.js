var express = require('express')
var router = express.Router()
var dbo = require('./../modules/db')

router.get('/', async function (req, res, next) {
  let Result = dbo.mongoose.model('results', dbo.anySchema, 'results')
  Result.find({}).sort({'date': -1}).limit(50).lean().exec(function (err, docs) {
    for (let doc of docs) {
      let fDate = doc.date
      doc.date = fDate.getFullYear() + '.' +
        ('0' + fDate.getMonth()).slice(-2) + '.' +
        ('0' + fDate.getDay()).slice(-2) + ' ' +
        ('0' + fDate.getHours()).slice(-2) + ':' +
        ('0' + fDate.getMinutes()).slice(-2) + ':' +
        ('0' + fDate.getSeconds()).slice(-2)
    }
    res.render('results', {title: 'Операции', data: docs})
  })
})

module.exports = router

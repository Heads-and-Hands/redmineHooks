const url = 'mongodb://mongo:27017/hooks';
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var Schema = mongoose.Schema;
var anySchema = new Schema({any:{}}, {versionKey: false, strict: false});
mongoose.connect(url);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});

module.exports = {
  mongoose: mongoose,
  ObjectId: ObjectId,
  anySchema: anySchema
};

var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var mongoStore = require('connect-mongo')(session);

var app = express();

// mongodb connection
var DatabaseURL = "mongodb://localhost:27017/events";
mongoose.connect(DatabaseURL , {useNewUrlParser: true}, function(err) {
  if(err) {
      var err = new Error('Conncetion to Database Failed.');
      err.status = 502;
      return next(err);
  }
});

var db = mongoose.connection;

// mongo error
db.on('error', console.error.bind(console, 'connection error:'));

// use sessions for tracking logins
app.use(session({
  secret: 'duttaditya18',
  resave: true,
  saveUninitialized: false,
  store: new mongoStore({
    mongooseConnection: db
  })
}));

// make user ID available in templates
app.use(function(req, res, next) {
  res.locals.currentUser = req.session.userId;
  next();
});

// parse incoming requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// serve static files from /public
app.use(express.static(__dirname + '/public'));

// view engine setup
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// include routes
var routes = require('./routes/index');
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('The Page you requested was not found.');
  err.status = 404;
  next(err);
});

// error handler
// define as the last app.use callback
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    title: "Error",
    message: err.message,
    error: {}
  });
});

const serverIp = '0.0.0.0';
const serverPort = 80;

app.listen(serverPort, serverIp, function() {
	console.log(`Server running at 'http://${serverIp}:${serverPort}/'`);
});

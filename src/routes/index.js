var express = require('express');
var moment = require('moment');
var multer  = require('multer');
var imgur  = require('imgur');
var fs = require('fs');
var router = express.Router();
var user = require('../models/user');
var comp = require('../models/comp');
var mid = require('../middleware/index');
var funcs = require('../funcs/index');
var upload = multer({ dest: './src/public/eventImg/' })

imgur.setClientId('96b89a7cdc32944');

// GET /
router.get('/', function(req, res, next) {
  return res.render('index', { title: 'Home' });
});

// GET /about
router.get('/about', function(req, res, next) {
  return res.render('about', { title: 'About' });
});

// GET /logout
router.get('/logout', function(req, res, next) {
  if(req.session) {
    // delelte session object
    req.session.destroy(function(err) {
      if(err) {
        return next(err);
      } else {
        return res.redirect('/');
      }
    })
  }
});

// GET /login
router.get('/login', mid.loggedOut, function(req, res, next) {
  return res.render('login', { title: 'Login'});
});

// POST /login
router.post('/login', function(req, res, next) {
  if(req.body.name && req.body.password) {
    user.authenticate(req.body.name, req.body.password, function(error, user) {
      if(error || !user) {
        var err = new Error('Wrong username or password.');
        err.status = 401;
        return next(err);
      } else {
        req.session.userId = user._id;
        return res.redirect('/me');
      }
    });
  } else {
    var err = new Error('Username and password are required.');
    err.status = 401;
    return next(err);
  }
});

// GET /register
router.get('/register', mid.loggedOut, function(req, res, next) {
  return res.render('register', { title: 'Sign Up' });
});

// POST /register
router.post('/register', function(req, res, next) {
  console.log(req.body)
  if(req.body.email && req.body.name && req.body.password && req.body.confirmPassword) {
    // confirm that user typed the same password twice
    if(req.body.password !== req.body.confirmPassword) {
      var err = new Error('Passwords do not match.');
      err.status = 400;
      return next(err);
    }

    // create object with form input
    var userData = {
      email: req.body.email,
      name: req.body.name,
      password: req.body.password
    }

    // user schema's create method to insert our document into mongo
    user.create(userData, function(err, user) {
      if(err) {
        return next(err);
      } else {
        req.session.userId = user._id;
        return res.redirect('/me');
      }
    });

  } else {
    var err = new Error('All fields required.');
    err.status = 400;
    return next(err);
  }
});

// GET /addEvent
router.get('/addEvent', mid.requiresLogin, function(req, res, next) {
  return res.render('addEvent', { title: 'Add Event' });
});

// POST /addEvent
router.post('/addEvent', upload.single('eventImg'), function(req, res, next) {
  if(req.body.eventName && req.body.eventDateFrom && req.body.eventDateTo && req.body.eventType
    && req.body.eventVenue && req.body.eventDetails && req.body.eventOrg && req.body.eventContact
    && req.body.eventMail && req.body.eventFB && req.body.eventOverview  && req.file) {
    
    var eventUrl =  `${req.body.eventType}/${moment(req.body.eventDate).format('YYYY/MM/DD')}/${(req.body.eventName).split(" ")[0]}`;
    if(moment(req.body.eventDateFrom).isAfter(req.body.eventDateTo)) {
      var err = new Error("Ending Date should be after the Starting Date.");
      return next(err);
    }

    imgur.uploadFile(req.file.path)
    .then(function (json) {

      fs.unlinkSync(req.file.path);

      // create object with form input
      var compData = {
        name: req.body.eventName,
        org: req.body.eventOrg,
        img: json.data.link,
        dateFrom: req.body.eventDateFrom,
        dateTo: req.body.eventDateTo,
        type: req.body.eventType,
        venue: req.body.eventVenue,
        contact: req.body.eventContact,
        mail: req.body.eventMail,
        fb: req.body.eventFB,
        web: req.body.eventWeb,
        overview: req.body.eventOverview,
        details: req.body.eventDetails,
        url: eventUrl,
        creator: req.session.userId
      }
  
      // comp schema's create method to insert our document into mongo
      comp.create(compData, function(err, newComp) {
        if(err) {
          if (err.code === 11000) {
            err.message = "The URL you specified is already being used. Please use a different URL."
          }
          return next(err);
        }
        
        else {
          // add the created event into the events array of the creator
          user.findByIdAndUpdate(req.session.userId, {$push: {events: newComp._id}}, {safe: true, upsert: true}, function(err, doc) {
                if(err) return next(err);
            }
        );
        return res.redirect('/events/'+ newComp.url);
        }
      });
    })
    .catch(function (err) {
        return next(err);
    });
    
  } else {
    var err = new Error('All fields required.');
    err.status = 400;
    return next(err);
  }
});

// GET /events
router.get('/events', function(req, res, next) {
  funcs.getEvents(req, res, next);
});

// GET /events/*
router.get('/events/*', function(req, res, next) {

  var eventUrl = (req.originalUrl).replace('/events/', '');

  if(!eventUrl) {

    funcs.getEvents(req, res, next);
  
  } else {

    // display single events
    comp.findOne({ 'url': eventUrl }, function(err, comp) {
      if(!comp) {
        var err = new Error('Event not found.');
        err.status = 404;
        return next(err);
      } else {
        user.findOne({ '_id': comp.creator} , function(err, user) {
          if(!user) {
            var err = new Error('Event not found.');
            err.status = 404;
            return next(err);
          } else {
            return res.render('eventProfile', { title: comp.name, comp: comp, creator: user, moment: moment, userId: req.session.userId });
          }
        });
      }
    });
  }
});

// GET /users/:name
router.get('/users/:name', function(req, res, next) {
  var name = req.params.name;
  if(name) {
    name = name.replace('@', '');
    user.findOne({ 'name': name }, function(err, user) {
      if (err) return next(err);
      if(!user) {
        var err = new Error('User not found.');
        err.status = 404;
        return next(err);
      } else if(user) {
        comp.find({ "creator" : user._id }, function(err, compList) {
          if (err) return next(err);
          return res.render('profile', { title: user.name, user: user, compList: compList, moment: moment });
        });
      }
    });
  }
});

// GET /me
router.get('/me', mid.requiresLogin, function(req, res, next) {
  user.findById(req.session.userId).exec(function(error, user) {
    if(error) {
      return next(error);
    } else {
      return res.redirect("users/" + user.name);
    }
  })
});

// GET /edit/*
router.get('/edit/*', function(req, res, next) {

  var editUrl = (req.originalUrl).replace('/edit/', '');
  
  if (!editUrl) {
    var err = new Error("The Page you requested was not found.")
    err.status = 404;
    return next(err);
  } else {
    comp.find({ url: editUrl }, function(err, comp) {
      if(err) {
        return next(err);
      }
      if(comp[0].creator == req.session.userId) {
        return res.render('edit', { title: `Edit : ${comp[0].name}`, comp: comp[0], moment: moment });
      } else {
        var err = new Error("You don't have the authority to view this page.");
        err.status = 403;
        return next(err);
      }
    });
  }

});

// POST /edit/*
router.post('/edit/*', upload.single('eventImg'), function(req, res, next) {
  
  var editUrl = (req.originalUrl).replace('/edit/', '');
  
  if(req.body.eventName && req.body.eventDate && req.body.eventType && req.body.eventVenue && req.body.eventDetails) {
    
    var eventUrl =  `${req.body.eventType}/${moment(req.body.eventDate).format('YYYY/MM/DD')}/${(req.body.eventName).split(" ")[0]}`;
    
    if(req.file) {
      
      imgur.uploadFile(req.file.path)
      .then(function (json) {
        
        // create object with form input
        var compData = {
          name: req.body.eventName,
          date: req.body.eventDate,
          type: req.body.eventType,
          venue: req.body.eventVenue,
          details: req.body.eventDetails,
          url: eventUrl,
          img: json.data.link,
          creator: req.session.userId
        }
      });
    } else {
      var compData = {
        name: req.body.eventName,
        date: req.body.eventDate,
        type: req.body.eventType,
        venue: req.body.eventVenue,
        details: req.body.eventDetails,
        url: eventUrl,
        creator: req.session.userId
      }
    }
  }
  
  comp.findOneAndUpdate({ url: editUrl }, compData, function(err, comp) {
    if(err) {
      return next(err);
    }

    return res.redirect("/events/" + eventUrl);
  });
});

// GET /delete/*
router.get('/delete/*', function(req, res, next) {

  var delUrl = (req.originalUrl).replace('/delete/', '');

  if (!delUrl) {
    var err = new Error("The Page you requested was not found.")
    err.status = 404;
    return next(err);
  } else {
    comp.find({ url: delUrl }, function(err, comp) {
      if(err) {
        return next(err);
      } else if(comp[0].creator == req.session.userId) {
        return res.render('delete', { title: `Delete : ${comp[0].name}`, comp: comp[0], moment: moment });
      } else {
        var err = new Error("You don't have the authority to view this page.");
        err.status = 403;
        return next(err);
      }
    });
  }
});

// POST /delete/*
router.post('/delete/*', function(req, res, next) {

  var editUrl = (req.originalUrl).replace('/delete/', '');

  comp.findOneAndRemove({url: editUrl}, function(err) {
    if(err) {
      return next(err);
    }
  });

  res.redirect("/events");
});

module.exports = router;

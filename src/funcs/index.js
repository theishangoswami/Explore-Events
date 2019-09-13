var comp = require('../models/comp');
var moment = require('moment');

function getEvents(req, res, next) {
    // display all events
    comp.find({}).sort('date').exec(function(err, comps) {
        if(err) {
        return next(err);
        }
        var compMap = [];

        comps.forEach(function(comp, i) {
        compMap[i] = comp;
        });
        return res.render('events', { title: 'Events', compList: compMap, moment: moment });
    });
}

module.exports.getEvents = getEvents;
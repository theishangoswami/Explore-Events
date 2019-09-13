var mongoose = require('mongoose');

var compSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    org: {
        type: String,
        required: true
    },
    img: {
        type: String,
        required: true
    },
    dateFrom: {
        type: Date,
        required: true
    },
    dateTo: {
        type: Date,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    venue: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    mail: {
        type: String,
        required: true
    },
    fb: {
        type: String,
        required: true
    },
    web: {
        type: String,
        required: true
    },
    overview: {
        type: String,
        required: true
    },
    details: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true,
        unique: true
    },
    creator: {
        type: String,
        required: true
    }
});


// mongoose automatically makes the plural version
var comp = mongoose.model('comp', compSchema);
module.exports = comp;
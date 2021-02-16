var mongoose = require('./connection'),
    Schema = mongoose.Schema;

var AppInfoModel = new Schema({
    is_maintenance: {
        type: String,
        enum: ['Y', 'N'],
        default: 'N'
    },
    version: {
        type: Number,
        default: 0
    },
    message: {
        type: String, 
        default: null
    }, 
    is_admin_msg_active:{
        type: String, 
        enum: ['Y', 'N'],
        default: 'N'
    },
    message_from_admin: {
        type: String, 
        default: null
    }
});

var AppInfo = mongoose.model('AppInfo', AppInfoModel);

module.exports = { AppInfo };
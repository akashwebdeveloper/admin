var mongoose = require('./connection'),
    config = require('../../config');
Schema = mongoose.Schema;


var UserModel = new Schema({
    parent: { 
        type: Schema.Types.ObjectId, 
        ref: 'User',
        default: null 
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    email: {
        type: String,
        trim: true
    },
    mobile_no: {
        type: String,
        trim: true,
    },
    password: {
        type: String
    },
    profilepic: {
        type: String,
        trim: true
    },
    created_at: {
        type: String
    },
    main_wallet:{
        type: Number, 
        default: 0
    }, 
    commission_wallet:{
        type: Number, 
        default: 0
    },
    commission_rate:{
        type: Number, 
        default: 0
    },
    device_type: {
        type: String,
        enum: ['ios', 'android']
    },
    reset_token: {
        value: {
            type: String
        },
        expired_at: {
            type: String
        }
    },
    is_active: {
        type: Boolean,
        default: true
    },
    is_deleted: {
        type: Boolean,
        default: false
    },
    onesignal_id: {
        type: String,
        default: ""
    },
    user_device: {
        id: {
            type: String
        },
        name: {
            type: String
        },
        model: {
            type: String
        },
        os: {
            type: String
        },
        processor: {
            type: String
        },
        ram: {
            type: String
        }
    },
    access_type: {
        type: String,
        enum: ['U', 'A', 'S'],  // U = User , A = Agent, S = Sub-admin
        required: true
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
});

var User = mongoose.model('User', UserModel);

module.exports = {
    User
};
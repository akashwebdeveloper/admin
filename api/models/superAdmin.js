var mongoose = require('./connection'),
    Schema = mongoose.Schema;

var config = require('./../../config');

var SuperAdminModel = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String
    },
    is_active:{
        type: Boolean,
        default: true
    },
    is_deleted:{
        type: Boolean,
        default: false
    },
	tokens: [{
		access: {
			type: String,
			required: true
		},
		token: {
			type: String,
			required: true
		}
	}]
}, {
    usePushEach: true
});


module.exports = mongoose.model('SuperAdmin', SuperAdminModel);
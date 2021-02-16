var mongoose = require('./connection'),
    Schema = mongoose.Schema;

var PackageModel = new Schema({
    boot_amount: {
        type: Number,
        required: true
    },
    created_at: {
        type: String, 
        required: true
    },
    is_active: {
        type: Boolean,
        default: true
    },
    is_deleted: {
        type: Boolean,
        default: false
    }
});

var Package = mongoose.model('Package', PackageModel);

module.exports = {Package};
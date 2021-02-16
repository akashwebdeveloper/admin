var mongoose = require('./connection'),
    Schema = mongoose.Schema;

var config = require('../../config');

var TableModel = new Schema({
    room: {
        type: String,
        required: true
    },
    room_type: {
        type: String,
        enum: ['PUB', 'PVT']
    },
    no_of_players: {
        type: Number
    },
    created_by: {
        type: String
    },
    created_at: {
        type: Number
    },
    game_started_at: {
        type: String,
        default: '-1'
    },
    game_completed_at: {
        type: String,
        default: '-1'
    },
    created_date: {
        type: Date,
        default: Date.now()
    },
    room_fee: {
        type: Number
    },
    players: [{
        id: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        rank: {
            type: Number,
            default: 0
        },
        fees:{
            type: Number,
            default: 0
        },
        pl:{
            type: Number,
            default: 0
        },  
        is_active:{
            type: Boolean,
            default: false
        }
    }],
});

module.exports = mongoose.model('Table', TableModel);
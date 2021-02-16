var mongoose = require('./connection'),
    Schema = mongoose.Schema;

var TransactionModel = new Schema({
    source: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    destination: {
        type: Schema.Types.ObjectId,
        ref: 'User', 
        default: null
    },
    txn_amount: {
        type: Number,
        required: true,
        default: 0
    },
    main_wallet: {
        type: Number,
        required: true,
        default: 0
    },
    commission_wallet: {
        type: Number,
        required: true,
        default: 0
    },
    commission_rate: {
        type: Number,
        required: true,
        default: 0    
    },
    created_at: {
        type: String
    },
    transaction_type: {
        type: String,
        enum: ['C', 'D'], // C = Credit, D = Debit
        default: "C"
    },
    resp_msg:{
        type: String,
        default: "NA"
    },
    txn_mode: {
        type: String,
        enum: ['G', 'C', 'A', 'SA', 'AG']  // G = Game, C = Commission, A = Admin, SA = Sub-Admin, 'AG' = Agent 
    },
    is_status: {
        type: String,
        enum: ['P', 'S', 'F'], // P = Pending, S = Success, F = Faild
        default: 'P'
    }
});

var Transaction = mongoose.model('Transaction', TransactionModel);

module.exports = {
    Transaction
};
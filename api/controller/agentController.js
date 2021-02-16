var SuperAdmin = require('./../models/superAdmin'),
    Service = require('./../service'),
    config = require('./../../config'),
    { User } = require('./../models/user'),
    Table = require('./../models/table'),
    _ = require('lodash'),
    { Transaction } = require('./../models/transaction'),
    localization = require('./../service/localization');
var ObjectId = require('mongoose').Types.ObjectId;
var moment = require('moment');
var bcrypt = require('bcryptjs');
const { Parser } = require('json2csv');

module.exports = {

    getAgents: async (req, res) => {
        try {
            const agent = await User.find({
                access_type: 'A'
            }).populate('parent').sort({
                created_at: -1
            });

            console.log("Agents", agent);

            const list = await Promise.all(
                agent.map(async u => {
                    console.log('A', u.parent);
                    if(u.parent == null){
                        u.created_by = 'ADMIN';
                        u.created_by_id = '';
                    } else {
                        u.created_by = u.parent.username;
                        u.created_by_id = u.parent._id;
                    }
                    return {
                        id: u._id,
                        name: u.name,
                        username: u.username,
                        total_agent: 0,
                        main_wallet: u.main_wallet,
                        commission_wallet: u.commission_wallet,
                        is_active: u.is_active,
                        created_at: u.created_at, 
                        created_by: u.created_by, 
                        created_by_id: u.created_by_id
                    };
                })
            );

            let count = await User.find({
                access_type: 'A'
            }).countDocuments();

            return { list, count };

        } catch (error) {
            console.log(error);
            return res.status(200).json(Service.response(0, localization.ServerError, null));
        }
    },

    createAgent: async (req, res) => {
        try {
            var params = _.pick(req.body, 'name', 'email', 'mobile_number', 'password', 'user_name');

            console.log("New Agent Create Request", params);

            if (_.isEmpty(params)) {
                return res.status(200).json(Service.response(0, localization.missingParamError, null));
            }

            if (_.isEmpty(params.name)) {
                return res.status(200).json(Service.response(0, localization.nameError, null));
            }

            if (_.isEmpty(params.user_name)) {
                return res.status(200).json(Service.response(0, localization.usernameValidationError, null));
            }

            if (params.email) {
                if (!Service.validateEmail(params.email)) {
                    return res.status(200).json(Service.response(0, localization.emailValidationError, null));
                }
            }

            if (params.mobile_number) {
                if (isNaN(params.mobile_number) || params.mobile_number.trim().length != 10) {
                    return res.status(200).json(Service.response(0, localization.mobileValidationError, null));
                }
            }

            if (_.isEmpty(params.password)) {
                return res.status(200).json(Service.response(0, localization.passwordEmptyError, null));
            }

            if (params.password.trim().length < 8) {
                return res.status(200).json(Service.response(0, localization.passwordValidationError, null));
            }

            if (params.user_name) {

                var sub_username = await User.findOne({
                    access_type: 'A',
                    username: params.user_name.trim()
                });

                if (sub_username) {
                    return res.status(200).json(Service.response(0, localization.uniqueUserNameError, null));
                }
            }

            var hash = bcrypt.hashSync(params.password);

            if (params.email) {

                var subadminemail = await User.findOne({
                    access_type: 'A',
                    email: params.email.trim()
                });

                if (subadminemail) {
                    return res.status(200).json(Service.response(0, localization.emailExistError, null));
                }
            }

            if (params.mobile_number) {
                var agentMob = await User.findOne({
                    access_type: 'A',
                    'mobile_no.number': params.mobile_number
                });

                if (agentMob) {
                    return res.status(200).json(Service.response(0, localization.mobileExistError, null));
                }
            }

            var token = await Service.issueToken(params);

            var newAgent = new User({
                name: params.name,
                username: params.user_name.trim(),
                email: params.email || '',
                created_at: new Date().getTime(),
                password: hash || '',
                mobile_number: params.mobile_number || '',
                access_type: 'A',
                tokens: [{
                    token: token
                }]
            });

            var newAgentSave = await newAgent.save();

            if (!newAgentSave) {
                return res.status(200).json(Service.response(0, localization.ServerError, null));
            } else {
                return res.status(200).json(Service.response(1, localization.success, null));
            }

        } catch (error) {
            console.log(error);
            return res.status(200).json(Service.response(0, localization.ServerError, null));
        }
    },

    getAgentCount: async () => {
        var c = await await User.find({
            access_type: 'A'
        }).countDocuments();
        return c;
    },

    getAgentProfile: async id => {
        console.log('Admin Request for Agent Profile ::', id)

        var u = await User.findById(id);

        var list = {
            id: u._id,
            name: _.capitalize(u.name),
            username: u.username,
            email: u.email || 'NA',
            m_wallet: u.main_wallet,
            c_wallet: u.commission_wallet,
            c_rate: u.commission_rate,
            mobile: u.mobile_number || 'NA',
            is_active: u.is_active,
            created_at: u.created_at
        };

        return list;
    },

    getAgentUser: async (id) => {
        console.log('Agent Profile ::', id)

        const agUser = await User.find({
            parent: id, 
            access_type: 'U' 
        }).sort({created_at: -1});

        console.log("u", agUser);

        if(agUser) {
            const list = await Promise.all(
                agUser.map(async u => {
                    return {
                        id: u._id,
                        name: _.capitalize(u.name),
                        username: u.username,
                        email: u.email || 'NA',
                        m_wallet: u.main_wallet,
                        c_wallet: u.commission_wallet,
                        c_rate: u.commission_rate,
                        mobile: u.mobile_number || 'NA',
                        is_active: u.is_active,
                        created_at: u.created_at
                    };    
                })
            );

            return list;
        }
    },

    updateStatus: async function (req, res) {
        if(req.admin2factor){
            var params = _.pick(req.body, ['request_id', 'status']);
            console.log("Agent status update", params);
            if (!params) return res.send(Service.response(0, localization.missingParamError, null));

            if (!Service.validateObjectId(params.request_id)) {
                return res.send(Service.response(0, localization.missingParamError, null));
            }

            var rez = await User.findByIdAndUpdate(params.request_id, {
                $set: {
                    is_active: params.status
                }
            });
            if (rez) return res.send(Service.response(1, localization.success, null));
            else return res.send(Service.response(0, localization.serverError, null));
        } else {
            return res.send(Service.response(0, localization.tokenExpired, null)); 
        }    
    },

    setCommission: async function (req, res) {
        if(req.admin2factor){
            var params = _.pick(req.body, ['commission', 'id']);

            console.log("Set Commission", params);

            if (!params) return res.send(Service.response(0, localization.missingParamError, null));

            if (_.isEmpty(params.commission)) {
                return res.status(200).json(Service.response(0, localization.missingParamError, null));
            }

            if (params.commission.trim() <= 0) {
                return res.status(200).json(Service.response(0, localization.invalidCommission, null));
            }

            if (!Service.validateObjectId(params.id)) {
                return res.send(Service.response(0, localization.missingParamError, null));
            }

            var rez = await User.findByIdAndUpdate(params.id, {
                $set: {
                    commission_rate: params.commission
                }
            });

            if (rez) return res.send(Service.response(1, localization.success, null));
            else return res.send(Service.response(0, localization.serverError, null));
        } else {
            return res.send(Service.response(0, localization.tokenExpired, null));    
        }
    },

    addCoin: async function (req, res) {
        if(req.admin2factor){

            var params = _.pick(req.body, ['coin', 'id', 'wallet']);

            console.log("Add Coin To Agent", params);

            if (!params) return res.send(Service.response(0, localization.missingParamError, null));

            if (_.isEmpty(params.coin)) {
                return res.status(200).json(Service.response(0, localization.missingParamError, null));
            }

            if (_.isEmpty(params.wallet)) {
                return res.status(200).json(Service.response(0, localization.missingParamError, null));
            }

            if (params.coin.trim() <= 0) {
                return res.status(200).json(Service.response(0, localization.invalidCommission, null));
            }

            if (!Service.validateObjectId(params.id)) {
                return res.send(Service.response(0, localization.missingParamError, null));
            }

            var newOrder = new Transaction({
                source: req.admin._id,
                destination: params.id,
                txn_amount: params.coin,
                created_at: new Date().getTime(),
                transaction_type: 'C',
                txn_mode: 'A',
                resp_msg: 'Coin Deposit',
                is_status: 'S'
            });

            if(params.wallet == 'M'){
                newOrder.main_wallet = params.coin;  
            } else {
                newOrder.commission_wallet = params.coin;      
            }

            console.log("Records", newOrder);

            var newOrderSave = await newOrder.save();

            if (newOrderSave) {

                var walletUpadteOption;
                
                if(params.wallet == 'M') {
                    walletUpadteOption = {
                        $inc: {
                            main_wallet: params.coin
                        }
                    }
                } else {
                    walletUpadteOption = {
                        $inc: {
                            commission_wallet: params.coin
                        }
                    }    
                }

                var rez = await User.findByIdAndUpdate(params.id, walletUpadteOption);
                if (rez) {
                    return res.send(Service.response(1, localization.success, null));
                } else {
                    return res.send(Service.response(0, localization.serverError, null));
                }
            } else {
                return res.send(Service.response(0, localization.serverError, null));
            }
        } else {
            return res.send(Service.response(0, localization.tokenExpired, null));     
        }
    },

    withdrawCoin: async function (req, res) {

        if(req.admin2factor){

            var params = _.pick(req.body, ['coin', 'id', 'wallet']);

            console.log("Withdraw Coin To Agent", params);

            if (!params) return res.send(Service.response(0, localization.missingParamError, null));

            if (_.isEmpty(params.coin)) {
                return res.status(200).json(Service.response(0, localization.missingParamError, null));
            }

            if (_.isEmpty(params.wallet)) {
                return res.status(200).json(Service.response(0, localization.missingParamError, null));
            }

            if (params.coin.trim() <= 0) {
                return res.status(200).json(Service.response(0, localization.invalidCommission, null));
            }

            if (!Service.validateObjectId(params.id)) {
                return res.send(Service.response(0, localization.missingParamError, null));
            }

            var checkUserBal = await User.findById(params.id);

            if(!checkUserBal){
                return res.send(Service.response(0, localization.invalidIdError, null));   
            }
            
            if(params.wallet == 'M'){
                if(checkUserBal.main_wallet < params.coin)
                    return res.send(Service.response(0, localization.insufficientWithdrawlError, null));      
            } else {
                if(checkUserBal.commission_wallet < params.coin)
                    return res.send(Service.response(0, localization.insufficientWithdrawlError, null));         
            }

            var newOrder = new Transaction({
                source: req.admin._id,
                destination: params.id,
                txn_amount: params.coin,
                created_at: new Date().getTime(),
                transaction_type: 'D',
                txn_mode: 'A',
                resp_msg: 'Coin Withdrawal',
                is_status: 'S'
            });

            if(params.wallet == 'M'){
                newOrder.main_wallet = params.coin;  
            } else {
                newOrder.commission_wallet = params.coin;      
            }

            console.log("Records", newOrder);

            var newOrderSave = await newOrder.save();

            if (newOrderSave) {

                var walletUpadteOption;
                
                if(params.wallet == 'M') {
                    walletUpadteOption = {
                        $inc: {
                            main_wallet: 0 - params.coin
                        }
                    }
                } else {
                    walletUpadteOption = {
                        $inc: {
                            commission_wallet: 0 - params.coin
                        }
                    }    
                }

                var rez = await User.findByIdAndUpdate(params.id, walletUpadteOption);
                if (rez) {
                    return res.send(Service.response(1, localization.success, null));
                } else {
                    return res.send(Service.response(0, localization.serverError, null));
                }
            } else {
                return res.send(Service.response(0, localization.serverError, null));
            }
        } else {
            return res.send(Service.response(0, localization.tokenExpired, null));     
        }
    },

    getTxnHistory: async id => {
        try {
            const subAdmin = await Transaction.find({
                destination: id
            }).sort({ created_at: -1 });
            const list = await Promise.all(
                subAdmin.map(async u => {
                    if(u.txn_mode == 'G'){
                        u.txn_mode = 'GAME';
                    } else if(u.txn_mode == "A"){
                        u.txn_mode = 'ADMIN';
                    } else if(u.txn_mode == 'SA'){
                        u.txn_mode = 'SUB ADMIN';    
                    } else if(u.txn_mode == 'AG') {
                        u.txn_mode = 'AGENT';   
                    } else {
                        u.txn_mode = 'COMMISSION';      
                    }
                    return {
                        id: u._id,
                        txn_amount: u.txn_amount,
                        transaction_type: u.transaction_type,
                        is_status: u.is_status,
                        created_at: u.created_at,
                        remark: u.resp_msg,
                        txn_mode : u.txn_mode,
                        main_wallet: u.main_wallet,
                        commission_wallet: u.commission_wallet
                    };
                })
            );

            let count = 0; //await SubAdmin.countDocuments();

            return { list, count };

        } catch (error) {
            console.log(error);
            return res.status(200).json(Service.response(0, localization.ServerError, null));
        }
    }
};

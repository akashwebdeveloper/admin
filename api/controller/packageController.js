var SuperAdmin = require('./../models/superAdmin'),
    Service = require('./../service'),
    config = require('./../../config'),
    _ = require('lodash'),
    localization = require('./../service/localization');
var ObjectId = require('mongoose').Types.ObjectId;
var moment = require('moment');
var bcrypt = require('bcryptjs');
var { Package } = require('./../models/package');
const { Parser } = require('json2csv');

module.exports = {

    getAllPckage: async (req, res) => {
        try {
            const package = await Package.find()
                .sort({
                    created_at: -1
                });
            const list = await Promise.all(
                package.map(async u => {
                    return {
                        id: u._id,
                        boot_amount: u.boot_amount,
                        is_active: u.is_active,
                        created_at: u.created_at
                    };
                })
            );

            let count = await Package.countDocuments();

            return { list, count };

        } catch (error) {
            console.log(error);
            return res.status(200).json(Service.response(0, localization.ServerError, null));
        }
    },

    createPacakge: async (req, res) => {
        try {
            if(req.admin2factor){
                var params = _.pick(req.body, 'boot_amount');

                console.log("New Package Create Request", params);

                if (_.isEmpty(params)) {
                    return res.status(200).json(Service.response(0, localization.missingParamError, null));
                }

                if (params.boot_amount.trim() <= 10) {
                    return res.status(200).json(Service.response(0, localization.bootAmountLessError, null));
                }

                var bootCheck = await Package.findOne({
                    boot_amount: params.boot_amount.trim()
                });

                if (bootCheck) {
                    return res.status(200).json(Service.response(0, localization.bootAmountExist, null));
                }

                var newPacakeg = new Package({
                    boot_amount: params.boot_amount,
                    created_at: new Date().getTime()
                });

                var newPacakegSave = await newPacakeg.save();

                if (!newPacakegSave) {
                    return res.status(200).json(Service.response(0, localization.ServerError, null));
                } else {
                    return res.status(200).json(Service.response(1, localization.success, null));
                }
            } else {
                return res.send(Service.response(0, localization.tokenExpired, null));     
            }    

        } catch (error) {
            console.log(error);
            return res.status(200).json(Service.response(0, localization.ServerError, null));
        }
    }, 

    packageUpdate: async (req, res) => {
        if(req.admin2factor){
            var params = _.pick(req.body, 'status', 'request_id');
            
            console.log('Package Update Request >> ', req.body);

            if (!params) {
                return res.status(200).json(Service.response(0, localization.missingParamError, null));
            }

            if (!params.status) {
                return res.status(200).json(Service.response(0, localization.missingParamError, null));
            }

            var checkId = await Service.validateObjectId(params.request_id);

            if(!checkId) {
                return res.status(200).json(Service.response(0, localization.invalidIdError, null)); 
            }

            var status = await Package.findByIdAndUpdate(params.request_id, {
                $set: {
                    is_active: params.status   
                }
            });

            if (status) {
                return res.status(200).json(Service.response(1, localization.success, null));
            } else {
                return res.status(200).json(Service.response(0, localization.ServerError, null));
            }
        } else {
            return res.send(Service.response(0, localization.tokenExpired, null));
        }

    }
   
};

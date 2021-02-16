var {
    User
} = require('../models/user'),
    Service = require('./../service'),
    config = require('../../config');

var mime = require('mime-types');
var jwt = require('jsonwebtoken');
var _ = require('lodash');
var localization = require('./localization');
var AWS = require('aws-sdk');
const fs = require('fs');
const crypto = require('crypto');
var ObjectId = require('mongoose').Types.ObjectId;

const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

var timeago = require("timeago.js");
var timeagoInstance = timeago(); 
var SuperAdmin = require('../models/superAdmin');

var moment = require('moment');
var bcrypt = require('bcryptjs');

module.exports = {
    
    admin2Factor: async function (req, res, next) {
        let  password = req.body.password ? req.body.password : false;
        console.log("Admin Pass", password);
        let checkPassword = await bcrypt.compare(password, req.admin.password);
        if (checkPassword) {
            req.admin2factor = true;
            next();
        } else {
            req.admin2factor = false;
            next();
        }
    },

    response: function (status, message, data) {
        return {
            status: status,
            message: message,
            data: data
        };
    },

    issueToken: function (data) {
        return jwt.sign(data, config.apiSecret);
    },

    verifyApiToken: async function (token) {
        if (token) {
            us = await User
                .findOne({
                    'tokens.token': token
                });

            if (us)
                return {
                    status: true,
                    user: us
                };
            else
                return {
                    status: false
                };

        } else {
            return {
                status: false
            };
        }
    },

    uniqueUserName: async function (username) {
        if (username) {
            us = await User
                .findOne({
                    'username': username
                });

            if (us)
                return {
                    status: false
                };
            else
                return {
                    status: true
                };

        } else {
            return {
                status: false
            };
        }
    },

    authenticate: async function (req, res, next) {
        var token = req.body.token;
        if (token) {
            us = await User
                .findOne({
                    'tokens.token': token
                });
            
                //console.log('From MiddleWare ::', us);

            if (us) {

                if (!us.is_active) {
                    return res.status(200).json({
                        status: 3,
                        message: localization.accountDeactivated,
                        data: null
                    });
                }

                if (us.is_deleted) {
                    return res.status(200).json({
                        status: 3,
                        message: localization.accountDeleted,
                        data: null
                    });
                }

                req.user = us;
                next();
            } else
                return res.status(200).json({
                    status: 3,
                    message: localization.tokenExpired,
                    data: null
                });

        } else {
            return res.status(200).json({
                status: 3,
                message: localization.tokenExpired,
                data: null
            });
        }
    },

    authenticateAdmin: async function (req, res, next) {

        var token = req.session ? req.session.auth ? req.session.auth : false : false;
        console.log("Token", token);
        if (token) {
        	us = await SuperAdmin
        		.findOne({
        			'tokens.token': token
        		});

        	if (us) {
        		req.admin = us;
        		req.auth = true;
        		next();
        	} else {
        		req.auth = false;
        		next();
        	}
        } else {
        	req.auth = false;
        	next();
        }


    },

    validateEmail: function (email) {
        var re = /[^\s@]+@[^\s@]+\.[^\s@]+/;
        return re.test(email);
    },

    validateURL: function (url) {
        var re = new RegExp("(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})");
        return re.test(url);
    },

    valiDate: function (date) {
        var re = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/;
        return re.test(date);
    },

    valiDateObject: function (date) {
        var date = new Date(date);
        if (date)
            return true;
        return false;
    },

    generateOtp: async function (user) {
        return {
            status: true,
            otp: await this.randomNumber(config.otp_length),
            message: "OTP Generate Success"
        };
    },

    validateObjectId: function (id) {

        if (ObjectId.isValid(id)) {
            var obj = new ObjectId(id);
            if (obj == id) {
                return true;
            }
        }
        return false;
    },

    uploadFile: function (file, types) {

        return new Promise((resolve, reject) => {

            //console.log("UPLOAD THIS FILE", file);
            // return	file.name;

            var re = /(?:\.([^.]+))?$/;
            var ext = re.exec(file.name)[1];

            if (ext == 'undefined') {
                //console.log("FILE EXT UNDEFINED");
                return resolve(false);
            }

            if (types) {
                if (types.indexOf(ext) == -1) {
                    //console.log("FILE TYPE NOT ALLOWED", ext);
                    return resolve(false);
                }
            }

            let zzz = '/files/' + new Date().getTime() + Math.round((Math.pow(36, 10 + 1) - Math.random() * Math.pow(36, 10))).toString(36).slice(1);
            let newFileName = zzz + '.' + ext;

            var mime_type = mime.lookup(newFileName);
            if (!mime_type) {
                //console.log("Not a valid mime", newFileName);
                return resolve(false);
            }

            //console.log("MIME FOUND", mime_type);

            // Use the mv() method to place the file somewhere on your server
            file.mv('./public' + newFileName, function (err) {
                if (err) {
                    //console.log("Error saving file on server");
                    return resolve(false);
                }

                let s3bucket = new AWS.S3({
                    accessKeyId: config.AWS_S3_BUCKET.key,
                    secretAccessKey: config.AWS_S3_BUCKET.secret,
                    Bucket: config.AWS_S3_BUCKET.name
                });

                fs.readFile('./public' + newFileName, async function (err, data) {
                    if (err) throw err;
                    //console.log("DATA", newFileName);

                    s3bucket.createBucket(function () {
                        var params = {
                            Bucket: config.AWS_S3_BUCKET.name,
                            Key: newFileName.substr(1,newFileName.length),
                            ContentType: mime_type,
                            Body: data
                        };
                        s3bucket.upload(params, function (err, data) {
                            if (err) {
                                //console.log('error in callback');
                                //console.log(err);
                                return reject(false);
                            }
                            //console.log('success', JSON.stringify(data, undefined, 2));
                            return resolve(data.Location);
                        });
                    });

                });

            });

        });
    },

    uploadFileLocal: function (file, types) {

        return new Promise((resolve, reject) => {

            //console.log("UPLOAD THIS FILE", file);
            // return	file.name;

            var re = /(?:\.([^.]+))?$/;
            var ext = re.exec(file.name)[1];

            if (ext == 'undefined') {
                //console.log("FILE EXT UNDEFINED");
                return resolve(false);
            }

            if (types) {
                if (types.indexOf(ext) == -1) {
                    //console.log("FILE TYPE NOT ALLOWED", ext);
                    return resolve(false);
                }
            }

            let zzz = '/files/' + new Date().getTime() + Math.round((Math.pow(36, 10 + 1) - Math.random() * Math.pow(36, 10))).toString(36).slice(1);
            let newFileName = zzz + '.' + ext;

            // Use the mv() method to place the file somewhere on your server
            file.mv('./public' + newFileName, function (err) {
                if (err) {
                    //console.log("Error saving file on server");
                    return resolve(false);
                }

                return resolve('./public' + newFileName);

            });

        });
    },

    uploadFileBase64: function (file) {

        return new Promise((resolve, reject) => {

            var ext = 'jpeg';

            let zzz = '/files/' + new Date().getTime() + Math.round((Math.pow(36, 10 + 1) - Math.random() * Math.pow(36, 10))).toString(36).slice(1);
            let newFileName = zzz + '.' + ext;

            // Use the mv() method to place the file somewhere on your server

            let s3bucket = new AWS.S3({
                accessKeyId: config.AWS_S3_BUCKET.key,
                secretAccessKey: config.AWS_S3_BUCKET.secret,
                Bucket: config.AWS_S3_BUCKET.name
            });

            buf = new Buffer(file.replace(/^data:image\/\w+;base64,/, ""), 'base64')
            //console.log("BUF", newFileName);
            var data = {
                Key: newFileName,
                Body: buf,
                Bucket: config.AWS_S3_BUCKET.name,
                ContentEncoding: 'base64',
                ContentType: 'image/jpeg'
            };
            s3bucket.putObject(data, function (err, data) {
                if (err) {
                    // console.log(err);
                    // console.log('Error uploading data: ', data);
                    return reject(false);
                } else {
                    return resolve('https://' + config.AWS_S3_BUCKET.name + '.s3.' + config.AWS_S3_BUCKET.region + '.amazonaws.com/' + newFileName);
                }
            });
        });
    },

    removeAwsFile: function (url) {
        let s3bucket = new AWS.S3({
            accessKeyId: config.AWS_S3_BUCKET.key,
            secretAccessKey: config.AWS_S3_BUCKET.secret,
            Bucket: config.AWS_S3_BUCKET.name
        });

        var parts = url.split('/');
        var dparts = [];
        dparts.push(parts[4]);
        dparts.push(parts[5]);
        // dparts.push(parts[6]);
        console.log('/' + dparts.join('/'));
        var delete_key = '/' + dparts.join('/');
        //console.log("DELETE FILE FROM S3 key", delete_key);
        var params = {
            Bucket: config.AWS_S3_BUCKET.name,
            Key: delete_key
        };
        s3bucket.deleteObject(params, function (err, data) {
            if (err)
                console.log(err, err.stack); // an error occurred
            else
                console.log("data", data); // successful response
        });
    },

    directUpload: function (url) {

        return new Promise((resolve, reject) => {

            let s3bucket = new AWS.S3({
                accessKeyId: config.AWS_S3_BUCKET.key,
                secretAccessKey: config.AWS_S3_BUCKET.secret,
                Bucket: config.AWS_S3_BUCKET.name
            });


            fs.readFile(url, async function (err, data) {
                if (err) throw err;
                //console.log("DATA", data);

                s3bucket.createBucket(function () {
                    var params = {
                        Bucket: config.AWS_S3_BUCKET.name,
                        Key: 'default_user.png',
                        Body: data
                    };
                    s3bucket.upload(params, function (err, data) {
                        if (err) {
                            // console.log('error in callback');
                            // console.log(err);
                            return reject(false);
                        }
                        //console.log('success');
                        return resolve(data.Location);
                    });
                });

            });

        });
    },

    dbBackupS3: function (url, name) {

        return new Promise((resolve, reject) => {

            let s3bucket = new AWS.S3({
                accessKeyId: config.AWS_S3_DB_BUCKET.key,
                secretAccessKey: config.AWS_S3_DB_BUCKET.secret,
                Bucket: config.AWS_S3_DB_BUCKET.name
            });


            fs.readFile(url, async function (err, data) {
                if (err) throw err;
                s3bucket.createBucket(function () {
                    var params = {
                        Bucket: config.AWS_S3_DB_BUCKET.name,
                        Key: name,
                        ContentType: 'application/tar',
                        Body: data
                    };
                    s3bucket.upload(params, function (err, data) {
                        if (err) {
                            // console.log('error in callback');
                            // console.log(err);
                            return reject(false);
                        }
                        //console.log('success');
                        return resolve(data.Location);
                    });
                });

            });

        });
    },

    getAge: function (dob) {

        var currentYear = new Date().getFullYear();
        var birthYear = new Date(dob).getFullYear();
        var currentMonth = new Date().getMonth();
        var birthMonth = new Date(dob).getMonth();

        //console.log("BIRTHMONTH", birthMonth);

        var age = currentYear - birthYear;

        if (currentMonth < birthMonth) {
            age--;
        } else if (currentMonth == birthMonth) {
            var currentDate = new Date().getDate();
            var birthDate = new Date(dob).getDate();
            if (currentDate < birthDate)
                age--;
        }

        return age;
    },

    formateD: function (d) {
        if (d.toString().length == 1)
            return "0" + d;
        else
            return d;
    },

    getAgeRange: function (age) {

        var currentYear = new Date().getFullYear();
        var currentMonth = new Date().getMonth();
        var currentDate = new Date().getDate();

        //console.log("CURRENT", currentYear + '-' + currentMonth + '-' + currentDate);

        var dayLow = "";
        var dateLow, monthLow, yearLow;

        var dayHigh = "";
        var dateHigh, monthHigh, yearHigh;

        yearLow = parseInt(currentYear) - parseInt(age);
        yearHigh = yearLow - 1;

        if (currentDate >= monthDays[currentMonth]) {
            monthHigh = currentMonth + 1;
            dateHigh = 1;
        } else {
            monthHigh = currentMonth;
            dateHigh = currentDate + 1;
        }

        if (currentMonth == 2) {
            if (currentDate == 28 || currentDate == 29) {
                dateLow = 28;
            } else {
                dateLow = currentDate;
            }
        } else {
            dateLow = currentDate;
        }

        monthLow = currentMonth;

        return ({
            'dateHigh': {
                'year': yearLow,
                'month': monthLow,
                'date': dateLow
            },
            'dateLow': {
                'year': yearHigh,
                'month': monthHigh,
                'date': dateHigh
            },
        });
    },
    
    isoToDate: function (iso) {

        var cutoffString = iso; // in utc
        var utcCutoff = moment.utc(cutoffString, 'YYYY-MM-DDTHH:mm:ss.sssZ');
        var displayCutoff = utcCutoff.clone().tz('Asia/Kolkata');

        console.log(iso,utcCutoff,displayCutoff);
        return displayCutoff;
    },

    formateDate: function (date) {
        // 7/12/2018 12:25PM
        var dat = new Date(date);
        var mon = (dat.getMonth() + 1 > 9) ? dat.getMonth() + 1 : "0" + parseInt(dat.getMonth() + parseInt(1));


        var hours = dat.getHours() % 12;
        hours = (hours > 9) ? hours : "0" + hours;

        var minutes = dat.getMinutes();
        minutes = (minutes > 9) ? minutes : "0" + minutes;

        var ap = (dat.getHours() >= 12) ? "PM" : "AM";
        var day = (dat.getDate() > 9) ? dat.getDate() : "0" + dat.getDate();

        rez = day + "/" + mon + "/" + dat.getFullYear() + " " + hours + ":" + minutes + ap;

        return rez;
    },

    randomNumber: async function (length) {
        return Math.floor(Math.pow(10, length - 1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1));
    },

    getUserObject: async function (user, mine) {

        var dataRes = {};

        var complete = 0;
        var incomplete = 0;

        //ALL USERS HAVE THIS DETAILS
        if (mine) {
            dataRes.token = user.tokens ? user.tokens[0] ? user.tokens[0].token ? user.tokens[0].token : "" : "" : "";
            dataRes.is_verify = user.otp_verified ? user.otp_verified : false;
            dataRes.is_security_set = user.security_set ? user.security_set : false;
            dataRes.credits = user.credits;
            dataRes.plan_expiring = user.plan_expiring;
        }

        // var rating = 0;
        // var rateCount = 0;
        // for(const r of user.reviews){
        //     rateCount++;
        //     rating+=r.rating;
        // }

        // if(rateCount>0)
        // 	rating = Math.floor(rating/rateCount);

        // dataRes.average_rating = rating;

        dataRes.is_active = user.is_active || false;

        dataRes._id = user._id || false;

        dataRes.first_name = user.first_name || "";
        (dataRes.first_name != "") ? complete++ : incomplete++;

        dataRes.last_name = user.last_name || "";
        (dataRes.last_name != "") ? complete++ : incomplete++;

        dataRes.gender = user.gender;
        (dataRes.gender) ? complete++ : incomplete++;

        dataRes.email = user.email;
        (dataRes.email) ? complete++ : incomplete++;

        dataRes.mobile_no = user.mobile_no;
        (dataRes.mobile_no) ? complete++ : incomplete++;

        dataRes.profile_pic = user.profile_pic || "";
        (dataRes.profile_pic != "") ? complete++ : incomplete++;

        dataRes.dob = user.dob || "";
        (dataRes.dob != "") ? complete++ : incomplete++;

        dataRes.address = {};

        if (user.address) {
            dataRes.address = user.address;

            (user.address.detail) ? complete++ : incomplete++;
            (user.address.country) ? complete++ : incomplete++;
            (user.address.state) ? complete++ : incomplete++;
            (user.address.city) ? complete++ : incomplete++;
            (user.address.zip) ? complete++ : incomplete++;

        } else {
            incomplete += 5;
        }

        dataRes.link = user.link || "";
        (dataRes.link != "") ? complete++ : incomplete++;


        if (user.social_link) {
            dataRes.social_link = user.social_link;

            (user.social_link.facebook) ? complete++ : incomplete++;
            (user.social_link.instagram) ? complete++ : incomplete++;
            (user.social_link.twitter) ? complete++ : incomplete++;
            (user.social_link.google_plus) ? complete++ : incomplete++;
            (user.social_link.linkedin) ? complete++ : incomplete++;
            (user.social_link.youtube) ? complete++ : incomplete++;

        } else {
            incomplete += 6;
        }

        dataRes.description = user.description || "";
        (dataRes.description != "") ? complete++ : incomplete++;

        dataRes.username = user.username || "";
        (dataRes.username != "") ? complete++ : incomplete++;

        dataRes.alternate_email = user.alternate_email || "";
        (dataRes.alternate_email != "") ? complete++ : incomplete++;

        dataRes.alternate_contact = user.alternate_contact || "";
        (dataRes.alternate_contact != "") ? complete++ : incomplete++;

        dataRes.office_number = user.office_number || "";
        (dataRes.office_number != "") ? complete++ : incomplete++;

        dataRes.direct_number = user.direct_number || "";
        (dataRes.direct_number != "") ? complete++ : incomplete++;

        dataRes.account_type = user.account_type;

        dataRes.projects = [];
        dataRes.team_details = [];
        dataRes.gallery = [];

        //SET DEFAULTS
        dataRes.debut_year = "";
        dataRes.indian_languages = [];
        dataRes.foreign_languages = [];
        dataRes.activities = [];
        dataRes.physique = "";

        dataRes.height = "";
        dataRes.weight = "";
        dataRes.chest = "";
        dataRes.waist = "";
        dataRes.hips = "";
        dataRes.collar = "";
        dataRes.shoe = "";
        dataRes.complexion = "";
        dataRes.eye_color = "";
        dataRes.hair_color = "";

        dataRes.hair_length = "";
        dataRes.piercings = "";
        dataRes.portfolio_by = "";
        dataRes.acting_institute = "";
        dataRes.casting_agency = "";
        dataRes.profession_training_from = "";

        dataRes.academic_details = [];
        dataRes.certification = [];
        dataRes.modeling_interests = [];
        dataRes.acting_interests = [];

        dataRes.early_life = "";
        dataRes.personal_life = "";
        dataRes.career = "";

        dataRes.relationship_status = "";
        dataRes.birth_place = "";

        dataRes.spouse_name = "";
        dataRes.number_of_children = "";
        dataRes.children_name = [];
        dataRes.father_name = "";
        dataRes.mother_name = "";
        dataRes.siblings = [];

        dataRes.writer_title = "";
        dataRes.writer_detail = "";
        dataRes.writer_file = "";
        dataRes.company_name = "";
        dataRes.company_established = "";
        dataRes.representative_by = "";
        dataRes.projects = [];
        dataRes.team_details = [];
        dataRes.props = [];
        dataRes.equipment = [];
        dataRes.location = [];

        var cat = await Category.findOne({
            '_id': user.category
        });
        dataRes.sub_category = cat.name;
        dataRes.sub_category_id = user.category;

        if (cat.parent == 0) {
            dataRes.category = dataRes.sub_category;
        } else {
            var scat = await Category.findOne({
                '_id': cat.parent
            });
            dataRes.category = scat ? scat.name : "";
        }

        dataRes.gallery = [];
        for (let i = 0; i < user.gallery.length; i++) {
            await dataRes.gallery.push({
                'id': user.gallery[i]._id,
                'description': user.gallery[i].description,
                'photo': user.gallery[i].file
            });
        }
        (dataRes.gallery != []) ? complete++ : incomplete++;

        var talentModelActor = ["5b40849eb6d6f1d5f040260a", "5b4084f4b6d6f1d5f0402a6b", "5b4084f4b6d6f1d5f0402a73", "5b4084f5b6d6f1d5f0402a77", "5b4084f5b6d6f1d5f0402a7c", "5b4084f5b6d6f1d5f0402a7f", "5b4084f5b6d6f1d5f0402a9d", "5b408585b6d6f1d5f04031ed", "5b408585b6d6f1d5f04031f0", "5b408565b6d6f1d5f040304f", "5b408464b6d6f1d5f040231c"];

        dataRes.debut_year = user.debut_year;

        if (talentModelActor.indexOf(user.category) > -1) {

            // Talent & Model/Actor

            var mo_to = await Language.findOne({
                '_id': user.mother_tongue
            });
            dataRes.mother_tongue_id = user.mother_tongue;
            dataRes.mother_tongue = mo_to ? mo_to.name || "" : "";
            (dataRes.mother_tongue != "") ? complete++ : incomplete++;

            dataRes.indian_languages = [];
            dataRes.indian_languages_id = [];
            for (const lan of user.indian_language) {
                var lang = await Language.findOne({
                    '_id': lan
                });
                dataRes.indian_languages.push(lang.name);
                dataRes.indian_languages_id.push(lan);
            }
            (dataRes.indian_languages != []) ? complete++ : incomplete++;

            dataRes.foreign_languages = [];
            dataRes.foreign_languages_id = [];
            for (const lan of user.foreign_language) {
                var lang = await Language.findOne({
                    '_id': lan
                });
                dataRes.foreign_languages.push(lang.name);
                dataRes.foreign_languages_id.push(lan);
            }
            (dataRes.foreign_languages != []) ? complete++ : incomplete++;

            dataRes.activities = [];
            dataRes.activities_id = [];
            for (const lan of user.activities) {
                var lang = await Activity.findOne({
                    '_id': lan
                });
                dataRes.activities.push(lang.name);
                dataRes.activities_id.push(lan);
            }
            (dataRes.activities != []) ? complete++ : incomplete++;

            var phy = await Physique.findOne({
                '_id': user.physique
            });
            dataRes.physique = phy ? phy.name || "" : "";
            dataRes.physique_id = user.physique;

            (dataRes.physique != "") ? complete++ : incomplete++;

            dataRes.height = user.height ? user.height.toString() : "";
            (dataRes.height != "") ? complete++ : incomplete++;

            dataRes.weight = user.weight ? user.weight.toString() : "";
            (dataRes.weight != "") ? complete++ : incomplete++;

            dataRes.chest = user.chest ? user.chest.toString() : "";
            (dataRes.chest != "") ? complete++ : incomplete++;

            dataRes.waist = user.waist ? user.waist.toString() : "";
            (dataRes.waist != "") ? complete++ : incomplete++;

            dataRes.hips = user.hips ? user.hips.toString() : "";
            (dataRes.hips != "") ? complete++ : incomplete++;

            dataRes.collar = user.collar ? user.collar.toString() : "";
            (dataRes.collar != "") ? complete++ : incomplete++;

            dataRes.shoe = (user.shoe.number ? user.shoe.number : "") + " " + (user.shoe.measure_type ? user.shoe.measure_type : "");

            dataRes.shoe_size = user.shoe.number ? user.shoe.number.toString() : "";
            (dataRes.shoe_size != "") ? complete++ : incomplete++;

            dataRes.shoe_size_type = user.shoe.measure_type ? user.shoe.measure_type : "";

            var comp = await Complexion.findOne({
                '_id': user.complexion
            });
            dataRes.complexion = comp ? comp.name || "" : "";
            dataRes.complexion_id = user.complexion;
            (dataRes.complexion != "") ? complete++ : incomplete++;

            var eyC = await EyeColor.findOne({
                '_id': user.eye_color
            });
            dataRes.eye_color = eyC ? eyC.name || "" : "";
            dataRes.eye_color_id = user.eye_color;
            (dataRes.eye_color != "") ? complete++ : incomplete++;

            var hairC = await HairColor.findOne({
                '_id': user.hair_color
            });
            dataRes.hair_color_id = user.hair_color;
            dataRes.hair_color = hairC ? hairC.name || "" : "";
            (dataRes.hair_color != "") ? complete++ : incomplete++;

            var hairL = await HairLength.findOne({
                '_id': user.hair_length
            });
            dataRes.hair_length = hairL ? hairL.name || "" : "";
            dataRes.hair_length_id = user.hair_length;

            (dataRes.hair_length != "") ? complete++ : incomplete++;

            dataRes.piercings = user.piercings || "";
            (dataRes.piercings != "") ? complete++ : incomplete++;

            dataRes.portfolio_by = user.portfolio_by || "";
            (dataRes.portfolio_by != "") ? complete++ : incomplete++;

            dataRes.acting_institute = user.acting_institute || "";
            (dataRes.acting_institute != "") ? complete++ : incomplete++;

            dataRes.casting_agency = user.casting_agency || "";
            (dataRes.casting_agency != "") ? complete++ : incomplete++;

            dataRes.profession_training_from = user.profession_training_from || "";
            (dataRes.profession_training_from != "") ? complete++ : incomplete++;

            dataRes.academic_details = [];
            for (let i = 0; i < user.academic_details.length; i++) {
                var acadType = await AcademicType.findOne({
                    '_id': user.academic_details[i].name
                });
                await dataRes.academic_details.push({
                    'id': user.academic_details[i]._id,
                    'name': acadType.name || "",
                    'year': user.academic_details[i].year,
                    'institute': user.academic_details[i].institute,
                    'result': user.academic_details[i].result
                });
            }

            dataRes.certification = [];
            for (let i = 0; i < user.certification.length; i++) {
                await dataRes.certification.push({
                    'id': user.certification[i]._id,
                    'title': user.certification[i].title,
                    'description': user.certification[i].description,
                    'photo': user.certification[i].photo
                });
            }

            dataRes.modeling_interests = [];
            dataRes.modeling_interests_id = [];
            for (let i = 0; i < user.interest.modeling.length; i++) {
                var acadType = await Interest.findOne({
                    '_id': user.interest.modeling[i]
                });
                dataRes.modeling_interests_id.push(user.interest.modeling[i]);
                dataRes.modeling_interests.push(acadType.name || "");
            }
            (dataRes.modeling_interests != []) ? complete++ : incomplete++;

            dataRes.acting_interests = [];
            dataRes.acting_interests_id = [];
            for (let i = 0; i < user.interest.acting.length; i++) {
                var acadType = await Interest.findOne({
                    '_id': user.interest.acting[i]
                });
                dataRes.acting_interests.push(acadType.name || "");
                dataRes.acting_interests_id.push(user.interest.acting[i]);
            }
            (dataRes.acting_interests != []) ? complete++ : incomplete++;

            dataRes.early_life = user.biography.early_life;
            (dataRes.early_life != "") ? complete++ : incomplete++;

            dataRes.personal_life = user.biography.personal_life;
            (dataRes.personal_life != "") ? complete++ : incomplete++;

            dataRes.career = user.biography.career;
            (dataRes.career != "") ? complete++ : incomplete++;

            dataRes.relationship_status = user.relationship_status;
            (dataRes.relationship_status != "") ? complete++ : incomplete++;

            dataRes.birth_place = user.birth_place;
            (dataRes.birth_place != "") ? complete++ : incomplete++;

            dataRes.spouse_name = user.family_details.spouse_name;
            (dataRes.spouse_name != "") ? complete++ : incomplete++;

            dataRes.number_of_children = user.family_details.number_of_children ? user.family_details.number_of_children.toString() : "0";
            (dataRes.number_of_children != "") ? complete++ : incomplete++;

            if (dataRes.number_of_children != "0")
                dataRes.children_name = user.family_details.children_name || [];

            dataRes.father_name = user.family_details.father_name || "";
            (dataRes.father_name != "") ? complete++ : incomplete++;

            dataRes.mother_name = user.family_details.mother_name || "";
            (dataRes.mother_name != "") ? complete++ : incomplete++;

            dataRes.siblings = user.family_details.siblings || [];
        }

        if (user.category == "5b4084f5b6d6f1d5f0402a7f") {
            //for only writer
            dataRes.writer_title = user.writer_title || "";
            (dataRes.writer_title != "") ? complete++ : incomplete++;

            dataRes.writer_detail = user.writer_detail || "";
            (dataRes.writer_detail != "") ? complete++ : incomplete++;

            dataRes.writer_file = user.writer_file || "";
            (dataRes.writer_file != "") ? complete++ : incomplete++;
        }

        if (talentModelActor.indexOf(user.category) == -1) {
            // Apart from Model/Actor & Talent
            dataRes.company_name = user.company_name || " ";
            (dataRes.company_name != "") ? complete++ : incomplete++;

            dataRes.company_established = user.company_established || " ";
            (dataRes.company_established != "") ? complete++ : incomplete++;

            dataRes.representative_by = user.representative_by || " ";
            (dataRes.representative_by != "") ? complete++ : incomplete++;

        }
        dataRes.team_details = [];
        for (let i = 0; i < user.team_details.length; i++) {
            await dataRes.team_details.push({
                'id': user.team_details[i]._id,
                'name': user.team_details[i].name,
                'designation': user.team_details[i].designation,
                'description': user.team_details[i].description,
                'photo': user.team_details[i].photo
            });
        }
        (dataRes.team_details != []) ? complete++ : incomplete++;

        var projectHolders = talentModelActor;
        projectHolders.push("5b4083a3b6d6f1d5f0401946");
        projectHolders.push("5b408408b6d6f1d5f0401e67");
        projectHolders.push("5b408409b6d6f1d5f0401e6f");
        projectHolders.push("5b408409b6d6f1d5f0401e71");
        projectHolders.push("5b408409b6d6f1d5f0401e73");
        projectHolders.push("5b40840ab6d6f1d5f0401e77");
        projectHolders.push("5b40837bb6d6f1d5f0401733");
        //Photographer, Producer/Client, Talent, Model/Actor

        if (projectHolders.indexOf(user.category) > -1) {
            dataRes.projects = [];
            for (let i = 0; i < user.projects.length; i++) {

                var type = await WorkType.findOne({
                    '_id': user.projects[i].project_type
                });

                await dataRes.projects.push({
                    'id': user.projects[i]._id,
                    'title': user.projects[i].title,
                    'project_type_id': type._id,
                    'project_type': type.name,
                    'description': user.projects[i].description,
                    'link': user.projects[i].link
                });
            }
            (dataRes.projects != []) ? complete++ : incomplete++;

        }

        //Props provider
        if (user.category == "5b4c7837b6d6f1d5f0cbe783") {
            dataRes.props = [];
            for (let i = 0; i < user.props.length; i++) {
                await dataRes.props.push({
                    'id': user.props[i]._id,
                    'name': user.props[i].name,
                    'photo': user.props[i].photo,
                    'price': user.props[i].price,
                    'description': user.props[i].description,
                    'rent_day': user.props[i].rent.day,
                    'rent_month': user.props[i].rent.month,
                    'rent_week': user.props[i].rent.week,
                    'rent_hour': user.props[i].rent.hour
                });
            }
            (dataRes.props != []) ? complete++ : incomplete++;
        }

        //Equipment rental provider / manufacturer
        if (user.category == "5b406692767c271b8c8623fe" || user.category == "5b40837ab6d6f1d5f040172c") {
            dataRes.equipment = [];
            for (let i = 0; i < user.equipment.length; i++) {
                await dataRes.equipment.push({
                    'id': user.equipment[i]._id,
                    'name': user.equipment[i].name,
                    'photo': user.equipment[i].photo,
                    'price': user.equipment[i].price,
                    'type': user.equipment[i].type,
                    'model_name': user.equipment[i].model_name,
                    'in_stock': user.equipment[i].in_stock,
                    'rent_day': user.equipment[i].rent.day,
                    'rent_month': user.equipment[i].rent.month,
                    'rent_week': user.equipment[i].rent.week,
                    'rent_hour': user.equipment[i].rent.hour
                });
            }
            (dataRes.equipment != []) ? complete++ : incomplete++;

        }

        // Location owner
        if (user.category == "5b40837bb6d6f1d5f0401731") {
            dataRes.location = [];
            for (let i = 0; i < user.location.length; i++) {
                await dataRes.location.push({
                    'id': user.location[i]._id,
                    'name': user.location[i].name,
                    'photo': user.location[i].photo,
                    'length': user.location[i].size.length,
                    'breadth': user.location[i].size.breadth,
                    'height': user.location[i].size.height,
                    'rent_day': user.location[i].rent.day,
                    'rent_month': user.location[i].rent.month,
                    'rent_week': user.location[i].rent.week,
                    'rent_hour': user.location[i].rent.hour
                });
            }
            (dataRes.location != []) ? complete++ : incomplete++;
        }

        if (mine) {
            var profile_completion = Math.round(complete / (complete + incomplete) * 100);
            // console.log("PROFILE COMPLETION", profile_completion);
            // console.log("COMPLETE", complete);
            // console.log("INCOMPLETE", incomplete);
            // console.log("TOTAL", complete + incomplete);
            dataRes.profile_complete = profile_completion;
        }

        // console.log("DATA RES",dataRes);

        return dataRes;
    },

    readableDate: function (date) {
        // 29 May 1992

        var dat = new Date(date);

        var mon = months[dat.getMonth()];

        var day = (dat.getDate() > 9) ? dat.getDate() : "0" + dat.getDate();

        rez = day + " " + mon + " " + dat.getFullYear();

        return rez;
    },

    readableDateTime: function (date) {
        // 29 May 1992
        var dat = new Date(date);
        return dat.toString();
    },

    formateDateandTime: function (date) {
        // 7/12/2018 12:25PM
        // console.log("D",date);
		// var dat = new Date(date);
        // // console.log("D",dat);
		// var mon = (dat.getMonth() + 1 > 9) ? dat.getMonth() + 1 : "0" + parseInt(dat.getMonth() + parseInt(1));


		// var hours = dat.getHours() % 12;
		// hours = (hours > 9) ? hours : "0" + hours;

		// var minutes = dat.getMinutes();
		// minutes = (minutes > 9) ? minutes : "0" + minutes;

		// var ap = (dat.getHours() >= 12) ? "PM" : "AM";
		// var day = (dat.getDate() > 9) ? dat.getDate() : "0" + dat.getDate();

		// rez = day + "/" + mon + "/" + dat.getFullYear() + " " + hours + ":" + minutes + ap;

        // return rez;
        let rez = moment(date,'x').utcOffset('+0530').format('DD/MM/YYYY HH:mm:ss A');
        console.log("RE",rez);
        return rez;
	},

    getDateDMY: function (date) {
        // 29/11/2017

        var dat = new Date(date);

        var mon = dat.getMonth() + 1;

        var day = (dat.getDate() > 9) ? dat.getDate() : "0" + dat.getDate();
        mon = mon > 9 ? mon : "0" + mon;

        rez = day + "/" + mon + "/" + dat.getFullYear();

        return rez;
    },

    getMonthYear: function (date) {
        // May 1992

        var dat = new Date(date);

        var mon = months[dat.getMonth()];

        rez = mon + " " + dat.getFullYear();

        return rez;
    },

    getMonth: function (date) {
        // May

        var dat = new Date(date);

        var mon = months[dat.getMonth()];

        rez = mon ;

        return rez;
    },

    getMonthNum: function (date) {
        // May

        var dat = new Date(date);

        return dat.getMonth();
    },

    getYear: function (date) {
        var dat = new Date(date);
        var rez = dat.getFullYear();
        return rez;    
    },

    timeago: function (timestamp) {
        return timeagoInstance.format(timestamp);
    },

    limitString: function (string, length) {
        if (string.length > 60) {
            var rez = string.substring(0, length);
            return rez + '.. ';
        } else {
            return string;
        }
    },

    getDaysAfter(numberOfDaysToAdd) {
        var dat = new Date();
        dat.setDate(dat.getDate() + numberOfDaysToAdd);
        var mm = (dat.getMonth() + 1 > 9) ? dat.getMonth() + 1 : "0" + parseInt(dat.getMonth() + parseInt(1));
        var dd = (dat.getDate() > 9) ? dat.getDate() : "0" + dat.getDate();
        var y = dat.getFullYear();

        var someFormattedDate = y + '-' + mm + '-' + dd;
        return someFormattedDate;
    },

    getDay(timestamp) {
        var dat = new Date(parseInt(timestamp));

        var mm = (dat.getMonth() + 1 > 9) ? dat.getMonth() + 1 : "0" + parseInt(dat.getMonth() + parseInt(1));
        var dd = (dat.getDate() > 9) ? dat.getDate() : "0" + dat.getDate();
        var y = dat.getFullYear();

        var someFormattedDate = y + '-' + mm + '-' + dd;
        return someFormattedDate;
    },

    dayYMD(day) {
        day = day.toString().trim();
        var dateString = new Date(day);
        if (_.isNull(dateString))
            return false;
        var d = dateString;

        if (isNaN(d))
            return false;
        var month = '' + (d.getMonth() + 1);
        var day = '' + d.getDate();
        var year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    },

    todayYMD() {
        var d = new Date(),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    },

    firstDayOfYear(year) {
        var d = new Date(year, 0, 1),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    },

    lastDayOfYear(year) {
        var d = new Date(year, 11, 31),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    },

    sendNotification: async function (data) {
        data.small_icon = 'app_icon';
    
        return new Promise((resolve,reject)=>{

            var headers = {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Basic ODZkMGQxYmItNjhiZC00YmM5LTllYTYtNDA5MGRmNjUwNWIy"
            };
        
            var options = {
                host: "onesignal.com",
                port: 443,
                path: "/api/v1/notifications",
                method: "POST",
                headers: headers
            };
        
            var https = require('https');
            var req = https.request(options, function (res) {
                res.on('data', function (data) {
                    return resolve(JSON.parse(data));
                });
            });
        
            req.on('error', function (e) {
                return reject(e);
            });
        
            req.write(JSON.stringify(data));
            req.end();
        });
    },

    getDataChart: async (data, month, year, val) => {
        for(const k of data){ 
            if(k._id.month == month && k._id.year == year && k._id.fee == val){
                //console.log("COUNT",k.count);
                return k.count;
            }
        }
        return 0;
    },
}
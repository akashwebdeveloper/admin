var UserController = require('../api/controller/userController');
var SubAdminController = require('../api/controller/subAdminController');
var AgentController = require('../api/controller/agentController');
var PackageController = require('../api/controller/packageController');
var SuperAdmin = require('../api/models/superAdmin');
var {AppInfo} = require('../api/models/appInfo');
var {User} = require('../api/models/user');

var Service = require('../api/service');
var config = require('../config');
var Table = require('../api/models/table');
_ = require('lodash');
var bcrypt = require('bcryptjs');
var localization = require('../api/service/localization');

module.exports = function (router) {

	// Admin Controller
	router.get('/', Service.authenticateAdmin, async function (req, res) {
		if (!req.auth) {
			res.redirect('/admin/login');
		} else {
			res.redirect('/admin/');
		}
	});
	router.get('/admin/', Service.authenticateAdmin, async function (req, res) {
		if (!req.auth) {
			res.redirect('/admin/login');
		} else {

			var data = {};
			data.sub_admin = await SubAdminController.getSubAdminCount();
			data.agent = await AgentController.getAgentCount();
			data.user = await UserController.getUserCount();
			res.render('admin/index', {
				'title': 'Dashboard',
				'type': 'dashboard',
				'sub': 'dashboard',
				'host': config.pre + req.headers.host,
				'admin': req.admin,
				'data': data
			});

		}
	});
	router.get('/profile', Service.authenticateAdmin, async function (req, res) {
		if (!req.auth) {
			res.redirect('/admin/login');
		} else {

			res.render('admin/profile', {
				'title': 'Admin Profile',
				'type': 'profile',
				'sub': 'profile',
				'host': config.pre + req.headers.host,
				'admin': req.admin
			});

		}
	});
	router.get('/admin/login', Service.authenticateAdmin, (req, res) => {
		if (req.auth) {
			res.redirect('/admin/');
		} else {
			res.render('admin/login', {
				'title': 'Admin Login',
				'host': config.pre + req.headers.host,
				'year': new Date().getFullYear(),
				'project_title': 'My Ludo'
			});
		}
	});
	router.get('/admin/404', Service.authenticateAdmin, async function (req, res) {
		res.render('admin/404', {
			'title': '404 Error',
			'type': '404',
			'sub': '404',
			'host': config.pre + req.headers.host,
			'admin': req.admin	
		})
	});

	router.post('/admin/login', async function (req, res) {
		
		var params = _.pick(req.body, 'email', 'password');

        console.log('ADMIN LOGIN REQUEST >> ', params);

        if (_.isEmpty(params)) {
            return res.status(200).json(Service.response(0, localization.missingParamErrorAdmin, null));
        }

        if (_.isEmpty(params.email) || _.isEmpty(params.password)) {
            return res.status(200).json(Service.response(0, localization.missingParamErrorAdmin, null));
        }

        var user = await SuperAdmin.findOne({
            email: params.email
        });

        if (!user) return res.status(200).json(Service.response(0, localization.invalidCredentials, null));

        var rez1 = await bcrypt.compare(params.password, user.password);

        if (!rez1) return res.status(200).json(Service.response(0, localization.invalidCredentials, null));

        var token = await Service.issueToken(params);

        // //TOKEN GENERATE FOR SINGLE LOGIN AT A TIME
        // // user.tokens = [{
        // // 	'access': 'auth',
        // // 	'token': token
        // // }];

        req.session.auth = token;
        req.session.auth.maxAge = 36000000;

        // //console.log('SESSION UPDATED', req.session);
        // // IN CASE IF MULTIPLE LOGINS ALLOWED

        user.tokens = [];
        user.tokens.push({
            access: 'auth',
            token: token
        });

        var rez = await user.save();

        if (!rez) return res.status(200).json(Service.response(0, localization.ServerError, null));

        return res.status(200).json(Service.response(1, localization.loginSuccess, token));
	});
	router.post('/admin/genprofile', Service.authenticateAdmin, Service.admin2Factor, async function(req, res) {
		console.log("tetstt");
		if(req.admin2factor){
			var params = _.pick(req.body, 'name', 'email');

			console.log("Admin Profile Update Request", params);

			if (!params) {
				return res.send(Service.response(0, localization.missingParamError, null));
			}

			if (!params.name) {
				return res.send(Service.response(0, localization.missingParamError, null));
			}

			if (!params.email) {
				return res.send(Service.response(0, localization.missingParamError, null));
			}

			var updateAdmin = await SuperAdmin.findByIdAndUpdate(req.admin._id, {
				$set: {
					name: params.name,
					email: params.email
				}
			});

			if (updateAdmin) {
				return res.send(Service.response(1, localization.success, null));
			} else {
				return res.send(Service.response(0, localization.ServerError, null));
			}
		} else {
			return res.send(Service.response(0, localization.tokenExpired, null));   
		}
	});
	
	router.post('/admin/adminpass', Service.authenticateAdmin, async function(req, res) {
		var params = _.pick(req.body, 'opass', 'pass_confirmation', 'pass');

        console.log("Admin Profile Update Request", params);

        if (!params) {
           return res.send(Service.response(0, localization.missingParamError, null));
        }

        if (!params.opass) {
           return res.send(Service.response(0, localization.missingParamError, null));
        }

        if (!params.pass_confirmation) {
           return res.send(Service.response(0, localization.missingParamError, null));
        }

        if (!params.pass) {
           return res.send(Service.response(0, localization.missingParamError, null));
        }

        if (params.pass_confirmation != params.pass) {
            return res.send(Service.response(0, localization.passwordNotMatchError, null));
        }

        if (params.pass_confirmation.trim().length < 6 || params.pass_confirmation.trim().length > 12) {
			return res.send(Service.response(0, localization.passwordValidationError, null));
        }

        var rez1 = await bcrypt.compare(params.opass, req.admin.password);

        if (!rez1) {
            return res.send(Service.response(0, localization.invalidOldPassError, null));
        }

        var hash = bcrypt.hashSync(params.pass_confirmation);

        var updateAdmin = await SuperAdmin.findByIdAndUpdate(req.admin._id, {
            $set: {
                password: hash
            }
        });

        if (updateAdmin) {
			return res.send(Service.response(1, localization.success, null));
        } else {
            return res.send(Service.response(0, localization.ServerError, null));
        }
	});
	router.get('/admin/logout', Service.authenticateAdmin, async function (req, res) {
		req.session.destroy(function (err) {
				console.log("ERR", err);
				res.send({status:1,message:"Logout Successfully"});
		})
	});

	router.post('/admin/reset-pass', Service.authenticateAdmin, Service.admin2Factor, async function(req, res) {
		try {
			if(req.admin2factor){
				var params = _.pick(req.body, ['id', 'pass_confirmation', 'pass']);
	
				console.log("Reset Sub-admin Pass", params);
	
				if (!params) return res.send(Service.response(0, localization.missingParamError, null));
	
				if (_.isEmpty(params.pass_confirmation)) {
					return res.status(200).json(Service.response(0, localization.missingParamError, null));
				}
	
				if (_.isEmpty(params.pass)) {
					return res.status(200).json(Service.response(0, localization.missingParamError, null));
				}
	
				if(params.pass_confirmation.trim() != params.pass.trim()){
					return res.status(200).json(Service.response(0, localization.passwordNotMatch, null));
				}
	
				if (params.pass_confirmation.trim().length < 8) {
					return res.status(200).json(Service.response(0, localization.passwordValidationError, null));
				}
	
				if (!Service.validateObjectId(params.id)) {
					console.log("Id not matched")
					return res.send(Service.response(0, localization.missingParamError, null));
				}
	
				let hash = bcrypt.hashSync(params.pass_confirmation);
	
				var rez = await User.findByIdAndUpdate(params.id, {
					$set: {
						password: hash
					}
				});
	
				if (rez) return res.send(Service.response(1, localization.success, null));
				else return res.send(Service.response(0, localization.serverError, null));
			} else {
				return res.send(Service.response(0, localization.tokenExpired, null));    
			}    
		} catch (error) {
			console.log("Error in admin pass reset", error);
			return res.send(Service.response(0, localization.serverError, null));  	
		}
	});

	
	// User Managemnet
	router.get('/user', Service.authenticateAdmin, async function (req, res) {
		if (!req.auth) {
			res.redirect('/admin/login');
		} else {
			const data = await UserController.getUsers();
			console.log(data);
			res.render('admin/user', {
				'title': 'All User',
				'type': 'user',
				'sub': 'user',
				'host': config.pre + req.headers.host,
				'admin': req.admin,
				'data' : data
			});

		}
	});
	router.post('/user/add', Service.authenticateAdmin, UserController.createUser);
	router.get('/user/profile/:id', Service.authenticateAdmin, async function (req, res) {
		
		const user = await UserController.getUserProfile(req.params.id);
		const txn = await UserController.getTxnHistory(req.params.id);

		console.log('Txn', txn);

		if (!req.auth) {
			return res.redirect('/admin/login');
		} 

		res.render('admin/user-profile', {
			'title': 'User Profile',
			'type': 'user',
			'sub': 'user',
			'host': config.pre + req.headers.host,
			'admin': req.admin,
			'data': user, 
			'txn': txn
		});

	});
	router.post('/user/update', Service.authenticateAdmin, Service.admin2Factor, UserController.updateStatus);
	router.post('/user/set-commission', Service.authenticateAdmin, Service.admin2Factor, UserController.setCommission);
	router.post('/user/add-coin', Service.authenticateAdmin, Service.admin2Factor, UserController.addCoin);
	router.post('/user/withdraw-coin', Service.authenticateAdmin, Service.admin2Factor, UserController.withdrawCoin);

	// Sub-Admin Managemnet
	router.get('/sub-admin', Service.authenticateAdmin, async function (req, res) {
		if (!req.auth) {
			res.redirect('/admin/login');
		} else {
			const subadmin = await SubAdminController.getSubAdmin();
			res.render('admin/sub-admin', {
				'title': 'All Sub Admin',
				'type': 'sub-admin',
				'sub': 'sub-admin',
				'host': config.pre + req.headers.host,
				'admin': req.admin,
				'data' : subadmin
			});

		}
	});
	router.post('/sub-admin/add', Service.authenticateAdmin, SubAdminController.createSubAdmin);
	router.get('/sub-admin/profile/:id', Service.authenticateAdmin, async function (req, res) {
		if (!req.auth) {
			return res.redirect('/admin/login');
		} 

		const user = await SubAdminController.getSubAdminProfile(req.params.id);
		const txn = await SubAdminController.getTxnHistory(req.params.id);
		const agents = await SubAdminController.getAgents(req.params.id);

		if(!_.isEmpty(user)){
			res.render('admin/sub-admin-profile', {
				'title': 'Sub Admin Profile',
				'type': 'sub-admin',
				'sub': 'sub-admin',
				'host': config.pre + req.headers.host,
				'admin': req.admin,
				'data': user, 
				'txn': txn, 
				'agents': agents
			});
		} else {
			res.render('admin/404', {
				'title': '404 Error',
				'type': '404',
				'sub': '404',
				'host': config.pre + req.headers.host,
				'admin': req.admin	
			})	
		}

	});
	router.post('/sub-admin/update', Service.authenticateAdmin, Service.admin2Factor, SubAdminController.updateStatus);
	router.post('/sub-admin/set-commission', Service.authenticateAdmin, Service.admin2Factor, SubAdminController.setCommission);
	router.post('/sub-admin/add-coin', Service.authenticateAdmin, Service.admin2Factor, SubAdminController.addCoin);
	router.post('/sub-admin/withdraw-coin', Service.authenticateAdmin, Service.admin2Factor, SubAdminController.withdrawCoin);
	//router.post('/sub-admin/password-reset', Service.authenticateAdmin, Service.admin2Factor, SubAdminController.resetPassword);

	// Agent Managemnet
	router.get('/agent', Service.authenticateAdmin, async function (req, res) {
		if (!req.auth) {
			res.redirect('/admin/login');
		} else {
			var data = await AgentController.getAgents();
			res.render('admin/agent', {
				'title': 'All Agents',
				'type': 'agent',
				'sub': 'agent',
				'host': config.pre + req.headers.host,
				'admin': req.admin,
				'data' : data
			});

		}
	});
	router.post('/agent/add', Service.authenticateAdmin, AgentController.createAgent);
	router.get('/agent/profile/:id', Service.authenticateAdmin, async function (req, res) {
		
		const user = await AgentController.getAgentProfile(req.params.id);
		const txn = await AgentController.getTxnHistory(req.params.id);
		const agents_user = await AgentController.getAgentUser(req.params.id);

		console.log('Txn', txn);

		if (!req.auth) {
			return res.redirect('/admin/login');
		} 

		res.render('admin/agent-profile', {
			'title': 'Agent Profile',
			'type': 'agent',
			'sub': 'agent',
			'host': config.pre + req.headers.host,
			'admin': req.admin,
			'data': user, 
			'txn': txn, 
			'agents_user': agents_user
		});

	});
	router.post('/agent/update', Service.authenticateAdmin, Service.admin2Factor, AgentController.updateStatus);
	router.post('/agent/set-commission', Service.authenticateAdmin, Service.admin2Factor, AgentController.setCommission);
	router.post('/agent/add-coin', Service.authenticateAdmin, Service.admin2Factor, AgentController.addCoin);
	router.post('/agent/withdraw-coin', Service.authenticateAdmin, Service.admin2Factor, AgentController.withdrawCoin);

	// Package Managemnet 
	router.get('/package', Service.authenticateAdmin, async function (req, res) {
		if (!req.auth) {
			res.redirect('/admin/login');
		} else {
			const pcakageData = await PackageController.getAllPckage();
			console.log(pcakageData);
			res.render('admin/package', {
				'title': 'Package Managemnet',
				'type': 'package',
				'sub': 'package',
				'host': config.pre + req.headers.host,
				'admin': req.admin,
				'data' : pcakageData
			});

		}
	}); 
	router.post('/package/add', Service.authenticateAdmin, Service.admin2Factor, PackageController.createPacakge);
	router.post('/package/update', Service.authenticateAdmin, Service.admin2Factor, PackageController.packageUpdate);

	// Game Setting 
	router.get('/settings', Service.authenticateAdmin, async function (req, res) {
		if (!req.auth) {
			res.redirect('/admin/login');
		} else {

			let data = await AppInfo.findById("5ea716b965b863566e8d8075");

			console.log("D", data);

			res.render('admin/game-settings', {
				'title': 'Game settings',
				'type': 'settings',
				'sub': 'settings',
				'host': config.pre + req.headers.host,
				'admin': req.admin, 
				'data': data
			});

		}
	}); 

	router.post('/admin/maintenance-status', Service.authenticateAdmin,  async function(req, res) {

		var params = _.pick(req.body, 'status');

        if (!params) {
            return res.send({
                status: 0,
                Msg: localization.missingParamError
            });
        }

        if (!params.status) {
            return res.send({
                status: 0,
                Msg: localization.missingParamError
            });
        }

        var status = await AppInfo.findOneAndUpdate(
            {
                _id: '5ea716b965b863566e8d8075'
            },
            {
                $set: {
                    is_maintenance: params.status
                }
            }
        );

        if (status) {
			return res.send(Service.response(1, localization.success, null));
        } else {
			return res.send(Service.response(0, localization.ServerError, null));
        }
	});

	router.post('/admin/set-msg', Service.authenticateAdmin, Service.admin2Factor, async function(req, res) {
		try {
            if(req.admin2factor){
                var params = _.pick(req.body, 'msgStatus', 'msg');

                console.log("Set Admin Msg", params);

                if (_.isEmpty(params)) {
                    return res.status(200).json(Service.response(0, localization.missingParamError, null));
                }

                var set = await AppInfo.findOneAndUpdate(
					{
						_id: '5ea716b965b863566e8d8075'
					},
					{
						$set: {
							is_admin_msg_active: params.msgStatus, 
							message_from_admin: params.msg
						}
					}
				);

                if (!set) {
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
	});

	
}
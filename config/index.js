var db_config = require('./db');

const config = function () {

	this.dummyMoves = db_config.dummyMoves || false;

	this.dbDev = {
		'database': 'myludo',
		'username': 'xxxxxxxx',
		'password': 'xxxxx',
		'host': 'xxxxxx',
		'authSource': 'admin',
		'port': '27017'
	};

	this.port = process.env.PORT || 3008;
	this.pre = 'https://';

	this.cryptrSecret = '3n6+*yzkCTQ.`_~&QQj;RE"AA:d7cD';
	this.apiSecret = 'q.`%ps*4h"spJc6;u)k,MJyPs\}APk{j:E_P3YPw';
	this.sessionSecret = 'wTf<d/c>#2v~g6gaH(>XNKC>:zd#@u+g:)W6CQy*';

	this.default_user_pic = "xxxxxxxxxx";
	this.otp_length = 6;
	this.live_url = 'http://localhost:3008';
	

	this.MOVE_PATH = [
		[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57],
		[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 58, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 59, 60, 61, 62, 63, 64],
		[27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 58, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 65, 66, 67, 68, 69, 70],
		[40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 58, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 71, 72, 73, 74, 75, 76]
	];

	this.safeZone = [1, 9, 14, 22, 27, 35, 40, 48];

	this.defaultPosition = [-1, -1, -1, -1];
}

module.exports = new config();
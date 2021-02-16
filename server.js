const express = require("express");
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require("path");
const fs = require("fs");
const app = express();
const router = express.Router();
const http = require('http');
const https = require('https');
const config = require('./config');
const session = require('express-session');

app.use(session({
	secret: config.sessionSecret,
	resave: false,
	saveUninitialized: true
}));

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
  });

require('./routes/admin-panel')(router);
router.get('*',function (req, res) {
	console.log("404 Hit");
	res.render('admin/404', { url: req.url });
});

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('.html', require('ejs').renderFile);
app.use(bodyParser.urlencoded({
	extended: true,
	type: 'application/x-www-form-urlencoded'
}));

app.use(fileUpload());
app.use(bodyParser.json());
app.use('/', router);


var server = http.createServer(app);


server.listen(config.port, function () {
	console.log("Server listening at PORT:" + config.port);
});

module.exports = server;
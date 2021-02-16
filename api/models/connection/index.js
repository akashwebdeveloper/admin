var mongoose = require('mongoose'),
	config = require('../../../config'),
	dbConnectionUrl = "";
switch (process.env.NODE_ENV) {
	case "development":
		dbConnectionUrl = `mongodb://127.0.0.1:27017/prodLudoDb`;
		break;
	case "production":
		dbConnectionUrl = `mongodb://127.0.0.1:27017/prodLudoDb`;
		break;
	case "local":
		dbConnectionUrl = `mongodb://127.0.0.1:27017/prodLudoDb`;
		break;
	default:
		dbConnectionUrl = `mongodb://127.0.0.1:27017/prodLudoDb`;
}

try {
	mongoose.set('useCreateIndex', true);
	mongoose.connect(`${dbConnectionUrl}`, { useNewUrlParser: true, useFindAndModify: false , allowDiskUse:true}, (d)=>{
		console.log("Connected to database: ", `${dbConnectionUrl}`);
	}).catch((err)=>{
		console.log("DBCONNECT ERROR",err);
	});
	
}
catch(err) {
	console.log("DBCONNECT ERROR",err);
}
module.exports = mongoose;
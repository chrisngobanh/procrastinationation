var express = require('express');
var cfenv = require('cfenv');
var request = require('request');

var app = express();
var appEnv = cfenv.getAppEnv();

app.listen(appEnv.port);

console.log('Server running on port 4000');

app.get('/', function(req, res) {
//	request.post('https://graph.facebook.com/oauth/device?type=device_code&client_id=523614004477797&scope=public_profile,user_friends,email', function(err, res) {
//		console.log(res.body);
//	});
	res.send('Hello World!');
});

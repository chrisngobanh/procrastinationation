var express = require('express');
var request = require('request');

var app = express();

app.listen(4000);

console.log('Server running on port 4000');

app.get('/', function(req, res) {
	request.post('https://graph.facebook.com/oauth/device?type=device_code&client_id=523614004477797&scope=public_profile,user_friends,email', function(err, res) {
		console.log(res.body);
	});
});
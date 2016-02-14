var bodyParser = require('body-parser');
var cfenv = require('cfenv');
var express = require('express');
var request = require('request');

var app = express();
var appEnv = cfenv.getAppEnv();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(appEnv.port);

console.log('Server running on ', appEnv.url);

app.get('/', function(req, res) {
  res.redirect('https://www.facebook.com/dialog/oauth?client_id=523614004477797&redirect_uri=http://procrastinationation.mybluemix.net/facebook&scope=public_profile,user_friends,email');
});

app.get('/facebook', function(req, res) {
  var code = req.query.code;

  request.post('https://graph.facebook.com/v2.3/oauth/access_token?client_id=523614004477797&redirect_uri=http://procrastinationation.mybluemix.net/facebook&client_secret=9fb99aa844667e815c990b41aa086d27&code=' + code, function(err, res) {
    console.log(res.body);
  });
});
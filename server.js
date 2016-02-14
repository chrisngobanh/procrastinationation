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
  console.log(req.params);
    /*request.post('https://www.facebook.com/dialog/oauth?client_id=523614004477797&redirect_uri=http://procrastinationation.mybluemix.net/facebook', function(err, res) {
      console.log(res.body);
    });*/
});
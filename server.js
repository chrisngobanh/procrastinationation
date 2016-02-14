var bodyParser = require('body-parser');
var cfenv = require('cfenv');
var Cloudant = require('cloudant');
var express = require('express');
var request = require('request');

var app = express();
var appEnv = cfenv.getAppEnv();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var baseRequest = request.defaults({json: true});

app.listen(appEnv.port);

console.log('Server running on', appEnv.url);

var cloudant = Cloudant('https://631d8429-f7da-49a0-91c2-a6b295a5ef0a-bluemix:94418a16ff22256659b0071300260597e371eeacb60689b4ddb95a2f9249c631@631d8429-f7da-49a0-91c2-a6b295a5ef0a-bluemix.cloudant.com');

cloudant.db.list(function(err, allDbs) {
  console.log('All my databases: %s', allDbs.join(', '))
});

var users = cloudant.db.use('users')

app.get('/facebook', function(req, res) {
  var code = req.query.code;


  baseRequest.post('https://graph.facebook.com/v2.3/oauth/access_token?client_id=523614004477797&redirect_uri=http://procrastinationation.mybluemix.net/facebook&client_secret=9fb99aa844667e815c990b41aa086d27&code=' + code, function(err, res1) {
    var access_token = res1.body.access_token;
    console.log(access_token);
    // Validate the token and its permissions
    baseRequest.get('https://graph.facebook.com/me/permissions?access_token=' + access_token, function(err, res2) {
      var permissions = res2.body.data;

      var isGood = false;

      var userFriends = 'user_friends';

      for (var i = 0; i < permissions.length; i++) {
        if (permissions[i].permission === userFriends) {
          if (permissions[i].status === 'granted') {
            isGood = true;
          }
          break;
        }
      }

      if (isGood) {
        res.send({
          'access_token': access_token
        });
      } else {
        res.redirect('https://www.facebook.com/dialog/oauth?client_id=523614004477797&redirect_uri=http://procrastinationation.mybluemix.net/facebook&auth_type=rerequest&scope=' + userFriends);
      }
    });
  });
});


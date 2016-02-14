var bodyParser = require('body-parser');
var cfenv = require('cfenv');
var express = require('express');
var request = require('request');

var app = express();
var appEnv = cfenv.getAppEnv();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(appEnv.port);

console.log('Server running on', appEnv.url);

app.get('/facebook', function(req, res) {
  var code = req.query.code;


  request.post('https://graph.facebook.com/v2.3/oauth/access_token?client_id=523614004477797&redirect_uri=http://procrastinationation.mybluemix.net/facebook&client_secret=9fb99aa844667e815c990b41aa086d27&code=' + code, function(err, res1) {
    var access_token = res1.body.access_token;
    console.log(res1.body);

    // Validate the token and its permissions
    request.get('https://graph.facebook.com/me/permissions?access_token=' + access_token, function(err, res2) {
      var permissions = res2.body.data;

      console.log(res2.body);
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
          access_token: access_token
        });
      } else {
        res.redirect('https://www.facebook.com/dialog/oauth?client_id=523614004477797&redirect_uri=http://procrastinationation.mybluemix.net/facebook&auth_type=rerequest&scope=' + userFriends);
      }
    });
  });
});
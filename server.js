var bodyParser = require('body-parser');
var cfenv = require('cfenv');
var Cloudant = require('cloudant');
var express = require('express');
var request = require('request');
var validator = require('validator');

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
var id = { name: 'facebookId', type:'json', index:{ fields: ['facebookId']}};

users.index(id);

app.get('/facebook', function(req, res) {
  var code = req.query.code;

  baseRequest.post('https://graph.facebook.com/v2.3/oauth/access_token?client_id=523614004477797&redirect_uri=http://procrastinationation.mybluemix.net/facebook&client_secret=9fb99aa844667e815c990b41aa086d27&code=' + code, function(err, res1) {
    var access_token = res1.body.access_token;

    if (!access_token) {
      res.send({
        message: 'Something went wrong. Try again.'
      });
      return;
    }

    // name id
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
        baseRequest.get('https://graph.facebook.com/me?access_token=' + access_token, function(err, res3) {
          var name = res3.body.name;
          var facebookId = res3.body.id;

          users.find({ selector: { facebookId: facebookId }}, function(err, body) {
            if (body.docs.length === 0) {
              users.insert({facebookId: facebookId, name: name}, function(err, body) {
                res.send({
                  message: 'You have logged in!',
                  access_token: access_token
                });
              });

            } else {
              res.send({
                message: 'You have logged in!',
                access_token: access_token
              });
            }
          });
        });

      } else {
        res.redirect('https://www.facebook.com/dialog/oauth?client_id=523614004477797&redirect_uri=http://procrastinationation.mybluemix.net/facebook&auth_type=rerequest&scope=' + userFriends);
      }
    });
  });
});

// TODO: Validation for this
app.post('/event', function(req, res) {
  var website = req.body.website;
  var timestamp = req.body.timestamp;
  var duration = req.body.duration;
  var user_token = req.body.user_token;

  if (!validator.isURL(website, { protocols: ['http', 'https'], require_protocol: true})) {
    res.send({
      message: 'That is not a valid website.',
    });
    return;
  }

  if (!validator.isDate(timestamp)) {
    res.send({
      message: 'That is not a valid timestamp.',
    });
    return;
  }

  res.send({ website: website, timestamp: timestamp, duration: duration, user_token: user_token })
});


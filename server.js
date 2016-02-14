var _ = require('lodash');
var async = require('async');
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


var events = cloudant.db.use('events')
var website = { name: 'website', type:'json', index:{ fields: ['website']}};
var timestamp = { name: 'timestamp', type:'json', index:{ fields: ['timestamp']}};
var duration = { name: 'duration', type:'json', index:{ fields: ['duration']}};
var userid = { name: 'userid', type:'json', index:{ fields: ['userid']}};

events.index(website);
events.index(timestamp);
events.index(duration);
events.index(userid);

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
                res.redirect('https://www.facebook.com/connect/login_success.html?access_token=' + access_token);
              });

            } else {
              res.redirect('https://www.facebook.com/connect/login_success.html?access_token=' + access_token)
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
  var website = req.body.url;
  var timestamp = parseInt(req.body.timestamp);
  var duration = req.body.duration;
  var user_token = req.body.user_token;

  if (!validator.isFQDN(website)) {
    console.log(website);
    res.send({
      message: 'That is not a valid website.',
    });
    return;
  }

  // If the timestamp is a valid date
  if (!((new Date(timestamp)).getTime() > 0)) {
    console.log(timestamp);
    res.send({
      message: 'That is not a valid timestamp.',
    });
    return;
  }

  baseRequest.get('https://graph.facebook.com/me?access_token=' + user_token, function(err, res1) {
    var facebookId = res1.body.id;

    // How??? Someone is messing with us
    if (!facebookId) {
      res.send({
        message: 'Something went wrong. Try again!',
      });
    }

    // Check if the user is in the db
    users.find({ selector: { facebookId: facebookId }}, function(err, body) {
      if (body.docs.length !== 0) {

        events.insert({userid: facebookId, website: website, timestamp: timestamp, duration: duration}, function(err, body) {
          res.send({
            message: '',
          });
        });
      } else {
        res.send({
          message: 'You do not have a Procrastinationation account.',
        });
      }
    });
  });
});


function isWithinADay(timestamp) {
  return (Date.now() - timestamp < 86400000);
}


// Rankings within the day
app.post('/stats/ranking/1', function(req, res) {
  var user_token = req.body.user_token;

  baseRequest.get('https://graph.facebook.com/me?access_token=' + user_token, function(err, res1) {
    var facebookId = res1.body.id;
    if (!facebookId) {
      res.send({
        message: 'Something went wrong. Try again.',
      });
      return;
    }

    events.find({ selector: { userid: facebookId }}, function(err, body) {
      var superObj = {};
      _.forEach(body.docs, function(val) {
        if (isWithinADay(val.timestamp)) {
          if (!superObj[val.website]) {
            superObj[val.website] = val.duration;
          } else {
            superObj[val.website] += val.duration;
          }
        }
      })



      var superArr = [];
      for (var i = 0; i < 5; i++) {
        if (_.size(superObj) <= 0) break;
        var maxName;
        var maxNum = 0;
        _.forEach(superObj, function(val, key) {
          if (val > maxNum) {
            maxName = key;
            maxNum = val;
          }
        })

        var obj = {};
        obj[maxName] = maxNum;
        superArr.push(obj);
        delete superObj[maxName];
      }

      res.send({ data: superArr });

    });
  });

});

// Show rankings for all time
app.post('/stats/ranking/3', function(req, res) {
  var user_token = req.body.user_token;

  baseRequest.get('https://graph.facebook.com/me?access_token=' + user_token, function(err, res1) {
    var facebookId = res1.body.id;
    if (!facebookId) {
      res.send({
        message: 'Something went wrong. Try again.',
      });
      return;
    }

    events.find({ selector: { userid: facebookId }}, function(err, body) {
      var superObj = {};
      _.forEach(body.docs, function(val) {
        if (!superObj[val.website]) {
          superObj[val.website] = val.duration;
        } else {
          superObj[val.website] += val.duration;
        }
      })

      var superArr = [];
      for (var i = 0; i < 5; i++) {
        if (_.size(superObj) <= 0) break;
        var maxName;
        var maxNum = 0;
        _.forEach(superObj, function(val, key) {
          if (val > maxNum) {
            maxName = key;
            maxNum = val;
          }
        })

        var obj = {};
        obj[maxName] = maxNum;
        superArr.push(obj);
        delete superObj[maxName];
      }

      res.send({ data: superArr });

    });
  });
});

// In the last 24 hours
app.post('/feed', function(req, res) {
  var user_token = req.body.user_token;

  baseRequest.get('https://graph.facebook.com/me?access_token=' + user_token, function(err, res1) {
    var facebookId = res1.body.id;
    if (!facebookId) {
      res.send({
        message: 'Something went wrong. Try again.',
      });
      return;
    }

    baseRequest.get('https://graph.facebook.com/me/friends?access_token=' + user_token, function(err, res2) {
      var friends = res2.body.data;
      var max = (friends.length > 10 ? friends.length : 10);

      var newFriends = _.shuffle(friends);
      var superArr = [];
      for (var i = 0; i < max; i++) {
        if (!newFriends[i]) break;
        //console.log(newFriends[i], newFriends[i].id);
        events.find({ selector: { userid: newFriends[i].id }}, function(err, body) {
          var superObj = {};
          _.forEach(body.docs, function(val) {
            if (isWithinADay(val.timestamp)) {
              if (!superObj[val.website]) {
                superObj[val.website] = val.duration;
              } else {
                superObj[val.website] += val.duration;
              }
            }
          });

          var maxName;
          var maxNum = 0;
          _.forEach(superObj, function(val, key) {
            if (val > maxNum) {
              maxName = key;
              maxNum = val;
            }
          })

          var obj = {};
          obj[maxName] = maxNum;
          superArr.push(obj);
          console.log(superArr);
        });
      }

      console.log(superArr);
    });


  });
})
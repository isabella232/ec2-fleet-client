var http = require('http')
  , express = require('express')
  , fs = require('fs')
  , _ = require('underscore')
  , siege = require('node-siege');

var app = express();

var config = {
    n: 0,
    concurrency: 100,
    host: '127.0.0.1',
    port: 8888,
    controlPort: 8889,
    log: '/home/ubuntu/siege.log'
};

var stats = {
    clients: 0,
    inproc: 0,
    errors_req: 0,
    errors_resp: 0,
    ended_req: 0
};

var _siege = {
    running: false,
    stats : {}
};

app.get('/',function(req,res){
    res.json({
        siege: _siege
    });
});

app.get('/set',function(req,res){
    _.each(req.query, function(v,k) {
        config[k] = (typeof config[k] == 'number') ? +v : v;
    });
    res.json(config);
});

app.get('/log', function(req, res) {
    fs.readFile(config.log, 'utf8', function(err, data) {
        if(err) console.log(err);
        res.set('Content-Type', 'text/html');
        res.send(data);
    });
});

app.get('/siege',function(req,res) {
    console.log('siege request');
    if(_siege.running === false && req.query.c) {
        var command = new Buffer(req.query.c, 'base64').toString();
        if(command.match(/-l/) === null) {
            command += ' -l' + config.log;
        }
        _siege.running = true;
        _siege.error = '';
        console.log('starting siege');
        console.log('command:',command);

        var s = siege()
          .args(command)
          .on('exit',function(){
              _siege.running = s.running;
          })
          .on('error',function(err){
              _siege.error = err.message;
          })
          .run();
    }
    res.send('running');
});

app.get('/urls', function(req, res) {
    if(req.query.urls) {
        var urls = new Buffer(req.query.urls,'base64');
        fs.writeFile('/home/ubuntu/urls.txt',urls,function(err){
            console.log('error writing to file');
        })
    }
    res.json({response:true});
});

app.get('/restart',function(req,res) {
    require('child_process').exec("sudo restart client", function() {});
    res.send('OK');
});

/*
 * GET/POST catch all to surface a 404
 */
app.get('*',function(req,res){
    res.send(404);
});
app.post('*',function(req,res){
    res.send(404);
});

app.listen(config.controlPort);
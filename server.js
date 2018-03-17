const AWS = require('aws-sdk');
const proxy = require("proxy-agent");

AWS.config.update({
	region: 'us-east-1',
	//httpOptions: { agent: proxy('http://localhost:8888') },
	//sslEnabled: false
});

const http = require('http');
const faye = require('faye');
const static = require('node-static');
const datastore = require("./datastore");
const url = require('url');

const roll_listener = require("./roll_listener");


const argv = require('yargs').argv;



var bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 45});
var fileServer = new static.Server('./dist', { 
	cache: 0,
	gzip: true
});

roll_listener.subscribe(bayeux);

var server = http.createServer(function (req, res) {
    var uri = url.parse(req.url);
    
    if(uri.pathname.startsWith("/save/")) {
        return datastore.save(req, res, bayeux);
    } else if(uri.pathname.startsWith("/map")) {
		return datastore.map(req, res, bayeux);
	}
    
    req.addListener('end', function() {
        fileServer.serve(req, res);
    }).resume();
    
});

bayeux.attach(server);
server.listen(argv.port || process.env.PORT || 8000);
const AWS = require('aws-sdk');
const url = require('url');
const dataurl = require('dataurl');
var dynamodb = new AWS.DynamoDB();
var s3 = new AWS.S3();

const argv = require('yargs').argv;

var decoded_map = null;

if(bucket_name()) {
	
	s3.getObject({
		Bucket: bucket_name(),
		Key: "maps/map.png"
	}, function(err, data) {
		if(err) {
			console.log(err.message);
			return;
		}
		
		decoded_map = Buffer.from(data.Body);
	})
	
}

function bucket_name() {
	return argv.s3_bucket || process.env.S3_BUCKET;
}

function save_put(req, res, bayeux) {
    var uri = url.parse(req.url);
    
    var id = uri.pathname.substring(6); // remove /save/
    
    var body = "";
    
    req.on('data', function(data) {
        body += data;
    });
    
    req.on('end', function() {
        
        var newItem = {
            "name": {
                S: id
            },
            "data": {
                S: body
            }
        };
        
        dynamodb.putItem({
            Item: newItem,
            TableName: "characters"
        }, function(err, data) {
            
            if(err) {
                res.writeHead(500, {"Content-Type": "application/json"});
                res.write(JSON.stringify(err));
                res.end();
                return;
            }
            
            //notify clients
            bayeux.getClient().publish('/character/' + id, JSON.parse(body));
            
            res.writeHead(200, { "Content-Type": "application/json"});
            res.write("{\"ok\":true}");
            res.end();
        });
        
        
    }).resume();
}

function map_put(req, res, bayeux) {
	var body = "";
	
	//console.log("map_put");
	
	req.on('data', function(data) {
        body += data;
    });
	
	req.on('end', function() {
		
		//console.log("map_put req_end");
        
		var bucket = bucket_name();
		
		if(!bucket) {
			res.writeHead(500, {"Content-Type": "application/json"});
			res.write(JSON.stringify({ err: "Server is misconfigured: no bucket name"}));
			res.end();
			return;
		}
		
		var decoded = dataurl.parse(body);
		
		if(!decoded) {
			res.writeHead(400, {"Content-Type": "application/json"});
			res.write(JSON.stringify({ err: "Could not decode the body as a data uri"}));
			res.end();
			return;
		}
		
		decoded_map = Buffer.from(decoded.data);
		
        s3.putObject({
			Bucket: bucket,
			Key: "maps/map.png",
			Body: decoded_map,
			
        }, function(err, data) {
            
            if(err) {
                res.writeHead(500, {"Content-Type": "application/json"});
                res.write(JSON.stringify(err));
                res.end();
                return;
            }
            
            //notify clients
            bayeux.getClient().publish('/map', { update: true });
            
            res.writeHead(200, { "Content-Type": "application/json"});
            res.write("{\"ok\":true}");
            res.end();
        });
        
        
    }).resume();
}

function save_get(req, res, bayeux) {
    var uri = url.parse(req.url);
    
    var id = uri.pathname.substring(6); // remove /save/
    
    req.on('end', function() {
        
		//console.log("Querying for '" + id + "'");
        var params = {
            Key: {
                "name": {
                    S: id
                }
            },
            TableName: "characters"
        }
        
        dynamodb.getItem(params, function(err, data) {
            if(err) {
                res.writeHead(500, {"Content-Type": "application/json"});
                res.write(JSON.stringify(err));
                res.end();
                return;
            }
            
            if(data.Item == null) {
                res.writeHead(404, {"Content-Type": "application/json"});
                res.write("{\"ok\":false}");
                res.end();
                return;
            }
            
            res.writeHead(200, { "Content-Type": "application/json"});
            
            var item = data.Item.data.S;
            
            res.write(item);
            
            res.end();
        });
        
        
    }).resume();
}

function map_get(req, res, bayeux) {
	req.on('end', function() {
		if(!decoded_map) {
			res.writeHead(404, { "Content-Type": "application/json" });
			res.write(JSON.stringify({ err: "No map has been uploaded" }));
			res.end();
			return;
		}
		
		res.writeHead(200, { "Content-Type": "image/png" });
		res.write(decoded_map);
		res.end();
		return;
		
	}).resume();
}

module.exports = {
    save: function(req, res, bayeux) {
        if(req.method == "PUT")
        {
            return save_put(req, res, bayeux);
        }
        else if(req.method == "GET")
        {
            return save_get(req, res, bayeux);
        }
    },
	map: function(req, res, bayeux) {
		if(req.method == "PUT") {
			return map_put(req, res, bayeux);
		} else if(req.method == "GET") {
			return map_get(req, res, bayeux);
		}
	}
};
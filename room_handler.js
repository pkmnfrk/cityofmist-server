const AWS = require('aws-sdk');
const url = require('url');
const dataurl = require('dataurl');
var dynamodb = new AWS.DynamoDB();

const argv = require('yargs').argv;

var rooms = {
	
	
};

var characters = {
	
};

/*
var sampleCharacter = {
	rooms: []
};

var sampleRoom = {
	characters: [],
	rolls: [],
	
};
*/

function ensureRoom(room) {
	if(!rooms[room]) {
		rooms[room] = {
			characters: [],
			rolls: []
		};
	}
}

function ensureCharacter(character) {
	if(!characters[character]) {
		characters[character] = {
			rooms: []
		}
		
		for(roomKey in rooms) {
			if(rooms[roomKey].characters.indexOf(character) !== -1) {
				characters[character].rooms.push(roomKey);
			}
		}
	}
}

function addRoll(room, roll, bayeux) {
	ensureRoom(room);
	
	rooms[room].rolls.unshift(roll);
	
	while(rooms[room].rolls.length > 15) {
		rooms[room].rolls.pop();
	}

	updateRoom(room, bayeux)
}

function updateRoom(room, bayeux) {
	bayeux.getClient().publish("/room/" + room, {
		kind: "room",
		room: rooms[room]
	});
}

function room_get(req, res, bayeux) {
    var uri = url.parse(req.url);
    
    [room] = uri.pathname.substring(10).split('/'); // remove /api/room/
	
	ensureRoom(room);
	
    req.on('end', function() {
        if(!room) {
			res.writeHead(400, {"Content-Type": "application/json"});
			res.write(JSON.stringify({ message: "Room is required"}));
			res.end();
			return;
		}
	            
		res.writeHead(200, { "Content-Type": "application/json"});
		
		res.write(JSON.stringify(rooms[room]));
		res.end();
    }).resume();
}

function roomJoin_post(req, res, bayeux) {
    var uri = url.parse(req.url);
    
    [room] = uri.pathname.substring(15).split('/'); // remove /api/room/join/
	
	ensureRoom(room);
	
	var body = "";
	
	req.on('data', function(d) {
		body += d;
	});
	
    req.on('end', function() {
		if(!room) {
			res.writeHead(400, {"Content-Type": "application/json"});
			res.write(JSON.stringify({ message: "Room is required"}));
			res.end();
			return;
		}
		
		var reqData = JSON.parse(body);
		
		if(!reqData.id) {
			res.writeHead(400, {"Content-Type": "application/json"});
			res.write(JSON.stringify({ message: "Character id is required"}));
			res.end();
			return;
		}
		
		ensureCharacter(reqData.id);
		
		if(characters[reqData.id].rooms.indexOf(room) === -1) {
			rooms[room].characters.push(reqData.id);
			characters[reqData.id].rooms.push(room);
			updateRoom(room, bayeux);
		}
        
	            
		res.writeHead(200, { "Content-Type": "application/json"});
		
		res.write(JSON.stringify({ok: true}));
		res.end();
    }).resume();
}

function roomPart_post(req, res, bayeux) {
    var uri = url.parse(req.url);
	
    //console.log("Someone is trying to leave a room");
	
    [room] = uri.pathname.substring(15).split('/'); // remove /api/room/part/
	
	ensureRoom(room);
	
	var body = "";
	
	req.on('data', function(d) {
		body += d;
	});
	
    req.on('end', function() {
		if(!room) {
			res.writeHead(400, {"Content-Type": "application/json"});
			res.write(JSON.stringify({ message: "Room is required"}));
			res.end();
			return;
		}
		
		var reqData = JSON.parse(body);
		
		if(!reqData.id) {
			res.writeHead(400, {"Content-Type": "application/json"});
			res.write(JSON.stringify({ message: "Character id is required"}));
			res.end();
			return;
		}
		
		ensureCharacter(reqData.id);
		//console.log("Identified character as " + reqData.id);
		
		var ix = rooms[room].characters.indexOf(reqData.id);
		//console.log("Found them in room? " + (ix !== -1));
		if(ix !== -1) {
			rooms[room].characters.splice(ix, 1);
			ix = characters[reqData.id].rooms.indexOf(room);
			characters[reqData.id].rooms.splice(ix, 1);
			
			updateRoom(room, bayeux);
		}
        
	            
		res.writeHead(200, { "Content-Type": "application/json"});
		
		res.write(JSON.stringify({ok: true}));
		res.end();
    }).resume();
}



module.exports = {
    room: function(req, res, bayeux) {
		var uri = url.parse(req.url);
		var path = uri.pathname.substring(10);
		if(path.startsWith("join/")) {
			if(req.method == "POST") {
				return roomJoin_post(req, res, bayeux);
			}
		} else if(path.startsWith("part/")) {
			if(req.method == "POST") {
				return roomPart_post(req, res, bayeux);
			}
		} else {
			if(req.method == "GET")
			{
				return room_get(req, res, bayeux);
			}
		}
    },
	addRoll: addRoll
};
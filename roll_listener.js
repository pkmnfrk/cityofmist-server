const http = require("https");
const url = require("url");
const argv = require('yargs').argv;

var hookurl = argv.discord_dice_webhook || process.env.DISCORD_DICE_WEBHOOK;

const discord_webhook = hookurl ? url.parse(hookurl) : null;

function send_discord_message(roll)
{
	/*    var roll = {
        label: label,
        when: Date.now(),
        who: who,
        dice: dice,
        bonus: bonus,
        penalty: penalty,
        total: total
    };*/
	
	var status = roll.who + " just rolled ";
	
	if(roll.advantage) {
		status += "with " + roll.advantage + " ";
	}
	
	for(var i = 0; i < roll.dice.length; i++) {
		if(i > 0) {
			status += " + ";
		}
		
		var dropped = roll.dropped.indexOf(i) !== -1;
		
		if(dropped) status += "~~";
		
		status += "[" + roll.dice[i] + "]";
		
		if(dropped) status += "~~";
	}
	
	if(roll.bonus) {
		status += " + " + roll.bonus;
	}
	if(roll.penalty) {
		status += " - " + roll.penalty;
	}
	
	status += " = " + roll.total;
	
	
	if(roll.total >= 10) {
		status += " _Full success!_";
	} else if(roll.total >= 7) {
		status += " _Partial success!_";
	} else {
		status += " _Miss!_";
	}
	
	var discord_roll = {
		content: status
	}
	
	var str = JSON.stringify(discord_roll);
	if(discord_webhook) {
		var req = http.request({
			protocol: discord_webhook.protocol,
			hostname: discord_webhook.hostname,
			port: discord_webhook.port,
			path: discord_webhook.path,
			query: discord_webhook.query,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(str)
			}
		}, function(res) {
			res.on('data', function(d) {
//				console.log("Discord response body: " + d);
			});
			res.on('end', function() {
				//console.log("Discord response done.");
			});
		});
	
		req.on("error", function(err) {
			console.log("Error making discord request: " + err.roll);
		});
		
		
		req.write(str);
		req.end();
	}
}

function roll_post(req, res, bayeux) {
	var room;
	var uri = url.parse(req.url);
	
	[room] = uri.pathname.substring(10).split('/'); // remove /api/roll/
	
	var body = "";
    
    req.on('data', function(data) {
        body += data;
    });
	
	req.on('end', function() {
		var roll;
		
		try {
			roll = JSON.parse(body);
		} catch(ex) {
			res.writeHead(400, {"Content-Type": "application/json"});
			res.write(JSON.stringify({ message: "Not a valid roll structure: " + ex.message}));
			res.end();
			return;
		}
		
		send_discord_message(roll);
		
		bayeux.getClient().publish('/room/' + room, {
			kind: "roll",
			roll: roll
		});
		
		res.writeHead(200, { "Content-Type": "application/json"});
		res.write("{\"ok\":true}");
		res.end();
		return;
	});
}

module.exports = {
	roll: function(req, res, bayeux) {
		if(req.method == "POST") {
			return roll_post(req, res, bayeux);
		}
	}
};
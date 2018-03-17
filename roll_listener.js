const http = require("https");
const url = require("url");
const argv = require('yargs').argv;

var hookurl = argv.discord_dice_webhook || process.env.DISCORD_DICE_WEBHOOK;

const discord_webhook = hookurl ? url.parse(hookurl) : null;

function subscribe(bayeux)
{
	/*    var message = {
        label: label,
        when: Date.now(),
        who: who,
        dice: dice,
        bonus: bonus,
        penalty: penalty,
        total: total
    };*/
	
	bayeux.getClient().subscribe('/rolls/*').withChannel(function(channel, message) {
		
		//console.log("Detected roll");
		
		var status = message.who + " just rolled ";
		
		for(var i = 0; i < message.dice.length; i++) {
			if(i > 0) {
				status += " + ";
			}
			
			status += "[" + message.dice[i] + "]";
		}
		
		if(message.bonus) {
			status += " + " + message.bonus;
		}
		if(message.penalty) {
			status += " - " + message.penalty;
		}
		
		status += " = " + message.total;
		
		
		if(message.total >= 10) {
			status += " _Full success!_";
		} else if(message.total >= 7) {
			status += " _Partial success!_";
		} else {
			status += " _Miss!_";
		}
		
		var discord_message = {
			content: status
		}
		
		var str = JSON.stringify(discord_message);
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
				console.log("Error making discord request: " + err.message);
			});
			
			
			req.write(str);
			req.end();
		}
	});
}

module.exports = {
	subscribe: subscribe
};
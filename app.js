var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'), // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
    fs = require('fs');
	db = require('./db.js');
	moment = require('moment');
	
var pseudos = [];
var urls =[];
var pseudosWriting = [];

//variable for flood
var rating, limit, interval;
rating = []; // rating: [*{'timestamp', 'pseudo'}]
limit = 10; // limit: maximum number of bytes/characters.
interval = 60000; // interval: interval in milliseconds.
function addRatingEntry (pseudo) {
	// Returns entry object.
	return rating[(rating.push({
		'timestamp': Date.now(),
		'pseudo': pseudo
	}) - 1)];
}
function evalRating (pseudo) {
	var i, newRating, totalSize;
	newRating = [];
	for (i = rating.length - 1; i >= 0; i -= 1) {
		if ((Date.now() - rating[i].timestamp) < interval)
			newRating.push(rating[i]);
	}
	rating = newRating;
	total = 0;
	for (i = newRating.length - 1; i >= 0; i -= 1) {
		if(pseudo == newRating[i].pseudo)
			total++;
	}
	return (total > limit ? false : true);
}

// Chargement de la page index.html
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.get('/css/:name', function (req, res) {
  var img = fs.readFileSync('./css/'+req.params.name);
  res.writeHead(200, {'Content-Type': 'text/css' });
  res.end(img, 'binary');
});

app.get('/emote/:name', function (req, res) {
  var img = fs.readFileSync('./emote/'+req.params.name);
  res.writeHead(200, {'Content-Type': 'image/png' });
  res.end(img, 'binary');
});

app.get('/image/:name', function (req, res) {
  var img = fs.readFileSync('./image/'+req.params.name);
  res.writeHead(200, {'Content-Type': 'image/png' });
  res.end(img, 'binary');
});

app.get('/audio/:name', function (req, res) {
  var img = fs.readFileSync('./audio/'+req.params.name);
  res.writeHead(200, {'Content-Type': 'audio/mp3' });
  res.end(img, 'binary');
});

app.use(function(req, res, next){
    res.setHeader('Content-Type', 'text/plain');
    res.send(404, 'Page introuvable !');
});

io.sockets.on('connection', function (socket, pseudo) {

	socket.on('clients',function(){
		//envoi des utilisateurs déja présent
		for(var i=0;i<pseudos.length;i++){
			socket.emit('clients', pseudos[i],urls[i]);
		}
	});

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session et on informe les autres personnes
    socket.on('nouveau_client', function(pseudo,url) {
		pseudo = ent.encode(pseudo);
		var ok = true;
		for(var i=0;i<pseudos.length;i++){
			if(pseudos[i]==pseudo)ok=false;
		}
		var dat = moment();
		if(ok){
			//pseudo.url = url;
			pseudos.push(pseudo);
			pseudosWriting.push(false);
			urls.push(url);
			socket.broadcast.emit('nouveau_client', pseudo,url,moment(dat).format("HH:mm:ss"));
		}
		socket.set('pseudo', pseudo);
		socket.set('url', url);	
		//fonction transmission histo receuili
		var processResult = function(row) {
			for(var key = row.length-1; key>=0; key--){
				socket.emit('message', {pseudo: row[key].pseudo, message: row[key].text, date: moment(row[key].date).format("HH:mm:ss")/*new Date(row[key].date).toLocaleTimeString()*/});
			}
			socket.emit('nouveau_client', pseudo, null, moment(dat).format("HH:mm:ss"));
		}
		//recherche dans la BDD
				/*db.connect('localhost','Elisath','Elisath','nodejs');
				var sqlSelect = "SELECT * FROM historiquechat WHERE pseudo <> '' ORDER BY id DESC LIMIT 25";
				db.executeSelectQuery(sqlSelect,processResult);*/
		//ajout dans la BDD
		/*var message = pseudo + ' a rejoint le Chat !';
		var sqlInsert = "INSERT INTO historiquechat (pseudo,text,date) VALUES('" + '' + "','" + message + "','"+dat+"') ";
		db.executeInsertQuery(sqlInsert);*/
				//db.close();
    });
	
	socket.on('client_ecrit', function(){
		socket.get('pseudo', function (error, pseudo) {
			var ok = false;
			for(var i=0;i<pseudos.length;i++){
				if(pseudos[i]==pseudo){
					if(!pseudosWriting[i]){
						pseudosWriting[i] = true;
						ok = true;
					}
				}
			}
			if(ok){
				var pseudosWritingTmp = [];
				for(var i=0;i<pseudos.length;i++){
					if(pseudosWriting[i]){
						pseudosWritingTmp.push(pseudos[i]);
					}
				}
				socket.broadcast.emit('client_ecrit', pseudosWritingTmp);
				//socket.emit('client_ecrit', pseudosWritingTmp);
			}
		});
	});
	
	socket.on('client_ecrit_fin', function(){
		socket.get('pseudo', function (error, pseudo) {
			var ok = false;
			for(var i=0;i<pseudos.length;i++){
				if(pseudos[i]==pseudo){
					if(pseudosWriting[i]){
						pseudosWriting[i] = false;
						ok = true;
					}
				}
			}
			if(ok){
				var pseudosWritingTmp = [];
				for(var i=0;i<pseudos.length;i++){
					if(pseudosWriting[i]){
						pseudosWritingTmp.push(pseudos[i]);
					}
				}
				socket.broadcast.emit('client_ecrit', pseudosWritingTmp);
				//socket.emit('client_ecrit', pseudosWritingTmp);
			}
		});
	});

    // Dès qu'on reçoit un message, on récupère le pseudo de son auteur et on le transmet aux autres personnes
    socket.on('message', function (message) {
		var dat = moment();
		if(message[0] == '/'){
			if(message == '/emote'){
				//envoi de la liste des emotes			
				message = "Survoler un emote pour connaitre son code.\nListe des emotes : \n:) <3 ;) :s :d :( ^^ :o :p :mlm: :cafe: :poop:";
				message = ent.encode(message);
				socket.emit('message', {pseudo: '', message: message, date: moment(dat).format("HH:mm:ss")});
			}
			if(message == '/help'){
				//envoi de la liste des emotes			
				message = "Liste des commandes : \n • /emote : liste les emotes disponibles.\n • /harlem : fait danser le site.\n • /wizz : fait trembler le site pour tous.\n • /... : ...";
				message = ent.encode(message);
				socket.emit('message', {pseudo: '', message: message, date: moment(dat).format("HH:mm:ss")});
			}
			if(message == '/harlem'){
				//fait trembler lecran !		
				socket.emit('harlem');
			}
			if(message == '/wizz'){
				socket.get('pseudo', function (error, pseudo) {
					addRatingEntry(pseudo);
					if(evalRating(pseudo)){
						//fait trembler lecran !		
						socket.emit('wizz');
						socket.broadcast.emit('wizz');
						message = pseudo+" a envoyé un wizz !";
						message = ent.encode(message);
						socket.emit('message', {pseudo: '', message: message, date: moment(dat).format("HH:mm:ss")});
						socket.broadcast.emit('message', {pseudo: '', message: message, date: moment(dat).format("HH:mm:ss")});
					}else{
						for(var i=0;i<10;i++)
							addRatingEntry(pseudo);
						socket.emit('flood');
					}
				});			
			}
		}else{
			socket.get('pseudo', function (error, pseudo) {
				if(evalRating(pseudo)){
					addRatingEntry(pseudo);
					message = ent.encode(message);
					socket.broadcast.emit('message', {pseudo: pseudo, message: message, date: moment(dat).format("HH:mm:ss")});
					//ajout dans la BDD
					/*db.connect('localhost','Elisath','Elisath','nodejs');
					var sqlInsert = "insert into historiquechat (pseudo,text,date) values('" + pseudo + "','" + message + "','"+moment(dat).format("YYYY-MM-DD HH:mm:ss")+"') ";
					db.executeInsertQuery(sqlInsert);
					db.close();*/
					socket.emit('message', {pseudo: pseudo, message: message, date: moment(dat).format("HH:mm:ss")});
				}else{
					for(var i=0;i<10;i++)
						addRatingEntry(pseudo);
					socket.emit('flood');
				}
			});
		}
    }); 
	
	//quand un client deco
	socket.on('clientparti',function(){
		socket.get('pseudo', function (error, pseudo) {
			var ancienPseudos = [];
			var ancienUrls = [];
			var dat = moment();
			for(var i=0;i<pseudos.length;i++){
				if(pseudos[i]!=pseudo){
					ancienPseudos[ancienPseudos.length]=pseudos[i];
					ancienUrls[ancienUrls.length]=urls[i];
				}
			}
			pseudos = ancienPseudos;
			urls = ancienUrls;
			
			socket.get('url', function (error, url) {
				socket.broadcast.emit('clientparti', pseudo,moment(dat).format("HH:mm:ss"));
			});
			//ajout dans la BDD
			/*var message = pseudo + ' a quitté le Chat !';
			db.connect('localhost','Elisath','Elisath','nodejs');
			var sqlInsert = "insert into historiquechat (pseudo,text,date) values('" + '' + "','" + message + "','"+dat+"') ";
			db.executeInsertQuery(sqlInsert);*/
		});	
	});
	
	//for mini draw
	// Start listening for mouse move events
    socket.on('mousemove', function (data) {
        // This line sends the event (broadcasts it)
        // to everyone except the originating client.
        socket.broadcast.emit('moving', data);
    });
});

io.sockets.on('close', function (socket, pseudo) {
	
});

var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "217.28.26.173";//23.21.97.86
var port = process.env.OPENSHIFT_NODEJS_PORT || 80;
server.listen( port, ipaddress, function() {
    console.log((new Date()) + ' Server is listening on port 7777');
});
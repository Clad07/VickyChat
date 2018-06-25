var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io')(server),
    ent = require('ent'), // Permet de bloquer les caractères HTML (sécurité équivalente à htmlentities en PHP)
    fs = require('fs');
	db = require('./db.js');
	pg = require('pg');
	//const { Client } = require('pg');
	moment = require('moment');
	
//init postgres
// pools will use environment variables
// for connection information
//const pool = new Pool()
/*const client = new Client({
  user: 'jlthbnkffnzbhy',
  host: 'ec2-107-21-219-235.compute-1.amazonaws.com',
  database: 'dtd7h0pdls9gb',
  password: 'mS8zWIo7alGJRYDQ3Zb8cUwCXd',
  port: 5432,
  ssl : false,
});*/
/*var db_url = process.env.DATABASE_URL || "postgres://jlthbnkffnzbhy:mS8zWIo7alGJRYDQ3Zb8cUwCXd@ec2-107-21-219-235.compute-1.amazonaws.com:5432/dtd7h0pdls9gb";
const client = new Client({
  connectionString: db_url,
  ssl: false,
});*/

var pseudos = [];
var urls =[];
var socketId =[];
var pseudosWriting = [];
//var bdd = 'mysql';
var bdd = 'pgsql';
moment.locale('fr');
var msgDateFormat = "[le] Do MMMM YYYY [à] HH:mm:ss";
var nbMsg = 10;

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
	//console.log('Openning for ' + pseudo);
	
	socket.on('clients',function(){
		//envoi des utilisateurs déja présent
		for(var i=0;i<pseudos.length;i++){
			socket.emit('clients', pseudos[i],urls[i]);
		}
	});

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session et on informe les autres personnes
    socket.on('nouveau_client', function(pseudo,url) {
		console.log(pseudo + " arrive");
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
			socketId.push(socket.id);
			socket.broadcast.emit('nouveau_client', pseudo,url,moment(dat).format("HH:mm:ss"));
		}
		socket.pseudo = pseudo;//socket.set('pseudo', pseudo);
		socket.url = url;//socket.set('url', url);	
		//fonction transmission histo receuili
		var processResult = function(row) {
			//console.log(row);
			//console.log("\n\n\n" + (row.length-1) + "\n\n\n");
			for(var key = row.length-1; key>=0; key--){
				//console.log({pseudo: row[key].pseudo, message: row[key].text, date: moment(row[key].date).format("HH:mm:ss")});
				if(row[key].pseudo == pseudo || row[key].destinataire == pseudo || row[key].destinataire == "Tous"){
					socket.emit('message', {pseudo: row[key].pseudo, destinataire: row[key].destinataire, message: row[key].text, date: moment(row[key].date).format(msgDateFormat)/*new Date(row[key].date).toLocaleTimeString()*/, debut: false});
				}
			}
			socket.emit('nouveau_client', pseudo, null, moment(dat).format("HH:mm:ss"));
		}
		//recherche dans la BDD
		if(bdd == 'mysql'){
			db.connect('localhost','5454','Elisath','Elisath','vickychat');
			//var sqlSelect = "SELECT * FROM historiquechat WHERE pseudo <> '' ORDER BY id DESC LIMIT "+nbMsg;
			var sqlSelect = "SELECT s.* FROM (SELECT * FROM historiquechat WHERE pseudo <> '' ORDER BY id DESC LIMIT "+nbMsg+") s ORDER BY s.id ASC";
			db.executeSelectQuery(sqlSelect,processResult);
			//ajout dans la BDD
			/*var message = pseudo + ' a rejoint le Chat !';
			var sqlInsert = "INSERT INTO historiquechat (pseudo,text,date) VALUES('" + '' + "','" + message + "','"+dat+"') ";
			db.executeInsertQuery(sqlInsert);*/
			db.close();
		}
		if(bdd == 'pgsql'){
			pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			  if (err) throw err;
			  console.log('Connected to postgres! Getting schemas...');

			  client
				.query("SELECT * FROM historiquechat WHERE pseudo <> '' ORDER BY id DESC LIMIT "+nbMsg)
				//.query("SELECT s.* FROM (SELECT * FROM historiquechat WHERE pseudo <> '' ORDER BY id DESC LIMIT "+nbMsg+") s ORDER BY s.id ASC")
				.on('row', function(row) {
					//console.log(row);
					if(row.pseudo == pseudo || row.destinataire == pseudo || row.destinataire == "Tous"){
						socket.emit('message', {pseudo: row.pseudo, destinataire: row.destinataire, message: row.text, date: moment(row.date).format(msgDateFormat), debut: false});
					}
					//change row because message is call text, etc ...
				})
				.on('end', function(){
					socket.emit('nouveau_client', pseudo, null, moment(dat).format("HH:mm:ss"));
				});
				done();
			});
			
			pg.end();
			//socket.emit('message', {pseudo: "LOL", message: "URL: "+db_url, date: moment(Date.now()).format(msgDateFormat), debut: true});
			/*client.connect();

			client.query("SELECT s.* FROM (SELECT * FROM historiquechat WHERE pseudo <> '' ORDER BY id DESC LIMIT "+nbMsg+") s ORDER BY s.id ASC", (err, res) => {
				if (err) throw err;
				for (let row of res.rows) {
					//console.log(JSON.stringify(row));
					socket.emit('message', {pseudo: row.pseudo, message: row.text, date: moment(row.date).format(msgDateFormat), debut: false});
				}
				client.end();
			});*/
		}
    });
	
	socket.on('affiche_plus', function(offset){
		var pseudo = socket.pseudo;
		//fonction transmission histo receuili
		var processResult = function(row) {
			//console.log(row);
			//console.log("\n\n\n" + (row.length-1) + "\n\n\n");
			for(var key = row.length-1; key>=0; key--){
				//console.log({pseudo: row[key].pseudo, message: row[key].text, date: moment(row[key].date).format("HH:mm:ss")});
				if(row[key].pseudo == pseudo || row[key].destinataire == pseudo || row[key].destinataire == "Tous"){
					socket.emit('message', {pseudo: row[key].pseudo, destinataire: row[key].destinataire, message: row[key].text, date: moment(row[key].date).format(msgDateFormat)/*new Date(row[key].date).toLocaleTimeString()*/, debut: false});
				}
			}
			socket.emit('affiche_plus_fin');
		}
		//recherche dans la BDD
		if(bdd == 'mysql'){
			db.connect('localhost','5454','Elisath','Elisath','vickychat');
			//var sqlSelect = "SELECT * FROM historiquechat WHERE pseudo <> '' ORDER BY id DESC LIMIT "+nbMsg+" OFFSET "+(offset*nbMsg);
			var sqlSelect = "SELECT s.* FROM (SELECT * FROM historiquechat WHERE pseudo <> '' ORDER BY id DESC LIMIT "+nbMsg+" OFFSET "+(offset*nbMsg)+") s ORDER BY s.id ASC";
			db.executeSelectQuery(sqlSelect,processResult);
			//ajout dans la BDD
			/*var message = pseudo + ' a rejoint le Chat !';
			var sqlInsert = "INSERT INTO historiquechat (pseudo,text,date) VALUES('" + '' + "','" + message + "','"+dat+"') ";
			db.executeInsertQuery(sqlInsert);*/
			db.close();
		}
		if(bdd == 'pgsql'){
			pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			  if (err) throw err;
			  console.log('Connected to postgres! Getting schemas...');

			  client
				.query("SELECT * FROM historiquechat WHERE pseudo <> '' ORDER BY id DESC LIMIT "+nbMsg+" OFFSET "+(offset*nbMsg))
				//.query("SELECT s.* FROM (SELECT * FROM historiquechat WHERE pseudo <> '' ORDER BY id DESC LIMIT "+nbMsg+" OFFSET "+(offset*nbMsg)+") s ORDER BY s.id ASC")
				.on('row', function(row) {
					//console.log(row);
					if(row.pseudo == pseudo || row.destinataire == pseudo || row.destinataire == "Tous"){
						socket.emit('message', {pseudo: row.pseudo, destinataire: row.destinataire, message: row.text, date: moment(row.date).format(msgDateFormat), debut: false});
					}
					//change row because message is call text, etc ...
				})
				.on('end', function(){
					socket.emit('affiche_plus_fin');
				});
				done();
			});
			pg.end();
		}
		socket.emit('affiche_plus_fin_gif');
	});
	
	socket.on('client_ecrit', function(){
		//socket.get('pseudo', function (error, pseudo) {
			var ok = false;
			for(var i=0;i<pseudos.length;i++){
				if(pseudos[i]==socket.pseudo){
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
		//});
	});
	
	socket.on('client_ecrit_fin', function(){
		//socket.get('pseudo', function (error, pseudo) {
			var ok = false;
			for(var i=0;i<pseudos.length;i++){
				if(pseudos[i]==socket.pseudo){
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
		//});
	});

    // Dès qu'on reçoit un message, on récupère le pseudo de son auteur et on le transmet aux autres personnes
    socket.on('message', function (message, destinataire) {
		var pseudo;
		var dat = moment();
		if(message[0] == '/'){
			if(message == '/emote'){
				//envoi de la liste des emotes			
				message = "Survoler un emote pour connaitre son code.\nListe des emotes : \n:) <3 ;) :s :d :( ^^ :o :p :mlm: :cafe: :poop:";
				message = ent.encode(message);
				socket.emit('message', {pseudo: '', destinataire: destinataire, message: message, date: moment(dat).format("HH:mm:ss"), debut: true});
			}
			if(message == '/help'){
				//envoi de la liste des emotes			
				message = "Liste des commandes : \n • /emote : liste les emotes disponibles.\n • /harlem : fait danser le site.\n • /wizz : fait trembler le site pour tous.\n • /clear : efface les dessins \n • /reset : pour nouveau pseudo / image et annule les dessins et le thème \n • /... : ...";
				message = ent.encode(message);
				socket.emit('message', {pseudo: '', destinataire: destinataire, message: message, date: moment(dat).format("HH:mm:ss"), debut: true});
			}
			if(message == '/harlem'){
				//fait trembler lecran !		
				socket.emit('harlem');
			}
			if(message == '/reset'){
				//efface cookie pour reecrire pseudo/image		
				socket.emit('reset');
			}
			if(message == '/clear'){
				//efface cookie pour reecrire pseudo/image		
				socket.emit('clear');
			}
			if(message == '/wizz'){
				//socket.get('pseudo', function (error, pseudo) {
				pseudo = socket.pseudo;
					addRatingEntry(pseudo);
					if(evalRating(pseudo)){
						//fait trembler lecran !		
						message = pseudo+" a envoyé un wizz à " + destinataire + " !";
						message = ent.encode(message);
						socket.emit('wizz');
						socket.emit('message', {pseudo: '', destinataire: destinataire, message: message, date: moment(dat).format("HH:mm:ss"), debut: true});
						if(destinataire=="Tous"){
							socket.broadcast.emit('wizz');
							socket.broadcast.emit('message', {pseudo: '', destinataire: destinataire, message: message, date: moment(dat).format("HH:mm:ss"), debut: true});
						}else{
							for(var i=0;i<pseudos.length;i++){
								if(pseudos[i]==destinataire){
									if(io.sockets.connected[socketId[i]]!="undefined"){
										io.sockets.connected[socketId[i]].emit('wizz');
										io.sockets.connected[socketId[i]].emit('message', {pseudo: '', destinataire: destinataire, message: message, date: moment(dat).format("HH:mm:ss"), debut: true});
									}
								}
							}
						}
					}else{
						//for(var i=0;i<10;i++)
							addRatingEntry(pseudo);
						socket.emit('flood');
					}
				//});			
			}
		}else{
			//socket.get('pseudo', function (error, pseudo) {
			pseudo = socket.pseudo;
			if(evalRating(pseudo)){
				addRatingEntry(pseudo);
				message = ent.encode(message);
				socket.emit('message', {pseudo: pseudo, destinataire: destinataire, message: message, date: moment(dat).format(msgDateFormat), debut: true});
				if(destinataire=="Tous"){
					socket.broadcast.emit('message', {pseudo: pseudo, destinataire: destinataire, message: message, date: moment(dat).format(msgDateFormat), debut: true});
				}else{
					for(var i=0;i<pseudos.length;i++){
						if(pseudos[i]==destinataire){
							//io.sockets.connected permet d'envoyer seulement a la personne voulu
							if(io.sockets.connected[socketId[i]]!="undefined"){
								io.sockets.connected[socketId[i]].emit('message', {pseudo: pseudo, destinataire: destinataire, message: message, date: moment(dat).format(msgDateFormat), debut: true});
							}
							break;
						}
					}
				}
				
				//ajout dans la BDD
				if(bdd == 'mysql'){
					db.connect('localhost','5454','Elisath','Elisath','vickychat');
					var sqlInsert = "insert into historiquechat (pseudo,destinataire,text,date) values('" + pseudo + "','" + destinataire + "','" + message + "','"+moment(dat).format("YYYY-MM-DD HH:mm:ss")+"') ";
					db.executeInsertQuery(sqlInsert);
					db.close();
				}
				if(bdd == 'pgsql'){
					pg.connect(process.env.DATABASE_URL, function(err, client, done) {
					  if (err) throw err;
					  console.log('Connected to postgres! Getting schemas...');

					  client
						.query("insert into historiquechat (pseudo,text,date) values('" + pseudo + "','" + destinataire + "','" + message + "','"+moment(dat).format("YYYY-MM-DD HH:mm:ss")+"') ");
					  done();
					});
					pg.end();
				}
			}else{
				//for(var i=0;i<10;i++)
					addRatingEntry(pseudo);
				socket.emit('flood');
			}
			//});
		}
    }); 
	
	//quand un client deco
	socket.on('clientparti',function(){
		console.log(socket.pseudo + " part");
		//socket.get('pseudo', function (error, pseudo) {
			var ancienPseudos = [];
			var ancienUrls = [];
			var ancienSocketId = [];
			var dat = moment();
			for(var i=0;i<pseudos.length;i++){
				if(pseudos[i]!=socket.pseudo){
					ancienPseudos[ancienPseudos.length]=pseudos[i];
					ancienUrls[ancienUrls.length]=urls[i];
					ancienSocketId[ancienSocketId.length]=socketId[i];
				}
			}
			pseudos = ancienPseudos;
			urls = ancienUrls;
			socketId = ancienSocketId;
			
			//socket.get('url', function (error, url) {
				socket.broadcast.emit('clientparti', socket.pseudo,moment(dat).format("HH:mm:ss"));
			//});
			//ajout dans la BDD
			/*var message = pseudo + ' a quitté le Chat !';
			db.connect('localhost','5454','Elisath','Elisath','vickychat');
			var sqlInsert = "insert into historiquechat (pseudo,text,date) values('" + '' + "','" + message + "','"+dat+"') ";
			db.executeInsertQuery(sqlInsert);*/
		//});	
	});
	
	//for mini draw
	// Start listening for mouse move events
    socket.on('mousemove', function (data, destinataire) {
        // This line sends the event (broadcasts it)
        // to everyone except the originating client.
		
		if(destinataire=="Tous"){
			socket.broadcast.emit('moving', data);
		}else{
			for(var i=0;i<pseudos.length;i++){
				if(pseudos[i]==destinataire){
					//io.sockets.connected permet d'envoyer seulement a la personne voulu
					if(io.sockets.connected[socketId[i]]!="undefined"){
						io.sockets.connected[socketId[i]].emit('moving', data);
					}
					break;
				}
			}
		}
		
        
    });
	
	socket.on('bouton_test', function () {
		var info = "test";
		info = moment.locale();
        socket.emit('bouton_test', info);
    });
});

io.sockets.on('close', function (socket, pseudo) {
	console.log('Closing for ' + pseudo);
});

//var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "23.21.97.86";//23.21.97.86
//var port = process.env.OPENSHIFT_NODEJS_PORT || 80;
app.set('port', (process.env.PORT || 5000));
server.listen( app.get('port'), function() {
    console.log((new Date()) + ' Server is listening ');
});
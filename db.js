db = module.exports = {
  mysql : require('mysql'),
  mySqlClient : null,
 
  connect : function (host, user, password, database) {
    this.mySqlClient = this.mysql.createConnection({
      host     : host,
      user     : user,
      password : password,
      database : database
    });
  },
 
  close : function() {
    this.mySqlClient.end();
  },
 
  executeSelectQuery : function( selectQuery, callbackResultFunction ) {
    this.mySqlClient.query(
    selectQuery,
    function select(error, results, fields) {
      if (error) {
        console.log(error);
        this.mySqlClient.end();
        return;
      }
 
      if ( results.length > 0 )  { 
        callbackResultFunction(results);
      } else {
        console.log("Pas de données");
      }
    });
  },
 
  executeInsertQuery : function( insertQuery ) {
  this.mySqlClient.query(
    insertQuery,
    function result(error, info) {
      if (error) {
		console.log(error);
		console.log(info);
        db.close();
        return error;
      }
      return info.insertId;
    }
  );
},

  executeUpdateQuery : function( updateQuery ) {
  this.mySqlClient.query(
    updateQuery,
    function result(error) {
      if (error) {
        db.close();
        return error;
      }
      return;
    }
  );
}
};
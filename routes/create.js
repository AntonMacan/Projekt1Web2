var router = require('express').Router();
const { requiresAuth } = require('express-openid-connect');
const pool = require('./db');
const format = require('pg-format');

router.post('/', requiresAuth(), async function(req,res,next){

   idx = undefined
   if(req.oidc.isAuthenticated()){
      found = true
      const query = {
        text: 'SELECT * FROM users WHERE username = $1',
        values: [req.oidc.user.nickname]
      };
  
      pool.query(query, (error, results) => {
        if (error) {
          console.error('Error executing query:', error);
        } else {
          console.log('Query results:', results.rows);
        }
        if(results.rowCount == 0){
          console.log("NOT FOUND")
          found = false
  
          const ADDquery = {
            text: 'INSERT INTO users(username) VALUES($1) RETURNING id',
            values: [req.oidc.user.nickname]
          }
  
          pool.query(ADDquery, (error, results) => {
            if (error) {
              console.error('Error executing query:', error);
            } else {
              console.log('Query results:', results.rows);
            }
          });
  
        }else{
         console.log(results.rows[0].id)
            idx = results.rows[0].id;
        }

   const tournamentName = req.body.tournamentName;
   var parts = req.body.participants
   const winPoints = req.body.winPoints;
   const drawPoints = req.body.drawPoints;
   const lossPoints = req.body.lossPoints;
   const owner = req.oidc.user.nickname;
   console.log(parts, typeof(parts))
   var participants = parts.split(',');
   console.log(owner + "  "+ participants.length + " "+ typeof(participants))
   if(owner != undefined && participants.length >= 4 && participants.length <= 8){
      //define id
      let id = undefined
      //query to create new league
      const createLeague = {
         text: 'INSERT INTO league(name, owner, win_value, draw_value, defeat_value) VALUES($1,$2,$3,$4,$5) RETURNING id',
         values: [tournamentName,idx,winPoints,drawPoints,lossPoints]
       }
       //execute the query
       pool.query(createLeague, (error, result) => {
         if (error) {
           console.error('Error inserting data:', error);
         } else {
           id = result.rows[0].id;
           console.log('New row inserted with ID:', id);
         }
         //query to add each participant
         let dataToInsert = []
         participants.forEach(p =>{
            dataToInsert.push([id,p])
         })
         console.log(dataToInsert)
         var insertQuery = format('INSERT INTO participant (league_id, name) VALUES %L RETURNING id',dataToInsert);
         let insertedRowIds = undefined;
         console.log(insertQuery)
         pool.query(insertQuery,(error, result) => {
            if (error) {
              console.error('Error inserting data:', error);
            } else {
              insertedRowIds = result.rows.map(row => row.id);
              console.log('New rows inserted with IDs:', insertedRowIds);
            }
            const lenght = insertedRowIds.length;
            let map = {
               4: {
                  1:[[1,4],[2,3]],
                  2:[[1,2],[3,4]],
                  3:[[1,3],[2,4]]
               },
               5:{
                  1:[[2,5],[3,4]],
                  2:[[1,2],[3,5]],
                  3:[[1,3],[4,5]],
                  4:[[1,4],[2,3]],
                  5:[[1,5],[2,4]]
               },
               6:{
                  1:[[1,6],[2,5],[3,4]],
                  2:[[1,2],[3,5],[4,6]],
                  3:[[1,3],[4,5],[2,6]],
                  4:[[1,4],[2,3],[5,6]],
                  5:[[1,5],[2,4],[3,6]]
               },
               7:{
                  1:[[2,7],[3,6],[4,5]],
                  2:[[1,2],[3,7],[4,6]],
                  3:[[1,3],[4,7],[5,6]],
                  4:[[1,4],[2,3],[5,7]],
                  5:[[1,5],[2,4],[6,7]],
                  6:[[1,6],[2,5],[3,4]],
                  7:[[1,7],[2,6],[3,5]]
               },
               8:{
                  1:[[2,7],[3,6],[4,5],[1,8]],
                  2:[[1,2],[3,7],[4,6],[5,8]],
                  3:[[1,3],[4,7],[5,6],[2,8]],
                  4:[[1,4],[2,3],[5,7],[6,8]],
                  5:[[1,5],[2,4],[6,7],[3,8]],
                  6:[[1,6],[2,5],[3,4],[7,8]],
                  7:[[1,7],[2,6],[3,5],[4,8]]
               }}
            let games = []
            let dict = map[lenght]
            let valuesGames = []
            for (const key in dict){
               if(dict.hasOwnProperty(key)){
                  let arr = dict[key]
                  arr.forEach( pair =>{
                      valuesGames.push([key,id,insertedRowIds[pair[0]-1],insertedRowIds[pair[1]-1]])
                  })
               }
            }
            const insertGamesQuery = format('INSERT INTO games (round, league_id, user1_id, user2_id) VALUES %L',valuesGames);

            pool.query(insertGamesQuery,(error, result) => {
               if (error) {
                 console.error('Error inserting data:', error);
               } else {
                 console.log("Added: "+result.rowCount);
               }
            });

            const generatedString = generateRandomString(10);
            console.log(generatedString)
            
            const insertLink = {
               text: 'INSERT INTO links (league_id,link) VALUES ($1, $2)',
               values: [id,generatedString]
             }

             pool.query(insertLink, (error, results) => {
               if (error) {
                 console.error('Error executing query:', error);
               } else {
                 console.log('Query results:', results.rows);
               }
             });
             const str = '/league/'+generatedString
             console.log('/league/'+generatedString)
             
             res.redirect(str)
         });
      });

      console.log('Owner'+owner+'Tournament created with the following data: Name:'+ tournamentName + ' Participants: '+ participants + ' Points for Win: '+ winPoints + ' Points for Draw: '+ drawPoints + ' Points for Loss: '+ lossPoints);
      
      
    }else{
      console.log('League not created!');
   }

   });
   }

   
 
   
  res.render('league', {
    title: 'Auth0 Webapp sample Nodejs',
    isAuthenticated: req.oidc.isAuthenticated()
  });
});


function generateRandomString(length) {
   const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
   let randomString = '';
 
   for (let i = 0; i < length; i++) {
     const randomIndex = Math.floor(Math.random() * charset.length);
     randomString += charset[randomIndex];
   }
 
   return randomString;
 }


 module.exports = router
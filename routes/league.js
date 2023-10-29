var router = require('express').Router();
const { requiresAuth } = require('express-openid-connect');
const pool = require('./db');
const format = require('pg-format');

router.get('/:link', (req,res) =>{
   const link  = req.params.link;
   console.log(link)
   const query = {
      text: 'SELECT * FROM league JOIN links ON league.id = links.league_id WHERE link = $1',
      values: [link]
    };
    let result = undefined
    pool.query(query, (error, results) => {
      if (error) {
        console.error('Error executing query:', error);
      } else {
        console.log('Query results:', results.rows);
      }
      result = results.rows[0]
      console.log(result.name)
      console.log(req.oidc.user)
      console.log(req.oidc.isAuthenticated())

      const query2 = {
         text: 'SELECT * FROM participant WHERE league_id = $1',
         values: [result.id]
       };
       pool.query(query2, (error, results) => {
         if (error) {
           console.error('Error executing query:', error);
         } else {
           console.log('Query results:', results.rows);
         }
         const participants = results.rows
         const query3 = {
            text: 'SELECT * FROM games WHERE league_id = $1',
            values: [result.id]
          };

          pool.query(query3, (error, results) => {
            if (error) {
              console.error('Error executing query:', error);
            } else {
              console.log('Query results:', results.rows);
            }

            let games = [];

            let leaderboard = {};

            participants.forEach(p =>{
               dict = {
                  played: 0,
                  points: 0,
                  gd: 0,
               }
               leaderboard[p.name] = dict;
            })
            console.log(leaderboard)

            results.rows.forEach(row =>{
               let pl1 = undefined;
               let pl2 = undefined;
               participants.forEach(par =>{
                  if(row.user1_id == par.id){
                     pl1 = par.name
                  }else if(row.user2_id == par.id){
                     pl2 = par.name
                  }
               });
               if(row.goals1 != undefined && row.goals2 != undefined){
                  t1 = leaderboard[pl1]
                  t2 = leaderboard[pl2]
                  if(row.goals1 > row.goals2){
                     t1['points']+=3
                  }else if(row.goals1 < row.goals2){
                     t2['points']+=3
                  }else{
                     t1['points']+=1;
                     t2['points']+=1;
                  }
                  t1['played']+=1
                  t2['played']+=1
                  t1['gd']+=(row.goals1-row.goals2)
                  t2['gd']+=(row.goals2-row.goals1)
               }
               let played = true
               if(row.goals1 == undefined){
                  row.goals1 = 0
                  played = false
               }
               if(row.goals2 == undefined){
                  row.goals2 = 0
               }
               dict = {
                  round: row.round,
                  pl1: pl1,
                  pl2: pl2,
                  goals1: row.goals1,
                  goals2: row.goals2,
                  id1: row.user1_id,
                  id2: row.user2_id,
                  played: played
               }
               console.log(dict["round"])
               games.push(dict)
            })
            let nick = ""
            if(req.oidc.user !=undefined){
               nick = req.oidc.user.nickname
            }
            const query4 = {
               text: 'SELECT * FROM users WHERE username = $1',
               values: [nick]
             };
             pool.query(query4, (error, results) => {
               let isAuth = false;
               if (error) {
                 console.error('Error executing query:', error);
               } else {
                 console.log('Query results:', results.rows);
                 userID = results.rows[0].id;
                 if(result.owner == userID){
                    isAuth = true;
                 }
               }
               

               const lboard = Object.entries(leaderboard).map(([team, attributes]) => ({ team, ...attributes }));
               lboard.sort((a, b) => {
                  if (a.points !== b.points) return b.points - a.points;
                  if (a.gd !== b.gd) return b.gd - a.gd;
                  return a.played - b.played;
               });

               games.sort((a, b) => a.round - b.round);
               res.render('league', {
                  title: result.name,
                  isAuth: isAuth,
                  link: link,
                  participants: participants,
                  info: results.rows,
                  games: games,
                  leagueId: result.id,
                  leaderboard: lboard
               })
            });
         });    

      });
   });
   
});


router.post('/:link', requiresAuth(), async function(req,res,next){
   const round = req.query.round;
   const team1 = req.query.team1;
   const team2 = req.query.team2;
   const league = req.query.league;
   const link  = req.params.link;


    const formData = req.body
    const team1Goals = req.body.team1Goals
    const team2Goals = req.body.team2Goals
   console.log(formData)
   const t1 = parseInt(team1Goals);
   const t2 = parseInt(team2Goals);
   let result = 0;
   if(t1 > t2){
      result = 1
   }else if(t1 < t2){
      result = 2
   }
   const query = {
      text: 'UPDATE games SET goals1 = $1 , goals2 = $2, result = $3 WHERE round = $4 AND league_id = $5 AND user1_id = $6 AND user2_id = $7',
      values: [t1,t2,result,round,league,team1,team2]
    };
    pool.query(query, (error, results) => {
      if (error) {
        console.error('Error executing query:', error);
      } else {
        console.log('Query results:', results.rows);
      }
      const str = '/league/'+link
      console.log('/league/'+link)
             
      res.redirect(str)
   });


});

module.exports = router
var router = require('express').Router();
const { requiresAuth } = require('express-openid-connect');
const pool = require('./db');
id = undefined

router.get('/', function (req, res, next) {

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
          text: 'INSERT INTO users(username) VALUES($1)',
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
        
          id = results.rows[0].id;
          req.idUs = id
          console.log(req.idUs)
      }
    });
}

  res.render('index', {
    title: 'Leagues manager',
    isAuthenticated: req.oidc.isAuthenticated(),
    id: id
  });
});

router.get('/profile', requiresAuth(), function (req, res, next) {
  res.render('profile', {
    userProfile: JSON.stringify(req.oidc.user, null, 2),
    title: 'Profile page'
  });
});


router.get('/leagueCreation', requiresAuth(), function (req, res, next) {
  req.idUs = id;
  console.log(id)
  req.oidc.id = id
  res.render('form', {
    userProfile: JSON.stringify(req.oidc.user, null, 2),
    title: 'Create a league'
  });
});

module.exports = router;

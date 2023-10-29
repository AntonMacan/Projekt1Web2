const { Pool } = require('pg');

const pool = new Pool({
   user: 'admin',
   host: 'dpg-cksksc6nfb1c73d1sl5g-a.frankfurt-postgres.render.com',
   database: 'natjecanja_6p9w',
   password: 'vRaV9wJzsIOWJKwszLjEyBh8PcukeeYd',
   port: 5432, // Default PostgreSQL port,
   ssl: true
 });

module.exports = pool;
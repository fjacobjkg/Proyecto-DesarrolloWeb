// api/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host    : process.env.MYSQL_HOST || 'localhost',
  user    : process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'merodias12',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = { pool };
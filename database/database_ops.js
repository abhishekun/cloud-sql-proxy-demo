const { Pool } = require("pg");
require('dotenv').config();

async function getPersonData(pool) {
    console.log('inside method: database_ops::getPersonData');
    return await pool
        .select('*')
        .from('user')
        .limit(5);

}

module.exports = { getPersonData};
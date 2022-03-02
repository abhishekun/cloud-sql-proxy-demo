require('dotenv').config();
const { getPersonData } = require('./database/database_ops');
const express = require('express');
const app = express();
const Knex = require('knex');

// Set Content-Type for all responses for these routes.
app.use((req, res, next) => {
  res.set('Content-Type', 'application/json');
  next();
});

let pool;

app.use(async (req, res, next) => {
  if (pool) {
    return next();
  }
  try {
    pool = await createPool();
    next();
  } catch (err) {
    console.log(err);
    return next(err);
  }
});

const createTcpPool = async config => {
  // Extract host and port from socket address
  const dbSocketAddr = process.env.DB_HOST.split(':');
  // Establish a connection to the database
  return Knex({
    client: 'pg',
    connection: {
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      host: dbSocketAddr[0],
      port: dbSocketAddr[1],
    },
    // ... Specify additional properties here.
    ...config,
  });
};

const createUnixSocketPool = async config => {
  console.log('unix path');
  const dbSocketPath = process.env.DB_SOCKET_PATH || '/cloudsql';

  // Establish a connection to the database
  return Knex({
    client: 'pg',
    connection: {
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      host: `${dbSocketPath}/${process.env.INSTANCE_CONNECTION_NAME}`,
    },
    // ... Specify additional properties here.
    ...config,
  });
};

// Initialize Knex, a Node.js SQL query builder library with built-in connection pooling.
const createPool = async () => {
  const config = { pool: {} };
  config.pool.max = 5;
  config.pool.min = 5;
  config.pool.acquireTimeoutMillis = 60000; // 60 seconds
  config.pool.createTimeoutMillis = 30000; // 30 seconds
  config.pool.idleTimeoutMillis = 600000; // 10 minutes
  config.pool.createRetryIntervalMillis = 200; // 0.2 seconds
  if (process.env.DB_HOST) {
    if (process.env.DB_ROOT_CERT) {
      return createTcpPoolSslCerts(config);
    } else {
      return createTcpPool(config);
    }
  } else {
    return createUnixSocketPool(config);
  }
};


// fetch data from DB
app.get('/user', async (req, res) => {
  console.log('inside method: index::user');

  pool = pool || (await createPool());
  try {
      await getPersonData(pool);
      res.json({ results: 'records fetched successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error populating person data', message: err.message });
  }
});




//health check
app.get('/status', (req, res) => res.json({ info: 'Working' }));

const port = process.env.PORT || 8080;
app.listen(port);
// library-management-system/src/app/lib/db.ts
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER as string,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
    encrypt: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool;

export const getConnection = async (): Promise<sql.ConnectionPool> => {
  if (!pool) {
    console.log('Connecting to DB with config:', {
      user: config.user,
      server: config.server,
      database: config.database,
      port: config.port,
    });

    try {
      pool = await sql.connect(config);
      console.log('✅ DB Connected successfully');
    } catch (error) {
      console.error('❌ DB connection error:', error);
      throw error;
    }
  }
  return pool;
};
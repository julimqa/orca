const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/tms_dev';
process.env.DATABASE_URL = DATABASE_URL;



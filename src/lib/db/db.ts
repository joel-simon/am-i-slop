import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from './types';
import * as dotenv from 'dotenv';

// Load environment variables from .env filedb
dotenv.config();

const dialect = new PostgresDialect({
    pool: new pg.Pool({
        user: process.env.POSTGRES_USER,
        database: process.env.POSTGRES_DATABASE,
        password: process.env.POSTGRES_PASSWORD,
        port: 5432,
        ssl: true,
        host: process.env.POSTGRES_HOST,
        max: 10,
    }),
});

export const db = new Kysely<Database>({
    dialect,
});

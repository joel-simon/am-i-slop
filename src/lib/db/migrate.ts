import { createTables } from './migrations';

async function migrate() {
    try {
        await createTables();
        console.log('Database tables created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Failed to create database tables:', error);
        process.exit(1);
    }
}

migrate();

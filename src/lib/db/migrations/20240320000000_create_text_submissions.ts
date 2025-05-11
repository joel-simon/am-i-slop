import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('text_submissions')
        .ifNotExists()
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('text_hash', 'varchar(255)', (col) => col.notNull().unique())
        .addColumn('text', 'text', (col) => col.notNull())
        .addColumn('perplexity', 'real', (col) => col.notNull())
        .addColumn('question_id', 'integer', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo('now()'))
        .execute();

    // Create indexes
    await db.schema
        .createIndex('idx_text_submissions_question_id')
        .ifNotExists()
        .on('text_submissions')
        .column('question_id')
        .execute();

    await db.schema
        .createIndex('idx_text_submissions_perplexity')
        .ifNotExists()
        .on('text_submissions')
        .column('perplexity')
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('text_submissions').execute();
}

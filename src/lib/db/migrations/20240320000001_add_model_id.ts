import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable('text_submissions')
        .addColumn('model_id', 'integer', (col) => col.notNull().defaultTo(0))
        .execute();

    await db.schema
        .createIndex('idx_text_submissions_model_id')
        .ifNotExists()
        .on('text_submissions')
        .column('model_id')
        .execute();

    // Create composite index for question_id and perplexity
    await db.schema
        .createIndex('idx_text_submissions_question_perplexity')
        .ifNotExists()
        .on('text_submissions')
        .columns(['question_id', 'perplexity'])
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable('text_submissions').dropColumn('model_id').execute();
}

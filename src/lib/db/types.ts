import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface TextSubmissionsTable {
    id: Generated<number>;
    text_hash: string;
    text: string;
    perplexity: number;
    question_id: number;
    created_at: ColumnType<Date, never, never>;
}

export interface Database {
    text_submissions: TextSubmissionsTable;
}

export type TextSubmission = Selectable<TextSubmissionsTable>;
export type NewTextSubmission = Insertable<TextSubmissionsTable>;
export type TextSubmissionUpdate = Updateable<TextSubmissionsTable>;

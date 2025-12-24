// Shared questions for the app
export const questions = [
    { id: 0, text: 'What did you do today?' },
    { id: 1, text: 'What are you thinking about?' },
    { id: 2, text: 'What are your dreams for the future?' },
    // Add more questions here as needed
];

// Helper function to get question text by ID
export function getQuestionText(questionId: number): string {
    const question = questions.find((q) => q.id === questionId);
    return question ? question.text : 'Unknown question';
}


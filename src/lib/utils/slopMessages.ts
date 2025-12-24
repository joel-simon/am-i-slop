export interface SlopMessage {
    emoji: string;
    title: string;
    subtitle: string;
}

export function getSlopMessage(slopPct: number): SlopMessage {
    if (slopPct >= 95) {
        return {
            emoji: '🤖',
            title: 'MAXIMUM SLOP DETECTED',
            subtitle: 'You are the algorithm. The algorithm is you.',
        };
    } else if (slopPct >= 85) {
        return {
            emoji: '📋',
            title: 'Corporate Email Energy',
            subtitle: 'Per my last message, please advise.',
        };
    } else if (slopPct >= 75) {
        return {
            emoji: '🥱',
            title: 'Aggressively Normal',
            subtitle: 'Your thoughts have been focus-grouped.',
        };
    } else if (slopPct >= 60) {
        return {
            emoji: '😐',
            title: 'Statistically Average',
            subtitle: 'The model saw you coming.',
        };
    } else if (slopPct >= 45) {
        return {
            emoji: '🤔',
            title: 'Slightly Unpredictable',
            subtitle: 'A flicker of originality detected.',
        };
    } else if (slopPct >= 30) {
        return {
            emoji: '✨',
            title: 'Interestingly Weird',
            subtitle: 'The model is mildly confused by you.',
        };
    } else if (slopPct >= 15) {
        return {
            emoji: '🌀',
            title: 'Delightfully Chaotic',
            subtitle: 'You broke the prediction engine.',
        };
    } else if (slopPct >= 5) {
        return {
            emoji: '👽',
            title: 'Off The Distribution',
            subtitle: 'Are you even speaking English?',
        };
    } else {
        return {
            emoji: '🦄',
            title: 'SINGULARITY ACHIEVED',
            subtitle: 'GPT-2 has never seen anything like you.',
        };
    }
}

export function getSlopEmoji(slopPct: number): string {
    return getSlopMessage(slopPct).emoji;
}

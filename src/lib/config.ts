// Site configuration and shared meta content
export const SITE_CONFIG = {
    name: 'Are you Slop??',
    url: 'https://amislop.com',
    description:
        "Are you Slop? Analyze your 'slop score' - a measure of how generic or unique your text appears to language models.",
    image: 'https://amislop.com/imgs/favicon.png',
} as const;

export const META_TAGS = {
    home: {
        title: 'Are you Slop??',
        description: SITE_CONFIG.description,
    },
} as const;

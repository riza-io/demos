export const PROMPTS = {
    "git-commit": {
        name: "git-commit",
        description: "Generate a Git commit message",
        arguments: [
            {
                name: "changes",
                description: "Git diff or description of changes",
                required: true,
            },
        ],
    },
    "explain-code": {
        name: "explain-code",
        description: "Explain how code works",
        arguments: [
            {
                name: "code",
                description: "Code to explain",
                required: true,
            },
            {
                name: "language",
                description: "Programming language",
                required: false,
            },
        ],
    },
};
export const PROMPT_MESSAGES = {
    "git-commit": (request) => {
        const language = request.params.arguments?.language || "Unknown";
        return [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Explain how this ${language} code works:\n\n${request.params.arguments?.code}`,
                },
            },
        ];
    },
};

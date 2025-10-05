export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'build',
                'chore',
                'ci',
                'docs',
                'feat',
                'fix',
                'perf',
                'enhancement',
                'refactor',
                'revert',
                'style',
                'test',
            ],
        ],
    },
};

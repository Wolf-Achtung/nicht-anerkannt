const globals = require('globals');

module.exports = [
  {
    files: ['assets/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        AtelierScore: 'readonly',
        AtelierChat: 'readonly',
        AtelierRemixer: 'readonly',
        AtelierStempel: 'readonly',
        AtelierTicker: 'readonly',
        AtelierQuiz: 'readonly',
        AtelierRoadmap: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      eqeqeq: ['error', 'always'],
      'no-var': 'off',
      'prefer-const': 'off',
      semi: ['warn', 'always'],
      'no-console': 'off'
    }
  },
  {
    files: ['server.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      eqeqeq: ['error', 'always'],
      'no-var': 'off',
      'prefer-const': 'off',
      semi: ['warn', 'always'],
      'no-console': 'off'
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      eqeqeq: ['error', 'always'],
      'no-var': 'off',
      'prefer-const': 'off',
      semi: ['warn', 'always'],
      'no-console': 'off'
    }
  }
];

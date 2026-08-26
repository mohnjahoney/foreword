# Foreword

Foreword is a tactile word-path puzzle built from four Wordle-evaluated rows
and one shared pool of shuffled letters.

## Development

```sh
npm install
npm run dev
```

Checks:

```sh
npm test
npm run typecheck
npm run build
```

The repository includes a GitHub Actions workflow for deploying the Vite
build to GitHub Pages. Its Vite base path is configured for the repository
name `foreword`.

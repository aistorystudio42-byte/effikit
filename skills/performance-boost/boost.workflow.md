<!-- @keywords: workflow, developer tools, shortcuts, automation, IDE, efficiency, tooling -->

# .devcontainer/devcontainer.json — reproducible environment

## Core Philosophy

## When to Activate

> This skill should be activated when you need to resolve issues related to workflow.

## Principles

### The Compound Effect of Tooling
A developer who spends 10 minutes setting up a script that saves 30 seconds per day will break even in 20 days. In a year, they've saved 2.5 hours. Applied to 10 such automations: 25 hours saved per year from small investments.

The opposite: a developer who never invests in tooling loses those same hours — invisibly, in small increments that never feel worth addressing.

---

### Git Workflow Optimization
```bash
[alias]
  s = status -s
  d = diff
  ds = diff --staged

  l = log --oneline --graph --decorate -20
  la = log --oneline --graph --decorate --all -20

  aa = add -A
  cm = commit -m
  amend = commit --amend --no-edit

  b = branch -vv
  bd = branch -d
  co = checkout
  cob = checkout -b

  undo = reset HEAD~1 --soft    # undo last commit, keep changes staged
  unstage = reset HEAD --       # unstage a file

  pushf = push --force-with-lease  # safer force push
  pom = pull origin main

[core]
  autocrlf = input   # normalize line endings
  editor = code --wait  # VS Code as git editor

[push]
  default = current  # git push = push current branch to same name
```

---

### Shell Productivity
```bash

alias ..='cd ..'
alias ...='cd ../..'
alias ~='cd ~'

alias ni='npm install'
alias nid='npm install --save-dev'
alias nr='npm run'
alias nrd='npm run dev'
alias nrt='npm run test'

alias gs='git status'
alias gl='git l'  # uses alias defined above
alias gaa='git add -A'
alias gcm='git commit -m'
alias gco='git checkout'
alias gb='git branch'
alias gp='git push origin HEAD:main'

alias dc='docker-compose'
alias dcu='docker-compose up -d'
alias dcd='docker-compose down'
alias dcl='docker-compose logs -f'

eval "$(zoxide init zsh)"

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
```

---

### Automation Scripts
```typescript
// scripts/new-feature.ts — scaffold a new feature module
// Usage: ts-node scripts/new-feature.ts user-notifications

const featureName = process.argv[2];
if (!featureName) {
  console.error('Usage: ts-node new-feature.ts <feature-name>');
  process.exit(1);
}

const kebab = featureName.toLowerCase().replace(/\s+/g, '-');
const pascal = kebab.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');

const files = [
  [`src/modules/${kebab}/${kebab}.controller.ts`, controllerTemplate(pascal, kebab)],
  [`src/modules/${kebab}/${kebab}.service.ts`, serviceTemplate(pascal)],
  [`src/modules/${kebab}/${kebab}.repository.ts`, repositoryTemplate(pascal)],
  [`src/modules/${kebab}/${kebab}.dto.ts`, dtoTemplate(pascal)],
  [`src/modules/${kebab}/${kebab}.module.ts`, moduleTemplate(pascal)],
  [`src/modules/${kebab}/__tests__/${kebab}.service.test.ts`, testTemplate(pascal)],
];

files.forEach(([path, content]) => {
  fs.mkdirSync(dirname(path), { recursive: true });
  fs.writeFileSync(path, content);
  console.log(`Created ${path}`);
});

console.log(`\n✓ Feature '${pascal}' scaffolded. Don't forget to register in app.module.ts`);
```

---

## Decision Framework

- Evaluate the complexity of the task.
- Identify structural bottlenecks.
- Choose the simplest abstraction that solves the problem.

## Anti-Patterns

- Over-engineering the solution.
- Ignoring context and copying blindly.
- Mixing concerns unnecessarily.

## Example in Action

```json
// settings.json — high-impact settings
{
  // Auto-save: never wait for Ctrl+S
  "files.autoSave": "onFocusChange",

  // Format on save: consistent code without thinking
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // TypeScript: import organizer
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit",
    "source.fixAll.eslint": "explicit"
  },

  // Terminal: integrated for context
  "terminal.integrated.defaultProfile.windows": "PowerShell",

  // Editor: navigation helpers
  "editor.minimap.enabled": false,        // reclaim horizontal space
  "breadcrumbs.enabled": true,            // show file location
  "editor.stickyScroll.enabled": true,    // see current function while scrolling

  // Search: include/exclude
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  }
}
```

```json
// keybindings.json — muscle memory shortcuts
[
  // Quick test run: Ctrl+Shift+T
  { "key": "ctrl+shift+t", "command": "workbench.action.tasks.runTask", "args": "test" },

  // Toggle terminal: Ctrl+`
  { "key": "ctrl+`", "command": "workbench.action.terminal.toggleTerminal" },

  // Go to definition: F12 (already default, but worth knowing)
  // Find all references: Shift+F12
  // Rename symbol: F2
  // Quick fix: Ctrl+.
]
```

---

```yaml
{
  "name": "MyApp Dev",
  "image": "node:20-alpine",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "20" },
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "postCreateCommand": "npm install",
  "customizations": {
    "vscode": {
      "extensions": [
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "prisma.prisma"
      ],
      "settings": {
        "editor.formatOnSave": true
      }
    }
  },
  "forwardPorts": [3000, 5432, 6379],
  "mounts": ["source=${localWorkspaceFolder},target=/workspace,type=bind"]
}
```

---

- [ ] VS Code auto-save, format-on-save, and organize-imports-on-save configured
- [ ] Git aliases set for frequent commands (status, log, add, commit)
- [ ] Shell aliases for npm, docker-compose, navigation
- [ ] Pre-commit hooks installed (lint, typecheck, unit tests)
- [ ] Feature scaffolding script created (save 20 minutes per new module)
- [ ] Dev environment defined as code (.devcontainer or docker-compose)
- [ ] Feedback loop measured: edit to test result in < 5 seconds
- [ ] Weekly 30-minute time investment in tooling improvements

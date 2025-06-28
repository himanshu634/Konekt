# GitHub Instructions for Konekt

## 🚀 Project Overview

Konekt is a WebRTC-based video chat application that connects strangers for video calls with integrated multiplayer games like chess. Built with Next.js frontend and Node.js backend using a Turborepo monorepo structure.

## 📁 Repository Structure

```
konekt/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── backend/      # Node.js Socket.IO server
├── packages/         # Shared packages and utilities
└── turbo.json       # Turborepo configuration
```

## 🛠️ Development Setup

### Prerequisites

- [Bun](https://bun.sh/) (>= 1.0)
- Node.js >= 18
- Modern browser (Chrome/Firefox recommended)

### Installation

```bash
git clone <repository-url>
cd konekt
bun install
bun run dev
```

## 📝 Code Conventions

### General Guidelines

- Use TypeScript for all new code
- Follow existing code patterns and naming conventions
- Maintain consistent indentation (2 spaces)
- Use meaningful variable and function names
- Write self-documenting code

### Frontend (Next.js)

- Use React functional components with hooks
- Follow Next.js App Router conventions
- Place components in `components/` directory
- Use Tailwind CSS for styling with shadcn/ui components
- Implement proper TypeScript interfaces for props
- Use custom hooks for complex state logic

### Backend (Node.js)

- Use ES modules (`type: "module"`)
- Implement proper error handling
- Use TypeScript interfaces for data structures
- Follow RESTful API conventions where applicable
- Use Socket.IO event names defined in `event-names.ts`

### File Naming

- Use kebab-case for directories and files
- Use PascalCase for React components
- Use camelCase for functions and variables
- Use SCREAMING_SNAKE_CASE for constants

### Import Organization

```typescript
// External libraries first
import React from "react";
import { Socket } from "socket.io";

// Internal imports
import { Button } from "@/components/ui/button";
import { socketEvents } from "@/socket/events";

// Relative imports last
import "./styles.css";
```

## 🧪 Testing & Quality

### Commands

```bash
# Type checking
bun run check-types

# Linting (with zero warnings policy)
bun run lint

# Format code
bun run format

# Build project
bun run build
```

### Pre-commit Requirements

- All TypeScript must compile without errors
- ESLint must pass with zero warnings (`--max-warnings 0`)
- Code must be properly formatted with Prettier

## 🚫 Things to Avoid

### Security

- ❌ Never commit secrets, API keys, or sensitive data
- ❌ Don't log sensitive user information
- ❌ Avoid exposing internal server details to client
- ❌ Don't implement authentication without proper security measures

### Code Quality

- ❌ No `console.log` statements in production code
- ❌ Avoid `any` type in TypeScript
- ❌ Don't use deprecated React patterns (class components, lifecycle methods)
- ❌ No hardcoded URLs or configuration values
- ❌ Avoid direct DOM manipulation in React components

### Performance

- ❌ Don't create unnecessary re-renders
- ❌ Avoid large bundle sizes (check with build analyzer)
- ❌ Don't forget to cleanup WebRTC connections
- ❌ Avoid memory leaks in Socket.IO event listeners

### Project Structure

- ❌ Don't modify package.json without discussion
- ❌ Avoid creating new top-level directories
- ❌ Don't bypass Turborepo task dependencies
- ❌ Avoid mixing frontend and backend code

### Git Practices

- ❌ No commits directly to main branch
- ❌ Don't push broken builds or failing tests
- ❌ Avoid large binary files in Git
- ❌ Don't force push to shared branches

## 🔄 Development Workflow

### Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Messages

```
feat: add chess game synchronization
fix: resolve WebRTC connection timeout
refactor: improve peer connection manager
docs: update setup instructions
```

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes following conventions
3. Run all quality checks locally
4. Create PR with descriptive title and summary
5. Address review feedback
6. Squash merge when approved

## 📦 Dependencies

### Adding New Dependencies

- Prefer established, well-maintained packages
- Check bundle size impact
- Update package.json in appropriate workspace
- Document new dependencies in PR

### Workspace Dependencies

- Use `@konekt/*` packages for shared code
- Keep external dependencies minimal
- Use workspace protocol for internal packages

## 🎯 Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO, TypeScript
- **Real-time**: WebRTC for video, Socket.IO for games
- **Build**: Bun, Turborepo
- **UI**: shadcn/ui components
- **Games**: Chess.js, React Chessboard

## 📞 WebRTC Guidelines

- Always handle connection failures gracefully
- Implement proper cleanup for peer connections
- Use STUN/TURN servers for NAT traversal
- Handle browser permission prompts appropriately
- Test across different browsers and network conditions
- Only use socket.io for signaling, not for media transport

## 🎮 Game Integration

- Keep game state synchronized via DataChannel of WebRTC
- Implement proper turn validation
- Handle disconnections during games
- Use established game libraries (chess.js)
- Maintain game history for replay functionality

---

For questions or clarifications, please create an issue or reach out to the maintainers.

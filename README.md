# 🤖 Custom AI Agent

A free, local AI-powered code assistant built with TypeScript and Ollama.

## Features

- 🐛 **Debug Mode** - Analyze errors and find root causes
- 📚 **Concept Mode** - Explain codebase architecture
- ✨ **Feature Mode** - Plan new feature implementations
- 💬 **Chat Mode** - Interactive AI conversation
- 📝 **IDE Editor** - VS Code-like web interface
- 🔍 **Project Scanner** - Analyze entire projects for issues
- 🧠 **Smart Domains** - Auto-detects WebGPU, WebGL, React, Vue, Angular

## Tech Stack

- TypeScript
- Ollama (local LLM)
- Express.js
- DeepSeek Coder 6.7B

## Installation

```bash
# Clone
git clone https://github.com/Suryaraj2211/Custom_AI_Agent.git
cd Custom_AI_Agent

# Install
npm install

# Start Ollama (in separate terminal)
ollama serve
ollama pull deepseek-coder:6.7b
```

## Usage

### Web UI (Recommended)
```bash
npm run web
# Open http://localhost:3000/ide.html
```

### CLI Modes
```bash
# Debug mode
npx ts-node src/index.ts --mode debug --error "your error"

# Concept mode  
npx ts-node src/index.ts --mode concept --path ./project

# Feature mode
npx ts-node src/index.ts --mode feature --request "Add feature"

# Chat mode
npx ts-node src/index.ts --mode chat
```

### Project Scanner
```bash
npx ts-node src/analyze-project.ts --path ./project
```

## Domain Knowledge

AI automatically adapts to:
| Domain | Extensions |
|--------|-----------|
| WebGPU | `.wgsl` |
| WebGL | `.glsl`, `.vert`, `.frag` |
| React | `.tsx`, `.jsx` |
| Vue | `.vue` |
| Angular | `.component.ts` |

## Project Structure

```
src/
├── llm/           # Ollama integration
├── agent/         # Core agent logic
├── modes/         # Debug, Concept, Feature, Chat
├── knowledge/     # Domain expertise & detection
├── web/           # Express server
└── public/        # Web UI
```

## License

MIT

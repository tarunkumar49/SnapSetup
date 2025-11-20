# SnapSetup

A powerful desktop application built with Electron, React, and Node.js that automates codebase setup for multiple programming languages with AI-powered assistance.

## Supported Languages

- **Node.js** (npm)
- **Python** (pip, pipenv, poetry)
- **Java** (Maven, Gradle)
- **Go** (go modules)
- **Rust** (Cargo)
- **PHP** (Composer)
- **Ruby** (Bundler)
- **Elixir** (Mix)

## Features

### 🚀 Automated Setup
- **Project Analysis**: Automatically detects project type (React, Next.js, Express, etc.)
- **Fullstack Support**: One-click setup for fullstack apps (backend + frontend + database)
- **Dependency Installation**: Sequential installation with progress tracking and per-package status
- **Real-time Terminal**: VS Code-style terminal with streaming output
- **Auto-retry Logic**: Automatically retries failed installations with exponential backoff
- **Smart Sequencing**: Starts database → backend → frontend in the correct order

### 🤖 AI Agent
- **Rule-Based Intelligence**: Instant responses for common queries
- **Conversational Interface**: Chat naturally about your setup
- **Action Panel**: Quick access to common actions and setup status
- **Smart Detection**: Detects missing requirements (runtimes, package managers, .env files)
- **Error Diagnosis**: Automatically identifies and suggests fixes for common errors
- **Guided Setup**: Step-by-step guidance through the setup process
- **100% Free**: No API keys required - works completely offline

### 🔧 System Checks
- Node.js and npm version detection
- Docker and Docker Compose availability
- Environment file handling (.env generation from .env.example)
- Port conflict detection

### 📁 File Management
- **Project Explorer**: Browse uploaded project files
- **File Watcher**: Automatically detects external file changes
- **Quick Actions**: Open project in VS Code, Cursor, or file explorer

### 🐳 Docker Support
- Detect existing docker-compose.yml
- Auto-generate docker-compose.yml for fullstack projects
- Automatic database container startup
- Run containers with streaming logs
- Support for MongoDB, PostgreSQL, MySQL
- Backend and frontend service configuration

### 📊 Database & Logs
- **Logs Viewer**: Complete setup logs with timestamps and types
- **Database Viewer**: Connect and view database contents
- **Export Options**: Export logs as JSON, CSV, or text

### 🎨 VS Code-like UI
- Dark theme optimized for developers
- Resizable panels
- Collapsible sections
- Toast notifications
- Status bar with project info

## Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
npm run build:electron
```

## Usage

### 1. Upload Project
- Click "Upload Project" in the header
- Select your JavaScript project folder
- The app will analyze the project and display detected information

### 2. Review Analysis
The sidebar shows:
- Project type (frontend, backend, fullstack)
- Technology stack
- Detected ports
- Docker Compose availability
- Environment file status

### 3. Start Auto Setup
- Click "Start Auto Setup" in the AI Agent panel
- The app will:
  - Check Node.js and npm
  - Check/create .env file
  - Install dependencies with progress tracking
  - Start development servers

### 4. Monitor Progress
- **Terminal Panel**: See real-time command output
- **AI Agent Panel**: View progress percentage and per-package status
- **Footer**: Check server URLs and system status

### 5. Docker Compose (Optional)
- If docker-compose.yml doesn't exist, click "Generate docker-compose.yml"
- Review the generated file
- Approve and save
- The app will run `docker-compose up` automatically

## Architecture

### Electron Main Process (`electron/main.js`)
- File system operations
- Process spawning and management
- File watching with chokidar
- IPC communication

### React Renderer (`src/`)
- **App.jsx**: Main application component
- **ProjectContext.jsx**: Global state management
- **Components**:
  - Header: Navigation and actions
  - Sidebar: Project explorer and info
  - Terminal: Real-time command output
  - AIAgent: Conversational AI and actions
  - DatabaseViewer: Logs and database viewer
  - Footer: Status bar
  - Toast: Notifications

### Setup Manager (`src/utils/SetupManager.js`)
- System checks
- Dependency installation
- Docker Compose generation
- Environment file handling
- Retry logic

## Security

- **No Automatic Secrets Upload**: .env files are never uploaded externally
- **Local Execution**: All commands run locally on your machine
- **Placeholder Generation**: Auto-generated .env files use placeholders
- **User Confirmation**: Docker Compose generation requires approval

### Google AI Studio / Generative API (safe integration)

This project includes a small local proxy you can run to safely call Google AI Studio or other Google Generative APIs without embedding your API key in the renderer (frontend).

Quick steps:

1. Create a local `.env` (copy from `.env.example`) and set `GOOGLE_AI_API_KEY` and `GOOGLE_AI_ENDPOINT`.
2. Install dependencies: `npm install` (this will install `express` and `dotenv` used by the proxy).
3. Start the proxy: `npm run start-proxy` (or `node src/googleAIProxy.js`). The proxy listens on port 3000 by default.
4. In development, the renderer (`AIAgent`) sends requests to `http://localhost:3000/ai` which the proxy forwards to the configured endpoint.

Security notes:
- Never paste or commit your API key into the code or any public place. If you accidentally shared a key, rotate/revoke it immediately in Google Cloud Console.
- The proxy reads the key from environment variables only. Keep the `.env` file local and out of source control.
- If you prefer a different deployment model, run the proxy on a secure server and protect it with authentication.


## Requirements

### For Running SnapSetup
- **Node.js**: v16 or higher (to run the app itself)
- **npm**: v8 or higher
- **Operating System**: Windows, macOS, or Linux

### For Project Setup (Auto-detected)
The app will detect your project language and prompt you to install:
- **Node.js** - https://nodejs.org/
- **Python** - https://www.python.org/downloads/
- **Java JDK** - https://www.oracle.com/java/technologies/downloads/
- **Go** - https://go.dev/dl/
- **Rust** - https://www.rust-lang.org/tools/install
- **PHP** - https://www.php.net/downloads
- **Ruby** - https://www.ruby-lang.org/en/downloads/
- **Elixir** - https://elixir-lang.org/install.html
- **Maven** - https://maven.apache.org/download.cgi
- **Gradle** - https://gradle.org/install/
- **Composer** - https://getcomposer.org/download/
- **Bundler** - https://bundler.io/

### Optional
- **Docker Desktop** (for Docker Compose features)

## Development

### Project Structure
```
ai-codebase-setup/
├── electron/           # Electron main process
│   ├── main.js        # Main process entry
│   └── preload.js     # Preload script
├── src/               # React renderer
│   ├── components/    # UI components
│   ├── context/       # State management
│   ├── utils/         # Utilities
│   ├── App.jsx        # Root component
│   └── main.jsx       # Entry point
├── package.json       # Dependencies
├── vite.config.js     # Vite configuration
└── index.html         # HTML template
```

### Adding New Features

1. **New UI Component**: Add to `src/components/`
2. **New Utility**: Add to `src/utils/`
3. **IPC Handler**: Add to `electron/main.js` and `electron/preload.js`
4. **State Management**: Update `src/context/ProjectContext.jsx`

## Troubleshooting

### Node.js Not Detected
- Install Node.js from https://nodejs.org/
- Restart the application
- Click "Start Auto Setup" again

### Docker Not Available
- Install Docker Desktop
- Ensure Docker is running
- Restart the application

### Port Conflicts
- Check the terminal for EADDRINUSE errors
- Kill processes using the conflicting ports
- Try again

### Installation Failures
- Check your internet connection
- Review terminal logs for specific errors
- Click "Retry Failed" to retry failed packages
- Some packages (like bcrypt) may require build tools

## AI Agent

The hybrid AI agent combines rule-based intelligence with optional local LLM:

### Rule-Based (Always Active)
- Instant responses for common queries
- Pattern matching for intent detection
- Error diagnosis and fixes
- No setup required

### Local LLM (Optional)
- Install Ollama for advanced AI
- Natural language understanding
- Complex query handling
- Completely free and private

See [AI_AGENT_GUIDE.md](AI_AGENT_GUIDE.md) for detailed usage.

## Future Enhancements

- [x] Hybrid AI agent with local LLM support
- [ ] Database schema visualization
- [ ] Git integration
- [ ] Code generation capabilities
- [ ] Multi-project support
- [ ] Custom setup templates
- [ ] Plugin system

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

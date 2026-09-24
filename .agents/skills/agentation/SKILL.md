---
name: agentation
description: Visual feedback and UI annotation integration with Agentation and agentation-mcp. Use when fetching, inspecting, replying to, resolving, or acting on visual UI feedback, annotations, or toolbar comments.
risk: safe
source: user
---

# Agentation & Agentation MCP Skill

Agentation connects browser-based visual feedback directly to AI coding agents via the Model Context Protocol (MCP). It eliminates manual copy-pasting of UI bugs, styling tweaks, and layout feedback by providing exact CSS selectors, React component context, element text, bounding boxes, and developer notes.

---

## 1. Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Web App)                        │
│  <Agentation /> Floating Toolbar in React/Next.js/Vite App  │
│  User clicks elements -> Leaves visual feedback notes       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / WebSocket (port 4747)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Agentation MCP Server (daemon)                 │
│         `agentation-mcp` or `npx agentation-mcp server`     │
└──────────────────────────────┬──────────────────────────────┘
                               │ stdio / MCP Protocol
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       AI Coding Agent                       │
│    Queries annotations, inspects selectors, fixes code,     │
│    and resolves feedback items via MCP tools                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Installation & Setup

### A. Install Packages in Your Project
```bash
npm install agentation --save-dev
npm install agentation-mcp --save-dev
```

### B. Add `<Agentation />` to Your React App
Mount the component near your root component (e.g. `src/App.tsx`, `src/main.tsx`, or `app/layout.tsx`):

```tsx
import React from 'react';
import { Agentation } from 'agentation';

export function App() {
  return (
    <>
      <YourAppContent />
      {/* Enable Agentation in development */}
      {process.env.NODE_ENV === 'development' && <Agentation />}
    </>
  );
}
```

### C. Configure MCP Server

#### Option 1: Using MCP configuration file (`mcp_config.json` or IDE MCP settings)
```json
{
  "mcpServers": {
    "agentation": {
      "command": "npx",
      "args": ["-y", "agentation-mcp", "server"]
    }
  }
}
```

#### Option 2: Using the CLI helper
```bash
npx add-mcp "npx -y agentation-mcp server"
```
Or for Claude Code:
```bash
npx agentation-mcp init
```

### D. Verify Installation
Run the doctor diagnostic command:
```bash
npx agentation-mcp doctor
```

---

## 3. MCP Tools Reference

When `agentation-mcp` is registered, the following tools are available:

### Querying Annotations
* **`agentation_get_all_pending`**: Retrieves all unresolved UI annotations across all active sessions. Returns CSS selectors, target text, component names, notes, and coordinates.
* **`agentation_get_pending`**: Retrieves pending annotations for a specified session ID.
* **`agentation_list_sessions`**: Lists all active annotation browser sessions.
* **`agentation_get_session`**: Gets full history and context for a specific session.

### Acting on Annotations
* **`agentation_acknowledge`**: Acknowledges an annotation to inform the user the agent is actively working on it.
* **`agentation_resolve`**: Marks the annotation as resolved once the code fix has been applied.
* **`agentation_reply`**: Posts a comment or question back into the browser toolbar thread for clarification.
* **`agentation_dismiss`**: Dismisses an annotation with an explanation (e.g. if deemed out of scope or invalid).
* **`agentation_watch_annotations`**: Blocks and waits until a user submits a new annotation in their browser.

---

## 4. Agent Resolution Workflow

When tasked with addressing visual feedback via Agentation:

1. **Fetch Pending Feedback**:
   Call `agentation_get_all_pending` to see all current annotations.

2. **Locate Target Elements**:
   Use the CSS selector, element text, or component name provided in the annotation to search the codebase (`grep_search` or IDE search).

3. **Acknowledge (Optional)**:
   Call `agentation_acknowledge` with the `annotationId` to show progress.

4. **Implement the Change**:
   Apply styling, structural, or behavioral changes to resolve the feedback.

5. **Mark Resolved**:
   Call `agentation_resolve` with the `annotationId` and a short description of what was changed.

---

## 5. Troubleshooting & Tips

* **Toolbar not visible?** Check that `<Agentation />` is rendered and that the app is running in development mode.
* **Connection issues?** Verify that the MCP server has access to localhost port `4747`. Run `npx agentation-mcp doctor` to test connectivity.
* **Animation states:** Use Agentation's built-in freeze tool (pause button in the toolbar) to freeze CSS/JS animations and inspect transient UI states accurately.

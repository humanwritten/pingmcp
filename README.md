# PingMCP - Audio Notifications for Claude

**Never miss when Claude finishes a task again!** 🔔

When Claude runs long operations or complex tasks, you might switch away from the terminal and miss when it's done. PingMCP solves this by playing a customizable notification sound whenever Claude completes any request.

Perfect for developers who want that satisfying "ping" when their code analysis, file operations, or multi-step tasks complete.

## Quick Start

1. **Install:**
   ```bash
   cd pingmcp
   npm install
   ```

2. **Configure Claude:**
   
   **For Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "pingmcp": {
         "command": "node",
         "args": ["/path/to/pingmcp/server.js"]
       }
     }
   }
   ```

   **For Claude Code** (create `.clauderc` in your project):
   ```json
   {
     "mcpServers": {
       "pingmcp": {
         "command": "node",
         "args": ["/path/to/pingmcp/server.js"]
       }
     }
   }
   ```

3. **Auto-Enable Notifications:**
   
   Add this to your global `~/.claude/CLAUDE.md`:
   ```markdown
   # Notifications
   After completing any user request or task, use the 'notify' tool from the pingmcp server to alert the user that the response is complete.
   ```
   
   Or add to project-specific `CLAUDE.md`:
   ```markdown
   # Notifications  
   After completing development tasks, use the 'notify' tool to alert the user.
   ```

4. **Restart Claude** (Desktop or Code)

That's it! Claude will now ping you after every completed task.

## Customization

**Priority system:**
1. `custom/default.mp3` (your personal override)
2. `notification.mp3` (built-in sound)  
3. Any `.mp3`/`.wav`/`.m4a` file in main folder
4. System beep (universal fallback)

**Supported formats:** MP3 (recommended - smallest), WAV, M4A  
**Tip:** Keep sounds short (1-3 seconds) for best experience

**Free sounds:** Download from [Mixkit](https://mixkit.co/free-sound-effects/notification/) (copyright-free)

## Advanced Setup

### Project-Specific Notifications
Create a `.clauderc` in your project root for project-only notifications:
```json
{
  "mcpServers": {
    "pingmcp": {
      "command": "node", 
      "args": ["/path/to/pingmcp/server.js"]
    }
  }
}
```

### Custom CLAUDE.md Integration
For automatic notifications, Claude reads your `CLAUDE.md` file on startup. Add the notification instruction there so Claude knows to use PingMCP without being asked.

**Global setup** (`~/.claude/CLAUDE.md`):
```markdown
# Development Notifications
When completing code analysis, file operations, testing, or multi-step development tasks, use the 'notify' tool to alert the user.
```

**Project setup** (`./CLAUDE.md`):
```markdown  
# Project Notifications
After completing tasks in this project, use the 'notify' tool to alert the user that work is ready for review.
```

### Testing

```bash
# Test your sound
afplay notification.mp3           # macOS
afplay custom/default.mp3         # Custom sound

# Test the MCP server
node server.js
# Input: {"jsonrpc":"2.0","method":"tools/call","params":{"name":"notify"},"id":1}
```

## How It Works

1. **Smart file detection**: Finds your preferred sound automatically
2. **Cross-platform audio**: Uses `afplay` (macOS), `paplay` (Linux), `powershell` (Windows)
3. **Graceful fallbacks**: Always works, even without sound files
4. **Zero configuration**: Works out of the box with included sound

## MCP Registry

Add PingMCP through MCP registries:

- **mcp-get.com**: `npx @mcp-get/registry add pingmcp`
- **MCP.Bar**: Browse at [mcp.bar](https://mcp.bar)  
- **Official MCP Registry**: Coming soon

Or install manually with: `npx pingmcp`

## Specifications

- **Server:** 72 lines of clean JavaScript
- **Dependencies:** Only MCP SDK (required)
- **Sound:** 56KB MP3 notification (3.5 seconds)
- **Platforms:** macOS, Linux, Windows
- **License:** MIT

**Files:** `server.js`, `package.json`, `notification.mp3`, `custom/` (gitignored)

---

## Star History

<a href="https://star-history.com/#humanwritten/pingmcp&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=humanwritten/pingmcp&type=Date&theme=dark" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=humanwritten/pingmcp&type=Date" />
 </picture>
</a>

---

*Built for developers who miss terminal feedback when Claude's working hard in the background.* ⚡
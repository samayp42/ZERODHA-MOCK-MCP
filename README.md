
# Zerodha Mock MCP (v2)

A standard-compliant MCP server for Zerodha mock trading, deployed on Vercel.

## 🚀 Live URL
**`https://zerodha-mock-v2.vercel.app/mcp`**

Add this URL to **Intel AI SuperBuilder** -> MCP Servers.

## Features
- **Strict MCP Compliance** (JSON-RPC 2.0)
- **Persistent Sessions** (via `init` tool or `x-session-id` header)
- **In-Memory Storage** (Resets on redeploy)
- **Tools**: `init`, `get-portfolio`, `get-holdings`, `get-orders`, `place-order`, `get-quote`

## 🛠 Deployment
This project is connected to GitHub for continuous deployment.

**Source Code**: [https://github.com/samayp42/ZERODHA-MOCK-MCP](https://github.com/samayp42/ZERODHA-MOCK-MCP)

To update the live server:
1.  Make changes locally.
2.  Push to GitHub:
    ```bash
    git add .
    git commit -m "Update message"
    git push
    ```
3.  Vercel will automatically deploy the changes!

Alternatively, for manual deployment:
```bash
deploy.bat
```

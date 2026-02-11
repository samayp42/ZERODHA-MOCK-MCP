# Zerodha Mock MCP

A super simple Vercel deployment for a mock Zerodha MCP server using in-memory storage.

## Features

- **Each user gets unique session** automatically
- **In-memory storage** - no database needed
- **Auto-resets** - fresh data on cold starts
- **5 tools**: init, portfolio, holdings, orders, place-order, quotes
- **Mock data** - TCS, Reliance, Infosys preloaded

## Deploy in 2 Minutes

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Deploy to Vercel

```bash
vercel
```

Follow the prompts:
- Link to existing project? **NO**
- Project name? **zerodha-mock-mcp**
- Directory? **./**
- Override settings? **NO**

Then to deploy to production:

```bash
vercel --prod
```

## Connect to Intel AI SuperBuilder

In SuperBuilder Settings -> MCP Servers:

```json
{
  "mcpServers": {
    "zerodha-mock": {
      "url": "https://zerodha-mock-mcp.vercel.app/mcp",
      "type": "http"
    }
  }
}
```

## Test Locally

```bash
vercel dev
```

Test at `http://localhost:3000/mcp`

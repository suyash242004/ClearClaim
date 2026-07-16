import os
import httpx

# 127.0.0.1 (not "localhost") so the gateway sees a loopback client and skips
# the x402 payment gate for internal agent-to-agent calls; the port must match
# whatever this process actually serves on (Render binds $PORT, not 8000).
MCP_SERVER_URL = f"http://127.0.0.1:{os.getenv('PORT', '8000')}"

async def get_mcp_tools():
    """Fetches available tools from the local MCP router."""
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{MCP_SERVER_URL}/mcp/tools")
        res.raise_for_status()
        return res.json().get("tools", [])

async def invoke_mcp_tool(tool_name: str, params: dict):
    """
    Invokes an MCP tool via the A2MCP standard pipeline.
    This replaces hardcoded internal REST calls with standard tool invocations.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        payload = {
            "tool": tool_name,
            "params": params
        }
        res = await client.post(f"{MCP_SERVER_URL}/mcp/invoke", json=payload)
        res.raise_for_status()
        data = res.json()
        return data.get("result")

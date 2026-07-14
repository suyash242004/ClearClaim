import httpx

MCP_SERVER_URL = "http://localhost:8000"

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

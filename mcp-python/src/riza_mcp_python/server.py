import os
import json
import logging
from datetime import datetime, timedelta
from collections.abc import Sequence
from functools import lru_cache
from typing import Any
from rizaio import AsyncRiza
import httpx
import asyncio
from dotenv import load_dotenv
from mcp.server import Server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
    LoggingLevel
)
from pydantic import AnyUrl
from mcp.server.sse import SseServerTransport


# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("weather-server")

# API configuration
API_KEY = os.getenv("OPENWEATHER_API_KEY")
if not API_KEY:
    raise ValueError("OPENWEATHER_API_KEY environment variable required")

API_BASE_URL = "http://api.openweathermap.org/data/2.5"
DEFAULT_CITY = "London"
CURRENT_WEATHER_ENDPOINT = "weather"
FORECAST_ENDPOINT = "forecast"

# The rest of our server implementation will go here

client = AsyncRiza(
    # This is the default and can be omitted
    api_key=os.environ.get("RIZA_API_KEY"),
)

tools = []


async def create_tool(code: str, name: str, description: str, input_schema: dict):
    tool = await client.tools.create(
        code=code,
        name=name,
        description=description,
        input_schema=input_schema,
    )
    tools.append(tool)
    return tool

app = Server("riza-py-server")


@app.list_tools()
async def list_tools() -> list[Tool]:
    return map(lambda tool: Tool(name=tool.name, description=tool.description, input_schema=tool.input_schema), tools)


@app.call_tool()

#!/usr/bin/env python3
"""
Tableau MCP Server for Nordstrom Tableau Server
Connects to tableau.nordstrom.com via REST API with Okta SSO/PAT authentication
"""

import os
import sys
import json
import asyncio
import logging
import aiohttp
import xml.etree.ElementTree as ET
from urllib.parse import urljoin
from dotenv import load_dotenv
from mcp.server import Server
from mcp.types import (
    Resource, Tool, TextContent, ImageContent, EmbeddedResource,
    LoggingLevel, CallToolResult, ListResourcesResult, ListToolsResult,
    ReadResourceResult
)
import mcp.server.stdio

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TableauServerMCP:
    def __init__(self):
        self.server_url = os.getenv('TABLEAU_SERVER_URL', 'https://tableau.nordstrom.com')
        self.site_id = os.getenv('TABLEAU_SITE_ID', 'technology-support-services')
        self.token_name = os.getenv('TABLEAU_TOKEN_NAME')
        self.token_value = os.getenv('TABLEAU_TOKEN_VALUE')
        
        # Proxy configuration for Zscaler
        self.proxy_url = os.getenv('HTTPS_PROXY', 'http://gateway.zscaler.net:80')
        self.no_proxy = os.getenv('NO_PROXY', 'localhost,127.0.0.1')
        
        self.auth_token = None
        self.site_uuid = None
        self.session = None
        
    async def initialize_session(self):
        """Initialize HTTP session with proxy configuration"""
        connector = aiohttp.TCPConnector()
        
        # Configure proxy if needed
        if self.proxy_url and not any(host in self.server_url for host in self.no_proxy.split(',')):
            self.session = aiohttp.ClientSession(
                connector=connector,
                trust_env=True,
                headers={'User-Agent': 'Nordstrom-Tableau-MCP/1.0'}
            )
        else:
            self.session = aiohttp.ClientSession(
                connector=connector,
                headers={'User-Agent': 'Nordstrom-Tableau-MCP/1.0'}
            )
    
    async def authenticate(self):
        """Authenticate with Tableau Server using Personal Access Token"""
        if not self.token_name or not self.token_value:
            raise ValueError("TABLEAU_TOKEN_NAME and TABLEAU_TOKEN_VALUE must be set in .env file")
        
        auth_url = f"{self.server_url}/api/3.19/auth/signin"
        
        # Create signin request XML
        signin_xml = f"""
        <tsRequest>
            <credentials personalAccessTokenName='{self.token_name}' personalAccessTokenSecret='{self.token_value}'>
                <site contentUrl='{self.site_id}' />
            </credentials>
        </tsRequest>
        """
        
        headers = {'Content-Type': 'application/xml'}
        
        try:
            async with self.session.post(auth_url, data=signin_xml, headers=headers, proxy=self.proxy_url if self.proxy_url else None) as response:
                if response.status == 200:
                    xml_response = await response.text()
                    root = ET.fromstring(xml_response)
                    
                    # Extract auth token and site ID
                    credentials = root.find('.//credentials')
                    if credentials is not None:
                        self.auth_token = credentials.get('token')
                        site = credentials.find('site')
                        if site is not None:
                            self.site_uuid = site.get('id')
                    
                    logger.info(f"Successfully authenticated to {self.server_url}")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Authentication failed: {response.status} - {error_text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return False
    
    async def make_api_request(self, endpoint, method='GET', data=None):
        """Make authenticated API request to Tableau Server"""
        if not self.auth_token:
            await self.authenticate()
        
        url = urljoin(self.server_url, f"/api/3.19/sites/{self.site_uuid}/{endpoint}")
        headers = {
            'X-Tableau-Auth': self.auth_token,
            'Content-Type': 'application/xml' if data else 'application/json'
        }
        
        try:
            async with self.session.request(method, url, data=data, headers=headers, proxy=self.proxy_url if self.proxy_url else None) as response:
                if response.status in [200, 201]:
                    if 'xml' in response.content_type:
                        return await response.text()
                    else:
                        return await response.json()
                else:
                    error_text = await response.text()
                    logger.error(f"API request failed: {response.status} - {error_text}")
                    return None
        except Exception as e:
            logger.error(f"API request error: {str(e)}")
            return None
    
    async def list_workbooks(self):
        """List all workbooks on the site"""
        xml_response = await self.make_api_request('workbooks')
        if not xml_response:
            return []
        
        workbooks = []
        try:
            root = ET.fromstring(xml_response)
            for workbook in root.findall('.//workbook'):
                workbooks.append({
                    'id': workbook.get('id'),
                    'name': workbook.get('name'),
                    'description': workbook.get('description', ''),
                    'size': workbook.get('size', '0'),
                    'createdAt': workbook.get('createdAt'),
                    'updatedAt': workbook.get('updatedAt'),
                    'project': workbook.find('.//project').get('name') if workbook.find('.//project') is not None else 'Unknown',
                    'owner': workbook.find('.//owner').get('name') if workbook.find('.//owner') is not None else 'Unknown'
                })
        except ET.ParseError as e:
            logger.error(f"Error parsing workbooks XML: {e}")
        
        return workbooks
    
    async def list_data_sources(self):
        """List all data sources on the site"""
        xml_response = await self.make_api_request('datasources')
        if not xml_response:
            return []
        
        data_sources = []
        try:
            root = ET.fromstring(xml_response)
            for ds in root.findall('.//datasource'):
                data_sources.append({
                    'id': ds.get('id'),
                    'name': ds.get('name'),
                    'description': ds.get('description', ''),
                    'type': ds.get('type'),
                    'createdAt': ds.get('createdAt'),
                    'updatedAt': ds.get('updatedAt'),
                    'project': ds.find('.//project').get('name') if ds.find('.//project') is not None else 'Unknown'
                })
        except ET.ParseError as e:
            logger.error(f"Error parsing data sources XML: {e}")
        
        return data_sources
    
    async def get_workbook_details(self, workbook_id):
        """Get detailed information about a specific workbook"""
        xml_response = await self.make_api_request(f'workbooks/{workbook_id}')
        if not xml_response:
            return None
        
        try:
            root = ET.fromstring(xml_response)
            workbook = root.find('.//workbook')
            if workbook is not None:
                # Get views (worksheets/dashboards) for this workbook
                views_response = await self.make_api_request(f'workbooks/{workbook_id}/views')
                views = []
                if views_response:
                    views_root = ET.fromstring(views_response)
                    for view in views_root.findall('.//view'):
                        views.append({
                            'id': view.get('id'),
                            'name': view.get('name'),
                            'contentUrl': view.get('contentUrl'),
                            'viewUrlName': view.get('viewUrlName')
                        })
                
                return {
                    'id': workbook.get('id'),
                    'name': workbook.get('name'),
                    'description': workbook.get('description', ''),
                    'size': workbook.get('size', '0'),
                    'views': views,
                    'viewCount': len(views)
                }
        except ET.ParseError as e:
            logger.error(f"Error parsing workbook details XML: {e}")
        
        return None
    
    async def close(self):
        """Clean up resources"""
        if self.session:
            await self.session.close()

# Initialize the MCP server
app = Server("tableau-nordstrom")
tableau_client = TableauServerMCP()

@app.list_tools()
async def handle_list_tools() -> ListToolsResult:
    """List available Tableau Server tools"""
    return ListToolsResult(
        tools=[
            Tool(
                name="list_workbooks",
                description="List all workbooks on Nordstrom Tableau Server",
                inputSchema={
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            ),
            Tool(
                name="list_data_sources", 
                description="List all data sources on Nordstrom Tableau Server",
                inputSchema={
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            ),
            Tool(
                name="get_workbook_details",
                description="Get detailed information about a specific workbook including worksheets and dashboards",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "workbook_name": {
                            "type": "string",
                            "description": "Name of the workbook to analyze"
                        },
                        "workbook_id": {
                            "type": "string", 
                            "description": "ID of the workbook (alternative to name)"
                        }
                    },
                    "required": []
                }
            ),
            Tool(
                name="search_content",
                description="Search for workbooks and data sources by name or description",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search term to look for in workbook/data source names"
                        }
                    },
                    "required": ["query"]
                }
            ),
            Tool(
                name="test_connection",
                description="Test connection to Nordstrom Tableau Server",
                inputSchema={
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            )
        ]
    )

@app.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> CallToolResult:
    """Handle tool calls"""
    try:
        if not tableau_client.session:
            await tableau_client.initialize_session()
        
        if name == "test_connection":
            success = await tableau_client.authenticate()
            if success:
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=f"✅ Successfully connected to {tableau_client.server_url}\n"
                             f"Site: {tableau_client.site_id}\n"
                             f"Auth Token: {'Present' if tableau_client.auth_token else 'Missing'}"
                    )]
                )
            else:
                return CallToolResult(
                    content=[TextContent(
                        type="text", 
                        text="❌ Failed to connect to Tableau Server. Check your credentials and network connection."
                    )],
                    isError=True
                )
        
        elif name == "list_workbooks":
            workbooks = await tableau_client.list_workbooks()
            if workbooks:
                workbook_list = "\n".join([
                    f"📊 **{wb['name']}**\n"
                    f"   Project: {wb['project']}\n"
                    f"   Owner: {wb['owner']}\n"
                    f"   Updated: {wb['updatedAt']}\n"
                    f"   Size: {wb['size']} bytes\n"
                    for wb in workbooks
                ])
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=f"Found {len(workbooks)} workbooks on tableau.nordstrom.com:\n\n{workbook_list}"
                    )]
                )
            else:
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text="No workbooks found or unable to retrieve workbooks."
                    )]
                )
        
        elif name == "list_data_sources":
            data_sources = await tableau_client.list_data_sources()
            if data_sources:
                ds_list = "\n".join([
                    f"🗄️ **{ds['name']}**\n"
                    f"   Type: {ds['type']}\n"
                    f"   Project: {ds['project']}\n"
                    f"   Updated: {ds['updatedAt']}\n"
                    for ds in data_sources
                ])
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=f"Found {len(data_sources)} data sources:\n\n{ds_list}"
                    )]
                )
            else:
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text="No data sources found or unable to retrieve data sources."
                    )]
                )
        
        elif name == "get_workbook_details":
            workbook_name = arguments.get("workbook_name")
            workbook_id = arguments.get("workbook_id")
            
            if workbook_name and not workbook_id:
                # Find workbook by name
                workbooks = await tableau_client.list_workbooks()
                matching_workbook = next((wb for wb in workbooks if wb['name'].lower() == workbook_name.lower()), None)
                if matching_workbook:
                    workbook_id = matching_workbook['id']
                else:
                    return CallToolResult(
                        content=[TextContent(
                            type="text",
                            text=f"❌ Workbook '{workbook_name}' not found."
                        )],
                        isError=True
                    )
            
            if workbook_id:
                details = await tableau_client.get_workbook_details(workbook_id)
                if details:
                    views_list = "\n".join([
                        f"   📋 {view['name']}" for view in details['views']
                    ])
                    return CallToolResult(
                        content=[TextContent(
                            type="text",
                            text=f"📊 **Workbook Details: {details['name']}**\n\n"
                                 f"**Worksheets & Dashboards ({details['viewCount']}):**\n{views_list}\n\n"
                                 f"**Size:** {details['size']} bytes\n"
                                 f"**Description:** {details['description']}"
                        )]
                    )
                else:
                    return CallToolResult(
                        content=[TextContent(
                            type="text",
                            text="❌ Unable to retrieve workbook details."
                        )],
                        isError=True
                    )
            else:
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text="❌ Please provide either workbook_name or workbook_id."
                    )],
                    isError=True
                )
        
        elif name == "search_content":
            query = arguments.get("query", "").lower()
            workbooks = await tableau_client.list_workbooks()
            data_sources = await tableau_client.list_data_sources()
            
            matching_workbooks = [wb for wb in workbooks if query in wb['name'].lower() or query in wb['description'].lower()]
            matching_data_sources = [ds for ds in data_sources if query in ds['name'].lower() or query in ds['description'].lower()]
            
            results = []
            
            if matching_workbooks:
                results.append(f"**📊 Workbooks matching '{query}':**")
                for wb in matching_workbooks:
                    results.append(f"   • {wb['name']} (Project: {wb['project']})")
            
            if matching_data_sources:
                results.append(f"\n**🗄️ Data Sources matching '{query}':**")
                for ds in matching_data_sources:
                    results.append(f"   • {ds['name']} (Type: {ds['type']})")
            
            if not matching_workbooks and not matching_data_sources:
                results.append(f"No content found matching '{query}'")
            
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text="\n".join(results)
                )]
            )
        
        else:
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=f"Unknown tool: {name}"
                )],
                isError=True
            )
    
    except Exception as e:
        logger.error(f"Error in tool {name}: {str(e)}")
        return CallToolResult(
            content=[TextContent(
                type="text",
                text=f"Error executing {name}: {str(e)}"
            )],
            isError=True
        )

async def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        if sys.argv[1] == "--test":
            # Test mode
            await tableau_client.initialize_session()
            success = await tableau_client.authenticate()
            if success:
                print("✅ Connection test successful")
                workbooks = await tableau_client.list_workbooks()
                print(f"✅ Found {len(workbooks)} workbooks")
            else:
                print("❌ Connection test failed")
            await tableau_client.close()
            return
        elif sys.argv[1] == "--debug":
            # Debug mode - run with more logging
            logging.getLogger().setLevel(logging.DEBUG)
    
    # Run MCP server
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
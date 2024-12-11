export const CREATE_TOOL_TOOL = {
    name: "create_tool",
    description: "Create a new tool. This tool will be used to create new tools. You can use the tools you have created to perform tasks.",
    inputSchema: {
        type: "object",
        required: ['name', 'description', 'code', 'input_schema', 'language'],
        properties: {
            name: {
                type: "string",
                description: "The name of the tool you are writing. This is what you will use to call the tool.",
            },
            description: {
                type: "string",
                description: "A description of the tool you are writing. This will help you or other agents or people pick the appropriate tool in the future.",
            },
            code: {
                type: "string",
                description: "The Typescript code for the tool you are writing. The code should be a valid Typescript function named `execute` that takes one argument called `input`. When called, the `input` provided will match the schema of the `input_schema` of the tool.",
            },
            input_schema: {
                type: "object",
                description: "The input schema for the tool. This must be provided as a valid JSON Schema object.",
            },
            language: {
                type: "string",
                description: "The language of the tool you are writing. This must be either 'TYPESCRIPT' or 'PYTHON'.",
            },
        },
    },
};
export const SAVE_AGENT_TOOL = {
    name: "save_agent",
    description: "Save the current set of tools as an agent.",
    inputSchema: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "The name of the agent you are saving. This will be used to identify the agent in the future.",
            },
        },
    },
};
export const FETCH_TOOL_TOOL = {
    name: "fetch_tool",
    description: "Fetch a tool, including its source code.",
    inputSchema: {
        type: "object",
        properties: {
            tool_name: { type: "string" },
        },
    },
};
export const EDIT_TOOL_TOOL = {
    name: "edit_tool",
    description: "Edit a tool, including its source code. Omit properties that you do not want to change.",
    inputSchema: {
        type: "object",
        required: ['tool_name', 'code', 'language'],
        properties: {
            tool_name: {
                type: "string",
                description: "The name of the tool you are editing.",
            },
            name: {
                type: "string",
                description: "The name of the tool you are editing. This is what you will use to call the tool.",
            },
            description: {
                type: "string",
                description: "A description of the tool you are editing. This will help you or other agents or people pick the appropriate tool in the future.",
            },
            code: {
                type: "string",
                description: "The Typescript code for the tool you are editing. The code should be a valid Typescript function named `execute` that takes one argument called `input`. When called, the `input` provided will match the schema of the `input_schema` of the tool.",
            },
            input_schema: {
                type: "object",
                description: "The input schema for the tool. This must be provided as a valid JSON Schema object.",
            },
            language: {
                type: "string",
                description: "The language of the tool you are editing. This must be either 'TYPESCRIPT' or 'PYTHON'.",
            },
        },
    },
};
export const EXECUTE_CODE_TOOL = {
    name: "execute_code",
    description: "Execute arbitrary Typescript or Python code. The function should be called ",
    inputSchema: {
        type: "object",
        properties: {
            code: {
                type: "string",
                description: "The code you are writing. This will be executed as a script. If you write code as a function, you must make sure you call it inside the script and print the output to stdout. If your function is async, you must await it when you call it.",
            },
            language: {
                type: "string",
                description: "The language of the code you are writing. This must be either 'TYPESCRIPT' or 'PYTHON'.",
            },
        },
    },
};
export const LIST_TOOLS_TOOL = {
    name: "list_tools",
    description: "Lists the tool definitions of all self-written tools available for use. These tools can be used by calling `use_tool` with the name and input.",
    inputSchema: {
        type: "object",
        properties: {},
    },
};
export const USE_TOOL_TOOL = {
    name: "use_tool",
    description: "Use a tool. This tool will be used to use a self-written tool.",
    inputSchema: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "The name of the tool you are using.",
            },
            input: {
                type: "object",
                description: "The input to the tool. This must match the input schema of the tool.",
            },
        },
    },
};

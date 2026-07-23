require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { z } = require("zod");

// const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp");
// const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp");

const {
    McpServer
} = require("./node_modules/@modelcontextprotocol/sdk/dist/cjs/server/mcp.js");

const {
    StreamableHTTPServerTransport
} = require("./node_modules/@modelcontextprotocol/sdk/dist/cjs/server/streamableHttp.js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.MCP_PORT || 3001;

const INVOICE_API_URL =
    process.env.INVOICE_API_URL ||
    "https://invoiceapi-ni8e.onrender.com";

// ===========================================
// MCP SERVER
// ===========================================

const server = new McpServer({
    name: "Invoice MCP Server",
    version: "1.0.0"
});

const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
});

// ===========================================
// TOOL 1 : FETCH INVOICE
// ===========================================

server.registerTool(
    "fetch_invoice",
    {
        title: "Fetch Invoice",
        description: "Fetch invoice details using invoice number.",

        inputSchema: {
            invoiceNumber: z.string().describe("Invoice Number")
        }
    },

    async ({ invoiceNumber }) => {

        try {

            const response = await axios.get(
                `${INVOICE_API_URL}/invoices/${invoiceNumber}`
            );

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(response.data, null, 2)
                    }
                ]
            };

        } catch (err) {

            return {

                content: [
                    {
                        type: "text",
                        text: `Invoice ${invoiceNumber} not found.`
                    }
                ],

                isError: true

            };

        }

    }
);

// ===========================================
// TOOL 2 : ANALYZE DISPUTE
// ===========================================

server.registerTool(
    "analyze_dispute",
    {
        title: "Analyze Dispute",
        description: "Analyze a customer dispute using the invoice number and customer complaint.",

        inputSchema: {
            invoiceNumber: z.string().describe("Invoice Number"),
            customerComplaint: z.string().describe("Customer Complaint")
        }
    },

    async ({ invoiceNumber, customerComplaint }) => {

        try {

            const response = await axios.post(
                `${INVOICE_API_URL}/analyzeDispute`,
                {
                    invoiceNumber,
                    customerComplaint
                }
            );

            return {

                content: [
                    {
                        type: "text",
                        text: JSON.stringify(response.data, null, 2)
                    }
                ]

            };

        }

        catch (err) {

            return {

                content: [
                    {
                        type: "text",
                        text: err.response?.data?.message ||
                              "Unable to analyze dispute."
                    }
                ],

                isError: true

            };

        }

    }
);

// ===========================================
// MCP ENDPOINTS
// ===========================================

app.get("/mcp", async (req, res) => {

    try {

        await transport.handleRequest(req, res);

    } catch (err) {

        console.error(err);

        if (!res.headersSent) {

            res.status(500).json({
                error: err.message
            });

        }

    }

});

app.post("/mcp", async (req, res) => {

    try {

        await transport.handleRequest(req, res, req.body);

    } catch (err) {

        console.error(err);

        if (!res.headersSent) {

            res.status(500).json({
                error: err.message
            });

        }

    }

});

app.delete("/mcp", async (req, res) => {

    try {

        await transport.handleRequest(req, res);

    } catch (err) {

        console.error(err);

        if (!res.headersSent) {

            res.status(500).json({
                error: err.message
            });

        }

    }

});

// ===========================================
// HEALTH CHECK
// ===========================================

app.get("/", (req, res) => {

    res.send("Invoice MCP Server Running");

});

// ===========================================
// START SERVER
// ===========================================

(async () => {

    try {

        await server.connect(transport);

        app.listen(PORT, () => {

            console.log("--------------------------------");
            console.log("Invoice MCP Server Started");
            console.log(`Port : ${PORT}`);
            console.log(`MCP Endpoint : http://localhost:${PORT}/mcp`);
            console.log("--------------------------------");

        });

    } catch (err) {

        console.error("Unable to start MCP Server");
        console.error(err);

    }

})();
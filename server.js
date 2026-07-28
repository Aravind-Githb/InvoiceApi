const express = require("express");
const fs = require("fs");
const axios = require("axios");
const basicAuth = require("express-basic-auth");
require("dotenv").config();
const { StreamableHTTPServerTransport } =
require("@modelcontextprotocol/sdk/server/streamableHttp.js");

const { McpServer } =
require("@modelcontextprotocol/sdk/server/mcp.js");const { z } = require("zod");

const disputeService =
require("./services/disputeService");

const app = express();
app.use(express.json());

// const crypto = require("crypto");
// const transport = new StreamableHTTPServerTransport({
//     sessionIdGenerator: () => crypto.randomUUID()
// });
// const server = new McpServer({

//     name: "Dispute Resolution MCP Server",

//     version: "1.0.0"

// });


const data = JSON.parse(fs.readFileSync("invoices.json", "utf8"));


const cors = require("cors");
app.use(cors());

// app.use(
//     basicAuth({
//         users: {
//             [process.env.API_USERNAME]: process.env.API_PASSWORD
//         },
//         challenge: true
//     })
// );




const invoices = data.invoices;

function createMcpServer() {

    const server = new McpServer({

        name: "Dispute Resolution MCP Server",

        version: "1.0.0"

    });

server.registerTool(
    "getInvoice",
    {
        title: "Get Invoice",
        description: "Returns invoice details.",
        inputSchema: {

            invoiceNumber: z.string()

        }
    },
    async ({ invoiceNumber }) => {

        const invoice =
            disputeService.getInvoice(invoiceNumber);

        return {

            content: [

                {

                    type: "text",

                    text: JSON.stringify(invoice, null, 2)

                }

            ]

        };

    }
);


server.registerTool(
    "updateDisputeStatus",
    {
        title: "Update Dispute Status",
        description: "Updates the dispute status of an invoice.",
        inputSchema: {
            invoiceNumber: z.string(),
            disputeStatus: z.enum(["Open", "In Progress", "Closed"])
        }
    },
    async ({ invoiceNumber, disputeStatus }) => {

        const result =
            disputeService.updateDisputeStatus(
                invoiceNumber,
                disputeStatus
            );

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };

    }
);


server.registerTool(

    "analyzeDispute",

    {

        title: "Analyze Dispute",

        description:
            "Analyzes a customer billing dispute.",

        inputSchema: {

            invoiceNumber: z.string(),

            customerComplaint: z.string()

        }

    },

    async ({ invoiceNumber, customerComplaint }) => {

        const result =
            disputeService.analyzeDispute(

                invoiceNumber,

                customerComplaint

            );

        return {

            content: [

                {

                    type: "text",

                    text: JSON.stringify(result, null, 2)

                }

            ]

        };

    }

);

 return server;

}

// =====================================
// Workflow Configuration
// =====================================

const WORKFLOW_API_URL = process.env.WORKFLOW_API_URL;
const WORKFLOW_DEFINITION_ID = process.env.WORKFLOW_DEFINITION_ID;
const WORKFLOW_ENVIRONMENT_ID = process.env.WORKFLOW_ENVIRONMENT_ID;
const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;


// Home
app.get("/", (req, res) => {
    res.send("Invoice API Running");
});

// Get all invoices
app.get("/invoices", (req, res) => {
    res.json(invoices);
});

// Get invoice by number
app.get("/invoices/:invoiceNumber", (req, res) => {

    const invoice = invoices.find(
        inv => inv.invoiceNumber === req.params.invoiceNumber
    );

    if (!invoice) {
        return res.status(404).json({
            message: "Invoice not found"
        });
    }

    res.json(invoice);
});



// Analyze Dispute
app.post("/analyzeDispute", async (req, res) => {

    try {

        const { invoiceNumber, customerComplaint } = req.body;

        const result =
            disputeService.analyzeDispute(
                invoiceNumber,
                customerComplaint
            );

        res.json(result);

    }

    catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

// =====================================
// Trigger SAP Build Process
// =====================================

        app.post("/startWorkflow", async (req, res) => {

            try {

                const {
                    invoiceNumber,
                    customerComplaint
                } = req.body;

                //=====================================
                // Step 1: Get OAuth Access Token
                //=====================================
                console.log("Getting OAuth Token...");
                const tokenResponse = await axios.post(

                    WORKFLOW_API_URL,

                    "grant_type=client_credentials",

                    {
                        auth: {
                            username: API_USERNAME,
                            password: API_PASSWORD
                        },
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        }
                    }

                );
                console.log("OAuth Token Received");
                const accessToken = tokenResponse.data.access_token;

                console.log("OAuth Token Retrieved Successfully");

                //=====================================
                // Step 2: Prepare Workflow Payload
                //=====================================

                const payload = {

                    definitionId: WORKFLOW_DEFINITION_ID,

                    context: {

                        invoiceNumber,
                        customerComplaint

                    }

                };

                //=====================================
                // Step 3: Start Workflow
                //=====================================
                console.log("Calling Workflow API...");

                const response = await axios.post(

                    `${WORKFLOW_API_URL}?environmentId=${WORKFLOW_ENVIRONMENT_ID}`,

                    payload,

                    {

                        headers: {

                            Authorization: `Bearer ${accessToken}`,

                            "Content-Type": "application/json"

                        }

                    }

                );

                res.json({

                    message: "Workflow Started Successfully",

                    workflowResponse: response.data

                });

                console.log("Workflow Started");

            } catch (error) {

                console.error("Workflow Error:");

                console.error(error.response?.data || error.message);

                console.log("WORKFLOW_API_URL:", WORKFLOW_API_URL);
                console.log("WORKFLOW_DEFINITION_ID:", WORKFLOW_DEFINITION_ID);
                console.log("WORKFLOW_ENVIRONMENT_ID:", WORKFLOW_ENVIRONMENT_ID);

                const finalUrl =
                    `${WORKFLOW_API_URL}?environmentId=${WORKFLOW_ENVIRONMENT_ID}`;

                console.log("Calling:", finalUrl);

                res.status(500).json({

                    message: "Unable to start the workflow",

                    error:
                        error.response?.data ||
                        error.message

                });

            }

        });




        app.post("/updateDisputeStatus", async (req, res) => {

    try {

        const { invoiceNumber, disputeStatus } = req.body;

        const result =
            disputeService.updateDisputeStatus(
                invoiceNumber,
                disputeStatus
            );

        res.json(result);

    }

    catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});


app.all("/mcp", async (req, res) => {

    try {

        const server = createMcpServer();

        const transport =
            new StreamableHTTPServerTransport({

                sessionIdGenerator: undefined,

                enableJsonResponse: true

            });

        res.on("close", () => {

            transport.close();

            server.close();

        });

        await server.connect(transport);

        await transport.handleRequest(

            req,

            res,

            req.body

        );

    }

    catch (err) {

        console.error(err);

        if (!res.headersSent) {

            res.status(500).json({

                error: err.message

            });

        }

    }

});

    app.listen(3000, () => {
        console.log("Server running on port 3000");
    });
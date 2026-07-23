const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.MCP_PORT || 3001;

/*
    Temporary MCP Endpoint

    In the next phase this endpoint will expose
    fetch_invoice
    analyze_dispute
    start_workflow
*/

app.post("/mcp", async (req, res) => {

    console.log("==================================");
    console.log("MCP Request Received");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("==================================");

    res.json({
        jsonrpc: "2.0",
        id: req.body.id || 1,
        result: {
            server: {
                name: "Invoice MCP Server",
                version: "1.0.0"
            },
            status: "running",
            message: "MCP Server is reachable."
        }
    });

});

app.get("/", (req, res) => {

    res.send("Invoice MCP Server Running");

});

app.listen(PORT, () => {

    console.log("--------------------------------");
    console.log("Invoice MCP Server Started");
    console.log("Port :", PORT);
    console.log(`URL  : http://localhost:${PORT}/mcp`);
    console.log("--------------------------------");

});
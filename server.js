const express = require("express");
const fs = require("fs");
const axios = require("axios");
const basicAuth = require("express-basic-auth");
require("dotenv").config();

const app = express();

app.use(express.json());

const data = JSON.parse(fs.readFileSync("invoices.json", "utf8"));


app.use(
    basicAuth({
        users: {
            [process.env.API_USERNAME]: process.env.API_PASSWORD
        },
        challenge: true
    })
);

const invoices = data.invoices;

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
app.post("/analyzeDispute", (req, res) => {

    const { invoiceNumber, customerComplaint } = req.body;

    const invoice = invoices.find(
        inv => inv.invoiceNumber === invoiceNumber
    );

    if (!invoice) {
        return res.status(404).json({
            disputeValid: false,
            customerMessage: "Invoice not found."
        });
    }

    let response = {
        disputeValid: false,
        rootCause: "No Issue",
        recommendedAction: "No Action Required",
        resolutionStatus: "Rejected",
        revisedInvoiceAmount: invoice.invoiceAmount,
        refundAmount: 0,
        financeNotificationRequired: false,
        customerMessage: "No billing issue was found."
    };

    switch (invoice.disputeScenario) {

        case "Discount Missing":

            response.disputeValid = true;
            response.rootCause = "Discount Missing";
            response.recommendedAction = "Generate Revised Invoice";
            response.resolutionStatus = "Resolved";

            response.revisedInvoiceAmount =
                invoice.invoiceAmount - invoice.discountAmount;

            response.refundAmount = invoice.discountAmount;

            response.financeNotificationRequired =
                invoice.paymentStatus === "Paid";

            response.customerMessage =
                `Your contractual discount of ₹${invoice.discountAmount} was not applied. A revised invoice has been generated.`;

            break;

        case "INSTALLATION_FEE":

            response.disputeValid = true;
            response.rootCause = "Installation Fee Included";
            response.recommendedAction = "Explain Charges";
            response.resolutionStatus = "Explained";

            response.customerMessage =
                `₹${invoice.installationFee} was charged for installation services as per your agreement.`;

            break;

        case "DUPLICATE_CHARGE":

            response.disputeValid = true;
            response.rootCause = "Duplicate Charge";
            response.recommendedAction = "Refund Customer";
            response.resolutionStatus = "Resolved";

            response.refundAmount = invoice.duplicateAmount;

            response.financeNotificationRequired = true;

            response.customerMessage =
                `A duplicate charge of ₹${invoice.duplicateAmount} was detected. Finance has been notified for refund processing.`;

            break;

        case "TAX_ERROR":

            response.disputeValid = true;
            response.rootCause = "Incorrect Tax";
            response.recommendedAction = "Generate Revised Invoice";
            response.resolutionStatus = "Resolved";

            response.revisedInvoiceAmount =
                invoice.invoiceAmount - invoice.taxDifference;

            response.refundAmount = invoice.taxDifference;

            response.customerMessage =
                `Incorrect tax calculation was identified. Revised invoice generated.`;

            break;

        default:

            response.customerMessage =
                "No billing discrepancy was detected.";
    }

    res.json(response);

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


app.listen(3000, () => {
    console.log("Server running on port 3000");
});
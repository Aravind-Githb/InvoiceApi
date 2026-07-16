const express = require("express");
const fs = require("fs");

const app = express();

app.use(express.json());

const data = JSON.parse(fs.readFileSync("invoices.json", "utf8"));



const invoices = data.invoices;



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

        case "DISCOUNT_NOT_APPLIED":

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

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
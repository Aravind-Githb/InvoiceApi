const data = require("../invoices.json");

const invoices = data.invoices;


function getInvoices() {
    return invoices;
}


function getInvoice(invoiceNumber) {

    return invoices.find(
        invoice => invoice.invoiceNumber === invoiceNumber
    );

}

function analyzeDispute(invoiceNumber, customerComplaint) {
    const complaint = customerComplaint.toLowerCase();
    // Find invoice
    const invoice = invoices.find(
        inv => inv.invoiceNumber === invoiceNumber
    );

    if (!invoice) {

        return {
            success: false,
            message: "Invoice not found."
        };

    }

   let response = {
        CustomerName: invoice.customerName,
        disputeValid: false,
        rootCause: "No Issue",
        recommendedAction: "No Action Required",
        resolutionStatus: "Rejected",
        revisedInvoiceAmount: invoice.invoiceAmount,
        refundAmount: 0,
        financeNotificationRequired: false,
        customerMessage: "No billing issue was found.",
    };

// -----------------------------
// Discount Missing
// -----------------------------
        if (
            (complaint.includes("discount") ||
            complaint.includes("offer") ||
            complaint.includes("contract discount") ||
            complaint.includes("10%")) &&
            invoice.discountAppliedPercent < invoice.contractDiscountPercent
        ) {

            const discountAmount =
                invoice.productAmount *
                invoice.contractDiscountPercent / 100;
            response.CustomerName = invoice.customerName;
            response.disputeValid = true;
            response.rootCause = "Discount Missing";
            response.recommendedAction = "Generate Revised Invoice";
            response.resolutionStatus = "Resolved";

            response.revisedInvoiceAmount =
                invoice.invoiceAmount - discountAmount;

            response.refundAmount = discountAmount;

            response.financeNotificationRequired =
                invoice.paymentStatus === "Paid";

            response.customerMessage =
                `Your contractual discount of ₹${discountAmount} was not applied. A revised invoice has been generated.`;
        }

        // -----------------------------
        // Installation Fee
        // -----------------------------
        else if (
            complaint.includes("installation")
        ) {
            response.CustomerName = invoice.customerName
            response.disputeValid = true;
            response.rootCause = "Installation Fee Included";
            response.recommendedAction = "Explain Charges";
            response.resolutionStatus = "Explained";

            response.customerMessage =
                `₹${invoice.installationFee} was charged for installation services as per your agreement.`;
        }

        // -----------------------------
        // Duplicate Charge
        // -----------------------------
        else if (
            complaint.includes("duplicate") ||
            complaint.includes("charged twice") ||
            complaint.includes("double charge")
        ) {
            response.CustomerName = invoice.customerName
            response.disputeValid = true;
            response.rootCause = "Duplicate Charge";
            response.recommendedAction = "Refund Customer";
            response.resolutionStatus = "Resolved";

            response.refundAmount = invoice.invoiceAmount;

            response.financeNotificationRequired = true;

            response.customerMessage =
                "A duplicate charge was detected. Finance has been notified for refund processing.";
        }

        // -----------------------------
        // Tax Error
        // -----------------------------
        else if (
            complaint.includes("tax") ||
            complaint.includes("gst")
        ) {
            response.CustomerName = invoice.customerName
            response.disputeValid = true;
            response.rootCause = "Incorrect Tax";
            response.recommendedAction = "Generate Revised Invoice";
            response.resolutionStatus = "Resolved";

            const correctTax =
                (invoice.productAmount -
                (invoice.productAmount * invoice.contractDiscountPercent / 100))
                * invoice.taxPercent / 100;

            const revisedAmount =
                invoice.productAmount -
                (invoice.productAmount * invoice.contractDiscountPercent / 100) +
                correctTax;

            response.revisedInvoiceAmount = revisedAmount;

            response.refundAmount =
                invoice.invoiceAmount - revisedAmount;

            response.customerMessage =
                "Incorrect tax calculation was identified. A revised invoice has been generated.";
        }

        // -----------------------------
        // Quantity Mismatch
        // -----------------------------
        else if (
            complaint.includes("quantity") ||
            complaint.includes("more items") ||
            complaint.includes("extra items") ||
            complaint.includes("extra") ||
            complaint.includes("billed more") ||
            complaint.includes("wrong quantity")||
            complaint.includes("quantites")
        ) {

            // Calculate extra quantity billed
            const extraQuantity =
                invoice.billedQuantity - invoice.orderedQuantity;

            // Calculate refund amount for extra quantity
            const refundAmount =
                extraQuantity * invoice.unitPrice;
            response.CustomerName = invoice.customerName
            response.disputeValid = true;
            response.rootCause = "Quantity Mismatch";
            response.recommendedAction = "Generate Revised Invoice";
            response.resolutionStatus = "Resolved";

            // Revised invoice amount after removing extra quantity
            response.revisedInvoiceAmount =
                invoice.invoiceAmount - (refundAmount * (1 + invoice.taxPercent / 100));

            response.refundAmount = refundAmount;

            response.financeNotificationRequired =
                invoice.paymentStatus === "Paid";

            response.customerMessage =
                `We identified that ${invoice.billedQuantity} items were billed instead of ${invoice.orderedQuantity}. A revised invoice has been generated and the extra charge of ₹${refundAmount} will be adjusted.`;
        }

        // -----------------------------
        // Unknown Complaint
        // -----------------------------
        else {

            response.customerMessage =
                "We couldn't identify the type of dispute. Please provide more details about your complaint.";

        }

    return response;

}


function updateDisputeStatus(invoiceNumber, status) {

    const invoice = invoices.find(
        inv => inv.invoiceNumber === invoiceNumber
    );

    if (!invoice) {

        return {
            success: false,
            message: "Invoice not found."
        };

    }

    invoice.disputeStatus = status;

    return {

        success: true,

        invoice

    };

}


module.exports = {

    getInvoices,

    getInvoice,

    analyzeDispute,

    updateDisputeStatus
};
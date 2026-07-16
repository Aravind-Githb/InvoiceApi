const express = require("express");
const fs = require("fs");

const app = express();

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

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
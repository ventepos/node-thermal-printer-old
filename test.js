#!/usr/local/bin/node


// var NodeThermalPrinter = require("./node-thermal-printer");
// var printer = new NodeThermalPrinter()

var printer = new (require("./node-thermal-printer"));

printer.init({
  type: 'epson',
  ip: '10.192.0.25',
  port: 9100
});
printer.alignCenter();

  printer.printVerticalTab()
  printer.println("106 E Liberty")
  printer.bold(true);
  printer.println("ALL DA TACOS");
  printer.cut();
  // printer.openCashDrawer();
  printer.execute(function(err){
    if (err) {
      console.error("Print failed", err);
    } else {
     console.log("Print done");
    }
  });


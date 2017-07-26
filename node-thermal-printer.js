var fs = require('fs'),
    PNG = require('node-png').PNG;

var writeFile = require('write-file-queue')({
    retries : 1000, 						    // number of write attempts before failing
    waitTime : 200 					        // number of milliseconds to wait between write attempts
    //, debug : console.error 			// optionally pass a function to do dump debug information to
});

function NodeThermalPrinter() {
  this.net = require("net");
  this.config = undefined;
  this.buffer = null;
  this.printerConfig = undefined;
};

NodeThermalPrinter.prototype.init = function(initConfig){
  if(initConfig.type === 'star'){
    this.config = require('./configs/starConfig');
  } else {
    this.config = require('./configs/epsonConfig');
  }

  if(!initConfig.width) initConfig.width = 48;
  if(!initConfig.characterSet) initConfig.characterSet = "SLOVENIA";
  if(typeof(initConfig.removeSpecialCharacters) == "undefined") initConfig.removeSpecialCharacters = false;
  if(typeof(initConfig.replaceSpecialCharacters) == "undefined") initConfig.replaceSpecialCharacters = true;

  this.printerConfig = initConfig;
};

NodeThermalPrinter.prototype.execute = function(cb){
  if(this.printerConfig.ip){
    var printer = this.net.connect({
      host : this.printerConfig.ip,
      port : this.printerConfig.port
    });
    printer.write(this.buffer);
    printer.end();

  } else {
    writeFile(this.printerConfig.interface , this.buffer, function (err) {
      if (err) {
        if ("function" == typeof cb) {
          cb("Print failed: " + err);
        } else {
          console.error("Print failed", err);
        }
      } else {
        this.buffer = null;
        if ("function" == typeof cb) {
          cb( null );
        } else {
          console.log("Print done");
        }
      }
    }.bind(this));
  }
};

NodeThermalPrinter.prototype.cut = function(){
  this.append(this.config.CTL_VT);
  this.append(this.config.CTL_VT);
  this.append(this.config.PAPER_FULL_CUT);
  this.append(this.config.HW_INIT);
};

NodeThermalPrinter.prototype.partialCut = function(){
  this.append(this.config.CTL_VT);
  this.append(this.config.CTL_VT);
  this.append(this.config.PAPER_PART_CUT);
  this.append(this.config.HW_INIT);
};

NodeThermalPrinter.prototype.beep = function(){
  if (this.printerConfig.type == 'star'){
    console.error("Beep not supported on STAR yet");
  } else {
    this.append(this.config.BEEP);
  }
};

NodeThermalPrinter.prototype.getWidth = function(){
  return parseInt(this.printerConfig.width);
};

NodeThermalPrinter.prototype.getText = function(){
  return this.buffer.toString();
};

NodeThermalPrinter.prototype.getBuffer = function(){
  return this.buffer;
};

NodeThermalPrinter.prototype.clear = function(){
  this.buffer = null;
};

NodeThermalPrinter.prototype.add = function(buffer){
  this.append(buffer);
};

NodeThermalPrinter.prototype.print = function(text){
  this.append(text.toString());
};

NodeThermalPrinter.prototype.println = function(text){
  this.append(text.toString());
  this.append("\n");
};

NodeThermalPrinter.prototype.printVerticalTab = function(){
  this.append(this.config.CTL_VT);
};

NodeThermalPrinter.prototype.bold = function(enabled){
  if(enabled) this.append(this.config.TXT_BOLD_ON);
  else this.append(this.config.TXT_BOLD_OFF);
};

NodeThermalPrinter.prototype.underline = function(enabled){
  if(enabled) this.append(this.config.TXT_UNDERL_ON);
  else this.append(this.config.TXT_UNDERL_OFF);
};

NodeThermalPrinter.prototype.underlineThick = function(enabled){
  if(enabled) this.append(this.config.TXT_UNDERL2_ON);
  else this.append(this.config.TXT_UNDERL_OFF);
};

NodeThermalPrinter.prototype.upsideDown = function(enabled){
    if(enabled) this.append(this.config.UPSIDE_DOWN_ON);
    else this.append(this.config.UPSIDE_DOWN_OFF);
};

NodeThermalPrinter.prototype.invert = function(enabled){
  if(enabled) this.append(this.config.TXT_INVERT_ON);
  else this.append(this.config.TXT_INVERT_OFF);
};

NodeThermalPrinter.prototype.openCashDrawer = function(){
  if(this.printerConfig.type == 'star'){
    this.append(this.config.CD_KICK);
  } else {
    this.append(this.config.CD_KICK_2);
    this.append(this.config.CD_KICK_5);
  }
};

NodeThermalPrinter.prototype.alignCenter = function(){
  this.append(this.config.TXT_ALIGN_CT);
};

NodeThermalPrinter.prototype.alignLeft = function(){
  this.append(this.config.TXT_ALIGN_LT);
};

NodeThermalPrinter.prototype.alignRight = function(){
  this.append(this.config.TXT_ALIGN_RT);
};

NodeThermalPrinter.prototype.setTypeFontA = function(){
  this.append(this.config.TXT_FONT_A);
};

NodeThermalPrinter.prototype.setTypeFontB = function(){
  this.append(this.config.TXT_FONT_B);
};

NodeThermalPrinter.prototype.setTextNormal = function(){
  this.append(this.config.TXT_NORMAL);
};

NodeThermalPrinter.prototype.setTextDoubleHeight = function(){
  this.append(this.config.TXT_2HEIGHT);
};

NodeThermalPrinter.prototype.setTextDoubleWidth = function(){
  this.append(this.config.TXT_2WIDTH);
};

NodeThermalPrinter.prototype.setTextQuadArea = function(){
  this.append(this.config.TXT_4SQUARE);
};

NodeThermalPrinter.prototype.newLine = function(){
  this.append(this.config.CTL_LF);
};

NodeThermalPrinter.prototype.drawLine = function(){
  // this.newLine();
  for(var i=0; i<this.printerConfig.width; i++){
    if(this.printerConfig.lineChar) this.append(new Buffer(this.printerConfig.lineChar));
    else this.append(new Buffer([196]));
  }
  this.newLine();
};

NodeThermalPrinter.prototype.leftRight = function(left, right){
  this.append(left.toString());
  var width = this.printerConfig.width - left.toString().length - right.toString().length;
  for(var i=0; i<width; i++){
    this.append(new Buffer(" "));
  }
  this.append(right.toString());
  this.newLine();
};

NodeThermalPrinter.prototype.table = function(data){
  var cellWidth = this.printerConfig.width/data.length;
  for(var i=0; i<data.length; i++){
    this.append(data[i].toString());
    var spaces = cellWidth - data[i].toString().length;
    for(var j=0; j<spaces; j++){
      this.append(new Buffer(" "));
    }
  }
  this.newLine();
}


// Options: text, align, width, bold
NodeThermalPrinter.prototype.tableCustom = function(data){
  var cellWidth = this.printerConfig.width/data.length;
  var secondLine = [];
  var secondLineEnabled = false;

  for(var i=0; i<data.length; i++){
    var tooLong = false;
    var obj = data[i];
    obj.text = obj.text.toString();

    if(obj.width) cellWidth = this.printerConfig.width * obj.width;
    if(obj.bold) this.bold(true);

    // If text is too wide go to next line
    if(cellWidth < obj.text.length){
      tooLong = true;
      obj.originalText = obj.text;
      obj.text = obj.text.substring(0, cellWidth);
    }

    if(obj.align == "CENTER"){
      var spaces = (cellWidth - obj.text.toString().length) / 2;
      for(var j=0; j<spaces; j++){
        this.append(new Buffer(" "));
      }
      if(obj.text != '')  this.append(obj.text);
      for(var j=0; j<spaces-1; j++){
        this.append(new Buffer(" "));
      }

    } else if(obj.align == "RIGHT") {
      var spaces = cellWidth - obj.text.toString().length;
      for(var j=0; j<spaces; j++){
        this.append(new Buffer(" "));
      }
      if(obj.text != '') this.append(obj.text);

    } else {
      if(obj.text != '') this.append(obj.text);
      var spaces = cellWidth - obj.text.toString().length;
      for(var j=0; j<spaces; j++){
        this.append(new Buffer(" "));
      }

    }

    if(obj.bold) this.bold(false);


    if(tooLong){
      secondLineEnabled = true;
      obj.text = obj.originalText.substring(cellWidth-1);
      secondLine.push(obj);
    } else {
      obj.text = "";
      secondLine.push(obj);
    }
  }

  this.newLine();

  // Print the second line
  if(secondLineEnabled){
    this.tableCustom(secondLine);
  }
};

NodeThermalPrinter.prototype.isPrinterConnected = function(exists){
  if(this.printerConfig.interface){
    fs.exists(this.printerConfig.interface, function(ex){
      exists(ex);
    });
  }
};


NodeThermalPrinter.prototype.printQR = function(str, settings){
  if (this.printerConfig.type == 'star') {
    if(settings) {
      console.error('Settings not yet available for star')
    }
    // ------------------------------ Star QR ------------------------------
    // [Name] Set QR code model
    // [Code] Hex. 1B 1D 79 53 30 n
    // [Defined Area] 1 ≤ n ≤ 2
    // [Initial Value] n = 2
    // [Function] Sets the model.
    // 	• Parameter details
    // n | Set Model
    //---+---------------
    // 1 | Model 1
    // 2 | Model 2
    this.append(this.config.QRCODE_MODEL1);


    // [Name] Set QR code mistake correction level
    // [Code] Hex. 1B 1D 79 53 31 n
    // [Defined Area] 0 ≤ n ≤ 3
    // [Initial Value] n = 0
    // [Function] Sets the mistake correction level.
    // 	• Parameter details
    // n | Correction Level | Mistake Correction Rate (%)
    // --+------------------+----------------------------
    // 0 | L 								|	7
    // 1 | M 								| 15
    // 2 | Q 							  | 25
    // 3 | H 								| 30
    this.append(this.config.QRCODE_CORRECTION_M);


    // [Name] Set QR code cell size
    // [Code] Hex. 1B 1D 79 53 32 n
    // [Defined Area] 1 ≤ n ≤ 8
    // [Initial Value] n = 3
    // [Function] Sets the cell size.
    //	• Parameter details
    //	• n: Cell size (Units: Dots)
    //	• It is recommended that the specification using this command be 3 ≤ n.
    //	  If n = 1 or 2, check by actually using.
    this.append(this.config.QRCODE_CELLSIZE_4);


    // [Name] Set QR code cell size (Auto Setting)
    // [Code] Hex. 1B 1D 79 44 31 m nL nH d1 d2 … dk
    // [Defined Area]
    // m = 0
    // 0 ≤ nL ≤ 255,
    // 0 ≤ nH ≤ 255
    // 1 ≤ nL + nH x 256 ≤ 7089 (k = nL + nH x 256)
    // 0 ≤ d ≤ 255
    // [Function]
    // Automatically expands the data type of the bar code and sets the data.
    //	• Parameter details
    //	• nL + nH x 256: Byte count of bar code data
    //	• dk: Bar code data (Max. 7089 bytes)
    //	• When using this command, the printer receives data for the number of bytes (k) specified by nL and nH. The data automatically expands to be set as the qr code data.
    //	• Indicates the number bytes of data specified by the nL and nH. Bar code data is cleared at this time.
    //	• The data storage region of this command is shared with the manual setting command so data is updated each time either command is executed.
    var s = str.length;
    var lsb = parseInt(s % 256);
    var msb = parseInt(s / 256);

    this.append(new Buffer([lsb, msb]));  // nL, nH
    this.append(new Buffer(str.toString()));  // Data
    this.append(new Buffer([0x0a])); // NL (new line)


    // [Name] Print QR code
    // [Code] 1B 1D 79 50
    // [Function] Prints bar code data.
    // When receiving this command, if there is unprinted data in the image this.buffer, the printer will print the bar code after printing the unprinted print data.
    // A margin of more than 4 cells is required around the QR code. The user should ensure that space. Always check printed bar codes in actual use.
    this.append(this.config.QRCODE_PRINT);

  } else {
    settings = settings || {};

    // ------------------------------ Epson QR ------------------------------

    // [Name] Select the QR code model
    // [Code] 1D 28 6B 04 00 31 41 n1 n2
    // n1
    // [49 x31, model 1]
    // [50 x32, model 2]
    // [51 x33, micro qr code]
    // n2 = 0
    // https://reference.epson-biz.com/modules/ref_escpos/index.php?content_id=140
    if(settings.model) {
      if(settings.model == 1) this.append(this.config.QRCODE_MODEL1)
      else if(settings.model == 3) this.append(this.config.QRCODE_MODEL3)
      else this.append(this.config.QRCODE_MODEL2)
    } else {
      this.append(this.config.QRCODE_MODEL2)
    }

    // [Name]: Set the size of module
    // 1D 28 6B 03 00 31 43 n
    // n depends on the printer
    // https://reference.epson-biz.com/modules/ref_escpos/index.php?content_id=141
    if(settings.cellSize) {
      var i = "QRCODE_CELLSIZE_".concat(settings.cellSize.toString())
      this.append(this.config[i]);
    } else {
      this.append(this.config.QRCODE_CELLSIZE_3)
    }


    // [Name] Select the error correction level
    // 1D 28 6B 03 00 31 45 n
    // n
    // [48 x30 -> 7%]
    // [49 x31-> 15%]
    // [50 x32 -> 25%]
    // [51 x33 -> 30%]
    // https://reference.epson-biz.com/modules/ref_escpos/index.php?content_id=142
    if(settings.correction) {
      var i = "QRCODE_CORRECTION_".concat(settings.correction.toUpperCase())
      this.append(this.config[i]);
    } else {
      this.append(this.config.QRCODE_CORRECTION_M)
    }


    // [Name] Store the data in the symbol storage area
    // 1D 28  6B pL pH 31 50 30 d1...dk
    // https://reference.epson-biz.com/modules/ref_escpos/index.php?content_id=143
    var s = str.length + 3;
    var lsb = parseInt(s % 256);
    var msb = parseInt(s / 256);
    this.append(new Buffer([0x1d, 0x28, 0x6b, lsb, msb, 0x31, 0x50, 0x30]));
    this.append(new Buffer(str));


    // [Name] Print the symbol data in the symbol storage area
    // 1D 28 6B 03 00 31 51 m
    // https://reference.epson-biz.com/modules/ref_escpos/index.php?content_id=144
    this.append(this.config.QRCODE_PRINT);

  }
};


NodeThermalPrinter.prototype.printBarcode = function(data, type, settings){
  if (this.printerConfig.type == 'star'){
    // ------------------------------ Star Barcode ------------------------------
    console.error("Barcode not supported on STAR yet");

  } else {
    var settings = settings || {};

    //Set HRI characters Position, 0-3 (none, top, bottom, top/bottom)
    if(settings.hriPos){
      this.append(new Buffer([0x1d, 0x48])) // GS H
      this.append(new Buffer([settings.hriPos]))
    } else {
      this.append(new Buffer([0x1d, 0x48, 0x00]))
    }

    // Set HRI character font. 0-4, 48-52, 97, 98 (depending on printer, 0 and 1 available on all), default 0
    if(settings.hriFont){
      this.append(new Buffer([0x1d, 0x66])) // GS f
      this.append(new Buffer([settings.hriFont]))
    } else {
      this.append(new Buffer([0x1d, 0x66, 0x00]))
    }

    // Set width 2-6, default 3
    if(settings.width){
      this.append(new Buffer([0x1d, 0x77])) // GS W
      this.append(new Buffer([settings.width]))
    } else {
      this.append(new Buffer([0x1d, 0x77, 0x03]))
    }

    // Set height 1 - 255 default 162
    if(settings.height){
      this.append(new Buffer([0x1d, 0x68])) // GS h
      this.append(new Buffer([settings.height]))
    } else {
      this.append(new Buffer([0x1d, 0x68, 0xA2]))
    }

    // Print Barcode
    this.append(new Buffer([0x1d, 0x6b])) // GS k
    // Select type and bit length of data
    this.append(new Buffer([type, data.length]))
    // Data
    this.append(data)
  }
};

NodeThermalPrinter.prototype.maxiCode = function(data, settings){
  if (this.printerConfig.type == 'star') {
    console.error('MaxiCode not supported on Star yet')
  }
  else {
    var settings = settings || {};

    // Maxi Mode
    // 2 - Formatted data/structured Carrier Message with a numeric postal code. (US)
    // 3 - Formatted data/structured Carrier Message with a numeric postal code. (International)
    // 4 - Unformatted data/Standard Error Correction.
    // 5 - Unformatted data/Enhanced Error Correction.
    // 6 - Used for programming hardware devices.

    if(settings.mode) {
      if(settings.mode == 2) this.append(this.config.MAXI_MODE2)
      else if(settings.mode == 3) this.append(this.config.MAXI_MODE3)
      else if(settings.mode == 5) this.append(this.config.MAXI_MODE5)
      else if(settings.mode == 6) this.append(this.config.MAXI_MODE6)
      else this.append(this.config.MAXI_MODE4)
    } else {
      this.append(this.config.MAXI_MODE4)
    }

    // Setup size of MaxiCode data
    var s = data.length + 3;
    var lsb = parseInt(s % 256);
    var msb = parseInt(s / 256);

    // Send Data
    this.append(new Buffer([0x1d, 0x28, 0x6b, lsb, msb, 0x32, 0x50, 0x30]));
    this.append(new Buffer(data.toString()));

    // Print barcode
    this.append(this.config.MAXI_PRINT);
  }
};

NodeThermalPrinter.prototype.code128 = function(data, settings) {
  if (this.printerConfig.type == 'star') {
    this.append(this.config.BARCODE_CODE128);

    // Barcode option
    // 1 - No text
    // 2 - Text on bottom
    // 3 - No text inline
    // 4 - Text on bottom inline
    if(settings){
      if(settings.text == 1) this.append(this.config.BARCODE_CODE128_TEXT_1);
      else if(settings.text == 2) this.append(this.config.BARCODE_CODE128_TEXT_2);
      else if(settings.text == 3) this.append(this.config.BARCODE_CODE128_TEXT_3);
      else if(settings.text == 4) this.append(this.config.BARCODE_CODE128_TEXT_4);
    } else {
      this.append(this.config.BARCODE_CODE128_TEXT_2);
    }

    // Barcode width
    // 31 - Small
    // 32 - Medium
    // 33 - Large
    if(settings) {
      if (settings.width == "SMALL") this.append(this.config.BARCODE_CODE128_WIDTH_SMALL);
      else if (settings.width == "MEDIUM") this.append(this.config.BARCODE_CODE128_WIDTH_MEDIUM);
      else if (settings.width == "LARGE") this.append(this.config.BARCODE_CODE128_WIDTH_LARGE);
    } else {
      this.append(this.config.BARCODE_CODE128_WIDTH_LARGE);
    }

    // Barcode height
    if(settings && settings.height) this.append(new Buffer([settings.height]));
    else this.append(new Buffer([0x50]));

    // Barcode data
    this.append(new Buffer(data.toString()));

    // Append RS(record separator)
    this.append(new Buffer([0x1e]));
  } else {
    console.error("Code128 not supported on EPSON yet");
  }
};


// ----------------------------------------------------- PRINT IMAGE EPSON -----------------------------------------------------
// https://reference.epson-biz.com/modules/ref_escpos/index.php?content_id=88
NodeThermalPrinter.prototype._printImageEpson = function(image, callback){
  fs.createReadStream(image).pipe(new PNG({
    filterType: 4
  })).on('parsed', function() {
    this._printImageBufferEpson(this.width, this.height, this.data, function(done){
      callback(done);
    }.bind(this));
  }.bind(this));
};


NodeThermalPrinter.prototype._printImageBufferEpson = function(width, height, data, callback){
  // Get pixel rgba in 2D array
  var pixels = [];
  for (var i = 0; i < height; i++) {
    var line = [];
    for (var j = 0; j < width; j++) {
      var idx = (width * i + j) << 2;
      line.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3]
      });
    }
    pixels.push(line);
  }

  var imageBuffer = new Buffer([]);
  for (var i = 0; i < height; i++) {
    for (var j = 0; j < parseInt(width/8); j++) {
      var byte = 0x0;
      for (var k = 0; k < 8; k++) {
        var pixel = pixels[i][j*8 + k];
        if(pixel.a > 126){ // checking transparency
          var grayscale = parseInt(0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b);

          if(grayscale < 128){ // checking color
            var mask = 1 << 7-k; // setting bitwise mask
            byte |= mask; // setting the correct bit to 1
          }
        }
      }

      imageBuffer = Buffer.concat([imageBuffer, new Buffer([byte])]);
    }
  }

  // Print raster bit image
  // GS v 0
  // 1D 76 30	m	xL xH	yL yH d1...dk
  // xL = (this.width >> 3) & 0xff;
  // xH = 0x00;
  // yL = this.height & 0xff;
  // yH = (this.height >> 8) & 0xff;
  // https://reference.epson-biz.com/modules/ref_escpos/index.php?content_id=94

  this.append(new Buffer ([0x1d, 0x76, 0x30, 48]));
  this.append(new Buffer ([(width >> 3) & 0xff]));
  this.append(new Buffer ([0x00]));
  this.append(new Buffer ([height & 0xff]));
  this.append(new Buffer ([(height >> 8) & 0xff]));

  // append data
  this.append(imageBuffer);

  callback(true);
};


// ----------------------------------------------------- PRINT IMAGE STAR -----------------------------------------------------
NodeThermalPrinter.prototype._printImageStar = function(image, callback){
  fs.createReadStream(image).pipe(new PNG({
    filterType: 4
  })).on('parsed', function() {
    this._printImageBufferStar(this.width, this.height, this.data, function(done){
      callback(done);
    }.bind(this));
  }.bind(this));
};


NodeThermalPrinter.prototype._printImageBufferStar = function(width, height, data, callback){
  // Get pixel rgba in 2D array
  var pixels = [];
  for (var i = 0; i < height; i++) {
    var line = [];
    for (var j = 0; j < width; j++) {
      var idx = (width * i + j) << 2;
      line.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3]
      });
    }
    pixels.push(line);
  }

  this.append(new Buffer([0x1b, 0x30]));

  // v3
  for(var i = 0; i < Math.ceil(height/24); i++){
    var imageBuffer = new Buffer([]);
    for(var y = 0; y < 24; y++){

      for (var j = 0; j < Math.ceil(width/8); j++) {
        var byte = 0x0;

        for (var x = 0; x < 8; x++) {

          if((i*24 + y < pixels.length) && (j*8 + x < pixels[i*24 + y].length)){
            var pixel = pixels[i*24 + y][j*8 + x];
            if(pixel.a > 126){ // checking transparency
              var grayscale = parseInt(0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b);

              if(grayscale < 128){ // checking color
                var mask = 1 << 7-x; // setting bitwise mask
                byte |= mask; // setting the correct bit to 1
              }
            }
          }
        }

        imageBuffer = Buffer.concat([imageBuffer, new Buffer([byte])]);
      }
    }
    this.append(new Buffer([0x1b, 0x6b, parseInt(imageBuffer.length/24), 0x00]));
    this.append(imageBuffer);
    this.append(new Buffer("\n"));
  }

  this.append(new Buffer([0x1b, 0x7a, 0x01]));

  callback(true);
};



// ----------------------------------------------------- PRINT IMAGE -----------------------------------------------------
NodeThermalPrinter.prototype.printImage = function(image, callback){
  try {
    // Check if file exists
    fs.accessSync(image);

    if(image.slice(-4) == ".png"){ // Check for file type
      if (this.printerConfig.type == 'star'){
        this._printImageStar(image, function(response){
          callback(response);
        });
      } else {
        this._printImageEpson(image, function(response){
          callback(response);
        });
      }
    } else {
      console.error("Image printing supports only PNG files.");
      callback(false);
    }
  }
  catch (e) {
    callback(false);
  }
};

// ----------------------------------------------------- PRINT IMAGE BUFFER -----------------------------------------------------
NodeThermalPrinter.prototype.printImageBuffer = function(buffer, callback){
  var png = new PNG({
    filterType: 4
  }).parse(buffer);

  png.on('parsed', function() {
    if (this.printerConfig.type == 'star'){
      this._printImageBufferStar(this.width, this.height, this.data, function(response){
        callback(response);
      });
    } else {
      this._printImageBufferEpson(this.width, this.height, this.data, function(response){
        callback(response);
      });
    }
  });
};


// ----------------------------------------------------- PRINT PDF417 -----------------------------------------------------
NodeThermalPrinter.prototype.pdf417 = function(data, settings) {
  if (this.printerConfig.type == 'star') {
    //(1) Bar code type setting (<ESC> <GS> “x” “S”)
    //(2) Bar code data setting (<ESC> <GS> “x” “D”)
    //(3) Bar code printing (<ESC> <GS> “x” “P”)
    //(4) Bar code expansion information acquisition (<ESC> <GS> “x” “I”)


    // Set PDF417 bar code size
    // 1B 1D 78 53 30 n p1 p2
    this.append(new Buffer([0x1b, 0x1d, 0x78, 0x53, 0x30, 0x00, 0x01, 0x02]));

    // Set PDF417 ECC (security level)
    // 1B 1D 78 53 31 n
    this.append(new Buffer([0x1b, 0x1d, 0x78, 0x53, 0x31, 0x02]));

    // Set PDF417 module X direction size
    // 1B 1D 78 53 32 n
    this.append(new Buffer([0x1b, 0x1d, 0x78, 0x53, 0x32, 0x02]));

    // Set PDF417 module aspect ratio
    // 1B 1D 78 53 33 n
    this.append(new Buffer([0x1b, 0x1d, 0x78, 0x53, 0x33, 0x03]));

    // Set PDF417 bar code data
    // 1B 1D 78 44 nL nH d1 d2 … dk
    var s = data.length;
    var lsb = parseInt(s % 256);
    var msb = parseInt(s / 256);

    this.append(new Buffer([0x1b, 0x1d, 0x78, 0x44]));
    this.append(new Buffer([lsb, msb]));  // nL, nH
    this.append(new Buffer(data.toString()));  // Data
    this.append(new Buffer([0x0a])); // NL (new line)


    // Print PDF417 bar code
    // 1B 1D 78 50
    this.append(new Buffer([0x1b, 0x1d, 0x78, 0x50]));

  } else {
    settings = settings || {};

    // Set error correction ratio 1 - 40
    if(settings.correction){
      this.append(this.config.PDF417_CORRECTION)
      this.append(new Buffer([settings.correction]))
    } else {
      this.append(this.config.PDF417_CORRECTION)
      this.append(new Buffer([0x01]))
    }

    // Set row height 2 - 8
    if(settings.rowHeight){
      this.append(this.config.PDF417_ROW_HEIGHT)
      this.append(new Buffer([settings.rowHeight]))
    } else {
      this.append(this.config.PDF417_ROW_HEIGHT)
      this.append(new Buffer([0x03]))
    }

    // Set width of module 2 - 8
    if(settings.width){
      this.append(this.config.PDF417_WIDTH)
      this.append(new Buffer([settings.width]))
    } else {
      this.append(this.config.PDF417_WIDTH)
      this.append(new Buffer([0x03]))
    }

    // Manualy set columns 1 - 30
    if(settings.columns){
      this.append(this.config.PDF417_COLUMNS)
      this.append(new Buffer([settings.columns]))
    } else {
      // Defualt to auto
      this.append(this.config.PDF417_COLUMNS)
      this.append(new Buffer([0x00]))
    }

    // Standrad or truncated option
    if(settings.truncated) this.append(this.config.PDF417_OPTION_TRUNCATED)
    else this.append(this.config.PDF417_OPTION_STANDARD)

    // Set PDF417 bar code data
    var s = data.length + 3;
    var lsb = parseInt(s % 256);
    var msb = parseInt(s / 256);

    this.append(new Buffer([0x1d, 0x28, 0x6b, lsb, msb, 0x30, 0x50, 0x30]));
    this.append(new Buffer(data.toString()));

    //Print barcode
    this.append(new Buffer(this.config.PDF417_PRINT))
  }
};


NodeThermalPrinter.prototype.raw = function(text,cb) {
  if (this.printerConfig.ip) {
    var printer = this.net.connect({
      host: this.printerConfig.ip,
      port: this.printerConfig.port
    });
    printer.write(text);
    printer.end();

  } else {
    writeFile(this.printerConfig.interface, text, function (err) {
      if (err) {
        if ('function' == typeof cb) {
          cb("Print failed: " + err);
        } else {
          console.error("Print failed", err);
        }
      } else {
        if ('function' == typeof cb) {
          cb("Print failed: " + err);
        } else {
          console.log("Print done");
        }
      }
    }.bind(this));
  }
};

NodeThermalPrinter.prototype.setInternationalCharacterSet = function(charSet){
  if (this.printerConfig.type == 'star') {
    // ------------------------------ Star Character set ------------------------------
    if(charSet == "USA") return this.config.CHARCODE_PC437;
    if(charSet == "JAPANESE") return this.config.CHARCODE_JIS;
    if(charSet == "MULTI") return this.config.CHARCODE_PC850;
    if(charSet == "PORTUGUESE") return this.config.CHARCODE_PC860;
    if(charSet == "CANADIAN") return this.config.CHARCODE_PC863;
    if(charSet == "NORDIC") return this.config.CHARCODE_PC865;
    if(charSet == "WEU") return this.config.CHARCODE_WEU;
    if(charSet == "GREEK") return this.config.CHARCODE_GREEK;
    if(charSet == "HEBREW") return this.config.CHARCODE_HEBREW;
    if(charSet == "WESTEUROPE") return this.config.CHARCODE_PC1252;
    if(charSet == "CIRLILLIC") return this.config.CHARCODE_PC866;
    if(charSet == "LATIN2") return this.config.CHARCODE_PC852;
    if(charSet == "SLOVENIA") return this.config.CHARCODE_PC852;
    if(charSet == "EURO") return this.config.CHARCODE_PC858;
    if(charSet == "THAI42") return this.config.CHARCODE_THAI42;
    if(charSet == "THAI11") return this.config.CHARCODE_THAI11;
    if(charSet == "THAI13") return this.config.CHARCODE_THAI13;
    if(charSet == "THAI14") return this.config.CHARCODE_THAI14;
    if(charSet == "THAI16") return this.config.CHARCODE_THAI16;
    if(charSet == "THAI17") return this.config.CHARCODE_THAI17;
    if(charSet == "THAI18") return this.config.CHARCODE_THAI18;
    return null;
  } else {
    // ------------------------------ Epson Character set ------------------------------
    if(charSet == "USA") return this.config.CHARCODE_USA;
    if(charSet == "FRANCE") return this.config.CHARCODE_FRANCE;
    if(charSet == "GERMANY") return this.config.CHARCODE_GERMANY;
    if(charSet == "UK") return this.config.CHARCODE_UK;
    if(charSet == "DENMARK1") return this.config.CHARCODE_DENMARK1;
    if(charSet == "SWEDEN") return this.config.CHARCODE_SWEDEN;
    if(charSet == "ITALY") return this.config.CHARCODE_ITALY;
    if(charSet == "SPAIN1") return this.config.CHARCODE_SPAIN1;
    if(charSet == "JAPAN") return this.config.CHARCODE_JAPAN;
    if(charSet == "NORWAY") return this.config.CHARCODE_NORWAY;
    if(charSet == "DENMARK2") return this.config.CHARCODE_DENMARK2;
    if(charSet == "SPAIN2") return this.config.CHARCODE_SPAIN2;
    if(charSet == "LATINA") return this.config.CHARCODE_LATINA;
    if(charSet == "KOREA") return this.config.CHARCODE_KOREA;
    if(charSet == "SLOVENIA") return this.config.CHARCODE_SLOVENIA;
    if(charSet == "CHINA") return this.config.CHARCODE_CHINA;
    if(charSet == "VIETNAM") return this.config.CHARCODE_VIETNAM;
    if(charSet == "ARABIA") return this.config.CHARCODE_ARABIA;
    return null;
  }
};

NodeThermalPrinter.prototype.append = function(buff){

  if(typeof buff == "string"){

    // Remove special characters
    if(this.printerConfig.removeSpecialCharacters) {
      var unorm = require('unorm');
      var combining = /[\u0300-\u036F]/g;
      buff = unorm.nfkd(buff).replace(combining, '');
    }

    var endBuff = null;
    for(var i=0; i<buff.length; i++){
      var value = buff[i];
      var tempBuff = new Buffer(value);

      // Replace special characters
      if(this.printerConfig.replaceSpecialCharacters) {
        for(var key in this.config.specialCharacters){
          if(value == key){
            tempBuff = new Buffer([this.config.specialCharacters[key]]);
            break;
          }
        }
      }

      if(endBuff) endBuff = Buffer.concat([endBuff,tempBuff]);
      else endBuff = tempBuff;
    }

    buff = endBuff;
  }

  // Append character set
  if(!this.buffer && this.printerConfig.characterSet) this.buffer = this.setInternationalCharacterSet(this.printerConfig.characterSet);

  // Append new this.buffer
  if (this.buffer) {
    this.buffer = Buffer.concat([this.buffer,buff]);
  } else {
    this.buffer = buff;
  }
};

module.exports = NodeThermalPrinter;

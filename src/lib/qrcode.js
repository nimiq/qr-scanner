/*
   Copyright 2011 Lazar Laszlo (lazarsoft@gmail.com, www.lazarsoft.info)
   
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/


var qrcode = {};
qrcode.imagedata = null;
qrcode.width = 0;
qrcode.height = 0;
qrcode.qrCodeSymbol = null;
qrcode.debug = false;
qrcode.maxImgSize = 1024*1024;

qrcode.sizeOfDataLengthInfo =  [  [ 10, 9, 8, 8 ],  [ 12, 11, 16, 10 ],  [ 14, 13, 16, 12 ] ];

qrcode.callback = null;

qrcode.decode = function(imageData) {
    qrcode.imagedata = imageData;
    qrcode.width = imageData.width;
    qrcode.height = imageData.height;
    qrcode.result = qrcode.process();
    if(qrcode.callback!=null)
        qrcode.callback(qrcode.result);
    return qrcode.result;
}

qrcode.isUrl = function(s)
{
    try {
        new URL(s);
        return true;
    } catch(e) {
        return false;
    }
}

qrcode.decode_url = function (s)
{
  var escaped = "";
  try{
    escaped = escape( s );
  }
  catch(e)
  {
    console.log(e);
    escaped = s;
  }
  var ret = "";
  try{
    ret = decodeURIComponent( escaped );
  }
  catch(e)
  {
    console.log(e);
    ret = escaped;
  }
  return ret;
}

qrcode.decode_utf8 = function ( s )
{
    if(qrcode.isUrl(s))
        return qrcode.decode_url(s);
    else
        return s;
}

qrcode.process = function(){
    var inputRgba = qrcode.imagedata.data;
    // asign the grayscale and binary image within the rgba buffer as the rgba image will not be needed anymore
    var offset = 0;
    var grayscaleImage = new Uint8ClampedArray(inputRgba.buffer, offset, qrcode.width * qrcode.height);
    offset += qrcode.width * qrcode.height;
    var binaryImage = new Uint8ClampedArray(inputRgba.buffer, offset, qrcode.width * qrcode.height);
    offset += qrcode.width * qrcode.height;
    var binarizerBufferSize = Binarizer.calculateRequiredBufferSize(qrcode.width, qrcode.height);
    var binarizerBuffer = new Uint8ClampedArray(inputRgba.buffer, offset, binarizerBufferSize);

    qrcode.grayscale(inputRgba, qrcode.width, qrcode.height, grayscaleImage);
    Binarizer.binarize(grayscaleImage, qrcode.width, qrcode.height, binaryImage, binarizerBuffer);

    var debugImage;
    if(qrcode.debug)
    {
        debugImage = new ImageData(new Uint8ClampedArray(qrcode.width * qrcode.height * 4), qrcode.width, qrcode.height);
        for (var y = 0; y < qrcode.height; y++)
        {
            for (var x = 0; x < qrcode.width; x++)
            {
                var point = (x * 4) + (y * qrcode.width * 4);
                var pixel = /*grayscaleImage[y * qrcode.width + x];*/ binaryImage[y * qrcode.width + x]? 0 : 255;
                debugImage.data[point] = pixel;
                debugImage.data[point+1] = pixel;
                debugImage.data[point+2] = pixel;
                debugImage.data[point+3] = 255; // alpha
            }
        }
    }

    try {
        var detector = new Detector(binaryImage);

        var qRCodeMatrix = detector.detect(); // throws if no qr code was found

        if (qrcode.debug) {
            for (var y = 0; y < qRCodeMatrix.bits.getHeight(); y++) {
                for (var x = 0; x < qRCodeMatrix.bits.getWidth(); x++) {
                    var point = (x * 4 * 2) + (y * 2 * qrcode.width * 4);
                    var isSet = qRCodeMatrix.bits.get_Renamed(x, y)
                    debugImage.data[point] = isSet ? 0 : 255;
                    debugImage.data[point + 1] = isSet ? 0 : 255;
                    debugImage.data[point + 2] = 255;
                }
            }
        }
    } finally {
        if (qrcode.debug) {
            sendDebugImage(debugImage);
        }
    }

    
    
    var reader = Decoder.decode(qRCodeMatrix.bits);
    var data = reader.getDataByte();
    var str="";
    for(var i=0;i<data.length;i++)
    {
        for(var j=0;j<data[i].length;j++)
            str+=String.fromCharCode(data[i][j]);
    }
    
    return qrcode.decode_utf8(str);
}

qrcode.grayscaleWeights = {
    // weights for quick luma integer approximation (https://en.wikipedia.org/wiki/YUV#Full_swing_for_BT.601)
    red: 77,
    blue: 150,
    green: 29
};
qrcode.grayscale = function(inputRgba, width, height, out_grayscale)
{
    var weightRed = qrcode.grayscaleWeights.red;
    var weightBlue = qrcode.grayscaleWeights.blue;
    var weightGreen = qrcode.grayscaleWeights.green;
    for (var y = 0; y < height; y++)
    {
        for (var x = 0; x < width; x++)
        {
            var index = y*width + x;
            var rgbaIndex = 4 * index;
            // based on quick luma integer approximation (https://en.wikipedia.org/wiki/YUV#Full_swing_for_BT.601)
            out_grayscale[index] = (weightRed * inputRgba[rgbaIndex] + weightBlue * inputRgba[rgbaIndex+1] +
                weightGreen * inputRgba[rgbaIndex+2] + 128) >> 8;
        }
    }
}




function URShift( number,  bits)
{
    if (number >= 0)
        return number >> bits;
    else
        return (number >> bits) + (2 << ~bits);
}
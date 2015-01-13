// Utils
var p = function(msg) { console.log(niceTime() + '  ' + String(msg)); }
var oneSecond = 1000, oneMinute = 60 * oneSecond, oneHour = 60 * oneMinute, oneDay = 24 * oneHour;
var niceTime = function(date) { date = date || new Date(); var now = date.getTime(), hours = Math.floor((now % oneDay) / oneHour), minutes = Math.floor((now % oneHour) / oneMinute), seconds = Math.floor((now % oneMinute) / oneSecond), mseconds = (now % oneSecond); return padZero(hours) + ':' + padZero(minutes) + ':' + padZero(seconds) + '.' + mseconds; }
var padZero = function(number) { number = parseInt(number, 10); if (number < 10) { return '0' + String(number); } return String(number); }

// Requires
var colors = require('colors'),
    config = require('./config.json'),
    binaryServer = require('binaryjs').BinaryServer,
    server = binaryServer({port: config.socketPort}),
    wav = require('wav'),
    i;

// Logic

p('server started'.bold);

server.on('connection', function(client) {
  p('client connected'.green);

  var fileWriter;

  client.on('stream', function(stream, meta) {
    p('new stream'.bold.green)
    var fileWriter = new wav.FileWriter(config.audioFilesRoot + niceTime() + '.wav', {
      channels: 1,
      sampleRate: 48000,
      bitDepth: 16
    });
    stream.pipe(fileWriter);
    stream.on('data', function() {
      p('stream data'.gray);
    });
    stream.on('end', function() {
      p('stream end'.bold.red)
      fileWriter.end();
    });
  });

  client.on('close', function() {
    p('client disconnected'.red)
    if (fileWriter != null) {
      fileWriter.end();
    }
  });

});
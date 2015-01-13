var p = function(msg) {
  console.log(utils.niceTime() + '  ' + String(msg));
}

var UserMedia = function() {

  p('UserMedia: create');

  var stream;

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

  var errorCallback = function(error) {
    p('UserMedia: error');

    error = typeof error === 'object' && error.name || error;

    switch(error) {
      case 'PERMISSION_DENIED':
      case 'PermissionDeniedError':
        p('The user denied permission to use a media device required for the operation.');
        break;
      case 'NOT_SUPPORTED_ERROR':
        p('A constraint specified is not supported by the browser.');
        break;
      case 'MANDATORY_UNSATISFIED_ERROR':
        p('No media tracks of the type specified in the constraints are found.');
        break;
      default:
        p(error);
    }
  }

  var init = function(constraints, success) {

    p('UserMedia: init');

    constraints = constraints || { video: true, audio: true };
    
    var successCallback = function(localMediaStream) {
      p('UserMedia: success');
      stream = localMediaStream;
      
      if (success) {
        success(localMediaStream);
      }
    }
    
    if (navigator.getUserMedia) {
      navigator.getUserMedia(constraints, successCallback, errorCallback);
    } else {
      p('UserMedia: your browser doesn\'t support access to media sources');
      alert('Your browser doesn\'t support access to media sources');
    }
  }

  var stop = function() {
    p('UserMedia: stop');
    stream.stop();
  }

  return {
    init: init,
    stop: stop
  };
}

var Socket = function() {
  
  p('Socket: create');
  
  var client,
      socketStream;
  
  var init = function(host, port) {
    p('Socket: init');

    host = host || '127.0.0.1';
    port = port || '80';

    client = new BinaryClient('ws://' + host + ':' + port + '/');
    client.on('open', function() {
      p('Socket: client open');
      socketStream = client.createStream();
    });

  }
  
  var write = function(chunk) {
    p('Socket: write');
    socketStream.write(chunk);
  }
  
  var close = function() {
    p('Socket: close');
    socketStream.end();
    client.close();
  }
  
  return {
    init: init,
    write: write,
    close: close
  };
}

var Recorder = function() {

  p('Recorder: create');
  
  var recorder;

  var init = function(localMediaStream, bufferSize, recorderProcessCallback) {
    p('Recorder: init');

    bufferSize = bufferSize || 1024;

    // Processing audio stream
    var context = new window.AudioContext(),
        audioInput = context.createMediaStreamSource(localMediaStream);

    // Every audio sample will go through this callback
    var recorderProcess = function(e) {
      p('Recorder: process');
      var left = e.inputBuffer.getChannelData(0);
      if (recorderProcessCallback) {
        recorderProcessCallback(utils.convertFloat32ToInt16(left));
      }
    }

    // Create a javascript node
    // Deprecated and should be replaced by Audio Workers soon:
    // https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode
    recorder = context.createScriptProcessor(bufferSize, 1, 1);
    // specify the processing function
    recorder.onaudioprocess = recorderProcess;
    // connect stream to our recorder
    audioInput.connect(recorder);
    // connect our recorder to the previous destination
    recorder.connect(context.destination);
  }
  
  var stop = function() {
    p('Recorder: stop');
    recorder.onaudioprocess = null;
  }

  return {
    init: init,
    stop: stop
  };
}

var Utils = function() {

  var oneSecond = 1000,
      oneMinute = 60 * oneSecond,
      oneHour = 60 * oneMinute,
      oneDay = 24 * oneHour;
  
  var niceDuration = function(from, until) {
    var fromTime = from.getTime(),
        untilTime = until.getTime(),
        duration = (untilTime - fromTime),
        durationHours = Math.floor(duration / oneHour),
        durationMinutes = Math.floor((duration % oneHour) / oneMinute),
        durationSeconds = Math.floor((duration % oneMinute) / oneSecond),
        durationMSeconds = (duration % oneSecond);
    
    return padZero(durationHours) + ':' + padZero(durationMinutes) + ':' + utils.padZero(durationSeconds) + '.' + String(durationMSeconds);
  }
  
  var niceTime = function(date) {
    date = date || new Date();
    var now = date.getTime(),
        hours = Math.floor((now % oneDay) / oneHour),
        minutes = Math.floor((now % oneHour) / oneMinute),
        seconds = Math.floor((now % oneMinute) / oneSecond),
        mseconds = (now % oneSecond);
    return padZero(hours) + ':' + padZero(minutes) + ':' + utils.padZero(seconds) + '.' + mseconds;
  }
  
  var padZero = function(number) {
    
    number = parseInt(number, 10);
    
    if (number < 10) {
      return '0' + String(number);
    }
    
    return String(number);
  }
  
  var convertFloat32ToInt16 = function(buffer) {
    l = buffer.length;
    buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, buffer[l])*0x7FFF;
    }
    return buf.buffer;
  }

  return {
    niceDuration: niceDuration,
    convertFloat32ToInt16: convertFloat32ToInt16,
    padZero: padZero,
    niceTime: niceTime
  };
}



var utils = Utils()
    socket = Socket(),
    audio = UserMedia(),
    recorder = Recorder();


var handleMouseup = function() {
  
  var button,
      start,
      status = 'waiting';
  
  var startRecording = function() {
    button.innerHTML = 'Initializing..';
    button.setAttribute('disabled', 'disabled');
  
    socket.init('192.168.178.97', '3005');
    audio.init({audio: true}, function(localMediaStream) {
    
      button.removeAttribute('disabled');
      start = new Date();

      recorder.init(localMediaStream, 2048, function(chunk) {
        var now = new Date(),
            recordingDuration = utils.niceDuration(start, now);
        button.innerHTML = 'Stop recording: ' + recordingDuration;
        socket.write(chunk);
      });

      // Use audio object to play audio stream
      // var audioContainer = document.querySelector('audio')
      // audioContainer.srcObject = localMediaStream;
      // audioContainer.src = window.URL.createObjectURL(localMediaStream);
    });
  }
  
  var stopRecording = function() {
    button.setAttribute('disabled', 'disabled');
    recorder.stop();
    socket.close();
    audio.stop();

    var now = new Date(),
        recordingDuration = utils.niceDuration(start, now);
    button.innerHTML = 'Recorded: ' + recordingDuration;
  }
  
  return function(event) {
    switch (status) {
      case 'waiting':
        button = event.target;
        status = 'recording';
        startRecording();
        break;
      case 'recording':
        status = 'finished';
        stopRecording();
        break;
      case 'finished':
      default:
        alert('Please refresh page to record again');
        break;
    }
  }
}

document.getElementById('startRecording').addEventListener('mouseup', handleMouseup());

 if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);
//const roomHash = '5dfd9b';
console.log("ROOM ID: >> " +roomHash);

// TODO: Replace with your own channel ID
const drone = new ScaleDrone('rNJKWINZW3VIAWU2');
// Room name needs to be prefixed with 'observable-'
const roomName = 'observable-' + roomHash;
//const roomName = 'observable-testPHR';
const configuration = {
    'iceServers': [
    {
      'url': 'turn:numb.viagenie.ca',
      'credential':'iHelpRobotics',
      'username': 'alexandruhang@yahoo.com'
    },
  ]
};
let room;
let pc;


function onSuccess() {
    console.log("Connection sucess");
};
function onError(error) {
  console.log("Connection failed!");
  //console.error(error);
};

drone.on('open', error => {

  if (error) {
     console.log( " Error open drone >>");
    return console.error(error);
  }
  console.log(" Drone open >>")
  room = drone.subscribe(roomName);
  room.on('open', error => {
    if (error) {
      onError(error);
    }
  });

  // We're connected to the room and received an array of 'members'
  // connected to the room (including us). Signaling server is ready.
  room.on('members', members => {
    console.log('MEMBERS', members);
    // If we are the second user to connect to the room we will be creating the offer
    const isOfferer = members.length === 2;
    startWebRTC(isOfferer);
  });
});

// Send signaling data via Scaledrone
function sendMessage(message) {
    console.log("Sending signal via scaledrone >>");
  drone.publish({
    room: roomName,
    message
  });
}

function startWebRTC(isOfferer) {
  console.log('Starting WebRTC in as', isOfferer ? 'offerer' : 'waiter');
  pc = new RTCPeerConnection(configuration);

  console.log(" Test A ");
  // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
  // message to the other peer through the signaling server
  pc.onicecandidate = event => {
    console.log("Send Message to Candidate");
    if (event.candidate) {
      sendMessage({'candidate': event.candidate});
    }
  };

  console.log(" Test B ");
  // If user is offerer let the 'negotiationneeded' event create the offer
  if (isOfferer) {
      console.log(" Create Offer ");
    pc.onnegotiationneeded = () => {
      pc.createOffer().then(localDescCreated).catch(onError);
    }
  }

  console.log(" Test C ");
  // When a remote stream arrives display it in the #remoteVideo element
  pc.ontrack = event => {
    console.log("Display remote video >>>")
    const stream = event.streams[0];
    console.log(" Stream : >>" +stream);
    if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
      remoteVideo.srcObject = stream;
    }
  };

  console.log(" Test D ");

  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  }).then(stream => {
    console.log(" Display Local Video >> ");
    // Display your local video in #localVideo element
    localVideo.srcObject = stream;
    // Add your stream to be sent to the conneting peer
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  }, onError);

 console.log(" Test E ");
  // Listen to signaling data from Scaledrone
  room.on('data', (message, client) => {
    // Message was sent by us
    if (client.id === drone.clientId) {
      return;
    }

console.log(" Test F ");

    if (message.sdp) {
      // This is called after receiving an offer or answer from another peer
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
        // When receiving an offer lets answer it
        if (pc.remoteDescription.type === 'offer') {
          console.log(" Answer call ");
          pc.createAnswer().then(localDescCreated).catch(onError);
        }
      }, onError);
    } else if (message.candidate) {
      // Add the new ICE candidate to our connections remote description
      pc.addIceCandidate(
        new RTCIceCandidate(message.candidate), onSuccess, onError
      );
    }

  });
}

function localDescCreated(desc) {
  pc.setLocalDescription(
    desc,
    () => sendMessage({'sdp': pc.localDescription}),
    onError
  );
}

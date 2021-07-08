/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useEffect, useRef, useState} from 'react';
import Config from 'react-native-config';

import type {Node} from 'react';

import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  useColorScheme,
} from 'react-native';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals,
} from 'react-native-webrtc';

import io from 'socket.io-client';

const dimensions = Dimensions.get('window');

let pc, socket = null;

export default function App() {
// const App: () => Node = () => {
  // const videoRef = useRef();
  // const remoteVideoRef = useRef();

  const [state, setState] = useState({
    localStream: null,
    remoteStream: null,
  });

  const sdp_ref = useRef();
  const candidates = useRef([]);
  // const [pc, setPC] = useState();
  // const socket_ref = useRef(null);
  // const socket = socket_ref.current;

  // const pc_config = null;
  // configuration object example

  // const socket = io(
  //   '/webrtcPeer'
  // );// worked
  // const socket = io(`https://${Config.DOMAIN_MAIN}/socket.io`);
  // socket = io.connect(`https://${Config.DOMAIN_MAIN}/webrtcPeer`, {
  //   path: '/socket.io',
  //   query: {ns:'webrtcPeer'},
  // });// works, but namespace isn't showing properly
  // its a const so maybe it only sets once

  
  
  useEffect(() => {

    console.log('[RocketNative] connecting...');
    console.log('[RocketNative] config = ', Config);
    console.log('[RocketNative] config DOMAIN_MAIN ', Config.DOMAIN_MAIN);

    socket = io(`https://${Config.DOMAIN_MAIN}/webrtcPeer`);// fails - no namespace

    // socket = io(`https://${Config.DOMAIN_MAIN}/webrtcPeer`, {
    //   reconnect: true,
    // });// fails - no change in namespace detection
    // socket = io("167.99.57.20:3002");// fails to connect

    // socket = io("https://167.99.57.20:3002");// fails to connect
    // socket = io("https://167.99.57.20:3002/webrtcPeer");// fails to connect
    
    // socket = io(`https://${Config.DOMAIN_MAIN}/webrtcPeer`, {
    //   path: '/socket.io',
    //   query: { ns: 'webrtcPeer' },
    // });// works, but namespace isn't showing properly

    socket.on("connect", () => {
      const transport = socket.io.engine.transport.name; // in most cases, "polling"
      console.log(`[io] transport`, transport);

      socket.io.engine.on("upgrade", () => {
        const upgradedTransport = socket.io.engine.transport.name; // in most cases, "websocket"
        console.log(`[io] upgradedTransport`, upgradedTransport);
      });
    });


    socket.on('connection-success', success => {
      console.log('[success]', success);
    });

    socket.on('offerOrAnswer', sdp => {
      sdp_ref.current = JSON.stringify(sdp);
      setRemoteDescription();// i put this here the instructor kept hitting the btn
    });// offerOrAnswer

    socket.on('candidate', candidate => {
      console.log('receiving candidates...');
      candidates.current = [...candidates.current, candidate];
      // we can set this to auto answer or only on btn approval
      addCandidate(); // FUTURE: in one to one calls this should pick up immediately
      // FUTURE: in selective broadcasts this should only set the candidate of the host selected socketID
      // we can separate it by using a json indicator, it will also not add to the candidates array
      // but replace it
    });

    const pc_config = {
      iceServers: [
        // {
        //   urls: 'stun[STUN-IP]:[PORT]',
        //   credential: '[YOUR CREDENTIAL]',
        //   username: '[USERNAME]'
        // },
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    }; // pc_config

    pc = new RTCPeerConnection(pc_config);
  // get access to the camera

    pc.onicecandidate = e => {
      // if(e.candidate) console.log(JSON.stringify(e.candidate));
      sendToPeer('candidate', e.candidate);
    }; // onicecandidate

    pc.oniceconnectionstatechange = e => {
      console.log(e);
    }; // oniceconnecionstatechange

    pc.onaddstream = e => {
      // remoteVideoRef.current.srcObject = e.stream;
      setState(prev => {
        return {...prev, remoteStream: e.stream};
      });
    }; // onaddstream

    // const constraints = { video: true };//audio: true
    // const constraints = {video: true, audio: true};// this audio: true may be the src for a mute btn, same with video

    // both set to false may be the key to receiving and watching a stream without sending sending one (in a way - still sending an empty one)

    const success = stream => {
      // videoRef.current.srcObject = stream;
      console.log(`[App] stream`, stream);
      console.log(`[App] stream.toURL`,stream.toURL());
      setState(prev => {
        return {...prev, localStream: stream};
      });
      pc.addStream(stream);
    }; // success

    const failure = e => {
      console.log('[getUserMedia] error:', e);
    };

    let isFront = true;
    mediaDevices.enumerateDevices().then(sourceInfos => {
      console.log(`[App] mediaDevices sourceInfos`,sourceInfos);
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (
          sourceInfo.kind == 'videoinput' &&
          sourceInfo.facing == (isFront ? 'front' : 'environment')
        ) {
          videoSourceId = sourceInfo.deviceId;
        }
      }
      // let constraints = {
      //   audio: true,
      //   video: {
      //     width: 640,
      //     height: 480,
      //     frameRate: 30,
      //     facingMode: isFront ? 'user' : 'environment',
      //     deviceId: videoSourceId,
      //   },
      // };

      const constraints = {
        audio: true,
        video: {
          mandatory: {
            minWidth: 500, // Provide your own width, height and frame rate here
            minHeight: 300,
            minFrameRate: 30
          },
          facingMode: (isFront ? "user" : "environment"),
          optional: (videoSourceId ? [{ sourceId: videoSourceId }] : [])
        }
      }

      mediaDevices.getUserMedia(constraints).then(success).catch(failure);
    });
  }, []);

  const sendToPeer = (messageType, payload) => {
    socket.emit(messageType, {
      socketID: socket.id,
      payload,
    });
  }; // sendToPeer

  const createOffer = () => {
    console.log('[Offer]');
    pc.createOffer({offerToReceiveVideo: 1})
      .then( sdp => {
        // console.log('[sdp]',JSON.stringify(sdp));
        pc.setLocalDescription(sdp); // set my own sdp

        sendToPeer('offerOrAnswer', sdp);
      }, e => {})// never seen this one on a then statement
    }; // createOffer

  const createAnswer = () => {
    console.log('[Answer]');
    pc.createAnswer({offerToReceiveVideo: 1})
      .then( sdp => {
        // console.log('[sdp]',JSON.stringify(sdp));
        pc.setLocalDescription(sdp); // set my own sdp
        sendToPeer('offerOrAnswer', sdp);
      }, e => {});
  }; // createAnswer

  const setRemoteDescription = () => {
    const desc = JSON.parse(sdp_ref.current);
    pc.setRemoteDescription(new RTCSessionDescription(desc));
  }; // setRemoteDescription

  const addCandidate = () => {
    // const candidate = JSON.parse(textRef.current.value);
    // console.log('[adding candidate]', candidate);
    // pc.addIceCandidate(new RTCIceCandidate(candidate));
    candidates.current.forEach(candidate => {
      console.log('[adding candidate]', JSON.stringify(candidate));
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
  };

  // 22:00 min mark

  const {localStream, remoteStream} = state;

  const remoteVideo = remoteStream ? (
    <RTCView
      key={2}
      mirror={true}
      objectFit="cover"
      style={{...styles.rtcRemoteView }}
      streamURL={remoteStream && remoteStream.toURL()}
    />
  ) : (
    <View>
      {/*eslint-disable-next-line react-native/no-inline-styles*/}
      <Text style={{fontSize: 22, textAlign: 'center', color: 'white'}}>
        Waiting for Peer Connection
      </Text>
    </View>
  )

  console.log(`[Rocket] final localStream`, localStream);
  if (localStream) {
    console.log(`[Rocket] final localStream toURL`, localStream.toURL());
  }

  return (
    <SafeAreaView style={{flex:1}}>
      <StatusBar backgroundColor="white" barStyle={'dark-content'} />
      <View style={{...styles.buttonsContainer}}>
        <View style={{flex: 1}}>
          <TouchableOpacity onPress={createOffer}>
            <View style={styles.button}>
              <Text style={styles.textContent}>Call</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={{flex: 1}}>
          <TouchableOpacity onPress={createAnswer}>
            <View style={styles.button}>
              <Text style={styles.textContent}>Answer</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.videosContainer}>
        <ScrollView style={{...styles.scrollView }}>
          <View style={styles.remoteVideo}>{remoteVideo}</View>
        </ScrollView>
        <View style={styles.localVideo}>
          <View style={{flex: 1}}>
            <TouchableOpacity
              onPress={() => localStream._tracks[1]._switchCamera()}>
              <View>
                <RTCView
                  key={1}
                  zOrder={1}
                  objectFit="cover"
                  style={{...styles.rtcView}}
                  streamURL={localStream && localStream.toURL()}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  ); // return
};

const styles = StyleSheet.create({
  buttonsContainer: {
    flexDirection: 'row',
  },
  button: {
    margin: 5,
    paddingVertical: 10,
    backgroundColor: 'lightgrey',
    borderRadius: 5,
  },
  textContent: {
    fontFamily: 'Avenir',
    fontSize: 20,
    textAlign: 'center',
  },
  videosContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  localVideo: {
    position: 'absolute',
    zIndex: 1,
    bottom: 10,
    right: 10,
    width: 100,
    height: 200,
    backgroundColor: 'black',
  },
  remoteVideo:{
    flex: 1,
    width: '100%',
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  scrollView:{
    flex: 1,
    backgroundColor: 'teal',
    padding: 15,
  },
  rtcView: {
    width: 100, // dimensions.width,
    height: 200, // dimensions.height / 2,
    backgroundColor: 'black',
  },
  rtcRemoteView: {
    width: dimensions.width - 30,
    height: dimensions.height - 120,
    backgroundColor: 'black',
  },
});

// export default App;

// const styles = StyleSheet.create({
//   sectionContainer: {
//     marginTop: 32,
//     paddingHorizontal: 24,
//   },
//   sectionTitle: {
//     fontSize: 24,
//     fontWeight: '600',
//   },
//   sectionDescription: {
//     marginTop: 8,
//     fontSize: 18,
//     fontWeight: '400',
//   },
//   highlight: {
//     fontWeight: '700',
//   },
// });

// [Rocket] final localStream { "_reactTag": "8ef8e4c2-1adc-45f1-95ac-5d0e4a422809", "_tracks": [{ "_constraints": [Object], "_enabled": true, "_settings": [Object], "id": "e47ba916-5867-49f8-995c-e845a1655bd7", "kind": "audio", "label": "e47ba916-5867-49f8-995c-e845a1655bd7", "muted": false, "readyState": "live", "remote": false }, { "_constraints": [Object], "_enabled": true, "_settings": [Object], "id": "95116053-815b-4a96-afb6-45abc4908ef5", "kind": "video", "label": "95116053-815b-4a96-afb6-45abc4908ef5", "muted": false, "readyState": "live", "remote": false }], "active": true, "id": "8ef8e4c2-1adc-45f1-95ac-5d0e4a422809" }
// [tutorial] localStream     { "_reactTag": "d1754ace-d7f9-4eb3-a9b8-9d5acc1d2fc9", "_tracks": [{ "_constraints": [Object], "_enabled": true, "_settings": [Object], "id": "1ae258f7-bdc3-4480-a662-29e3b9de2e3e", "kind": "audio", "label": "1ae258f7-bdc3-4480-a662-29e3b9de2e3e", "muted": false, "readyState": "live", "remote": false }, { "_constraints": [Object], "_enabled": true, "_settings": [Object], "id": "6bd72258-1c1d-4bbc-804a-84cc02b03b94", "kind": "video", "label": "6bd72258-1c1d-4bbc-804a-84cc02b03b94", "muted": false, "readyState": "live", "remote": false }], "active": true, "id": "d1754ace-d7f9-4eb3-a9b8-9d5acc1d2fc9" }
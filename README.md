# RocketNative Notes

## help guides/ articles/ tutorials/ notes
[WebRTC Let's learn together (ReactNative) - Part 4](https://youtu.be/uR_92JkSezA)   
> youtube video tutorial series
> it helps to do the earlier parts

[React Native Notes](https://github.com/techthehood/notes/blob/master/react%20native/react%20native%20notes.md)  
[React Native install and device testing notes (getting started notes)](https://github.com/techthehood/notes/blob/master/react%20native/react%20native%20getting%20started.md)    
[app keeps stopping issue](https://github.com/techthehood/notes/blob/master/react%20native/react%20native%20webrtc%20crash.md)   
[react native webrtc notes](https://github.com/techthehood/notes/blob/master/react%20native/react%20native%20webrtc.md)   

#### GOTCHA: [Socket.io client is not working with React Native](https://stackoverflow.com/questions/55443912/socket-io-client-is-not-working-with-react-native)   
> i had to roll back to a previous version (i was using version 4 something)

```
  npm i socket.io-client@2.1.1
```

## fixing the localStream video issue

**GOTCHA:** App_tutorial the absolutely position localStream RTCView is covered by the remoteStream element
> to fix i had to change the order of the script elements putting the localStream view last

```
  <ScrollView style={{ ...styles.scrollView }}>
            <View style={{
              flex: 1,
              width: '100%',
              backgroundColor: 'black',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              { remoteVideo }
            </View>
          </ScrollView>
          <View style={{
            position: 'absolute',
            zIndex: 1,
            bottom: 10,
            right: 10,
            width: 100, height: 200,
            backgroundColor: 'black', //width: '100%', height: '100%'
          }}>
              <View style={{flex: 1 }}>
                <TouchableOpacity onPress={() => localStream._tracks[1]._switchCamera()}>
                  <View>
                  <RTCView
                    key={1}
                    zOrder={0}
                    objectFit='cover'
                    style={{ ...styles.rtcView }}
                    streamURL={localStream && localStream.toURL()}
                    />
                  </View>
                </TouchableOpacity>
              </View>
          </View>
```
> i moved ScrollView section above the absolute positioned View

**GOTCHA:** the position of the absolute positioned localStream element depends on the outer wrapper having a flex style of 1

```
  change
    <SafeAreaView>
  to
    <SafeAreaView style={{flex:1}}>
```

**GOTCHA:** here was the video issue

```
    streamUrl={localStream && localStream.toURL()}
  should have been
    streamURL={localStream && localStream.toURL()}

```
> Url > URL

## can i connect to the socket.io server?

```
  import { io } from "socket.io-client";

  const socket = io("https://example.com/order", {
    path: "/my-custom-path/"
  });
```
> the Socket instance is attached to the “order” Namespace
> the HTTP requests will look like: GET https://example.com/my-custom-path/?EIO=4&transport=polling&t=ML4jUwU

[](https://socket.io/docs/v3/server-api/index.html)
[](https://socket.io/docs/v3/namespaces/index.html)   
[](https://alxolr.com/articles/working-with-socket-io-dynamic-namespaces)   

to fix the z-index issue i was having i needed to raise the zOrder from 0 to 1

```
  zOrder={1}
```
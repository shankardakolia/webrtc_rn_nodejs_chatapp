import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, TextInput, Platform, SafeAreaView } from 'react-native';
import {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';
import io from 'socket.io-client';

// TODO: Replace with your PC's local IP address (e.g., 192.168.1.X)
// Look for IPv4 Address in 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)
const SERVER_URL = 'http://172.16.16.101:3000'; // Change this to your IP

export default function App() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [socket, setSocket] = useState(null); // Keep state if needed for UI, but use Ref for logic
  const socketRef = useRef(null);
  const [roomId, setRoomId] = useState('1234');
  const [isJoined, setIsJoined] = useState(false);
  const [status, setStatus] = useState('Disconnected');

  const localStreamRef = useRef(null);
  const pc = useRef(null);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setStatus('Connected to Signaling Server');
    });

    newSocket.on('disconnect', () => {
      setStatus('Disconnected');
    });

    newSocket.on('user-joined', async (userId) => {
      console.log("Socket event: user-joined from", userId);
      createOffer();
    });

    newSocket.on('offer', async (data) => {
      console.log("Received offer");
      handleOffer(data);
    });

    newSocket.on('answer', async (data) => {
      console.log("Received answer");
      handleAnswer(data);
    });

    newSocket.on('ice-candidate', async (data) => {
      console.log("Received ICE candidate");
      handleCandidate(data);
    });

    return () => {
      newSocket.disconnect();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (pc.current) {
        pc.current.close();
      }
    };
  }, []);

  const startLocalStream = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      console.log("Local Stream obtained successfully");
      return stream;
    } catch (err) {
      console.error('Error getting user media', err);
      // Fallback: try audio only if video fails? 
      // Or just return null so we know it failed.
      return null;
    }
  };

  const createPeerConnection = (stream) => {
    const peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          target: roomId, // Ideally use specific user ID, but room broadcasting for MVP
          candidate: event.candidate,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      console.log("Received remote track");
      setRemoteStream(event.streams[0]);
    };

    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });

    pc.current = peerConnection;
    return peerConnection;
  };

  const joinRoom = async () => {
    const stream = await startLocalStream();
    if (stream) {
      socketRef.current?.emit('join', roomId);
      setIsJoined(true);
      setStatus('Joined Room: ' + roomId);

      // Initialize PC but don't offer yet; wait for 'user-joined' or 'offer'
      // Actually, for this simple logic, if we are second, we wait for offer.
      // If we are first, we wait for someone to join.
      // But we need to initialize PC to receive offers too? 
      // No, usually we init PC when we need to offer or answer.
      // But to be simple, let's just hold the stream.
    }
  };

  const createOffer = async () => {
    // Only create offer if we have the stream
    const stream = localStreamRef.current;
    if (!stream) {
      console.log("createOffer failed: No local stream");
      return;
    }
    console.log("Creating Offer...");

    const peerConnection = createPeerConnection(stream);

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketRef.current?.emit('offer', {
        target: roomId,
        sdp: offer
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleOffer = async (data) => {
    if (data.sender === socketRef.current?.id) return; // Ignore own messages
    const stream = localStreamRef.current;
    if (!stream) return; // Should already have stream if joined

    // If PC exists (e.g. glare), might need to handle. For MVP assume clean state or overwrite.
    if (pc.current) {
      // pc.current.close(); 
      // Simple case: just proceed.
    }

    const peerConnection = createPeerConnection(stream);

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socketRef.current?.emit('answer', {
        target: roomId,
        sdp: answer
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnswer = async (data) => {
    if (data.sender === socketRef.current?.id) return; // Ignore own messages
    if (pc.current) {
      try {
        await pc.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCandidate = async (data) => {
    if (data.sender === socketRef.current?.id) return; // Ignore own messages
    if (pc.current) {
      try {
        await pc.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.statusText}>{status}</Text>
      <View style={styles.videoContainer}>
        {localStream && (
          <View style={styles.localVideo}>
            <RTCView streamURL={localStream.toURL()} style={styles.video} objectFit="cover" mirror={true} />
          </View>
        )}
        {remoteStream && (
          <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" mirror={false} />
        )}
      </View>

      {!isJoined ? (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={roomId}
            onChangeText={setRoomId}
            placeholder="Enter Room ID"
          />
          <Button title="Join Room" onPress={joinRoom} />
        </View>
      ) : (
        <Button title="Leave Room" onPress={() => {
          // For MVP just reload
          // In real app, cleanup
        }} color="red" />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    marginTop: 50,
    fontSize: 18,
    fontWeight: 'bold',
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    marginTop: 20,
    marginBottom: 20,
  },
  localVideo: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 100,
    height: 150,
    backgroundColor: '#000',
    zIndex: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  inputContainer: {
    marginBottom: 50,
    width: '80%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  }
});

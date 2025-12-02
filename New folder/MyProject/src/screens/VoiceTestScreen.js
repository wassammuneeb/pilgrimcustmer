import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';

const VoiceTestScreen = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00:00');
  const [playTime, setPlayTime] = useState('00:00:00');
  const [duration, setDuration] = useState('00:00:00');
  const [audioPath, setAudioPath] = useState('');

  const audioRecorderPlayer = useRef(AudioRecorderPlayer).current;
  const soundRef = useRef(null);

  // Request microphone permission (Android only)
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        console.log('Permission result:', granted);

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission required',
            'Please allow microphone permission to record audio'
          );
          return false;
        }
        return true;
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  // Generate audio path
  const getAudioPath = () => {
    return Platform.OS === 'ios'
      ? 'voiceTest.m4a'
      : `${RNFS.ExternalDirectoryPath}/voiceTest.m4a`;
  };

  // Start recording
  const onStartRecord = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const path = getAudioPath();
      console.log('Recording to path:', path);

      const result = await audioRecorderPlayer.startRecorder(path);
      console.log('Recorder started, result path:', result);

      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.current_position)));
      });

      setAudioPath(result);
      setIsRecording(true);
    } catch (err) {
      console.log('Start record error:', err);
    }
  };

  // Stop recording
  const onStopRecord = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsRecording(false);
      setAudioPath(result);

      const exists = await RNFS.exists(result.replace('file://', ''));
      console.log('Recording stopped. File exists:', exists, 'Path:', result);
    } catch (err) {
      console.log('Stop record error:', err);
    }
  };

  // Start playback using react-native-sound
  const onStartPlay = async () => {
    if (!audioPath) {
      Alert.alert('No audio', 'Please record audio first');
      return;
    }

    try {
      const pathToPlay =
        Platform.OS === 'android' ? audioPath.replace('file://', '') : audioPath;

      const exists = await RNFS.exists(pathToPlay);
      console.log('Playback path exists:', exists, 'Path:', pathToPlay);

      if (!exists) {
        Alert.alert('Error', 'Audio file not found');
        return;
      }

      setIsPlaying(true);

      soundRef.current = new Sound(pathToPlay, '', (error) => {
        if (error) {
          console.log('Sound load error:', error);
          setIsPlaying(false);
          return;
        }

        console.log('Sound loaded, duration:', soundRef.current.getDuration());
        soundRef.current.play((success) => {
          if (success) {
            console.log('Sound playback finished successfully');
          } else {
            console.log('Sound playback failed');
          }
          setIsPlaying(false);
          soundRef.current.release();
        });
      });
    } catch (err) {
      console.log('Start play error:', err);
      setIsPlaying(false);
    }
  };

  // Stop playback
  const onStopPlay = () => {
    if (soundRef.current) {
      soundRef.current.stop(() => {
        console.log('Playback stopped manually');
        setIsPlaying(false);
        soundRef.current.release();
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Voice Test Screen</Text>

      <Text style={styles.timer}>Recording Time: {recordTime}</Text>
      <TouchableOpacity
        style={[styles.button, isRecording ? styles.stopButton : styles.recordButton]}
        onPress={isRecording ? onStopRecord : onStartRecord}
      >
        <Text style={styles.buttonText}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.timer}>Playback: {playTime} / {duration}</Text>
      <TouchableOpacity
        style={[styles.button, isPlaying ? styles.stopButton : styles.playButton]}
        onPress={isPlaying ? onStopPlay : onStartPlay}
      >
        <Text style={styles.buttonText}>
          {isPlaying ? 'Stop Playing' : 'Play Recording'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default VoiceTestScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  header: {
    fontSize: 24,
    marginBottom: 40,
    fontWeight: 'bold',
  },
  button: {
    width: '70%',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#FF4D4D',
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timer: {
    fontSize: 18,
    marginVertical: 10,
  },
});

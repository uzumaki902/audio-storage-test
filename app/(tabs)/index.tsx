import { Audio } from "expo-av";
import React, { useState } from "react";
import {
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        alert("Permission to access microphone is required.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      console.log("Recording started");
    } catch (err) {
      console.log("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();

      setRecording(null);
      setRecordingUri(uri || null);

      console.log("Recording saved at:", uri);
    } catch (err) {
      console.log("Failed to stop recording", err);
    }
  }

  async function playRecording() {
    try {
      if (!recordingUri) return;

      const { sound } = await Audio.Sound.createAsync({
        uri: recordingUri,
      });

      setSound(sound);

      await sound.playAsync();
    } catch (err) {
      console.log("Failed to play recording", err);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Audio Storage Test</Text>

      <View style={styles.buttonContainer}>
        <Button title="Start Recording" onPress={startRecording} />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Stop Recording" onPress={stopRecording} />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Play Recording" onPress={playRecording} />
      </View>

      {recordingUri && (
        <Text style={styles.text}>Recording saved successfully</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 40,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 20,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
  },
});
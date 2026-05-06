import { Audio } from "expo-av";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
} from "react-native";

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState("Ready to record");

  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    let animation: Animated.CompositeAnimation;

    if (isRecording) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );

      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isRecording]);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        alert("Microphone permission is required.");
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
      setIsRecording(true);
      setStatusText("Recording started • Speak now");

      console.log("Recording started");
    } catch (err) {
      console.log("Failed to start recording", err);
      setStatusText("Failed to start recording");
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();

      setRecording(null);
      setRecordingUri(uri || null);
      setIsRecording(false);
      setStatusText("Recording saved successfully");

      console.log("Recording saved at:", uri);
    } catch (err) {
      console.log("Failed to stop recording", err);
      setStatusText("Failed to stop recording");
    }
  }

  async function playRecording() {
    try {
      if (!recordingUri) {
        setStatusText("No recording found");
        return;
      }

      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync({
        uri: recordingUri,
      });

      setSound(newSound);
      setStatusText("Playing recording");

      await newSound.playAsync();
    } catch (err) {
      console.log("Failed to play recording", err);
      setStatusText("Failed to play recording");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Audio Storage Test</Text>

      <Animated.View
        style={[
          styles.recordingIndicator,
          {
            transform: [{ scale: pulseAnim }],
            opacity: isRecording ? 1 : 0.4,
          },
        ]}
      />

      <Text style={styles.status}>{statusText}</Text>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.recordButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={startRecording}
      >
        <Text style={styles.buttonText}>START RECORDING</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.stopButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={stopRecording}
      >
        <Text style={styles.buttonText}>STOP RECORDING</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.playButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={playRecording}
      >
        <Text style={styles.buttonText}>PLAY RECORDING</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1115",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "white",
    marginBottom: 30,
  },
  recordingIndicator: {
    width: 22,
    height: 22,
    borderRadius: 50,
    backgroundColor: "#ff3b30",
    marginBottom: 20,
  },
  status: {
    color: "#bdbdbd",
    fontSize: 16,
    marginBottom: 40,
    textAlign: "center",
  },
  button: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 18,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  recordButton: {
    backgroundColor: "#2563eb",
  },
  stopButton: {
    backgroundColor: "#dc2626",
  },
  playButton: {
    backgroundColor: "#16a34a",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const successSound = require("../../assets/sounds/success.mp3");

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [showToast, setShowToast] = useState(false);

  const [statusText, setStatusText] = useState("Ready to record");

  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    let animation: Animated.CompositeAnimation;

    if (isRecording) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
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

  async function playUiSound(soundFile: any) {
    const { sound } = await Audio.Sound.createAsync(soundFile);
    await sound.playAsync();
  }

  async function startRecording() {
    try {
      await Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Medium
      );

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
    } catch (err) {
      console.log("Failed to start recording", err);

      setStatusText("Failed to start recording");
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();

      await playUiSound(successSound);

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      const uri = recording.getURI();

      setRecording(null);
      setRecordingUri(uri || null);

      setIsRecording(false);

      setStatusText("Recording saved successfully");

      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
      }, 2500);

      console.log("Recording saved at:", uri);
    } catch (err) {
      console.log("Failed to stop recording", err);

      setStatusText("Failed to stop recording");
    }
  }

  async function playRecording() {
    try {
      await Haptics.selectionAsync();

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

      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });

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
          styles.recordingWrapper,
          {
            transform: [{ scale: pulseAnim }],
            opacity: isRecording ? 1 : 0.5,
          },
        ]}
      >
        <View style={styles.recordingIndicator} />

        <Text style={styles.recordingText}>
          {isRecording ? "RECORDING LIVE" : "NOT RECORDING"}
        </Text>
      </Animated.View>

      <Text style={styles.status}>{statusText}</Text>

      {recordingUri && (
        <View style={styles.audioCard}>
          <Text style={styles.audioCardTitle}>
            Voice Note Saved
          </Text>

          <Text style={styles.audioCardSubtext}>
            Ready for upload
          </Text>

          {isPlaying && (
            <Text style={styles.playingText}>
              Playing Audio...
            </Text>
          )}
        </View>
      )}

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

      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>
            Audio recorded successfully
          </Text>
        </View>
      )}
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

  recordingWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "#181c24",
  },

  recordingIndicator: {
    width: 26,
    height: 26,
    borderRadius: 50,
    backgroundColor: "#ff3b30",
    marginRight: 12,

    shadowColor: "#ff3b30",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
  },

  recordingText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },

  status: {
    color: "#bdbdbd",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },

  audioCard: {
    width: "100%",
    backgroundColor: "#181c24",
    padding: 18,
    borderRadius: 18,
    marginBottom: 30,
  },

  audioCardTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },

  audioCardSubtext: {
    color: "#9ca3af",
    fontSize: 14,
  },

  playingText: {
    color: "#22c55e",
    marginTop: 10,
    fontWeight: "700",
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

  toast: {
    position: "absolute",
    bottom: 40,
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },

  toastText: {
    color: "white",
    fontWeight: "700",
  },
});
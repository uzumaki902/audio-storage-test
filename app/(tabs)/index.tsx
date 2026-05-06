// app/(tabs)/index.tsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Slider from "@react-native-community/slider";

import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";

import { router, useFocusEffect } from "expo-router";

import { supabase } from "../../lib/supabase";

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const [recordingUri, setRecordingUri] = useState<string | null>(
    null
  );

  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const [isRecording, setIsRecording] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);

  const [position, setPosition] = useState(0);

  const [duration, setDuration] = useState(1);

  const [statusText, setStatusText] = useState("Ready");

  const [hasPermission, setHasPermission] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Re-assert recording audio mode every time this screen is focused
  // (navigating to recordings.tsx changes it to allowsRecordingIOS:false)
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const permission = await Audio.requestPermissionsAsync();
        if (permission.granted) {
          setHasPermission(true);
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });
        }
      })();
    }, [])
  );

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 700,
            useNativeDriver: true,
          }),

          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isRecording]);

  async function startRecording() {
    try {
      if (!hasPermission) {
        Alert.alert("Permission required");
        return;
      }

      await Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Medium
      );

      const { recording } =
        await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );

      setRecording(recording);

      setIsRecording(true);

      setStatusText("Recording LIVE");
    } catch (error) {
      console.log(error);
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();

      setRecordingUri(uri || null);

      setRecording(null);

      setIsRecording(false);

      setStatusText(
        "Preview recording before saving"
      );

      if (uri) {
        await loadSound(uri);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function loadSound(uri: string) {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } =
        await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false }
        );

      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate(
        (status: any) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0);

            setDuration(
              status.durationMillis || 1
            );

            setIsPlaying(status.isPlaying || false);
          }
        }
      );
    } catch (error) {
      console.log(error);
    }
  }

  async function playPauseAudio() {
    if (!sound) return;

    const status: any =
      await sound.getStatusAsync();

    if (status.isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  }

  async function seekAudio(value: number) {
    if (!sound) return;

    await sound.setPositionAsync(value);
  }

  async function saveRecording() {
    try {
      if (!recordingUri) return;

      setStatusText("Uploading to cloud...");

      const base64 =
        await FileSystem.readAsStringAsync(
          recordingUri,
          {
            encoding: "base64",
          }
        );

      const filePath = `recording-${Date.now()}.m4a`;

      const buffer = Uint8Array.from(
        atob(base64),
        (c) => c.charCodeAt(0)
      );

      const { error } = await supabase.storage
        .from("recordings")
        .upload(filePath, buffer, {
          contentType: "audio/m4a",
        });

      if (error) {
        console.log(error);

        setStatusText("Cloud upload failed");

        return;
      }

      setStatusText("Uploaded successfully");

      Alert.alert(
        "Success",
        "Recording saved to cloud"
      );
    } catch (error) {
      console.log(error);

      setStatusText("Upload failed");
    }
  }

  function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);

    const minutes = Math.floor(totalSeconds / 60);

    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds < 10 ? "0" : ""
      }${seconds}`;
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.savedButton}
        onPress={() =>
          router.push("/recordings")
        }
      >
        <Text style={styles.savedButtonText}>
          Saved Recordings
        </Text>
      </TouchableOpacity>

      <Text style={styles.title}>
        Audio Storage Test
      </Text>

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
          {isRecording
            ? "RECORDING LIVE"
            : "NOT RECORDING"}
        </Text>
      </Animated.View>

      <Text style={styles.status}>
        {statusText}
      </Text>

      {recordingUri && (
        <View style={styles.playerContainer}>
          <Slider
            style={{ width: "100%" }}
            minimumValue={0}
            maximumValue={duration}
            value={position}
            minimumTrackTintColor="#ff4da6"
            maximumTrackTintColor="#333"
            thumbTintColor="#fff"
            onSlidingComplete={seekAudio}
          />

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>
              {formatTime(position)}
            </Text>

            <Text style={styles.timeText}>
              {formatTime(duration)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.playButton}
            onPress={playPauseAudio}
          >
            <Text style={styles.playButtonText}>
              {isPlaying ? "PAUSE" : "PLAY"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveRecording}
          >
            <Text style={styles.saveButtonText}>
              SAVE RECORDING
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.startButton}
        onPress={startRecording}
      >
        <Text style={styles.buttonText}>
          START RECORDING
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.stopButton}
        onPress={stopRecording}
      >
        <Text style={styles.buttonText}>
          STOP RECORDING
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 20,
  },

  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "bold",
    marginBottom: 30,
  },

  savedButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "#181c24",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },

  savedButtonText: {
    color: "white",
    fontWeight: "700",
  },

  recordingWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
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
    color: "#bbb",
    marginBottom: 25,
    fontSize: 15,
  },

  playerContainer: {
    width: "100%",
    backgroundColor: "#121826",
    padding: 20,
    borderRadius: 25,
    marginBottom: 30,
  },

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  timeText: {
    color: "white",
    fontSize: 15,
  },

  playButton: {
    marginTop: 25,
    backgroundColor: "#222",
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
  },

  playButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },

  saveButton: {
    marginTop: 18,
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },

  startButton: {
    width: "100%",
    backgroundColor: "#2563eb",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 18,
  },

  stopButton: {
    width: "100%",
    backgroundColor: "#ef4444",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
});
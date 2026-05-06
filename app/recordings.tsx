// app/recordings.tsx

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

import { router, useFocusEffect } from "expo-router";

import { supabase } from "../lib/supabase";

interface CloudRecording {
  name: string;
  id: string | null;
  created_at: string | null;
  publicUrl: string;
}

export default function RecordingsScreen() {
  const [recordings, setRecordings] = useState<CloudRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingName, setPlayingName] = useState<string | null>(null);
  const [bufferingName, setBufferingName] = useState<string | null>(null);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const [downloadingName, setDownloadingName] = useState<string | null>(null);

  // Set playback audio mode whenever this screen is focused
  useFocusEffect(
    useCallback(() => {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    }, [])
  );

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("recordings")
        .list("", { sortBy: { column: "created_at", order: "desc" } });

      if (error) {
        console.error(error);
        Alert.alert("Error", "Failed to fetch recordings");
        return;
      }

      const withUrls: CloudRecording[] = (data ?? [])
        .filter((item) => !item.name.startsWith("."))
        .map((item) => {
          const { data: urlData } = supabase.storage
            .from("recordings")
            .getPublicUrl(item.name);
          return {
            name: item.name,
            id: item.id,
            created_at: item.created_at,
            publicUrl: urlData.publicUrl,
          };
        });

      setRecordings(withUrls);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
    return () => {
      // clean up any playing sound on unmount
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, []);

  async function handlePlay(item: CloudRecording) {
    try {
      // If same item is playing, stop it
      if (playingName === item.name && currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setPlayingName(null);
        return;
      }

      // Stop any currently playing sound
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setPlayingName(null);
      }

      // Show buffering indicator
      setBufferingName(item.name);

      // Download to cache first so playback is local (no streaming lag)
      const cachedUri = FileSystem.cacheDirectory + item.name;
      const fileInfo = await FileSystem.getInfoAsync(cachedUri);
      let localUri = cachedUri;
      if (!fileInfo.exists) {
        const dl = await FileSystem.downloadAsync(item.publicUrl, cachedUri);
        localUri = dl.uri;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: localUri },
        { shouldPlay: true }
      );

      setBufferingName(null);
      setCurrentSound(sound);
      setPlayingName(item.name);

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          setCurrentSound(null);
          setPlayingName(null);
        }
      });
    } catch (err) {
      console.error(err);
      setBufferingName(null);
      Alert.alert("Error", "Failed to play recording");
    }
  }

  async function handleDownload(item: CloudRecording) {
    try {
      setDownloadingName(item.name);
      const destPath =
        FileSystem.documentDirectory + item.name;
      const result = await FileSystem.downloadAsync(
        item.publicUrl,
        destPath
      );
      if (result.status === 200) {
        Alert.alert("Downloaded", `Saved to: ${result.uri}`);
      } else {
        Alert.alert("Error", "Download failed");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Download failed");
    } finally {
      setDownloadingName(null);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Unknown date";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  function renderItem({ item }: { item: CloudRecording }) {
    const isPlaying = playingName === item.name;
    const isBuffering = bufferingName === item.name;
    const isDownloading = downloadingName === item.name;
    const label = item.name.replace(/^recording-/, "").replace(/\.m4a$/, "");

    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            🎙 {label}
          </Text>
          <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, isPlaying && styles.actionBtnActive]}
            onPress={() => handlePlay(item)}
            disabled={isBuffering}
          >
            {isBuffering ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>
                {isPlaying ? "⏹ Stop" : "▶ Play"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.downloadBtn]}
            onPress={() => handleDownload(item)}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>⬇ Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cloud Recordings</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchRecordings}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#ff4da6" size="large" />
          <Text style={styles.loadingText}>Loading recordings…</Text>
        </View>
      ) : recordings.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🎵</Text>
          <Text style={styles.emptyText}>No recordings yet.</Text>
          <Text style={styles.emptySubText}>
            Record and save audio from the main screen.
          </Text>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id ?? item.name}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1f2e",
  },

  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#181c24",
  },

  backBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },

  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#181c24",
  },

  refreshBtnText: {
    color: "#ff4da6",
    fontSize: 20,
    fontWeight: "bold",
  },

  list: {
    padding: 20,
    gap: 14,
  },

  card: {
    backgroundColor: "#121826",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e2535",
  },

  cardInfo: {
    marginBottom: 14,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },

  cardDate: {
    color: "#888",
    fontSize: 13,
  },

  cardActions: {
    flexDirection: "row",
    gap: 10,
  },

  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#1e2a40",
    borderWidth: 1,
    borderColor: "#2a3652",
  },

  actionBtnActive: {
    backgroundColor: "#7c1d3a",
    borderColor: "#ff4da6",
  },

  downloadBtn: {
    backgroundColor: "#1a3a2a",
    borderColor: "#2a5e40",
  },

  actionBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  loadingText: {
    color: "#888",
    marginTop: 14,
    fontSize: 15,
  },

  emptyIcon: {
    fontSize: 52,
    marginBottom: 16,
  },

  emptyText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },

  emptySubText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});

import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function About() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.aboutContent}>
        <Text style={styles.aboutTitle}>About SeizureSafe</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Research on Seizures</Text>
          <Text style={styles.sectionText}>
            Seizures are sudden, uncontrolled electrical disturbances in the brain that can cause changes in behavior, movements, feelings, and levels of consciousness. They are a common symptom of epilepsy, affecting approximately 50 million people worldwide.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Research Findings:</Text>
          <Text style={styles.sectionText}>• Heart rate typically increases by 10-20 BPM during a seizure</Text>
          <Text style={styles.sectionText}>• Falls are a common occurrence during seizures</Text>
          <Text style={styles.sectionText}>• Early detection can significantly reduce the risk of injury</Text>
          <Text style={styles.sectionText}>• Most seizures last between 30 seconds to 2 minutes</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 20,
  },
  aboutContent: {
    padding: 20,
  },
  aboutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 24,
    marginBottom: 8,
  },
}); 
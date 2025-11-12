import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export default function SlayHeader() {
    return (
        <View style={styles.wrap}>
            <Svg width={36} height={36} viewBox="0 0 128 128">
                <Circle cx="64" cy="64" r="48" stroke="#0E0E0E" strokeWidth={11} fill="none" />
                <Path d="M32 64a46 46 0 0074 35" stroke="#FF69B4" strokeWidth={9} strokeLinecap="round" fill="none" />
                <Path d="M96 34l3.5 8.5 8.5 3.5-8.5 3.5-3.5 8.5-3.5-8.5-8.5-3.5 8.5-3.5 3.5-8.5z" fill="#6E56CF" />
            </Svg>

            <View style={styles.texts}>
                <Text style={styles.brand}>SlayRated</Text>
                <Text style={styles.tagline}>Share receipts. Rate honestly.</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center' },
    texts: { marginLeft: 10 },
    brand: { fontSize: 20, fontWeight: '800', color: '#0E0E0E' },
    tagline: { fontSize: 12, color: '#78727D' },
});

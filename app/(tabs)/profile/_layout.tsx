import { Stack } from 'expo-router';

export default function ProfileStackLayout() {
    return (
        <Stack
            screenOptions={{
                headerTitle: '',
                headerBackTitleVisible: false,
                headerShown: false,
            }}
        />
    );
}

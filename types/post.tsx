import { ImageSourcePropType } from "react-native";
import { Timestamp } from "react-native-reanimated/lib/typescript/commonTypes";

export type Review = {
    id: string;
    businessName: string;
    username: string | null | undefined;
    avatar: ImageSourcePropType | null | undefined;
    image: ImageSourcePropType | null | undefined;
    likes: string | null | undefined;
    comments: string[] | null | undefined;
    cityState: string;
    caption: string;
    serviceType: string;
    rating: number;
    createdAt?: Timestamp;
    imageUrl?: string; // Optional field for image URL};  
    media?: { type: 'image' | 'video'; url: string }[]; // Optional field for media array
    timestamp?: firebase.firestore.Timestamp;
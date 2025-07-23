import { ImageSourcePropType } from "react-native";

export type Review = {
    id: string;
    businessName: string;
    username: string | null | undefined;
    avatar: ImageSourcePropType | null | undefined;
    image: ImageSourcePropType | null | undefined;
    time: string | null | undefined;
    likes: string | null | undefined;
    comments: string[] | null | undefined;
    cityState: string;
    caption: string;
    serviceType: string;
    rating: number;
    createdAt: string;
};  
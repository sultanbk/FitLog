import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FitLog — Personal Health Journal",
    short_name: "FitLog",
    description: "Your personal health goals, in one calm place.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f4ef",
    theme_color: "#f6f4ef",
    categories: ["health", "lifestyle"],
    icons: [
      { src: "/icons/fitlog-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/fitlog-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/fitlog-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

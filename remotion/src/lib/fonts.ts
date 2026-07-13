import { loadFont } from "@remotion/google-fonts/BeVietnamPro";

const loaded = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "vietnamese"],
});

export const fontFamily = loaded.fontFamily;

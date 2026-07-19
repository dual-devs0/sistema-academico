import Svg, { Path, Circle, Rect, Line } from "react-native-svg";

export function CursosIconOutline({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 8l10-4 10 4-10 4-10-4z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M6 10.5v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function CursosIconFull({ size = 32 }: { size?: number }) {
  const navy = "#16213e";
  const roof = "#7b86a8";
  const column = "#e9ebf1";
  const base = "#c7c9d4";
  const capBlue = "#4a90e2";
  const capDark = "#2d6cc4";
  const gold = "#f0b429";

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M50 14L14 46h72L50 14z" fill={roof} stroke={navy} strokeWidth={4} strokeLinejoin="round" />
      <Circle cx="50" cy="34" r="7" fill="#ffffff" />

      <Rect x="12" y="46" width="76" height="10" fill={roof} stroke={navy} strokeWidth={4} />

      {[22, 45, 68].map((x) => (
        <Rect key={x} x={x} y="58" width="10" height="26" fill={column} stroke={navy} strokeWidth={3.5} />
      ))}

      <Rect x="10" y="84" width="80" height="8" fill={base} stroke={navy} strokeWidth={4} />
      <Line x1="4" y1="96" x2="96" y2="96" stroke={navy} strokeWidth={4} strokeLinecap="round" />

      <Path d="M78 20L54 32l24 12 24-12-24-12z" fill={capBlue} stroke={navy} strokeWidth={3.5} strokeLinejoin="round" />
      <Path d="M62 36v10c0 5 7 9 16 9s16-4 16-9V36" fill={capDark} stroke={navy} strokeWidth={3.5} strokeLinejoin="round" />
      <Line x1="94" y1="30" x2="94" y2="52" stroke={navy} strokeWidth={3} strokeLinecap="round" />
      <Circle cx="94" cy="56" r="4" fill={gold} stroke={navy} strokeWidth={2} />
    </Svg>
  );
}

import Svg, { Path } from "react-native-svg";

// Curva divisoria reutilizable (header/body de pantallas con WaveBackground-like
// layout). Un solo Q (curva cuadratica), no C -- panza unica, sin doble quiebre.
// Path por defecto derivado proporcionalmente de la referencia de diseno
// (viewBox 280x520, "M0,166 Q180,220 280,130") reescalado a viewBox 500x150.

interface CurveBackgroundProps {
  width: number;
  height?: number;
  fill: string;
  d?: string;
}

const DEFAULT_D = "M0,60 Q321,150 500,0 L500,150 L0,150 Z";

export function CurveBackground({ width, height = 150, fill, d = DEFAULT_D }: CurveBackgroundProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 500 150"
      preserveAspectRatio="none"
      style={{ position: "absolute", bottom: -2 }}
    >
      <Path d={d} fill={fill} />
    </Svg>
  );
}

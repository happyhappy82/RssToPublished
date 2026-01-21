declare module "vanta/dist/vanta.clouds2.min" {
  interface VantaOptions {
    el: HTMLElement;
    THREE: unknown;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    backgroundColor?: number;
    skyColor?: number;
    cloudColor?: number;
    cloudShadowColor?: number;
    sunColor?: number;
    sunGlareColor?: number;
    sunlightColor?: number;
    speed?: number;
  }

  interface VantaEffect {
    destroy: () => void;
  }

  export default function (options: VantaOptions): VantaEffect;
}

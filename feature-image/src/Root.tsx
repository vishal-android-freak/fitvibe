import "./index.css";
import { Composition } from "remotion";
import { FeatureGrid } from "./FeatureGrid";
import { Social } from "./Social";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Wide hero — 16:9, the classic OS feature-image shape. Render a still
          at a settled frame (e.g. --frame=120) or the full clip as an MP4 loop. */}
      <Composition
        id="FeatureImage"
        component={FeatureGrid}
        durationInFrames={300}
        fps={30}
        width={2560}
        height={1440}
      />
      {/* GitHub social preview — exactly 1280×640 (the size GitHub uses). */}
      <Composition
        id="SocialPreview"
        component={Social}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={640}
      />
    </>
  );
};

// 三节共用：把主角婴儿 奶妈 碗画进对应图层。碗在摇篮上时画在床板图层，被拿在手里时画在人物图层
import React from "react";
import { HeroBaby, HeroBowl, HeroNurse, HeroState } from "./hero";
import { Layer } from "./NurserySet";
import { RIM_Y } from "./world";

export const HeroLayers: React.FC<{ layer: Layer; st: HeroState; frame: number }> = ({ layer, st, frame }) => {
  const bowlOnRim = Math.abs(st.bowl.y - RIM_Y) < 1 && st.bowl.rotate === 0;
  if (layer === "babies") return <HeroBaby st={st} />;
  if (layer === "cradleFront" && bowlOnRim) return <HeroBowl st={st} frame={frame} />;
  if (layer === "actors")
    return (
      <>
        {!bowlOnRim ? <HeroBowl st={st} frame={frame} /> : null}
        <HeroNurse st={st} />
      </>
    );
  return null;
};

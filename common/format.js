export const formatTime = (t) => {
  return t < 10 ? "0" + t : t;
};

export const formatBG = (bg) => {
  const roundedBGx10 = Math.round(bg * 10);
  const isInteger = roundedBGx10 % 10 === 0;
  const roundedBG = roundedBGx10 / 10;
  return isInteger ? roundedBG + ".0" : roundedBG;
};

export const formatdBG = (dBG) => {
  const formatteddBG = formatBG(dBG);
  return dBG >= 0 ? `+${formatteddBG}` : formatteddBG;
};
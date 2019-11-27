export const compareBGs = (bg1, bg2) => {
  if (bg1.t < bg2.t) { return -1; }
  if (bg1.t > bg2.t) { return 1; }
  return 0;
};
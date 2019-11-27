export const parseTime = (t) => {
  const [ date, time ] = t.split(" - ");
  const [ year, month, day ] = date.split(".");
  const [ hour, minute, second ] = time.split(":");
  
  return { year, month, day, hour, minute, second };
};

export const getEpochTime = (t) => {
  const { year, month, day, hour, minute, second } = parseTime(t);
  return new Date(year, month - 1, day, hour, minute, second).getTime() / 1000;
};
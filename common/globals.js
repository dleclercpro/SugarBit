export const BG_COUNT = 288;             // Number of BGs to store (24h worth of data)
export const BG_UNITS = "mmol/L";
export const BG_REFRESH_RATE = 5 * 6000; // ms
export const BG_GRAPH_MIN = 0;           // mmol/L
export const BG_GRAPH_MAX = 16;          // mmol/L
export const GRAPH_WIDTH_RATIO = 1;
export const GRAPH_HEIGHT_RATIO = 0.8;

// Commands between companion and device
export const CMD_FETCH_BG = 100;
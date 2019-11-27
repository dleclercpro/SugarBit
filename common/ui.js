import { GRAPH_BG_LOW, GRAPH_BG_HIGH } from "./constants";

// Show DOM element
export const show = (el) => {
  el.style.display = "inline";
};

// Hide DOM element
export const hide = (el) => {
  el.style.display = "none";
};

// Toggle DOM element
export const toggle = (el) => {
  const isHidden = el.style.display === "none";
  el.style.display = isHidden ? "inline" : "none";
};

// Color DOM element based on its BG value
export const colorBG = (el, bg) => {
  if (bg >= GRAPH_BG_HIGH) {
    el.style.fill = "#ff9d2f";
  } else if (bg <= GRAPH_BG_LOW) {
    el.style.fill = "#e50000";
  } else {
    el.style.fill = "#999999";
  }
};
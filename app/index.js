import document from "document";
import clock from "clock";
import { me } from "device";
import { peerSocket } from "messaging";
import { TIME_3_H, TIME_6_H, TIME_12_H, TIME_24_H, BG_UNITS, GRAPH_BG_LOW, GRAPH_BG_HIGH, GRAPH_BG_MIN, GRAPH_BG_MAX, GRAPH_WIDTH_RATIO, GRAPH_HEIGHT_RATIO, CMD_FETCH_BG } from "../common/globals";
import { sendMessage, formatTime, formatBG, getLast, getCurrentTime, colorBGElement } from "../common/lib";



// DOM ELEMENTS
const ui = {
  time: document.getElementById("time"),
  bg: document.getElementById("bg"),
  graph: {
    bgs: document.getElementsByClassName("bg"),
    targets: {
      low: document.getElementById("target-low"),
      high: document.getElementById("target-high"),
    },
    axes: {
      time: {
        ticks: document.getElementsByClassName("time-tick"),
        labels: document.getElementsByClassName("time-tick-label"),
      },
    },
  },
};



// GRAPH
const graph = {
  dBG: GRAPH_BG_MAX - GRAPH_BG_MIN,
  dt: TIME_24_H,
  width: GRAPH_WIDTH_RATIO * me.screen.width,
  height: GRAPH_HEIGHT_RATIO * me.screen.height,
};



// STATE
const state = {
  bgs: [],
};



// CLOCK
// Update the clock every second
clock.granularity = "minutes";

// On every clock tick
clock.ontick = (e) => {
  const today = e.date;
  const hour = formatTime(today.getHours());
  const minute = formatTime(today.getMinutes());
  
  // Update time
  ui.time.text = `${hour}:${minute}`;
  
  // Update BGs
  fetchBGs();
};



// MESSAGING
// Messaging channel open
peerSocket.onopen = (e) => {
  fetchBGs();
};

// Messaging error
peerSocket.onerror = (err) => {
  console.error(`Connection error: ${err.code} - ${err.message}`);
};

// Message received from companion
peerSocket.onmessage = (msg) => {
  if (!msg.data) {
    console.warn("Received message from companion without data.");
    return;
  }
  
  // Destructure message
  const { command, key, size, payload } = msg.data;

  // React according to message type
  switch (command) {
    case CMD_FETCH_BG:
      state.bgs = [ ...state.bgs, payload ];
      
      // Last BG received
      if (key === size) {
        console.log(`Received ${size} BGs.`)
        
        // Keep only BGs from the last 24 hours
        const now = getCurrentTime();
        const then = now - TIME_24_H;
        state.bgs = state.bgs.filter(bg => bg.t >= then);
        
        // Update current BG
        const bg = getLast(state.bgs).bg;
        ui.bg.text = formatBG(bg);
        colorBGElement(ui.bg, bg);
        
        // Build graph
        showBGs();
      }
      
      break;

    default:
      console.warn("Unknown message received from companion.");
  }
};



// FUNCTIONS
// Fetch BGs
const fetchBGs = () => {
  const now = getCurrentTime();
  
  // No BGs fetched so far: fetch to fill graph
  // Otherwise: fetch newer ones
  const then = state.bgs.length === 0 ? now - graph.dt : getLast(state.bgs).t;
  
  // Ask companion for BGs
  sendMessage({
    command: CMD_FETCH_BG,
    key: 1,
    size: 1,
    payload: {
      after: then,
    },
  });
};

// Show BGs stored in state in graph
const showBGs = () => {
  const now = getCurrentTime();
  const then = now - graph.dt;
  
  // Keep BGs from state which will fit in graph
  const bgs = state.bgs.filter(bg => bg.t >= then);
  const nBGs = bgs.length;

  // Show all stored BGs
  ui.graph.bgs.map((el, i) => {
    
    // No more BGs stored: hide element
    if (i >= nBGs) {
      el.style.display = "none";
    } else {
      const bg = bgs[nBGs - 1 - i];
      
      // Position BG in graph
      el.cx = (bg.t - then) / graph.dt * graph.width;
      el.cy = (GRAPH_BG_MAX - bg.bg) / graph.dBG * graph.height;
      
      // Color it
      colorBGElement(el, bg.bg);
      
      // Show it
      el.style.display = "inline";
    }
  });
};

// Show target range
const showTargetRange = () => {
  const { low, high } = ui.graph.targets;
  const lowY = (GRAPH_BG_MAX - GRAPH_BG_LOW) / graph.dBG * graph.height;
  const highY = (GRAPH_BG_MAX - GRAPH_BG_HIGH) / graph.dBG * graph.height;

  low.style.display = "inline";
  high.style.display = "inline";
  low.y1 = lowY;
  low.y2 = lowY;
  high.y1 = highY;
  high.y2 = highY;
};

// Show time axis
const showTimeAxis = () => {
  const now = getCurrentTime();
  const then = now - graph.dt;
  let nHours = [];
  
  // Get last full hour as a date
  let lastHour = new Date();
  lastHour.setTime(now * 1000);
  lastHour.setMinutes(0);
  lastHour.setSeconds(0);
  lastHour.setMilliseconds(0);
  
  // Choose axis ticks based on chosen graph timescale
  switch (graph.dt) {
    case TIME_3_H:
      nHours = [-2, -1, 0];
      break;
    case TIME_6_H:
      nHours = [-4, -2, 0];
      break;
    case TIME_12_H:
      nHours = [-8, -4, 0];
      break;
    case TIME_24_H:
      nHours = [-16, -8, 0];
      break;
    default:
      console.error("Cannot draw time axis: wrong timescale.");
      return;
  }
  
  // Get axis ticks in epoch time (s)
  const epochDates = nHours.map((n) => {
    const date = new Date();
    date.setTime(lastHour.getTime() + n * 60 * 60 * 1000);
    
    return date;
  });
  
  ui.graph.axes.time.ticks.map((tick, i) => {
    const date = epochDates[i];
    const time = date.getTime() / 1000;
    const hour = formatTime(date.getHours());
    const minute = formatTime(date.getMinutes());
    
    const tickX = (time - then) / graph.dt * graph.width;
    tick.x1 = tickX;
    tick.x2 = tickX;
    tick.style.display = "inline";
    
    const label = ui.graph.axes.time.labels[i];
    label.text = `${hour}:${minute}`;
    label.x = tickX - 3;
    label.style.display = "inline";
  });
};



// MAIN
showTargetRange();
showTimeAxis();
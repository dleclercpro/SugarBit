import document from "document";
import clock from "clock";
import { me } from "device";
import { peerSocket } from "messaging";
import { TIME_3_H, TIME_6_H, TIME_12_H, TIME_24_H,
  GRAPH_BG_LOW, GRAPH_BG_HIGH, GRAPH_BG_MIN, GRAPH_BG_MAX, GRAPH_WIDTH_RATIO, GRAPH_HEIGHT_RATIO,
  BG_UNITS, BG_MAX_AGE, BG_MAX_DELTA, BG_NONE } from "../common/constants";
import { CMD_FETCH_BGS, CMD_SYNC, CMD_DISPLAY_ERROR, getCommands } from "../common/commands";
import { sendMessage } from "../common/messages";
import { formatTime, formatBG, formatdBG } from "../common/format";
import { show, hide, colorBG } from "../common/ui";



// INITIAL TIME
const now = new Date();
const zero = new Date(0);



// STATE
const state = {
  time: {
    now: {
      date: now,
      epoch: now.getTime() / 1000
    },
  },
  bgs: {
    isFetching: false, // Is device currently waiting for BG fetching?
    last: null,        // Latest BG
    el: 0,             // SVG element index to use for next BG
  },
};



// GRAPH
const graph = {
  dBG: GRAPH_BG_MAX - GRAPH_BG_MIN,
  dt: TIME_24_H,
  width: GRAPH_WIDTH_RATIO * me.screen.width,
  height: GRAPH_HEIGHT_RATIO * me.screen.height,
};



// DOM
const ui = {
  top: {
    time: document.getElementById("time"),
    bg: document.getElementById("bg"),
    dbg: document.getElementById("dbg"),
    error: document.getElementById("error"),
  },
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



// CLOCK
// Update the clock every minute
clock.granularity = "minutes";

// On every clock tick
clock.ontick = (e) => {
  
  // Store current time in state
  state.time.now = {
    date: e.date,
    epoch: e.date.getTime() / 1000, // s
  };
    
  // Update display time and time axis
  updateDisplayTime();
  showTimeAxis();
  
  // Fetch BGs
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
  const { command, key, size, payload } = msg.data;

  // React according to message type
  switch (command) {
    case CMD_FETCH_BGS:
      const bg = payload;
      
      // Show newly received BG
      showBG(bg);
      
      // Update last BG
      state.bgs.last = bg;
      
      // Last BG received
      if (key === size) {
        console.log(`Received ${size} BG(s).`);
        
        // Not fetching anymore
        state.bgs.isFetching = false;
        
        // Update current BG
        updateDisplayBG(bg);
      }
      return;
      
    case CMD_DISPLAY_ERROR:
      console.error(`Received error: ${payload}`);
      
      // Update error message and show it
      ui.top.error.text = payload;
      show(ui.top.error);
      return;

    default:
      console.warn("Unknown message received from companion.");
  }
};



// FUNCTIONS
// Fetch BGs
const fetchBGs = () => {
  
  // Fetch only if not currently doing it
  if (!state.bgs.isFetching) {
    const { bgs: { last }, time: { now } } = state;

    // No BGs fetched so far: fetch to fill graph
    // Otherwise: fetch newer ones
    const then = last ? last.t : now.epoch - graph.dt;

    // Ask companion for BGs
    const [ cmd ] = getCommands(CMD_FETCH_BGS, [ { after: then } ]);
    
    // Fetching currently
    state.bgs.isFetching = sendMessage(cmd);
  }
};


// Define current time
const updateDisplayTime = () => {
  const { now } = state.time;
  const hour = formatTime(now.date.getHours());
  const minute = formatTime(now.date.getMinutes());
  
  // Update its value
  ui.top.time.text = `${hour}:${minute}`;
};


// Define current BG
const updateDisplayBG = (bg) => {
  const { bgs: { last }, time: { now } } = state;
  
  // Last BG and dBG
  const isOld = bg ? bg.t < now.epoch - BG_MAX_AGE : true;
  const isDeltaValid = last ? bg.t - last.t < BG_MAX_DELTA : false;
  
  // Update current BG
  if (bg) {
    ui.top.bg.text = formatBG(bg.bg);
    colorBG(ui.top.bg, bg.bg);  
  } else {
    ui.top.bg.text = BG_NONE;
  }
  
  // Update last dBG
  if (!isOld && isDeltaValid) {
    ui.top.dbg.text = `(${formatdBG(bg.bg - last.bg)})`;
    colorBG(ui.top.dbg, bg.bg);
  } else {
    hide(ui.top.dbg);
  }
};


// Display BG in graph
const showBG = (bg) => {
  const { time: { now } } = state;
  const then = now.epoch - graph.dt;
  
  // Get SVG element to use and increment index
  const el = ui.graph.bgs[state.bgs.el];
  state.bgs.el++;
  
  // Position BG in graph
  el.cx = (bg.t - then) / graph.dt * graph.width;
  el.cy = (GRAPH_BG_MAX - bg.bg) / graph.dBG * graph.height;

  // Color corresponding element
  colorBG(el, bg.bg);

  // Show it
  show(el);
};


// Show target range
const showTargetRange = () => {
  const { low, high } = ui.graph.targets;
  const lowY = (GRAPH_BG_MAX - GRAPH_BG_LOW) / graph.dBG * graph.height;
  const highY = (GRAPH_BG_MAX - GRAPH_BG_HIGH) / graph.dBG * graph.height;

  low.y1 = lowY;
  low.y2 = lowY;
  high.y1 = highY;
  high.y2 = highY;
  
  show(low);
  show(high);
};


// Show time axis
const showTimeAxis = () => {
  const { now } = state.time;
  const then = now.epoch - graph.dt;
  const lastHour = new Date(Math.floor(now.epoch / 3600) * 3600 * 1000);
  let nHours = [];
  
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
  const lastHours = nHours.map((n) => {
    return new Date(lastHour.getTime() + n * 3600 * 1000);
  });
  
  ui.graph.axes.time.ticks.map((tick, i) => {
    const date = lastHours[i];
    const time = date.getTime() / 1000;
    const hour = formatTime(date.getHours());
    const minute = formatTime(date.getMinutes());
    
    const tickX = (time - then) / graph.dt * graph.width;
    tick.x1 = tickX;
    tick.x2 = tickX;
    show(tick);
    
    const label = ui.graph.axes.time.labels[i];
    label.text = `${hour}:${minute}`;
    label.x = tickX - 5;
    show(label);
  });
};



// MAIN
showTargetRange();
showTimeAxis();
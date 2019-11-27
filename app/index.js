import document from "document";
import clock from "clock";
import { me } from "device";
import { peerSocket } from "messaging";
import { TIME_3_H, TIME_6_H, TIME_12_H, TIME_24_H,
  GRAPH_BG_LOW, GRAPH_BG_HIGH, GRAPH_BG_MIN, GRAPH_BG_MAX, GRAPH_WIDTH_RATIO, GRAPH_HEIGHT_RATIO,
  CMD_FETCH_BG,
  BG_UNITS, BG_MAX_AGE, BG_MAX_DELTA } from "../common/constants";
import { sendMessage } from "../common/messages";
import { formatTime, formatBG, formatdBG } from "../common/format";
import { show, hide, colorBG } from "../common/ui";



// INITIAL TIME
const now = new Date();



// STATE
const state = {
  time: {
    now: {
      date: now,
      epoch: now.getTime() / 1000, // s
    },
  },
  bgs: [],
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
// Update the clock every second
clock.granularity = "seconds";

// On every clock tick
clock.ontick = (e) => {
  
  // Store current time in state
  state.time.now = {
    date: e.date,
    epoch: e.date.getTime() / 1000, // s
  };
  
  // Every minute
  if (e.date.getSeconds() === 0) {
    
    // Update time
    updateDisplayTime();
    
    // Every 5 minutes
    if (e.date.getMinutes() % 5 === 0) {

      // Update BGs
      fetchBGs();
    }
  }
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
      
      // Store new BG
      state.bgs.push(payload);
      
      // Last BG received
      if (key === size) {
        console.log(`Received ${size} BG(s).`)
        
        // Keep only BGs from the last 24 hours
        const { now } = state.time;
        const then = now.epoch - TIME_24_H;
        state.bgs = filterBGs(then);
        
        // Update current BG
        updateDisplayBG();
        
        // Build graph
        showBGs();
      }
      
      break;

    default:
      console.warn("Unknown message received from companion.");
  }
};



// FUNCTIONS
// Define current time
const updateDisplayTime = () => {
  const { now } = state.time;
  const hour = formatTime(now.date.getHours());
  const minute = formatTime(now.date.getMinutes());
  
  // Update its value
  ui.top.time.text = `${hour}:${minute}`;
};

// Define current BG
const updateDisplayBG = () => {
  const { bgs, time: { now } } = state;
  let bg, lastBG;
  
  // Get last BGs
  if (bgs.length > 1) {
    [ lastBG, bg ] = bgs.slice(-2);
  } else if (bgs.length > 0) {
     [ bg ] = bgs.slice(-1);
  }
  
  // Last BG and dBG
  const isOld = bg ? bg.t < now.epoch - BG_MAX_AGE : true;
  const isDeltaValid = lastBG ? bg.t - lastBG.t < BG_MAX_DELTA : false;
  
  // Update current BG
  if (bg) {
    ui.top.bg.text = formatBG(bg.bg);
    colorBG(ui.top.bg, bg.bg);  
  } else {
    hide(ui.top.bg);
  }
  
  // Update last dBG
  if (lastBG && !isOld && isDeltaValid) {
    ui.top.dbg.text = `(${formatdBG(bg.bg - lastBG.bg)})`;
    colorBG(ui.top.dbg, bg.bg);
  } else {
    hide(ui.top.dbg);
  }
};

// Filter out BGs older than given time
const filterBGs = (then) => {
  return state.bgs.filter(bg => bg.t >= then);
};

// Fetch BGs
const fetchBGs = () => {
  const { bgs, time: { now } } = state;
  let then, bg;
  
  // No BGs fetched so far: fetch to fill graph
  // Otherwise: fetch newer ones
  if (bgs.length === 0) {
    then = now.epoch - graph.dt;
  } else {
    [ bg ] = bgs.slice(-1);
    then = bg.t;
  }
  
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
  const { now } = state.time;
  const then = now.epoch - graph.dt;
  
  // Keep BGs from state which will fit in graph
  const bgs = filterBGs(then);
  const nBGs = bgs.length;

  // Show all stored BGs
  ui.graph.bgs.map((el, i) => {
    
    // No more BGs stored
    if (i >= nBGs) {
      
      // Hide element
      hide(el);
      
    } else {
      const bg = bgs[nBGs - 1 - i];
      
      // Position BG in graph
      el.cx = (bg.t - then) / graph.dt * graph.width;
      el.cy = (GRAPH_BG_MAX - bg.bg) / graph.dBG * graph.height;
      
      // Color element
      colorBG(el, bg.bg);
      
      // Show it
      show(el);
    }
  });
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
  let nHours = [];
  
  // Get last full hour as a date
  let lastHour = new Date();
  lastHour.setTime(now.epoch * 1000);
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
    show(tick);
    
    const label = ui.graph.axes.time.labels[i];
    label.text = `${hour}:${minute}`;
    label.x = tickX - 3;
    show(label);
  });
};



// MAIN
updateDisplayTime();
showTargetRange();
showTimeAxis();
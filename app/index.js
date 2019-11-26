import document from "document";
import clock from "clock";
import { me } from "device";
import { peerSocket } from "messaging";
import { BG_UNITS, BG_GRAPH_MIN, BG_GRAPH_MAX, GRAPH_WIDTH_RATIO, GRAPH_HEIGHT_RATIO, CMD_FETCH_BG } from "../common/globals";
import { sendMessage, formatTime, formatBG, getLast } from "../common/lib";



// UI ELEMENTS
const timeLabel = document.getElementById("time");
const bgLabel = document.getElementById("bg");
const graphElement = document.getElementById("graph");
const bgElements = document.getElementsByClassName("bg");



// UI
const graph = {
  dBG: BG_GRAPH_MAX - BG_GRAPH_MIN, // mmol/L
  dt: 24 * 60 * 60,                 // s
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
  timeLabel.text = `${hour}:${minute}`;
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
  const { command, size, payload } = msg.data;

  // React according to message type
  switch (command) {
    case CMD_FETCH_BG:
      state.bgs = [ ...state.bgs, payload ];
      
      // Last BG received
      if (state.bgs.length === size) {
        showBGs();
      }
      
      // Update BG
      bgLabel.text = formatBG(getLast(state.bgs).bg);
      break;

    default:
      console.warn("Unknown message received from companion.");
  }
};

// Fetch recent BGs from server
const fetchBGs = () => {
  
  // Reset BGs
  state.bgs = [];
  
  // Ask companion for latest BGs
  sendMessage({
    command: CMD_FETCH_BG,
    size: 1,
    payload: {},
  });
};



// FUNCTIONS
const showBGs = () => {
  const now = new Date().getTime() / 1000;
  const then = now - graph.dt;

  // Show all stored BGs
  state.bgs.map((bg, i) => {
    const bgEl = bgElements[i];
    
    bgEl.style.display = "inline";
    bgEl.cx = (bg.t - then) / graph.dt * graph.width;
    bgEl.cy = (BG_GRAPH_MAX - bg.bg) / graph.dBG * graph.height;
  });
};
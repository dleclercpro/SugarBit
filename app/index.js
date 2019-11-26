import document from "document";
import clock from "clock";
import { peerSocket } from "messaging";
import { BG_UNITS, CMD_FETCH_BG } from "../common/globals";
import { sendMessage, formatTime, formatBG, getLast } from "../common/lib";



// UI
const timeLabel = document.getElementById("time");
const bgLabel = document.getElementById("bg");



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
  
  // Update time on watch
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
  const { command, payload } = msg.data;

  // React according to message type
  switch (command) {
    case CMD_FETCH_BG:
      //console.log(`BG: ${payload.bg} ${BG_UNITS} (${payload.t})`);
      state.bgs = [ ...state.bgs, payload ];
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
    payload: {},
  });
};
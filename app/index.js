import document from "document";
import clock from "clock";
import * as messaging from "messaging";
import { BG_UNITS, MSG_TYPE_BG, MSG_TYPE_LAST_BG } from "../common/globals";
import { zeroPad } from "../common/lib";

// UI
const timeLabel = document.getElementById("time");
const bgLabel = document.getElementById("bg");

// STATE
const state = {
  bgs: [],
};

// Update the clock every second
clock.granularity = "minutes";

// On every clock tick
clock.ontick = (e) => {
  const today = e.date;
  const hour = zeroPad(today.getHours());
  const min = zeroPad(today.getMinutes());
  
  // Update time on watch
  timeLabel.text = `${hour}:${min}`;
};

// Message received from companion
messaging.peerSocket.onmessage = (msg) => {
  const [ msgType, msgTime, msgValue ] = msg.data;
  
  // React according to message type
  switch (msgType) {
    case MSG_TYPE_BG:
      state.bgs.push(`BG: ${msgValue} ${BG_UNITS} (${msgTime})`);
      break;
      
    case MSG_TYPE_LAST_BG:
      console.log(`Last BG: ${msgValue} ${BG_UNITS} (${msgTime})`);
      
      // Update BG on watch
      bgLabel.text = msgValue;
      break;
      
    default:
      console.warn("Unknown message received from companion.");
  }
};
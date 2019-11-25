import document from "document";
import clock from "clock";
import * as messaging from "messaging";
import { BG_UNITS, MSG_TYPE_BG, MSG_TYPE_LAST_BG } from "../common/globals";
import { zeroPad } from "../common/lib";

// UI
const timeLabel = document.getElementById("time");
const bgLabel = document.getElementById("bg");

// Update the clock every second
clock.granularity = "minutes";

// On every clock tick
clock.ontick = (e) => {
  let today = e.date;
  let hour = zeroPad(today.getHours());
  let min = zeroPad(today.getMinutes());
  timeLabel.text = `${hour}:${min}`;
};

// Message received from companion
messaging.peerSocket.onmessage = (msg) => {
  const [ msgType, msgTime, msgValue ] = msg.data;
  
  // React according to message type
  switch (msgType) {
    case MSG_TYPE_BG:
      console.log(`Received BG: ${msgValue} ${BG_UNITS} (${msgTime})`);
      break;
      
    case MSG_TYPE_LAST_BG:
      console.log(`Received last BG: ${msgValue} ${BG_UNITS} (${msgTime})`);
      
      // Update BG on watch face
      bgLabel.text = msgValue;
      break;
      
    default:
      console.warn("Unknown message received from companion.");
  }
};
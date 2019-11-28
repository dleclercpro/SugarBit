import { peerSocket } from "messaging";
import { me } from "companion";
import { CMD_FETCH_BGS, CMD_SYNC, CMD_DISPLAY_ERROR, getCommands } from "../common/commands";
import { compareBGs } from "../common/lib";
import { getEpochTime } from "../common/time";
import { sendMessages } from "../common/messages";



// SERVER
const URL = "https://dleclerc.net/sugarscout/reports/";

const REPORTS = {
  bgs: "BG.json",
  history: "history.json",
  treatments: "treatments.json",
  errors: "errors.json",
};



// STATE
const state = {
  sync: 0,
  bgs: [],
  buffer: [],
};



// PERMISSIONS
const PERMISSIONS_NEEDED = ["access_internet"];

const isGranted = (permission) => {
    if (me.permissions.granted(permission)) {
      console.log(`Permission granted: ${permission}`);
      return true;
    }
  
  console.error(`Permission denied: ${permission}`);
  return false;
};

const checkPermissions = () => {
  return PERMISSIONS_NEEDED.reduce((otherPermissionsGranted, permission) => {
    return otherPermissionsGranted && isGranted(permission);
  }, true);
};



// MESSAGING
// Keep sending messages
peerSocket.onbufferedamountdecrease = () => {
  sendMessages(state.buffer);
};

// Messaging error
peerSocket.onerror = (err) => {
  console.error(`Connection error: ${err.code} - ${err.message}`);
};

// Message received from device
peerSocket.onmessage = (msg) => {
  if (!msg.data) {
    console.warn("Received message from device without data.");
    return;
  }
  
  // Destructure message
  const { command, key, size, payload } = msg.data;

  // React according to message type
  switch (command) {
    case CMD_FETCH_BGS:
      const { after } = payload;
      
      // Fetch recent BGs from server and send them over to device
      fetchBGs(after).then(() => {
        const { bgs } = state;
        const nBGs = bgs.length;
        
        // No BGs after given time: send nothing
        if (nBGs > 0) {
          console.log(`Sending ${nBGs} BG(s) to device...`);

          state.buffer = getCommands(CMD_FETCH_BGS, bgs);
          sendMessages(state.buffer);
        }

      // Error handling
      }).catch(error => {
        const { message } = error;
        console.error(`Could not send BG(s) to device: ${message}`);
        
        state.buffer = getCommands(CMD_DISPLAY_ERROR, [ message ]);
        sendMessages(state.buffer);
      });
      return;
      
    case CMD_SYNC:
      const { sync } = state;
      
      state.buffer = getCommands(CMD_SYNC, [ sync ]);
      sendMessages(state.buffer);
      return;
      
    // No errors possibly coming from device
    CMD_DISPLAY_ERROR:
      return;

    default:
      console.warn("Unknown message received from device.");
  }
};



// FUNCTIONS
// Fetch recent BGs from server
const fetchBGs = (after) => {
  console.log(`Fetching BGs newer than: ${after}`);
  
  // Build request
  const request = new Request(URL + REPORTS.bgs, {
    method: "GET",
    headers: { "Cache-Control": "no-cache" },
  });
  
  // Execute it
  return fetch(request).then(response => {
    
    // Store last modified date in epoch time, then convert
    // response content to JSON and return it
    state.sync = new Date(response.headers.get("Last-Modified")).getTime() / 1000; // s
    return response.json();
    
  // Process response content
  }).then(json => {
    console.log("Fetched BGs successfully.");
    
    // Use epoch time for BGs
    const times = Object.keys(json);
    let epochBGs = times.reduce((bgs, t) => {
      const epoch = getEpochTime(t);
      
      // Keep only BGs after given time
      if (epoch > after) {
        return [ ...bgs, { t: epoch, bg: json[t] } ];
      }
      
      return bgs;
    }, []);
    
    // Sort and store them
    epochBGs.sort(compareBGs);
    state.bgs = epochBGs;
  
  // Error handling
  }).catch(error => {
    const { message } = error;
    console.error(`BGs could not be fetched: ${message}`);
    
    // Rethrow error for higher level handling
    throw error;
  });
};



// MAIN
checkPermissions();
import { peerSocket } from "messaging";
import { me } from "companion";
import { BG_REFRESH_RATE, CMD_FETCH_BG } from "../common/constants";
import { compareBGs } from "../common/lib";
import { getEpochTime } from "../common/time";
import { sendMessage, sendMessages } from "../common/messages";



// SERVER
const URL = "https://dleclerc.net/sugarscout/reports/";

const REPORTS = {
  bgs: "BG.json",
  history: "history.json",
  treatments: "treatments.json",
  errors: "errors.json",
};



// REQUESTS
const REQUEST_HEADERS = new Headers();
REQUEST_HEADERS.append("pragma", "no-cache");
REQUEST_HEADERS.append("cache-control", "no-cache");

const REQUEST_INIT = {
  method: "GET",
  headers: REQUEST_HEADERS,
};

const REQUEST = new Request(URL + REPORTS.bgs);



// STATE
const state = {
  bgs: {
    isFetched: false,
    isError: false,
    data: {},
  },
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
    case CMD_FETCH_BG:
      const { after } = payload;
      
      // Fetch recent BGs from server and send them over to device
      fetchBGs(after).then(() => {
        const nBGs = state.bgs.data.length;
        
        if (nBGs > 0) {
          console.log(`Sending ${nBGs} BG(s) to device...`);

          fillBufferWithBGs();
          sendMessages(state.buffer);
        }

      }).catch((error) => {
        console.error(`Could not send BG(s) to device: ${error}`);
      });
      
      break;

    default:
      console.warn("Unknown message received from device.");
  }
};

// Keep sending messages
peerSocket.onbufferedamountdecrease = () => {
  sendMessages(state.buffer);
};



// FUNCTIONS
// Fetch recent BGs from server
const fetchBGs = (after) => {
  console.log(`Fetching BGs newer than: ${after}`);
  
  return fetch(REQUEST, REQUEST_INIT).then(response => response.json()).then(json => {
    console.log("Fetched BGs successfully.");
    
    // Use epoch time for BGs, keep only those after given time, sort, and store them
    let epochBGs = Object.keys(json).reduce((bgs, t) => [
      ...bgs, { t: getEpochTime(t), bg: json[t] }
    ], []);
    epochBGs = epochBGs.filter(bg => bg.t > after);
    epochBGs.sort(compareBGs);
    
    // Update state
    state.bgs = {
      isFetched: true,
      isError: false,
      data: epochBGs,
    };
    
  }).catch((error) => {
    console.error(`BGs could not be fetched: ${error}`);
    
    // Update state
    state.bgs = {
      isFetched: false,
      isError: true,
      data: {},
    };
    
    // Rethrow error for higher level handling
    throw error;
  });
};

// Fill buffer with fetched BGs
const fillBufferWithBGs = () => {
  const bgs = state.bgs.data;
  const nBGs = bgs.length;
  
  // Map BGs onto buffer
  state.buffer = bgs.map((bg, i) => ({
    command: CMD_FETCH_BG,
    key: i + 1,
    size: nBGs,
    payload: bg,
  }));
};



// MAIN
checkPermissions();
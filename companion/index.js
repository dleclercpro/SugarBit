import { peerSocket } from "messaging";
import { me } from "companion";
import { BG_COUNT, BG_REFRESH_RATE, CMD_FETCH_BG } from "../common/globals";
import { sendMessage, sendMessages, getEpochTime, compareBGs } from "../common/lib";



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
  const { command, size, payload } = msg.data;

  // React according to message type
  switch (command) {
    case CMD_FETCH_BG:
      sendBGs();
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
const fetchBGs = () => {
  console.log("Fetching BGs...");
  
  return fetch(URL + REPORTS.bgs).then((response) => {
    return response.json();
  }).then((json) => {
    console.log("Fetched BGs successfully.");
    
    // Use epoch time for BGs, sort them and keep only the last 24h
    let epochBGs = Object.keys(json).reduce((bgs, t) => {
      return [
        ...bgs,
        { t: getEpochTime(t), bg: json[t] },
      ];
    }, []);
    epochBGs.sort(compareBGs);
    epochBGs = epochBGs.slice(-Math.min(epochBGs.length, BG_COUNT));
    
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
  state.buffer = state.bgs.data.map((bg) => {
    return {
      command: CMD_FETCH_BG,
      size: state.bgs.data.length,
      payload: bg,
    };
  });
};

// Send BGs loaded in state to device
const sendBGs = () => {
  
  // Fetch recent BGs from server
  fetchBGs().then(() => {
    fillBufferWithBGs();
    sendMessages(state.buffer);
    
  }).catch((error) => {
    console.error("Could not send BGs to device.");
  });
};



// MAIN
checkPermissions();
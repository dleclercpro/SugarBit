import * as messaging from "messaging";
import { me } from "companion";
import { BG_REFRESH_RATE, MSG_TYPE_BG, MSG_TYPE_LAST_BG } from "../common/globals";

const URL = "https://dleclerc.net/sugarscout/reports/";

const REPORTS = {
  "bg": "BG.json",
  "history": "history.json",
  "treatments": "treatments.json",
  "errors": "errors.json",
};


/**
 * CHECKPERMISSIONS
 * Make sure all the necessary permissions are granted for the app to work
 */
const checkPermissions = () => {
  return new Promise((resolve, reject) => {
    if (!me.permissions.granted("access_internet")) {
      console.log("Can't access the internet using the companion API.");
      reject();
    }
    
    resolve();
  })
};

/**
 * FETCHBGS
 * Fetch all recent BGs from server
 */
const fetchBGs = () => {
  return fetch(URL + REPORTS["bg"])
    .then((response) => {
      return response.json();
    })
    .then((json) => {
      console.log("BGs fetched successfully.")
      
      // Send BGs individually to watch
      if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
        for (const t in json) {
          messaging.peerSocket.send([MSG_TYPE_BG, t, json[t]]);
        }
      }
    })
    .catch((error) => {
      console.error(`BGs could not be fetched: ${error}`);
    });
};

/**
 * FETCHLASTBG
 * Send last BG to watch
 */
const fetchLastBG = () => {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send([MSG_TYPE_LAST_BG, "2019.11.27 - 15:55:55", 5.5]);
  }
}


// MAIN
checkPermissions().then(() => fetchBGs()).then(() => {
    fetchLastBG();
    setTimeout(fetchLastBG, BG_REFRESH_RATE);  
});
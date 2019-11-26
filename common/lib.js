import { peerSocket } from "messaging";

export const formatTime = (t) => {
  return t < 10 ? "0" + t : t;
};

export const formatBG = (bg) => {
  const isInteger = bg.toString().split(".").length === 1;
  return isInteger ? bg + ".0" : bg;
};

export const parseTime = (t) => {
  const [ date, time ] = t.split(" - ");
  const [ year, month, day ] = date.split(".");
  const [ hour, minute, second ] = time.split(":");
  
  return { year, month, day, hour, minute, second };
};

export const getLast = (x) => {
  return x[x.length - 1];
};

export const getEpochTime = (t) => {
  const { year, month, day, hour, minute, second } = parseTime(t);
  return new Date(year, month - 1, day, hour, minute, second).getTime() / 1000;
};

export const getCurrentTime = () => {
  return new Date().getTime() / 1000;
}

export const compareBGs = (bg1, bg2) => {
  if (bg1.t < bg2.t) { return -1; }
  if (bg1.t > bg2.t) { return 1; }
  return 0;
};

// Send message to device/companion
export const sendMessage = (msg) => {
  if (peerSocket.readyState === peerSocket.OPEN) {
    peerSocket.send(msg);
    
    // Message was successfully sent
    return true;
  }
  
  // Message could not be sent (channel not open)
  return false;
};

// Send multiple messages without overflowing buffer
export const sendMessages = (msgs) => {
  
  // Send messages only while the buffer contains less than 128 bytes
  while (peerSocket.bufferedAmount < 128) {
    
    // No more message to send
    if (msgs.length === 0) {
      return;
    }
      
    // Send messages in buffer FIFO, giving app some time to breath
    setTimeout(sendMessage(msgs.shift()), 1);
  }
};
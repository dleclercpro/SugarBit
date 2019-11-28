import { peerSocket } from "messaging";

// Send message to device/companion
const sendMessage = (msg) => {
  if (peerSocket.readyState === peerSocket.OPEN) {
    peerSocket.send(msg);
    return true;
  }
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
      
    // Send messages in buffer (FIFO)
    if (sendMessage(msgs[0])) {
      
      // Remove message if sent successfully
      msgs.shift();
    }
  }
};
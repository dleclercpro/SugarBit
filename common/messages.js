import { peerSocket } from "messaging";

// Send message to device/companion
export const sendMessage = (msg) => {
  if (peerSocket.readyState === peerSocket.OPEN) {
    peerSocket.send(msg);
    return true;
  }
  
  // Could not send message
  console.warn("Trying to send message while channel is closed.");
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
    sendMessage(msgs.shift());
  }
};
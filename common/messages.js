import { peerSocket } from "messaging";

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
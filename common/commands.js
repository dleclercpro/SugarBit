import { sendMessages } from "./messages";

export const CMD_FETCH_BGS = 100;
export const CMD_SYNC = 101;
export const CMD_DISPLAY_ERROR = 200;

// Build commands
export const getCommands = (cmd, msgs) => {
  return msgs.map((msg, i) => ({
    command: cmd,
    key: i + 1,
    size: msgs.length,
    payload: msg,
  }));
};
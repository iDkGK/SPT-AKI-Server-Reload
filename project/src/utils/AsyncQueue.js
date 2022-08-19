"use strict";

require("../Lib.js");

class AsyncQueue
{
    static commandsQueue = [];

    static async waitFor(command)
    {
        // Add to the queue
        AsyncQueue.commandsQueue.push(command);

        // eslint-disable-next-line no-constant-condition
        while (AsyncQueue.commandsQueue[0].uuid !== command.uuid)
        {
            await new Promise(resolve =>
            {
                setTimeout(resolve, 100);
            });
        }

        // When the command is ready, execute it
        return AsyncQueue.commandsQueue.shift().cmd();
    }
}

module.exports = AsyncQueue;

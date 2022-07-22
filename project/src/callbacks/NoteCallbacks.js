"use strict";

require("../Lib.js");

class NoteCallbacks
{
    static addNote(pmcData, body, sessionID)
    {
        return NoteController.addNote(pmcData, body, sessionID);
    }

    static editNote(pmcData, body, sessionID)
    {
        return NoteController.editNote(pmcData, body, sessionID);
    }

    static deleteNote(pmcData, body, sessionID)
    {
        return NoteController.deleteNote(pmcData, body, sessionID);
    }
}

module.exports = NoteCallbacks;

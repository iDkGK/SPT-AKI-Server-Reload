"use strict";

require("../Lib.js");

class NoteController
{
    static addNote(pmcData, body, sessionID)
    {
        pmcData.Notes.Notes.push({
            "Time": body.note.Time,
            "Text": body.note.Text
        });

        return ItemEventRouter.getOutput(sessionID);
    }

    static editNote(pmcData, body, sessionID)
    {
        pmcData.Notes.Notes[body.index] = {
            "Time": body.note.Time,
            "Text": body.note.Text
        };

        return ItemEventRouter.getOutput(sessionID);
    }

    static deleteNote(pmcData, body, sessionID)
    {
        pmcData.Notes.Notes.splice(body.index, 1);
        return ItemEventRouter.getOutput(sessionID);
    }
}

module.exports = NoteController;

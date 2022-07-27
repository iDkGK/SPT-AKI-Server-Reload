"use strict";

require("../Lib.js");

class NoteController
{
    static addNote(pmcData, body, sessionID)
    {
        const newNote = {
            Time: body.note.Time,
            Text: body.note.Text,
        };
        pmcData.Notes.Notes.push(newNote);

        return ItemEventRouter.getOutput(sessionID);
    }

    static editNote(pmcData, body, sessionID)
    {
        const noteToEdit = pmcData.Notes.Notes[body.index];
        noteToEdit.Time = body.note.Time;
        noteToEdit.Text = body.note.Text;

        return ItemEventRouter.getOutput(sessionID);
    }

    static deleteNote(pmcData, body, sessionID)
    {
        pmcData.Notes.Notes.splice(body.index, 1);
        return ItemEventRouter.getOutput(sessionID);
    }
}

module.exports = NoteController;

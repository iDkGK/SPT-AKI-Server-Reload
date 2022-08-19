"use strict";

require("../Lib.js");

class DialogueCallbacks
{
    static update()
    {
        DialogueController.update();
        return true;
    }

    static getFriendList(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DialogueController.getFriendList(sessionID)
        );
    }

    static getChatServerList(url, info, sessionID)
    {
        return HttpResponseUtil.getBody([
            {
                _id: HashUtil.generate(),
                RegistrationId: 20,
                DateTime: TimeUtil.getTimestamp(),
                IsDeveloper: true,
                Regions: ["EUR"],
                VersionId: "bgkidft87ddd",
                Ip: "",
                Port: 0,
                Chats: [
                    {
                        _id: "0",
                        Members: 0,
                    },
                ],
            },
        ]);
    }

    static getMailDialogList(url, info, sessionID)
    {
        return DialogueController.generateDialogueList(sessionID);
    }

    static getMailDialogView(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DialogueController.generateDialogueView(info.dialogId, sessionID)
        );
    }

    static getMailDialogInfo(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DialogueController.getDialogueInfo(info.dialogId, sessionID)
        );
    }

    static removeDialog(url, info, sessionID)
    {
        DialogueController.removeDialogue(info.dialogId, sessionID);
        return HttpResponseUtil.emptyArrayResponse();
    }

    static pinDialog(url, info, sessionID)
    {
        DialogueController.setDialoguePin(info.dialogId, true, sessionID);
        return HttpResponseUtil.emptyArrayResponse();
    }

    static unpinDialog(url, info, sessionID)
    {
        DialogueController.setDialoguePin(info.dialogId, false, sessionID);
        return HttpResponseUtil.emptyArrayResponse();
    }

    static setRead(url, info, sessionID)
    {
        DialogueController.setRead(info.dialogs, sessionID);
        return HttpResponseUtil.emptyArrayResponse();
    }

    static getAllAttachments(url, info, sessionID)
    {
        return HttpResponseUtil.getBody(
            DialogueController.getAllAttachments(info.dialogId, sessionID)
        );
    }

    static listOutbox(url, info, sessionID)
    {
        return HttpResponseUtil.getBody([]);
    }

    static listInbox(url, info, sessionID)
    {
        return HttpResponseUtil.getBody([]);
    }

    static friendRequest(url, request, sessionID)
    {
        return HttpResponseUtil.nullResponse();
    }

    static sendMessage(url, request, sessionID)
    {
        return HttpResponseUtil.getBody(1);
    }
}

module.exports = DialogueCallbacks;

"use strict";

require("../Lib.js");

class DialogueCallbacks
{
    static getFriendList(url, info, sessionID)
    {
        return HttpResponse.getBody({
            Friends: [],
            Ignore: [],
            InIgnoreList: [],
        });
    }

    static getChatServerList(url, info, sessionID)
    {
        return HttpResponse.getBody([
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
        return HttpResponse.getBody(
            DialogueController.generateDialogueView(info.dialogId, sessionID)
        );
    }

    static getMailDialogInfo(url, info, sessionID)
    {
        return HttpResponse.getBody(
            DialogueController.getDialogueInfo(info.dialogId, sessionID)
        );
    }

    static removeDialog(url, info, sessionID)
    {
        DialogueController.removeDialogue(info.dialogId, sessionID);
        return HttpResponse.getBody([]);
    }

    static pinDialog(url, info, sessionID)
    {
        DialogueController.setDialoguePin(info.dialogId, true, sessionID);
        return HttpResponse.getBody([]);
    }

    static unpinDialog(url, info, sessionID)
    {
        DialogueController.setDialoguePin(info.dialogId, false, sessionID);
        return HttpResponse.emptyArrayResponse();
    }

    static setRead(url, info, sessionID)
    {
        DialogueController.setRead(info.dialogs, sessionID);
        return HttpResponse.emptyArrayResponse();
    }

    static getAllAttachments(url, info, sessionID)
    {
        return HttpResponse.getBody(
            DialogueController.getAllAttachments(info.dialogId, sessionID)
        );
    }

    static listOutbox(url, info, sessionID)
    {
        return HttpResponse.emptyArrayResponse();
    }

    static listInbox(url, info, sessionID)
    {
        return HttpResponse.emptyArrayResponse();
    }

    static friendRequest(url, request, sessionID)
    {
        return HttpResponse.nullResponse();
    }

    static sendMessage(url, request, sessionID)
    {
        return HttpResponse.getBody(1);
    }

    static update()
    {
        DialogueController.update();
        return true;
    }
}

module.exports = DialogueCallbacks;

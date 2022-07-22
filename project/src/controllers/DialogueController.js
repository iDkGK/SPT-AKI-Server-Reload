"use strict";

require("../Lib.js");

class DialogueController
{
    static messageTypes = {
        "npcTrader": 2,
        "insuranceReturn": 8,
        "questStart": 10,
        "questFail": 11,
        "questSuccess": 12
    };

    /* Set the content of the dialogue on the list tab. */
    static generateDialogueList(sessionID)
    {
        const data = [];

        for (const dialogueId in SaveServer.profiles[sessionID].dialogues)
        {
            data.push(DialogueController.getDialogueInfo(dialogueId, sessionID));
        }

        return HttpResponse.getBody(data);
    }

    /* Get the content of a dialogue. */
    static getDialogueInfo(dialogueId, sessionID)
    {
        const dialogue = SaveServer.profiles[sessionID].dialogues[dialogueId];

        return {
            "_id": dialogueId,
            "type": 2, // Type npcTrader.
            "message": DialogueController.getMessagePreview(dialogue),
            "new": dialogue.new,
            "attachmentsNew": dialogue.attachmentsNew,
            "pinned": dialogue.pinned
        };
    }

    /*
	* Set the content of the dialogue on the details panel, showing all the messages
	* for the specified dialogue.
	*/
    static generateDialogueView(dialogueId, sessionID)
    {
        const dialogue = SaveServer.profiles[sessionID].dialogues[dialogueId];
        dialogue.new = 0;

        // Set number of new attachments, but ignore those that have expired.
        let attachmentsNew = 0;
        const currDt = Date.now() / 1000;

        for (const message of dialogue.messages)
        {
            if (message.hasRewards && !message.rewardCollected && currDt < (message.dt + message.maxStorageTime))
            {
                attachmentsNew++;
            }
        }

        dialogue.attachmentsNew = attachmentsNew;

        return HttpResponse.getBody({ "messages": SaveServer.profiles[sessionID].dialogues[dialogueId].messages });
    }

    /*
	* Add a templated message to the dialogue.
	*/
    static addDialogueMessage(dialogueID, messageContent, sessionID, rewards = [])
    {
        const dialogueData = SaveServer.profiles[sessionID].dialogues;
        const isNewDialogue = !(dialogueID in dialogueData);
        let dialogue = dialogueData[dialogueID];

        if (isNewDialogue)
        {
            dialogue = {
                "_id": dialogueID,
                "messages": [],
                "pinned": false,
                "new": 0,
                "attachmentsNew": 0
            };

            dialogueData[dialogueID] = dialogue;
        }

        dialogue.new += 1;

        // Generate item stash if we have rewards.
        const items = {};

        if (rewards.length > 0)
        {
            const stashId = HashUtil.generate();

            items.stash = stashId;
            items.data = [];
            rewards = ItemHelper.replaceIDs(null, rewards);

            for (const reward of rewards)
            {
                if (!("slotId" in reward) || reward.slotId === "hideout")
                {
                    reward.parentId = stashId;
                    reward.slotId = "main";
                }

                items.data.push(reward);

                const itemTemplate = DatabaseServer.tables.templates.items[reward._tpl];
                if ("StackSlots" in itemTemplate._props)
                {
                    const stackSlotItems = ItemHelper.generateStackSlotItems(itemTemplate, reward._id);
                    for (const stackSlotItem of stackSlotItems)
                    {
                        items.data.push(stackSlotItem);
                    }
                }

            }

            dialogue.attachmentsNew += 1;
        }

        const message = {
            "_id": HashUtil.generate(),
            "uid": dialogueID,
            "type": messageContent.type,
            "dt": Date.now() / 1000,
            "localDateTime": Date.now() / 1000,
            "templateId": messageContent.templateId,
            "text": messageContent.text,
            "hasRewards": rewards.length > 0,
            "rewardCollected": false,
            "items": items,
            "maxStorageTime": messageContent.maxStorageTime,
            "systemData": messageContent.systemData
        };

        dialogue.messages.push(message);

        // Offer Sold notifications are now separate from the main notification
        if (messageContent.type === 4 && messageContent.ragfair)
        {
            const offerSoldMessage = NotifierController.createRagfairOfferSoldNotification(message, messageContent.ragfair);
            NotifierController.sendMessage(sessionID, offerSoldMessage);
            message.type = 13; // Should prevent getting the same notification popup twice
        }

        const notificationMessage = NotifierController.createNewMessageNotification(message);
        NotifierController.sendMessage(sessionID, notificationMessage);
    }

    /*
	* Get the preview contents of the last message in a dialogue.
	*/
    static getMessagePreview(dialogue)
    {
        // The last message of the dialogue should be shown on the preview.
        const message = dialogue.messages[dialogue.messages.length - 1];

        return {
            "dt": message.dt,
            "type": message.type,
            "templateId": message.templateId,
            "uid": dialogue._id
        };
    }

    /*
	* Get the item contents for a particular message.
	*/
    static getMessageItemContents(messageId, sessionID)
    {
        const dialogueData = SaveServer.profiles[sessionID].dialogues;

        for (const dialogueId in dialogueData)
        {
            const messages = dialogueData[dialogueId].messages;

            for (const message of messages)
            {
                if (message._id === messageId)
                {
                    const attachmentsNew = SaveServer.profiles[sessionID].dialogues[dialogueId].attachmentsNew;
                    if (attachmentsNew > 0)
                    {
                        SaveServer.profiles[sessionID].dialogues[dialogueId].attachmentsNew = attachmentsNew - 1;
                    }
                    message.rewardCollected = true;
                    return message.items.data;
                }
            }
        }

        return [];
    }

    static removeDialogue(dialogueId, sessionID)
    {
        delete SaveServer.profiles[sessionID].dialogues[dialogueId];
    }

    static setDialoguePin(dialogueId, shouldPin, sessionID)
    {
        SaveServer.profiles[sessionID].dialogues[dialogueId].pinned = shouldPin;
    }

    static setRead(dialogueIds, sessionID)
    {
        const dialogueData = SaveServer.profiles[sessionID].dialogues;

        for (const dialogId of dialogueIds)
        {
            dialogueData[dialogId].new = 0;
            dialogueData[dialogId].attachmentsNew = 0;
        }

    }

    static getAllAttachments(dialogueId, sessionID)
    {
        const output = [];
        const timeNow = Date.now() / 1000;

        for (const message of SaveServer.profiles[sessionID].dialogues[dialogueId].messages)
        {
            if (timeNow < (message.dt + message.maxStorageTime))
            {
                output.push(message);
            }
        }

        SaveServer.profiles[sessionID].dialogues[dialogueId].attachmentsNew = 0;
        return { "messages": output };
    }

    static update()
    {
        for (const sessionID in SaveServer.profiles)
        {
            DialogueController.removeExpiredItems(sessionID);
        }
    }

    // deletion of items that has been expired. triggers when updating traders.
    static removeExpiredItems(sessionID)
    {
        for (const dialogueId in SaveServer.profiles[sessionID].dialogues)
        {
            for (const message of SaveServer.profiles[sessionID].dialogues[dialogueId].messages)
            {
                if ((Date.now() / 1000) > (message.dt + message.maxStorageTime))
                {
                    message.items = {};
                }
            }
        }
    }

    /*
    * Return the int value associated with the messageType, for readability.
    */
    static getMessageTypeValue(messageType)
    {
        return DialogueController.messageTypes[messageType];
    }
}

module.exports = DialogueController;

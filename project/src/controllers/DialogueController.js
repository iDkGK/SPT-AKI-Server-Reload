"use strict";

require("../Lib.js");

class DialogueController
{
    static update()
    {
        const profiles = SaveServer.getProfiles();
        for (const sessionID in profiles)
        {
            DialogueController.removeExpiredItems(sessionID);
        }
    }

    static getFriendList(sessionID)
    {
        return {
            Friends: [],
            Ignore: [],
            InIgnoreList: [],
        };
    }

    /* Set the content of the dialogue on the list tab. */
    static generateDialogueList(sessionID)
    {
        const data = [];

        for (const dialogueId in SaveServer.getProfile(sessionID).dialogues)
        {
            data.push(
                DialogueController.getDialogueInfo(dialogueId, sessionID)
            );
        }

        return HttpResponseUtil.getBody(data);
    }

    /* Get the content of a dialogue. */
    static getDialogueInfo(dialogueID, sessionID)
    {
        const dialogue = SaveServer.getProfile(sessionID).dialogues[dialogueID];

        return {
            _id: dialogueID,
            type: MessageType.NPC_TRADER, // Type npcTrader.
            message: DialogueHelper.getMessagePreview(dialogue),
            new: dialogue.new,
            attachmentsNew: dialogue.attachmentsNew,
            pinned: dialogue.pinned,
        };
    }

    /*
     * Set the content of the dialogue on the details panel, showing all the messages
     * for the specified dialogue.
     */
    static generateDialogueView(dialogueID, sessionID)
    {
        const dialogue = SaveServer.getProfile(sessionID).dialogues[dialogueID];
        dialogue.new = 0;

        // Set number of new attachments, but ignore those that have expired.
        let attachmentsNew = 0;
        const currDt = Date.now() / 1000;

        for (const message of dialogue.messages)
        {
            if (
                message.hasRewards &&
                !message.rewardCollected &&
                currDt < message.dt + message.maxStorageTime
            )
            {
                attachmentsNew++;
            }
        }

        dialogue.attachmentsNew = attachmentsNew;

        const messages =
            SaveServer.getProfile(sessionID).dialogues[dialogueID].messages;
        return {
            messages: messages,
            profiles: [],
            hasMessagesWithRewards:
                DialogueController.messagesHaveUncollectedRewards(messages),
        };
    }

    static removeDialogue(dialogueID, sessionID)
    {
        delete SaveServer.getProfile(sessionID).dialogues[dialogueID];
    }

    static setDialoguePin(dialogueID, shouldPin, sessionID)
    {
        SaveServer.getProfile(sessionID).dialogues[dialogueID].pinned =
            shouldPin;
    }

    static setRead(dialogueIDs, sessionID)
    {
        const dialogueData = SaveServer.getProfile(sessionID).dialogues;

        for (const dialogID of dialogueIDs)
        {
            dialogueData[dialogID].new = 0;
            dialogueData[dialogID].attachmentsNew = 0;
        }
    }

    static getAllAttachments(dialogueID, sessionID)
    {
        const messages = [];
        const timeNow = Date.now() / 1000;

        for (const message of SaveServer.getProfile(sessionID).dialogues[
            dialogueID
        ].messages)
        {
            if (
                timeNow < message.dt + message.maxStorageTime &&
                !message.rewardCollected &&
                message.hasRewards
            )
            {
                messages.push(message);
            }
        }

        SaveServer.getProfile(sessionID).dialogues[
            dialogueID
        ].attachmentsNew = 0;

        return {
            messages: messages,
            profiles: [],
            hasMessagesWithRewards:
                DialogueController.messagesHaveUncollectedRewards(messages),
        };
    }

    static messagesHaveUncollectedRewards(messages)
    {
        return messages.some(
            x => x.hasRewards && x.items?.data?.length > 0 && !x.rewardCollected
        );
    }

    // deletion of items that has been expired. triggers when updating traders.
    static removeExpiredItems(sessionID)
    {
        for (const dialogueId in SaveServer.getProfile(sessionID).dialogues)
        {
            for (const message of SaveServer.getProfile(sessionID).dialogues[
                dialogueId
            ].messages)
            {
                if (Date.now() / 1000 > message.dt + message.maxStorageTime)
                {
                    message.items = {};
                }
            }
        }
    }

    /*
     * Return the int value associated with the messageType, for readability.
     */
    /* @Cleanup: Not really needed anymore sinde we use Enum
     static getMessageTypeValue(messageType)
     {
         return DialogueController.messageTypes[messageType];
     }
     */
}

module.exports = DialogueController;

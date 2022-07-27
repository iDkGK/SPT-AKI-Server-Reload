"use strict";

require("../Lib.js");

class DialogueHelper
{
    static messageTypes = {
        npcTrader: 2,
        fleamarketMessage: 4,
        insuranceReturn: 8,
        questStart: 10,
        questFail: 11,
        questSuccess: 12,
        messageWithItems: 13,
    };

    /*
     * Return the int value associated with the messageType, for readability.
     */
    static getMessageTypeValue(messageType)
    {
        return DialogueHelper.messageTypes[messageType];
    }

    static createMessageContext(templateId, messageType, maxStoreTime)
    {
        return {
            templateId: templateId,
            type: messageType,
            maxStorageTime: maxStoreTime * TimeUtil.oneHourAsSeconds,
        };
    }
    /*
     * Add a templated message to the dialogue.
     */
    static addDialogueMessage(
        dialogueID,
        messageContent,
        sessionID,
        rewards = []
    )
    {
        const dialogueData = SaveServer.getProfile(sessionID).dialogues;
        const isNewDialogue = !(dialogueID in dialogueData);
        let dialogue = dialogueData[dialogueID];
        if (isNewDialogue)
        {
            dialogue = {
                _id: dialogueID,
                messages: [],
                pinned: false,
                new: 0,
                attachmentsNew: 0,
            };
            dialogueData[dialogueID] = dialogue;
        }
        dialogue.new += 1;
        // Generate item stash if we have rewards.
        let items = {};
        if (rewards.length > 0)
        {
            const stashId = HashUtil.generate();
            items = {
                stash: stashId,
                data: []
            };
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
                        const itemToAdd = {
                            _id: stackSlotItem._id,
                            _tpl: stackSlotItem._sptTpl,
                            upd: stackSlotItem.upd,
                            parentId: stackSlotItem.parent,
                            slotId: stackSlotItem.slotId
                        };
                        items.data.push(itemToAdd);
                    }
                }
            }

            if (items.data.length === 0)
            {
                delete items.data;
            }

            dialogue.attachmentsNew += 1;
        }
        const message = {
            _id: HashUtil.generate(),
            uid: dialogueID,
            type: messageContent.type,
            dt: Date.now() / 1000,
            localDateTime: Date.now() / 1000,
            templateId: messageContent.templateId,
            text: messageContent.text ?? "",
            hasRewards: rewards.length > 0,
            rewardCollected: false,
            items: items,
            maxStorageTime: messageContent.maxStorageTime,
        };
        if (messageContent.text)
        {
            message.text = messageContent.text;
        }
        dialogue.messages.push(message);
        // Offer Sold notifications are now separate from the main notification
        if (
            messageContent.type ===
                DialogueHelper.getMessageTypeValue("fleamarketMessage") &&
            messageContent.ragfair
        )
        {
            const offerSoldMessage =
                NotifierController.createRagfairOfferSoldNotification(
                    message,
                    messageContent.ragfair
                );
            NotifierController.sendMessage(sessionID, offerSoldMessage);
            message.type = MessageType.MessageWithItems; // Should prevent getting the same notification popup twice
        }
        const notificationMessage =
            NotifierController.createNewMessageNotification(message);
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
            dt: message.dt,
            type: message.type,
            templateId: message.templateId,
            uid: dialogue._id,
        };
    }
    /*
     * Get the item contents for a particular message.
     */
    static getMessageItemContents(messageID, sessionID)
    {
        const dialogueData = SaveServer.getProfile(sessionID).dialogues;
        for (const dialogueId in dialogueData)
        {
            const messages = dialogueData[dialogueId].messages;
            for (const message of messages)
            {
                if (message._id === messageID)
                {
                    const attachmentsNew =
                        SaveServer.getProfile(sessionID).dialogues[dialogueId]
                            .attachmentsNew;
                    if (attachmentsNew > 0)
                    {
                        SaveServer.getProfile(sessionID).dialogues[
                            dialogueId
                        ].attachmentsNew = attachmentsNew - 1;
                    }
                    message.rewardCollected = true;
                    return message.items.data;
                }
            }
        }
        return [];
    }
}

module.exports = DialogueHelper;

"use strict";

require("../Lib.js");

class DialogueHelper
{
    static createMessageContext(templateId, messageType, maxStoreTime)
    {
        return {
            templateId: templateId,
            type: messageType,
            maxStorageTime: maxStoreTime * TimeUtil.oneHourAsSeconds,
        };
    }

    /**
     * Add a templated message to the dialogue.
     * @param dialogueID
     * @param messageContent
     * @param sessionID
     * @param rewards
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
                data: [],
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

                const itemTemplate =
                    DatabaseServer.getTables().templates.items[reward._tpl];
                if ("StackSlots" in itemTemplate._props)
                {
                    const stackSlotItems =
                        ItemHelper.generateItemsFromStackSlot(
                            itemTemplate,
                            reward._id
                        );
                    for (const itemToAdd of stackSlotItems)
                    {
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
            dt: Math.round(Date.now() / 1000),
            text: messageContent.text ?? "",
            templateId: messageContent.templateId,
            hasRewards: rewards.length > 0,
            rewardCollected: false,
            items: items,
            maxStorageTime: messageContent.maxStorageTime,
        };

        if (messageContent.systemData)
        {
            message.systemData = messageContent.systemData;
        }

        if (messageContent.text || messageContent.text === "")
        {
            message.text = messageContent.text;
        }

        if (
            messageContent.profileChangeEvents ||
            messageContent.profileChangeEvents?.length === 0
        )
        {
            message.profileChangeEvents = messageContent.profileChangeEvents;
        }

        dialogue.messages.push(message);

        // Offer Sold notifications are now separate from the main notification
        if (
            messageContent.type === MessageType.FLEAMARKET_MESSAGE &&
            messageContent.ragfair
        )
        {
            const offerSoldMessage =
                NotifierHelper.createRagfairOfferSoldNotification(
                    message,
                    messageContent.ragfair
                );
            NotificationSendHelper.sendMessage(sessionID, offerSoldMessage);
            message.type = MessageType.MESSAGE_WITH_ITEMS; // Should prevent getting the same notification popup twice
        }

        const notificationMessage =
            NotifierHelper.createNewMessageNotification(message);
        NotificationSendHelper.sendMessage(sessionID, notificationMessage);
    }

    /**
     * Get the preview contents of the last message in a dialogue.
     * @param dialogue
     * @returns
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

    /**
     * Get the item contents for a particular message.
     * @param messageID
     * @param sessionID
     * @returns
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

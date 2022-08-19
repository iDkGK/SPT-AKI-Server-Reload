"use strict";

require("../Lib.js");

class InsuranceController
{
    static processReturn()
    {
        const time = TimeUtil.getTimestamp();

        for (const sessionID in SaveServer.getProfiles())
        {
            const insurance = SaveServer.getProfile(sessionID).insurance;
            let i = insurance.length;

            while (i-- > 0)
            {
                const insured = insurance[i];

                if (time < insured.scheduledTime)
                {
                    continue;
                }
                // Inject a little bit of a surprise by failing the insurance from time to time ;)
                const slotIdsThatCanFail =
                    InsuranceConfig.slotIdsWithChanceOfNotReturning;
                const toDelete = [];

                for (const insuredItem of insured.items)
                {
                    // Roll from 0 to 9999, then divide it by 100: 9999 =  99.99%
                    const returnChance = RandomUtil.getInt(0, 9999) / 100;
                    // @Cleanup: what does isNaN mean in this context. is it needed?
                    // if ((toLook.includes(insuredItem.slotId) || !isNaN(insuredItem.slotId)) && RandomUtil.getInt(0, 99) >= InsuranceConfig.returnChancePercent[insured.traderId] && !toDelete.includes(insuredItem._id))
                    if (
                        slotIdsThatCanFail.includes(insuredItem.slotId) &&
                        returnChance >=
                            InsuranceConfig.returnChancePercent[
                                insured.traderId
                            ] &&
                        !toDelete.includes(insuredItem._id)
                    )
                    {
                        toDelete.push(
                            ...ItemHelper.findAndReturnChildrenByItems(
                                insured.items,
                                insuredItem._id
                            )
                        );
                    }
                }

                for (let pos = insured.items.length - 1; pos >= 0; --pos)
                {
                    if (toDelete.includes(insured.items[pos]._id))
                    {
                        insured.items.splice(pos, 1);
                    }
                }

                if (insured.items.length === 0)
                {
                    const insuranceFailedTemplates =
                        DatabaseServer.getTables().traders[insured.traderId]
                            .dialogue.insuranceFailed;
                    insured.messageContent.templateId =
                        RandomUtil.getArrayValue(insuranceFailedTemplates);
                }

                DialogueHelper.addDialogueMessage(
                    insured.traderId,
                    insured.messageContent,
                    sessionID,
                    insured.items
                );
                insurance.splice(i, 1);
            }

            SaveServer.getProfile(sessionID).insurance = insurance;
        }
    }

    /* add insurance to an item */
    static insure(pmcData, body, sessionID)
    {
        let output = ItemEventRouter.getOutput(sessionID);
        const itemsToPay = [];
        const inventoryItemsHash = {};

        for (const item of pmcData.Inventory.items)
        {
            inventoryItemsHash[item._id] = item;
        }

        // get the price of all items
        for (const key of body.items)
        {
            itemsToPay.push({
                id: inventoryItemsHash[key]._id,
                count: Math.round(
                    InsuranceService.getPremium(
                        pmcData,
                        inventoryItemsHash[key],
                        body.tid
                    )
                ),
            });
        }

        const options = {
            scheme_items: itemsToPay,
            tid: body.tid,
            Action: "",
            type: "",
            item_id: "",
            count: 0,
            scheme_id: 0,
        };

        // pay for the item insurance
        output = PaymentService.payMoney(pmcData, options, sessionID, output);
        if (output.warnings.length > 0)
        {
            return output;
        }

        // add items to InsuredItems list once money has been paid
        for (const key of body.items)
        {
            pmcData.InsuredItems.push({
                tid: body.tid,
                itemId: inventoryItemsHash[key]._id,
            });
        }

        return output;
    }

    /**
     * Calculate insurance cost
     * @param info request object
     * @param sessionID session id
     * @returns response object to send to client
     */
    static cost(info, sessionID)
    {
        const output = {};
        const pmcData = ProfileHelper.getPmcProfile(sessionID);
        const inventoryItemsHash = {};

        for (const item of pmcData.Inventory.items)
        {
            inventoryItemsHash[item._id] = item;
        }

        for (const trader of info.traders)
        {
            const items = {};

            for (const key of info.items)
            {
                items[inventoryItemsHash[key]._tpl] = Math.round(
                    InsuranceService.getPremium(
                        pmcData,
                        inventoryItemsHash[key],
                        trader
                    )
                );
            }

            output[trader] = items;
        }

        return output;
    }
}

module.exports = InsuranceController;

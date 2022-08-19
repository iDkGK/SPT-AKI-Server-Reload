"use strict";

require("../Lib.js");

class PaymentService
{
    /**
     * Take money and insert items into return to server request
     * @param {Object} pmcData
     * @param {Object} body
     * @param {string} sessionID
     * @returns Object
     */
    static payMoney(pmcData, body, sessionID, output)
    {
        const trader = TraderHelper.getTrader(body.tid, sessionID);
        let currencyTpl = PaymentHelper.getCurrency(trader.currency);

        // delete barter things(not a money) from inventory
        if (body.Action === "TradingConfirm")
        {
            for (const index in body.scheme_items)
            {
                const item = pmcData.Inventory.items.find(i => i._id === body.scheme_items[index].id);
                if (item !== undefined)
                {
                    if (!PaymentHelper.isMoneyTpl(item._tpl))
                    {
                        output = InventoryHelper.removeItem(pmcData, item._id, sessionID, output);
                        body.scheme_items[index].count = 0;
                    }
                    else
                    {
                        currencyTpl = item._tpl;
                        break;
                    }
                }
            }
        }

        // prepare a price for barter
        let barterPrice = 0;
        barterPrice = body.scheme_items.reduce((accumulator, item) => accumulator + item.count, 0);

        // Nothing to do here, since we dont need to pay money.
        if (barterPrice === 0)
        {
            Logger.success("Price is 0 no payment needed");
            return output;
        }

        output = PaymentService.addPaymentToOutput(pmcData, currencyTpl, barterPrice, sessionID, output);
        if (output.warnings.length > 0)
        {
            return output;
        }

        // set current sale sum
        // convert barterPrice itemTpl into RUB then convert RUB into trader currency
        const saleSum = pmcData.TradersInfo[body.tid].salesSum += HandbookHelper.fromRUB(HandbookHelper.inRUB(barterPrice, currencyTpl), PaymentHelper.getCurrency(trader.currency));

        pmcData.TradersInfo[body.tid].salesSum = saleSum;
        TraderHelper.lvlUp(body.tid, sessionID);
        Object.assign(output.profileChanges[sessionID].traderRelations, { [body.tid]: pmcData.TradersInfo[body.tid] });

        Logger.debug("Items taken. Status OK.");
        return output;
    }

    /**
     * Receive money back after selling
     * @param {IPmcData} pmcData
     * @param {number} amount
     * @param {IProcessSellTradeRequestData} body
     * @param {IItemEventRouterResponse} output
     * @param {string} sessionID
     * @returns IItemEventRouterResponse
     */
    static getMoney(pmcData, amount, body, output, sessionID)
    {
        const trader = TraderHelper.getTrader(body.tid, sessionID);
        const currency = PaymentHelper.getCurrency(trader.currency);
        let calcAmount = HandbookHelper.fromRUB(HandbookHelper.inRUB(amount, currency), currency);
        const maxStackSize = DatabaseServer.getTables().templates.items[currency]._props.StackMaxSize;
        let skip = false;

        for (const item of pmcData.Inventory.items)
        {
            // item is not currency
            if (item._tpl !== currency)
            {
                continue;
            }

            // item is not in the stash
            if (!PaymentService.isItemInStash(pmcData, item))
            {
                continue;
            }

            if (item.upd.StackObjectsCount < maxStackSize)
            {

                if (item.upd.StackObjectsCount + calcAmount > maxStackSize)
                {
                    // calculate difference
                    calcAmount -= maxStackSize - item.upd.StackObjectsCount;
                    item.upd.StackObjectsCount = maxStackSize;
                }
                else
                {
                    skip = true;
                    item.upd.StackObjectsCount = item.upd.StackObjectsCount + calcAmount;
                }

                output.profileChanges[sessionID].items.change.push(item);

                if (skip)
                {
                    break;
                }
                continue;
            }
        }

        if (!skip)
        {
            const request = {
                items: [{
                    item_id: currency,
                    count: calcAmount
                }],
                tid: body.tid
            };

            output = InventoryHelper.addItem(pmcData, request, output, sessionID, null, false);
        }

        // set current sale sum
        const saleSum = pmcData.TradersInfo[body.tid].salesSum + amount;

        pmcData.TradersInfo[body.tid].salesSum = saleSum;
        TraderHelper.lvlUp(body.tid, sessionID);
        Object.assign(output.profileChanges[sessionID].traderRelations, { [body.tid]: { "salesSum": saleSum } });

        return output;
    }

    /**
   * Recursively checks if the given item is
   * inside the stash, that is it has the stash as
   * ancestor with slotId=hideout
   */
    static isItemInStash(pmcData, item)
    {
        let container = item;

        while ("parentId" in container)
        {
            if (container.parentId === pmcData.Inventory.stash && container.slotId === "hideout")
            {
                return true;
            }

            container = pmcData.Inventory.items.find(i => i._id === container.parentId);
            if (!container)
            {
                break;
            }
        }
        return false;
    }

    /**
     * Remove currency from player stash/inventory
     * @param pmcData Player profile to find and remove currency from
     * @param currencyTpl Type of currency to pay
     * @param amountToPay money value to pay
     * @param sessionID Sessino id
     * @param output output object to send to client
     * @returns IItemEventRouterResponse
     */
    static addPaymentToOutput(pmcData, currencyTpl, amountToPay, sessionID, output)
    {
        const moneyItemsInInventory = ItemHelper.findBarterItems("tpl", pmcData, currencyTpl);
        moneyItemsInInventory.sort(PaymentService.moneySort);

        const amountAvailable = moneyItemsInInventory.reduce((accumulator, item) => accumulator + item.upd.StackObjectsCount, 0);

        // if no money in inventory or amount is not enough we return false
        if (moneyItemsInInventory.length <= 0 || amountAvailable < amountToPay)
        {
            Logger.error(`Profile did not have enough money for transaction: needed ${amountToPay}, has ${amountAvailable}`);
            output = HttpResponseUtil.appendErrorToOutput(output, "Not enough money to complete transaction", "Transaction Error");
            return output;
        }

        let leftToPay = amountToPay;
        for (const moneyItem of moneyItemsInInventory)
        {
            const itemAmount = moneyItem.upd.StackObjectsCount;
            if (leftToPay >= itemAmount)
            {
                leftToPay -= itemAmount;
                output = InventoryHelper.removeItem(pmcData, moneyItem._id, sessionID, output);
            }
            else
            {
                moneyItem.upd.StackObjectsCount -= leftToPay;
                leftToPay = 0;
                output.profileChanges[sessionID].items.change.push(moneyItem);
            }

            if (leftToPay === 0)
            {
                break;
            }
        }

        return output;
    }

    /**
     * Prioritise player stash first over player inventory
     * Post-raid healing would often take money out of the players pockets/secure container
     * @param a Firsat money stack item
     * @param b Second money stack item
     * @returns sorted item
     */
    static moneySort (a, b)
    {
        if (a.slotId === "hideout" && b.slotId === "hideout")
        {
            return 0;
        }

        if (a.slotId === "hideout" && b.slotId !== "hideout")
        {
            return -1;
        }

        if (a.slotId !== "hideout" && b.slotId === "hideout")
        {
            return 1;
        }

        return 0;
    }
}

module.exports = PaymentService;

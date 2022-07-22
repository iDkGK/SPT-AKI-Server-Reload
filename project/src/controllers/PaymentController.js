require("../Lib");

class PaymentController
{
    /**
     * Check whether tpl is Money
     * @param {string} tpl
     * @returns void
     */
    static isMoneyTpl(tpl)
    {
        return [ItemHelper.MONEY.Dollars, ItemHelper.MONEY.Euros, ItemHelper.MONEY.Roubles].includes(tpl);
    }

    /**
    * Gets currency TPL from TAG
    * @param {string} currency
    * @returns string
    */
    static getCurrency(currency)
    {
        switch (currency)
        {
            case "EUR":
                return ItemHelper.MONEY.Euros;
            case "USD":
                return ItemHelper.MONEY.Dollars;
            case "RUB":
                return ItemHelper.MONEY.Roubles;
            default:
                return "";
        }
    }

    /**
    * Gets currency TAG from TPL
    * @param {string} currency
    * @returns string
    */
    static getCurrencyTag(currency)
    {
        switch (currency)
        {
            case "569668774bdc2da2298b4568":
                return "EUR";

            case "5696686a4bdc2da3298b456a":
                return "USD";

            case "5449016a4bdc2d6f028b456f":
                return "RUB";

            default:
                return "";
        }
    }

    /**
    * Gets Currency to Ruble conversion Value
    * @param {number} value
    * @param {number} currency
    * @returns number
    */
    static inRUB(value, currencyFrom)
    {
        return Math.round(value * (HandbookController.getTemplatePrice(currencyFrom) || 0));
    }

    /**
     * Gets Ruble to Currency conversion Value
     * @param {number} value
     * @param {number} currency
     * @returns number
     */
    static fromRUB(value, currencyTo)
    {
        const price = HandbookController.getTemplatePrice(currencyTo);
        return price ? Math.round(value / price) : 0;
    }

    /**
     * Take money and insert items into return to server request
     * @param {Object} pmcData
     * @param {Object} body
     * @param {string} sessionID
     * @returns Object
     */
    static payMoney(pmcData, body, sessionID, output)
    {
        const trader = TraderController.getTrader(body.tid, sessionID);
        let currencyTpl = PaymentController.getCurrency(trader.currency);

        // delete barter things(not a money) from inventory
        if (body.Action === "TradingConfirm")
        {
            for (const index in body.scheme_items)
            {
                const item = pmcData.Inventory.items.find(i => i._id === body.scheme_items[index].id);
                if (item !== undefined)
                {
                    if (!PaymentController.isMoneyTpl(item._tpl))
                    {
                        output = InventoryController.removeItem(pmcData, item._id, sessionID, output);
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

        // find all items with currency _tpl id
        const moneyItemsInInventory = ItemHelper.findBarterItems("tpl", pmcData, currencyTpl);

        // only pay with money which is not in secured container.
        // const moneyItems = moneyItemsTemp.filter(item => item.slotId = "hideout");

        // prepare a price for barter
        let barterPrice = 0;
        barterPrice = body.scheme_items.reduce((accumulator, item) => accumulator + item.count, 0);

        // Nothing to do here, since we dont need to pay money.
        if (barterPrice === 0)
        {
            Logger.success("Price is 0 no payment needed");
            return output;
        }

        // prepare the amount of money in the profile
        let amountMoney = 0;
        amountMoney = moneyItemsInInventory.reduce((accumulator, item) => accumulator + item.upd.StackObjectsCount, 0);

        // if no money in inventory or amount is not enough we return false
        if (moneyItemsInInventory.length <= 0 || amountMoney < barterPrice)
        {
            Logger.error(`Profile did not have enough money for transaction: needed ${barterPrice}, had ${amountMoney}`);
            output = HttpResponse.appendErrorToOutput(output, "Not enough money to complete transaction", "Transaction Error");
            return output;
        }

        let leftToPay = barterPrice;

        for (const moneyItem of moneyItemsInInventory)
        {
            const itemAmount = moneyItem.upd.StackObjectsCount;
            if (leftToPay >= itemAmount)
            {
                leftToPay -= itemAmount;
                output = InventoryController.removeItem(pmcData, moneyItem._id, sessionID, output);
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

        // set current sale sum
        // convert barterPrice itemTpl into RUB then convert RUB into trader currency
        const saleSum = pmcData.TradersInfo[body.tid].salesSum += PaymentController.fromRUB(PaymentController.inRUB(barterPrice, currencyTpl), PaymentController.getCurrency(trader.currency));

        pmcData.TradersInfo[body.tid].salesSum = saleSum;
        TraderController.lvlUp(body.tid, sessionID);
        Object.assign(output.profileChanges[sessionID].traderRelations, { [body.tid]: pmcData.TradersInfo[body.tid] });

        Logger.debug("Items taken. Status OK.");
        return output;
    }

    /**
     * Receive money back after selling
     * @param {Object} pmcData
     * @param {number} amount
     * @param {Object} body
     * @param {Object} output
     * @param {string} sessionID
     * @returns Object
     */
    static getMoney(pmcData, amount, body, output, sessionID)
    {
        const trader = TraderController.getTrader(body.tid, sessionID);
        const currency = PaymentController.getCurrency(trader.currency);
        let calcAmount = PaymentController.fromRUB(PaymentController.inRUB(amount, currency), currency);
        const maxStackSize = DatabaseServer.tables.templates.items[currency]._props.StackMaxSize;
        let skip = false;

        for (const item of pmcData.Inventory.items)
        {
            // item is not currency
            if (item._tpl !== currency)
            {
                continue;
            }

            // item is not in the stash
            if (!InventoryHelper.isItemInStash(pmcData, item))
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
                "items": [{
                    "item_id": currency,
                    "count": calcAmount,
                }],
                "tid": body.tid
            };

            output = InventoryController.addItem(pmcData, request, output, sessionID, null, false);
        }

        // set current sale sum
        const saleSum = pmcData.TradersInfo[body.tid].salesSum + amount;

        pmcData.TradersInfo[body.tid].salesSum = saleSum;
        TraderController.lvlUp(body.tid, sessionID);
        Object.assign(output.profileChanges[sessionID].traderRelations, { [body.tid]: { "salesSum": saleSum } });

        return output;
    }
}

module.exports = PaymentController;
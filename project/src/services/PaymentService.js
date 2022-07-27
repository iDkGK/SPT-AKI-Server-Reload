"use strict";

require("../Lib");

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
                const item = pmcData.Inventory.items.find(
                    i => i._id === body.scheme_items[index].id
                );
                if (item !== undefined)
                {
                    if (!PaymentHelper.isMoneyTpl(item._tpl))
                    {
                        output = InventoryHelper.removeItem(
                            pmcData,
                            item._id,
                            sessionID,
                            output
                        );
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

        // only pay with money which is not in secured container.
        // const moneyItems = moneyItemsTemp.filter(item => item.slotId = "hideout");

        // prepare a price for barter
        let barterPrice = 0;
        barterPrice = body.scheme_items.reduce(
            (accumulator, item) => accumulator + item.count,
            0
        );

        // Nothing to do here, since we dont need to pay money.
        if (barterPrice === 0)
        {
            Logger.success("Price is 0 no payment needed");
            return output;
        }

        output = PaymentService.addPaymentToOutput(pmcData, currencyTpl, barterPrice, sessionID, output);
        if (output.warnings.length > 0)
        {
            const itemAmount = moneyItem.upd.StackObjectsCount;
            if (leftToPay >= itemAmount)
            {
                leftToPay -= itemAmount;
                output = InventoryHelper.removeItem(
                    pmcData,
                    moneyItem._id,
                    sessionID,
                    output
                );
            }
            else
            {
                moneyItem.upd.StackObjectsCount -= leftToPay;
                leftToPay = 0;
                output.profileChanges[sessionID].items.change.push(moneyItem);
            }

            if (leftToPay === 0)
            {
                return output;
            }
        }

        // set current sale sum
        // convert barterPrice itemTpl into RUB then convert RUB into trader currency
        const saleSum = pmcData.TradersInfo[body.tid].salesSum +=
            HandbookHelper.fromRUB(
                HandbookHelper.inRUB(barterPrice, currencyTpl),
                PaymentHelper.getCurrency(trader.currency)
            );

        pmcData.TradersInfo[body.tid].salesSum = saleSum;
        TraderHelper.lvlUp(body.tid, sessionID);
        Object.assign(output.profileChanges[sessionID].traderRelations, {
            [body.tid]: pmcData.TradersInfo[body.tid],
        });

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
        const trader = TraderHelper.getTrader(body.tid, sessionID);
        const currency = PaymentHelper.getCurrency(trader.currency);
        let calcAmount = HandbookHelper.fromRUB(
            HandbookHelper.inRUB(amount, currency),
            currency
        );
        const maxStackSize =
            DatabaseServer.tables.templates.items[currency]._props.StackMaxSize;
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
                    item.upd.StackObjectsCount =
                        item.upd.StackObjectsCount + calcAmount;
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
                items: [
                    {
                        item_id: currency,
                        count: calcAmount,
                    },
                ],
                tid: body.tid,
            };

            output = InventoryHelper.addItem(
                pmcData,
                request,
                output,
                sessionID,
                null,
                false
            );
        }

        // set current sale sum
        const saleSum = pmcData.TradersInfo[body.tid].salesSum + amount;

        pmcData.TradersInfo[body.tid].salesSum = saleSum;
        TraderHelper.lvlUp(body.tid, sessionID);
        Object.assign(output.profileChanges[sessionID].traderRelations, {
            [body.tid]: { salesSum: saleSum },
        });

        return output;
    }

    static addPaymentToOutput(pmcData, currencyTpl, amountToPay, sessionID, output)
    {
        const moneyItemsInInventory = ItemHelper.findBarterItems("tpl", pmcData, currencyTpl);
        const amountAvailable = moneyItemsInInventory.reduce((accumulator, item) => accumulator + item.upd.StackObjectsCount, 0);
        // if no money in inventory or amount is not enough we return false
        if (moneyItemsInInventory.length <= 0 || amountAvailable < amountToPay)
        {
            Logger.error(`Profile did not have enough money for transaction: needed ${amountToPay}, had ${amountAvailable}`);
            output = HttpResponse.appendErrorToOutput(output, "Not enough money to complete transaction", "Transaction Error");
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

}

module.exports = PaymentService;

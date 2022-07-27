"use strict";

require("../Lib.js");

class PaymentHelper
{
    /**
     * Check whether tpl is Money
     * @param {string} tpl
     * @returns void
     */
    static isMoneyTpl(tpl)
    {
        return [
            ItemHelper.MONEY.Dollars,
            ItemHelper.MONEY.Euros,
            ItemHelper.MONEY.Roubles,
        ].includes(tpl);
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
}

module.exports = PaymentHelper;

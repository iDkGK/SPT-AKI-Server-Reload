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
        return [Money.DOLLARS, Money.EUROS, Money.ROUBLES].some(
            element => element === tpl
        );
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
                return Money.EUROS;
            case "USD":
                return Money.DOLLARS;
            case "RUB":
                return Money.ROUBLES;
            default:
                return "";
        }
    }
}

module.exports = PaymentHelper;

"use strict";

require("../Lib.js");

class HttpResponse
{
    static clearString(s)
    {
        return s.replace(/[\b]/g, "")
            .replace(/[\f]/g, "")
            .replace(/[\n]/g, "")
            .replace(/[\r]/g, "")
            .replace(/[\t]/g, "")
            .replace(/[\\]/g, "");
    }

    static noBody(data)
    {
        return this.clearString(JsonUtil.serialize(data));
    }

    static getBody(data, err = 0, errmsg = null)
    {
        return this.clearString(this.getUnclearedBody(data, err, errmsg));
    }

    static getUnclearedBody(data, err = 0, errmsg = null)
    {
        return JsonUtil.serialize({
            "err": err,
            "errmsg": errmsg,
            "data": data
        });
    }

    static emptyResponse()
    {
        return this.getBody("", 0, "");
    }

    static nullResponse()
    {
        return this.getBody(null);
    }

    static emptyArrayResponse()
    {
        return this.getBody([]);
    }

    static appendErrorToOutput(output, message = "An unknown error occurred", title = "Error")
    {
        output.warnings = [{
            "index": 0,
            "err": title,
            "errmsg": message
        }];

        return output;
    }
}

module.exports = HttpResponse;

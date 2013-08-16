const webEngine = "http://qualia.org.uk/api/v1/";   // Qualia Web Engine URL

var u;                                              // API Username
var ak;                                             // API Key

var qualia = {
    // Application Constructor
    init: function(username, apikey) {
        u = username;
        ak = apikey;
        $.support.cors = true;
    },
    // API Explorer 
    // e.g. .api("visitor/{id}/", "GET", {}, callback)
    api: function(request, type, data, callback) {
        //If sending a POST to the API, convert the data JSON
        if (type == "POST") data = JSON.stringify(data);
        jQuery.ajax({
            dataType:       "json",
            async:          true,
            crossDomain:    true,
            type:           type,
            data:           data,
            contentType:    "application/json",
            url:            webEngine+request+"/?api_key="+ak+"&username="+u,
            success:        callback,
            error:          function(a,b,c) { callback(b); }
        });
    },
    // User Login
    // Returns Visitor "id" as Integer
    login: function(email_address, callback) {
        var that = this;
        this.api("visitor","GET",{email:email_address},function(e) {
            if (e != "error" || e != "parsererror") {
                if (e.meta.total_count > 0) { // email does exist
                    callback(e.objects[0].id);
                } else { // email doesnt exist
                    that.api("visitor","POST",{email:email_address},function(e,t,r) {
                        callback(e.id);
                    });
                }
            } else {
                callback(e);  
            }
        });
            
    }
}
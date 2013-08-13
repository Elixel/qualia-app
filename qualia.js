var u;
var ak;

var qualia = {
    // Application Constructor
    init: function(username, apikey) {
        u = username;
        ak = apikey;
    },
    api: function(request, type, data, callback) {
        //If sending a POST to the API, convert the data JSON
        if (type == "POST"){
            data = JSON.stringify(data);
        }

        var url = "http://qualia.org.uk/api/v1/";
        jQuery.ajax({
            dataType:       "json",
            async:          true,
            crossDomain:    true,
            type:           type,
            data:           data,
            contentType:    "application/json",
            url:            url+request+"?api_key="+ak+"&username="+u,
            success:        callback,
            error:          function(a,b,c) { console.log(b); callback(c); },
            beforeSend:     function(jqXHR, settings) {
                console.log(settings);
            }
        });
    },
    login: function(email_address, callback) {
        var that = this;
        this.api("visitor","GET",{email:email_address},function(e) {
            console.log(e);
            if (e.meta.total_count > 0) { // email does exist
                callback(e.objects[0].id);
            } else { // email doesnt exist
                that.api("visitor","POST",{email:email_address},function(e,t,r) {
                    if (e.meta.total_count > 0) callback(e.objects[0].id);
                    console.log(e);
                });
            }
        });
    }
}
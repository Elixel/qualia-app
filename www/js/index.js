//
//  index.js
//
// Core functionality for Qualia applications.
// Written by Christian Cook of Elixel for the Qualia project.
//
// Qualia PhoneGap Application
// http://qualia.org.uk/

// Qualia Engine
var QUALIA_USERNAME = "elixel";
var QUALIA_API_KEY = "ab33073c631ff2df0497e7c2a63fc523a020415e";

// Event Information ("YYYY-MM-DD")
var START_DATE = new Date("2013-10-04");
var END_DATE = new Date("2013-10-13");
//END_DATE = new Date("2014-03-21");

// Push Notifications (Uses PushWoosh: http://www.pushwoosh.com)
var PUSH_ENABLED = true;
//var PUSHWOOSH_APP_ID = "38C7F-39C51";
var PUSHWOOSH_APP_ID = "2D0AD-5DE2C";
var GOOGLE_PROJECT_ID = "62883180042";

// Facebook & Twitter
var FACEBOOK_APP_ID = "510092625750443";
var HASHTAG = "#cheltlitfest"; // Appended to messages on the 'social' panel

// App Labels
var APP_NAME = "Qualia";
var LIKERT_COLOURS = {1:"#00aeef",2:"#4978bc",3:"#8e5ca5",4:"#92278f",5:"#942c61",6:"#c02646",7:"#ed1d24"};
var LIKERT_FEEDBACK = {1:"Strongly Disagree",2:"Disagree",3:"Somewhat Disagree",4:"Neutral",5:"Somewhat Agree",6:"Agree",7:"Strongly Agree"};
var LIKERT_MOOD = {1:"Very Bad",2:"Bad",3:"Somewhat Bad",4:"Neutral",5:"Somewhat Good",6:"Good",7:"Very Good"};
var NO_INTERNET = "You are currently not connected to the Internet.";
var NO_INTERNET_EDIT_PROFILE = "You require an active internet connection to edit your profile.";
var NO_INTERNET_FEEDBACK = "You require an active internet connection to leave feedback.";
var NO_INTERNET_GET_EVENTS = "An Internet connection is required to retrieve events.";
var NO_INTERNET_HOTSPOTS = "You require an active internet connection to view hotspots.";
var NO_INTERNET_MOOD = "You require an active internet connection to submit your mood.";
var NO_INTERNET_SOCIAL = "You require an active internet connection to share content.";
var TOO_MANY_RESULTS = "Your search yielded too many results. Try and be more specific.";
var THANK_YOU_RESPONSE = "Thank you for your response.";
var PROBLEM_RESPONSE = "There was a problem submitting your response.";
var THANK_YOU_MOOD = "Mood submitted successfully.";
var PROFILE_UPDATED_SUCCESS = "Profile Updated Successfully."
var SOCIAL_CHOOSE_NETWORK = "Please choose atleast one network to share to.";
var FACEBOOK_POST_SUCCESS = "Posted to Facebook successfully.";
var FACEBOOK_POST_FAIL = "There was an error posting to Facebook.";
var FACEBOOK_LOGIN_FAIL = "There was an error logging in to Facebook.";
var QUALIA_LOGIN_FAIL = "There was an error logging into Qualia.";
var TIMED_OUT = "The request has timed out. Please try again later!";


/*

CHANGE ANYTHING BELOW THIS LINE AT YOUR OWN RISK.

*/

// Global Variables
var touchTimer;
var notificationScroller;
var running = true;
var PUSH_LISTENER = false;
var MENU_INITIALISED = false;
var ua = navigator.userAgent.toLowerCase();
var isAndroid = ua.indexOf("android") > -1;
var isiOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );
var isiOS7 = ( navigator.userAgent.match(/(iPad|iPhone|iPod touch);.*CPU.*OS 7_\d/i) ? true : false );
var body = jQuery("body");
var DEVICE_READY = false;

var app = {
    initialise: function() {
        af.ui.removeFooterMenu();    // Disable AF Footer
        af.ui.useOSThemes=false;     // Disable AF Themes
        af.ui.resetScrollers=false;
        if (isiOS7) jQuery("body").addClass("ios7"); // if IOS7, add extra padding to the top
        else if (!isiOS7 && isiOS) jQuery("body").addClass("ios");
        jQuery(document.body).on("touchstart", "#pageTitle", app.scrollToTop);
        this.bindEvents();          // Bind Event Listeners
        qualia.init(QUALIA_USERNAME,QUALIA_API_KEY);
    },
    bindEvents: function() {
        document.addEventListener('deviceready', app.onDeviceReady, false);
        document.addEventListener("resume", app.onResume, false);
        document.addEventListener("pause", app.onPause, false);
        if (!isAndroid) jQuery(document.body).on("touchstart",".afScrollPanel", app.onScrollStart);
        if (!isAndroid) jQuery(document.body).on("touchend", ".afScrollPanel", app.onScrollEnd);
        af.ui.ready(app.onUIReady);
    },
    onScrollStart: function() {
        body.css("pointer-events","none");  
    },
    onScrollEnd: function() {
        body.css("pointer-events","auto");
    },
    onDeviceReady: function() {
        DEVICE_READY = true;
        console.log("Device Ready");
        if (window.localStorage.getItem("id") !== null) app.initialisePushNotifications();
        app.initialiseFacebook();
        
        var localStorageSpace = function(){
            var allStrings = '';
            for(var key in window.localStorage){
                if(window.localStorage.hasOwnProperty(key)){
                    allStrings += window.localStorage[key];
                }
            }
            return allStrings ? 3 + ((allStrings.length*16)/(8*1024)) + ' KB' : 'Empty (0 KB)';
        };
        console.log("Storage Space: "+localStorageSpace());
    },
    onUIReady: function() {  
        if (window.device) window.setTimeout(function(){navigator.splashscreen.hide();},250);
        // Automatically update relative timestamps
        jQuery(".timeago").timeago();
        if (window.localStorage.getItem("id") === null) {
            app.navigateTo("login","fade");
        } else {
            app.refreshUserData();
            app.navigateTo("dashboard","fade");
            app.initialiseMenu();
            app.initialiseNotifications();
            app.loadNotifications();
        }
    },
    onResume: function() {
        if (window.localStorage.getItem("id") !== null) {
            app.refreshUserData();
            app.refreshData();
            app.initialisePushNotifications();
        } else {
            jQuery("#login-form").children().prop("disabled",false).removeClass("disabled");   
        }
        setTimeout(function(){running = true;},2000);
    },
    refreshUserData: function() {
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        qualia.api("visitor/"+visitor.id,"GET",{},function(e) {
            window.localStorage.setItem("visitor", JSON.stringify(e));
            app.displayProfilePicture();
        });
        //var visitor = app.parse(window.localStorage.getItem("visitor"));
        //qualia.api("visitor/"+visitor.id,"PATCH",visitor,function(response){console.log("Visitor object updated");});
    },
    refreshData: function(force) {
        if (app.hasInternet()) {
            console.log("force refresh");
            var refresh = window.localStorage.getItem("refresh");
            if (refresh == null) {
                refresh = Date.now();
                window.localStorage.setItem("refresh",refresh);
                qualia.api("event","GET",{limit:1000,festival:4},function(data) {
                    if (data != "parsererror" && data != "error") window.localStorage.setItem("event-data", JSON.stringify(data.objects));
                });
            } else {
                refresh = new Date(parseInt(refresh));
                var hourAgo = new Date();
                hourAgo.setHours(hourAgo.getHours()-1);
                if (refresh.getTime() < hourAgo.getTime() || force) {
                    refresh = Date.now();
                    window.localStorage.setItem("refresh",refresh);
                    qualia.api("event","GET",{limit:1000,festival:4},function(data) {
                        if (data != "parsererror" && data != "error") window.localStorage.setItem("event-data", JSON.stringify(data.objects));
                    });
                }
            }
        }
    },
    onPause: function() {
        running = false;  
    },
    // Menu Functions
    initialiseMenu: function() {
        if (!MENU_INITIALISED) {
            MENU_INITIALISED = true;
            jQuery("#menu a").bind("click",function(event) {
                app.navigateTo(event.currentTarget.hash.substr(1),"fade");
            });
            af.ui.setSideMenuWidth(jQuery(document).width()-45);
            jQuery("#header header").append("<a id='notifications-button' onclick='af.ui.toggleRightMenu();'><a id='menu-button' onclick='af.ui.toggleSideMenu();'></a>");
            //jQuery("#header header").append("<a id='notifications-button' onclick='af.ui.loadContent(\"notifications\",false,false,\"slide\");'><a id='menu-button' onclick='af.ui.toggleSideMenu();'></a>");
        }
        jQuery("#header header").show();
        app.displayProfilePicture();
    },
    navigateTo: function(div,transition) {
        if (div != "schedule") jQuery("#schedule-list").empty();                        // Clear schedule to save memory
        af.ui.loadContent(div,true,false,transition);                                   // Load Page
        af.ui.scrollToTop(div,"1ms");                                                   // Scroll page to top
        af.ui.clearHistory();                                                           // Clear Navigation History
        jQuery("#menu a").removeClass("active");
        jQuery("#menu ."+div).addClass("active");
    },
    showNotification: function(message, callback) {
        if (navigator.notification) navigator.notification.alert(message,callback,APP_NAME,"OK");
        else alert(message);
    },
    // Login
    loginWithFacebook: function() {
        if (app.hasInternet()) {
            jQuery("#login-form").children().prop("disabled",true).addClass("disabled");      
            FB.getLoginStatus(function(response) {
                if (response.status == 'connected') {
                    app.loginWithFacebookUserDetails();
                } else {
                    app.loginFacebook(function(response){
                        if (response.status) {
                            app.loginWithFacebookUserDetails();                            
                        } else {
                            jQuery("#login-form").children().prop("disabled",false).removeClass("disabled");
                            app.showNotification(FACEBOOK_LOGIN_FAIL);
                        }
                    });
                }
            });
        } else {
            jQuery("#login-form").children().prop("disabled",false).removeClass("disabled");
            app.showNotification(NO_INTERNET);
        }
    },
    loginWithFacebookUserDetails: function() {
        jQuery("#login-form").children().prop("disabled",true).addClass("disabled");
        af.ui.showMask("Logging In...");        
        FB.api('/me', function(fb_response) {
            qualia.login(fb_response.email, function(visitor) {
                if (visitor == "error") {
                    af.ui.hideMask();
                    jQuery("#login-form").children().prop("disabled",false).removeClass("disabled");
                    app.showNotification(QUALIA_LOGIN_FAIL);
                } else {
                    visitor.first_name = fb_response.first_name;
                    visitor.middle_name = fb_response.middle_name;
                    visitor.last_name = fb_response.last_name;
                    if (fb_response.gender == "male") visitor.gender = "M";
                    else if (fb_response.gender == "female") visitor.gender = "F";
                    if (fb_response.hometown) visitor.hometown = fb_response.hometown.name;
                    var birthday = new Date(fb_response.birthday);
                    visitor.birthday = birthday.getFullYear()+"-"+((birthday.getMonth()+1)<10?"0"+(birthday.getMonth()+1):(birthday.getMonth()+1))+"-"+(birthday.getDate()<10?"0"+birthday.getDate():birthday.getDate());
                    window.localStorage.setItem("id", visitor.resource_uri);
                    window.localStorage.setItem("facebook_id", fb_response.id);
                    window.localStorage.setItem("visitor", JSON.stringify(visitor));
                    qualia.api("visitor/"+visitor.id,"PATCH",visitor,function(response){console.log("Visitor object updated");});
                    app.displayProfilePicture();
                    af.ui.showMask("Loading Events..."); 
                    qualia.api("event","GET",{limit:1000,festival:4},function(data) {
                        if (data != "parsererror" && data != "error") window.localStorage.setItem("event-data", JSON.stringify(data.objects));
                        af.ui.hideMask();
                        app.navigateTo("profile","slide");
                        jQuery("#profile .skip").css("display", "block"); 
                        app.initialiseNotifications(); 
                        app.loadNotifications();
                        app.initialisePushNotifications();
                        app.initialiseMenu();
                    });
                }
            });
        });
    },
    login: function(email) {
        document.activeElement.blur();
        if (email.value != '') {
            if (app.hasInternet()) {
                jQuery("#login-form").children().prop("disabled",true).addClass("disabled");
                af.ui.showMask("Logging In...");                
                qualia.login(email.value, function(response) {
                    if (response == "error") {
                        app.showNotification(QUALIA_LOGIN_FAIL);
                        af.ui.hideMask();
                        jQuery("#login-form").children().prop("disabled",false).removeClass("disabled");
                    } else {
                        app.displayProfilePicture();
                        af.ui.showMask("Loading Events...");  
                        window.localStorage.setItem("id", response.resource_uri);
                        window.localStorage.setItem("visitor", JSON.stringify(response));
                        qualia.api("event","GET",{limit:1000,festival:4},function(data) {
                            if (data != "parsererror" && data != "error") window.localStorage.setItem("event-data", JSON.stringify(data.objects));
                            else app.showNotification(TIMED_OUT);
                            jQuery("#login-form").children().prop("disabled",false).removeClass("disabled");
                            af.ui.hideMask();
                            app.navigateTo("profile","slide");
                            jQuery("#profile .skip").css("display", "block"); 
                            app.initialiseNotifications(); 
                            app.loadNotifications();
                            app.initialisePushNotifications();
                            app.initialiseMenu();
                        });
                    }
                });
            } else {
                app.showNotification(NO_INTERNET);
            }
        } else {
            jQuery("#login-form #login_email").focus();
        }
    },
    logoutOfApp: function() {
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        var deviceid = window.localStorage.getItem("deviceid");
        
        if (deviceid != null && app.hasInternet()) {
            qualia.api("device","GET",{visitor:visitor.id},function(response) {
                jQuery(response.objects).each(function(index, device) {
                    if (device.device_string == deviceid) {
                        qualia.api("device/"+device.id,"DELETE",{},function(response) {
                        });
                    }
                });
            });
        }
        window.localStorage.clear();
        window.localStorage.setItem("mood",4);
        jQuery("#login_email").val("");
        jQuery("#login-form").children().prop("disabled",false).removeClass("disabled"); 
        jQuery('#profile-form')[0].reset();  
        jQuery("#header header").hide();
    },
    initialiseProfile: function() {
        jQuery("#profile-form select").change(function() {
           if (jQuery(this).val() != "") jQuery(this).addClass("notdisabled");
        });
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        var form = jQuery("#profile-form")[0];
        if (visitor.first_name != null) jQuery("#profile-form input[name='first_name']").val(visitor.first_name);
        if (visitor.middle_name != null) jQuery("#profile-form input[name='middle_name']").val(visitor.middle_name);
        if (visitor.last_name != null) jQuery("#profile-form input[name='last_name']").val(visitor.last_name);
        if (visitor.is_member != null) jQuery("#profile-form select[name='is_member']").val(String(visitor.is_member));
        if (visitor.gender != null) jQuery("#profile-form select[name='gender']").val(visitor.gender);
        if (visitor.email != null) jQuery("#profile-form input[name='email']").val(visitor.email);
        if (visitor.hometown != null) jQuery("#profile-form input[name='hometown']").val(visitor.hometown);
        if (visitor.age_range != null) jQuery("#profile-form select[name='age_range']").val(visitor.age_range);
        if (visitor.attended_similar != null) jQuery("#profile-form select[name='attended_similar']").val(visitor.attended_similar);
        //console.log(new Date(visitor.birthday).toISOString().substring(0, 10));
        //if (visitor.birthday != null) jQuery("#profile-form input[name='birthday']").val(new Date(visitor.birthday).toISOString().substring(0, 10));
        if (visitor.ethnicity != null) jQuery("#profile-form select[name='ethnicity']").val(visitor.ethnicity);
        if (visitor.income != null) jQuery("#profile-form select[name='income']").val(visitor.income);
        if (visitor.num_children != null) jQuery("#profile-form input[name='num_children']").val(visitor.num_children);
        if (visitor.religion != null) jQuery("#profile-form select[name='religion']").val(visitor.religion);
        jQuery("#profile-form select").each(function(index, element) {
            if (jQuery(element).val() != null) jQuery(element).addClass("notdisabled");
        });
    },
    unloadProfile: function() {
        jQuery("#profile .skip").css("display", "none");  
    },
    editProfile: function() {
        if (app.hasInternet()) {
            af.ui.showMask("Updating Profile...");
            af.ui.blockUI(0.01);
            jQuery("#profile-form").children().prop("disabled",true).addClass("disabled");
            var visitor = app.parse(window.localStorage.getItem("visitor"));
            var form = jQuery("#profile-form")[0];
            if (form["first_name"].value != '') visitor.first_name = form["first_name"].value;
            if (form["middle_name"].value != '') visitor.middle_name = form["middle_name"].value;
            if (form["last_name"].value != '') visitor.last_name = form["last_name"].value;
            if (form["is_member"].value != '') visitor.is_member = form["is_member"].value;
            if (form["gender"].value != '') visitor.gender = form["gender"].value;
            if (form["email"].value != '') visitor.email = form["email"].value;
            if (form["hometown"].value != '') visitor.hometown = form["hometown"].value;
            if (form["age_range"].value != '') visitor.age_range = form["age_range"].value;
            if (form["attended_similar"].value != '') visitor.attended_similar = form["attended_similar"].value;
            //if (form["birthday"].value != '') visitor.birthday = form["birthday"].value;
            if (form["ethnicity"].value != '') visitor.ethnicity = form["ethnicity"].value;
            if (form["income"].value != '') visitor.income = form["income"].value;
            if (form["num_children"].value != '') visitor.num_children = form["num_children"].value;
            if (form["religion"].value != '') visitor.religion = form["religion"].value;
            window.localStorage.setItem("visitor",JSON.stringify(visitor));
            app.initialiseProfile();
            qualia.api("visitor/"+visitor.id,"PATCH",visitor,function(response) {
                af.ui.hideMask();
                af.ui.unblockUI();
                app.showNotification(PROFILE_UPDATED_SUCCESS);                
                jQuery("#profile-form").children().prop("disabled",false).removeClass("disabled");
                if (jQuery("#backButton").css("visibility") != "hidden") af.ui.goBack();
                else app.navigateTo("dashboard","fade");
                jQuery("#profile .skip").css("display", "none");
            });
        } else {
            app.showNotification(NO_INTERNET_EDIT_PROFILE);
        }
    },
    // Dashboard
    /*initialiseDashboard: function() {
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        var null_count = 0;
        var total = 0;
        for (var property in visitor) {
            if (property != "birthday" &&
                property != "age" &&
                property != "attendance" && 
                property != "locale" && 
                property != "name" &&
                property != "id" &&
                property != "resource_uri") {
                if (visitor[property] == null) null_count++;
                total++;
            }
        }
        var percent = parseInt(100 - (null_count/total)*100);
        jQuery("#dashboard .dial").knob();
        jQuery("#dashboard #completed").text(percent+"% Completed");
        jQuery("#dashboard .dial").val(percent-1).trigger('change');
        if (app.hasInternet()) {
            af.ui.showMask("Retrieving Visualisation Data...");
            af.ui.blockUI(0.01);
            jQuery("#visualisations").html('<iframe src="http://www.qualia.org.uk/mobile/app/visuals/" width="100%" frameBorder="0"></iframe>');
            jQuery('#visualisations iframe').load(function() {
                var that = this;
                setTimeout(function() {
                    jQuery(that).height(jQuery(that).contents().find("body").height());
                    jQuery("#visualisations iframe").css("display","block");
                    af.ui.hideMask();
                    af.ui.unblockUI();
                },1000);
            });
        }
            
    },*/
    initialiseDashboard: function() {
        var events = app.parse(window.localStorage.getItem("event-data"));
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        var subscribed_events = 0;
        if (visitor.attendance) subscribed_events = visitor.attendance.length;
        var feedback_left = 0;
        var now = new Date();
        var next = events[0];
        // Calculate amount of feedback left & find next scheduled event
        if (subscribed_events > 0) jQuery(visitor.attendance).each(function(index, attendance) {
            if (attendance.received_pre_response) feedback_left+= 0.5;
            if (attendance.received_post_response) feedback_left+= 0.5;
            
            var item = app.findInArrayByProperty(events, "resource_uri", attendance.event);
            if (item) {
                var item_start = new Date(item.start);
                if (!item.cancelled && item_start > now && item_start > new Date(next.start)) {
                    if (new Date(next.start) > now) {
                        if (item_start < new Date(next.start))  next = item;
                    } else {
                        next = item;
                    }
                }
            }
        });
        if (new Date(next.start) > now && subscribed_events > 0) { //If it found an event which is in the future
            var start = new Date(next.start);
            var end = new Date(next.end);
            jQuery.timeago.settings.allowFuture = true;
            var html = "<li><a onclick='app.displayEvent("+next.id+")'><p class='time'>Your next scheduled event is starting<span class='timeago' title='"+start.toISOString()+"'></span></p><table><tr><td class='left'><img class='circle' src='"+next.thumbnail+"' width='55' height='55' onerror='app.onImageError(this,\"img/no-image-square.png\");' /></td><td><span class='content-title'>"+next.name+"</span><span class='small-text'>"+app.getWeekday(start.getDay())+" "+start.getHours()+":"+(start.getMinutes()<10?'0':'') + start.getMinutes()+" - "+end.getHours()+":"+(end.getMinutes()<10?'0':'')+end.getMinutes()+"</span><span class='small-text'>"+next.venue.name+"</span></td></tr></table></a></li>";
                jQuery("#next-event").html(html);
                jQuery(".timeago").timeago();
        }  
        
        
        // Calculate Profile Completion %
        var null_count = 0;
        var total = 0;
        for (var property in visitor) {
            if (property != "birthday" &&
                property != "age" &&
                property != "attendance" && 
                property != "locale" && 
                property != "name" &&
                property != "id" &&
                property != "resource_uri") {
                if (visitor[property] == null) null_count++;
                total++;
            }
        }
        
        var percent_complete = parseInt(100 - (null_count/total)*100);
        if (subscribed_events == 0 || feedback_left == 0) feedback_left = 0;
        else feedback_left = parseInt((feedback_left/subscribed_events)*100);
        // Display calculated values
        jQuery("#subscribed-events span").text(subscribed_events);
        
        jQuery("#dashboard .dial").knob();
        
        if (!isAndroid) {
            jQuery("#feedback-left .dial, #profile-completion .dial").val(0).trigger('change');
            jQuery("#feedback-left span, #profile-completion span").text(0+"%");
            
            jQuery("#feedback-left .dial").delay(1000).animate({value: feedback_left}, {
                duration: 1500,
                easing:'easeOutSine',
                step: function() 
                {
                    jQuery("#feedback-left .dial").val(Math.ceil(this.value)).trigger('change');
                    jQuery("#feedback-left span").text(Math.ceil(this.value)+"%");
                }
            });
            
            jQuery("#feedback-left span").text(0+"%");
            jQuery("#profile-completion .dial").val(0).trigger('change');
            jQuery("#profile-completion .dial").delay(1000).animate({value: percent_complete}, {
                duration: 1500,
                easing:'easeOutSine',
                step: function() 
                {
                    jQuery("#profile-completion .dial").val(Math.ceil(this.value)).trigger('change');
                    jQuery("#profile-completion span").text(Math.ceil(this.value)+"%");
                }
            });
        } else {
            jQuery("#profile-completion span").text(percent_complete+"%");
            jQuery("#feedback-left span").text(feedback_left+"%");
            
        }
        
        var mood = window.localStorage.getItem("mood");
        jQuery(".current-mood").text(LIKERT_MOOD[mood]).css("color",LIKERT_COLOURS[mood]);
        app.displayProfilePicture();
    },
    displayProfilePicture: function() {
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        var name = visitor.first_name!=null?visitor.first_name:""+" "+visitor.last_name!=null?visitor.last_name:"";
        jQuery("#user-profile .content-title, #menu-profile span.username").text(name!=null?name:visitor.email);
        var facebook_id = window.localStorage.getItem("facebook_id");
        if (app.hasInternet() && facebook_id !== null) jQuery("#user-profile img, #menu-profile img").attr("src","http://graph.facebook.com/"+facebook_id+"/picture?width=136&height=136");
    },
    // Events
    initialiseEvents: function() {
        var date;
        if (jQuery("#schedule-day span").data("date") != undefined ) date = new Date(jQuery("#schedule-day span").data("date")); // Else if date is previously loaded on screen
        else if (date == undefined) date = new Date(); // else if no date set, set date to today
        if (date <= START_DATE) {
            date = START_DATE;
            jQuery("#schedule-day .left").data("date",START_DATE.getTime()).addClass("disabled");
            jQuery("#schedule-day .right").data("date",START_DATE.getTime() + (24*60*60*1000)).removeClass("disabled"); 
        } else if (date >= END_DATE) {
            date = END_DATE;
            jQuery("#schedule-day .left").data("date",END_DATE.getTime() - (24*60*60*1000)).removeClass("disabled");
            jQuery("#schedule-day .right").data("date",END_DATE).addClass("disabled"); 
        } else {
            date = date;
            jQuery("#schedule-day .left").data("date",date.getTime() - (24*60*60*1000)).removeClass("disabled");
            jQuery("#schedule-day .right").data("date",date.getTime() + (24*60*60*1000)).removeClass("disabled");   
        }
        jQuery("#schedule-day span").text(app.getWeekday(date.getDay()) + " " + date.getDate() + app.getNthSuffix(date.getDate())).data("date",date);
        app.updateScheduleLabel();
        
        if (jQuery("#schedule").data("scrollable") != "true") {
            jQuery("#schedule").data("scrollable","true");
            var eventsScroller = af("#schedule").scroller({});
            eventsScroller.addInfinite();
            af.bind(eventsScroller,"infinite-scroll", function(){
                var self = this;
                if (jQuery("#schedule").data("mode") != "schedule") {
                    jQuery("#schedule-list").append("<div id='infinite' style='height:60px;line-height:60px;text-align:center;font-weight:bold'>Fetching content...</div>");
                    af.bind(eventsScroller, "infinite-scroll-end", function () {
                        af.unbind(eventsScroller, "infinite-scroll-end");
                        var date = jQuery("#schedule-day span").data("date");
                        var from = jQuery("#schedule-list").data("to")+1;
                        var to = from + 5;
                        setTimeout(function () {
                            jQuery("#schedule-list").find("#infinite").remove();
                            app.displayEventsRange(date,from,to);
                            self.clearInfinite();
                        }, 1000);
                    });
                } else {
                    self.clearInfinite();   
                }
            });
        }        
        
        if (window.localStorage.getItem("event-data") === "undefined") {
            if (app.hasInternet()) {
                af.ui.showMask("Loading Events...");
                af.ui.blockUI(0.01);
                qualia.api("event","GET",{limit:1000,festival:4},function(data) {
                    if (data != "parsererror" && data != "error") {
                        window.localStorage.setItem("event-data", JSON.stringify(data.objects));
                        app.displayEvents();
                    } else {
                        app.showNotification(TIMED_OUT);   
                        af.ui.hideMask();
                    }
                    af.ui.unblockUI();
                });
            } else {
                af.ui.unblockUI();
                app.showNotification(NO_INTERNET_GET_EVENTS);
            }
        } else if (jQuery("#schedule-list").is(":empty")) {
            if (jQuery("#schedule").data("mode") == "events") app.displayEvents();
            else if (jQuery("#schedule").data("mode") == "schedule") app.displaySchedule();
            else if (jQuery("#schedule").data("mode") == "search") app.searchEvents();
        }
    },
    displayEvents: function(ref) {
            jQuery("#schedule").data("mode","events");
            jQuery("#schedule-find").addClass("active");
            jQuery("#schedule-me").removeClass("active");
            jQuery("#schedule-day, #schedule-find, #schedule-me").show();
            jQuery("#search input").val("");
            jQuery("#search .close").css("display","none");
            jQuery("#schedule-list").empty();
            
            var events = app.parse(window.localStorage.getItem("event-data"));
            if (events !== "undefined") app.displayEventsRange(jQuery("#schedule-day span").data("date"),0,4);
    },
    // Search
    searchEvents: function() {
        jQuery("#schedule-find").removeClass("active");
        jQuery("#schedule-me").removeClass("active");
        jQuery("#schedule-day, #schedule-find, #schedule-me").hide();
        jQuery("#schedule-list").empty().removeClass("feedback");
        jQuery("#search .close").css("display","block");
        var events = app.parse(window.localStorage.getItem("event-data"));
        if (events !== "undefined") {
            if (jQuery("#search input").val() != '') {
                jQuery("#schedule").data("mode","search");
                jQuery("#schedule-list").empty();
                app.displayEventsRange(null, 0, 4);
            } else {
                app.displayEvents();   
            }
            jQuery("#schedule-find").blur(); // DO NOT REMOVE
        }
    },
    focusSearch: function() {
        jQuery("#search input").focus();
        jQuery("#search .close").css("display","block");
    },
    cancelSearch:function(e) {
        jQuery("#search input").val("").blur();
    },
    // Schedule
    displaySchedule: function(ref) {
        jQuery("#schedule").data("mode","schedule");
        jQuery("#schedule-find").removeClass("active");
        jQuery("#schedule-me").addClass("active");
        jQuery("#schedule-day, #schedule-find, #schedule-me").show();
        jQuery("#search input").val("");
        jQuery("#search .close").css("display","none");
        jQuery("#schedule-list").empty();
        var events = app.parse(window.localStorage.getItem("event-data"));
        if (events !== "undefined") app.displayEventsRange(jQuery("#schedule-day span").data("date"), 0, 4);
    },
    updateDatePicker: function(ref) {
        var date;
        if (jQuery(ref).data("date")) date = new Date(jQuery(ref).data("date")); // If date in reference.data
        else if (jQuery("#schedule-day span").data("date") != undefined ) date = new Date(jQuery("#schedule-day span").data("date")); // Else if date is previously loaded on screen
        else if (date == undefined) date = new Date(); // else if no date set, set date to today
        if (date <= START_DATE) { // date is less than the start date
            date = START_DATE;
            jQuery("#schedule-day .left").data("date",START_DATE.getTime()).addClass("disabled");
            jQuery("#schedule-day .right").data("date",START_DATE.getTime() + (24*60*60*1000)).removeClass("disabled"); 
        } else if (date >= END_DATE) { // date is greater than the end date
            date = END_DATE;
            jQuery("#schedule-day .left").data("date",END_DATE.getTime() - (24*60*60*1000)).removeClass("disabled");
            jQuery("#schedule-day .right").data("date",END_DATE).addClass("disabled"); 
        } else { // date is within range
            date = date;
            jQuery("#schedule-day .left").data("date",date.getTime() - (24*60*60*1000)).removeClass("disabled");
            jQuery("#schedule-day .right").data("date",date.getTime() + (24*60*60*1000)).removeClass("disabled");   
        }
        jQuery("#schedule-day span").text(app.getWeekday(date.getDay()) + " " + date.getDate() + app.getNthSuffix(date.getDate())).data("date",date);
        jQuery("#schedule-list").html("");
        app.displayEventsRange(date,0,4);
    },
    displayEventsRange: function(date, from, to) {
        jQuery("#schedule-list").data("from",from).data("to",to);
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        var events = app.parse(window.localStorage.getItem("event-data"));
        var mode = jQuery("#schedule").data("mode");
        if (mode == "events") {
            jQuery(app.filterScheduleByDate(events,date)).each(function(index, element) {
                    if (index >= from && index <= to) {
                        var start = new Date(element.start);
                        var end = new Date(element.end);
                        var item = "<li data-id="+index+"><table><tr><td class='left'><img class='circle' src='"+element.thumbnail+"' width='55' height='55' onerror='app.onImageError(this,\"img/no-image-square.png\");' onclick='app.displayEvent("+element.id+")' /></td><td><a onclick='app.displayEvent("+element.id+")'><span class='content-title'>"+element.name+"</span><span class='small-text'>"+start.getHours()+":"+(start.getMinutes()<10?'0':'') + start.getMinutes()+" - "+end.getHours()+":"+(end.getMinutes()<10?'0':'')+end.getMinutes()+"</span><span class='small-text'>"+element.venue.name+"</span><span class='small-text'>"+element.price+"</span><span class='small-text'>Quick Find: "+element.quick_find+"</span>";
                        if (element.tickets_available == false) item += "<span class='small-text'>Sold Out</span>";
                        else if (element.tickets_available == true) item += "<span class='small-text'>Tickets available</span>";
                        item += "</a>";
                        if (element.cancelled == true) {
                            item += "<span class='cancelled'>Cancelled</span>";
                        } else {
                            item += app.renderAttendingButton(element, visitor);
                        }
                        item += "</td></tr></table></li>";
                        jQuery("#schedule-list").append(item);
                    }
            });
        } else if (mode == "search") {
            var results = app.findInArrayByProperties(events, [{query:"name"},{query:"quick_find"},{query:"venue.name"}], jQuery("#search input").val());
            jQuery(results).each(function(index, element) {
                if (index >= from && index <= to) {
                    var start = new Date(element.start);
                    var end = new Date(element.end);
                    var item = "<li data-id="+index+"><table><tr><td class='left'><img class='circle' src='"+element.thumbnail+"' width='55' height='55'  onerror='app.onImageError(this,\"img/no-image-square.png\");' onclick='app.displayEvent("+element.id+")' /></td><td><a onclick='app.displayEvent("+element.id+")'><span class='content-title'>"+element.name+"</span><span class='small-text'>"+app.getWeekday(start.getDay())+" "+start.getHours()+":"+(start.getMinutes()<10?'0':'') + start.getMinutes()+" - "+end.getHours()+":"+(end.getMinutes()<10?'0':'')+end.getMinutes()+"</span><span class='small-text'>"+element.venue.name+"</span><span class='small-text'>"+element.price+"</span><span class='small-text'>Quick Find: "+element.quick_find+"</span>";
                    if (element.tickets_available == false) item += "<span class='small-text'>Sold Out</span>";
                    else if (element.tickets_available == true) item += "<span class='small-text'>Tickets available</span>";
                    item += "</a>";
                    if (element.cancelled == true) {
                        item += "<span class='cancelled'>Cancelled</span>";
                    } else {
                        if (new Date() < start.getTime()) item += app.renderAttendingButton(element, visitor);
                    }
                    item += "</td></tr></table></li>";
                    jQuery("#schedule-list").append(item);
                }
            });
        } else if (mode == "schedule") {
            jQuery(visitor.attendance).each(function(index, attendance) {
                var item = app.findInArrayByProperty(events, "resource_uri", attendance.event);
                var start = new Date(item.start);
                if (new Date(start).setHours(0,0,0,0) == new Date(date).setHours(0,0,0,0)) {
                    var end = new Date(item.end);
                    var html = "<li data-id="+index+"><table><tr><td class='left'><img class='circle' src='"+item.thumbnail+"' width='55' height='55' onerror='app.onImageError(this,\"img/no-image-square.png\");' onclick='app.displayEvent("+item.id+")' /></td><td><a onclick='app.displayEvent("+item.id+")'><span class='content-title'>"+item.name+"</span><span class='small-text'>"+start.getHours()+":"+(start.getMinutes()<10?'0':'') + start.getMinutes()+" - "+end.getHours()+":"+(end.getMinutes()<10?'0':'')+end.getMinutes()+"</span><span class='small-text'>"+item.venue.name+"</span><span class='small-text'>"+item.price+"</span><span class='small-text'>Quick Find: "+item.quick_find+"</span>";
                    if (item.tickets_available == false) html += "<span class='small-text'>Sold Out</span>";
                    else if (item.tickets_available == true) html += "<span class='small-text'>Tickets available</span>";
                    html += "</a>";
                    if (item.cancelled == true) {
                        html += "<span class='cancelled'>Cancelled</span>";
                    } else {
                        html += app.renderFeedbackButton(item, attendance);
                        html += app.renderAttendingButton(item, visitor);
                    }
                    item += "</td></tr></table></li>";
                    jQuery("#schedule-list").append(html);
                }
            });
        }
        if (jQuery("#schedule-list").is(":empty")) {
            if (mode == "events" || mode == "schedule") jQuery("#schedule-list").append("<li class='no-events'>No Events</li>");
            else if (mode == "search") jQuery("#schedule-list").append("<li class='no-search'>No Search Results</li>");
        }
        app.forceRedraw(jQuery("#schedule-list"));
    },
    renderFeedbackButton: function(item, attendance, centre) {
        if (attendance != undefined) {
            var start = new Date(item.start);
            if (new Date() < start.getTime()) {
                if (attendance.received_pre_response || !item.expecting_pre_response) return "";//return "<a class='button feedback disabled"+(centre ? " centre" : "")+"'><span>Leave pre-feedback</span></a>";
                else return "<a class='button feedback"+(centre ? " centre" : "")+"' href='#pre-feedback' onclick='app.hookPreFeedback(\""+attendance.resource_uri+"\")'><span>Leave pre-feedback</span></a>";
            } else {
                if (attendance.received_post_response || attendance.did_not_attend) return "";//return "<a class='button feedback disabled"+(centre ? " centre" : "")+"'><span>Leave post-feedback</span></a>";
                else return "<a class='button feedback"+(centre ? " centre" : "")+"' href='#post-feedback' onclick='app.hookPostFeedback(\""+attendance.resource_uri+"\")'><span>Leave post-feedback</span></a>"; 
            }
        } else {
            return "<a class='button feedback"+(centre ? " centre" : "")+"' href='#generic-feedback' onclick='app.hookGenericFeedback(\""+item.resource_uri+"\")'><span>Leave feedback</span></a>";
        }
    },
    renderAttendingButton: function(item, visitor, centre) {
        var start = new Date(item.start);
        if (app.findInArrayByEvent(visitor.attendance, item.resource_uri) != undefined) {
            if (new Date() < start.getTime()) return "<a class='button attend"+(centre ? " centre" : "")+"' onclick='app.attendEvent(this,\""+item.resource_uri+"\","+item.id+")'><span>Unattend Event</span></a>";
            //else return "<a class='button attend disabled"+(centre ? " centre" : "")+"'><span>Unattend Event</span></a>";
            else return "";
        } else {
            if (new Date() < start.getTime()) return "<a class='button attend"+(centre ? " centre" : "")+"' onclick='app.attendEvent(this,\""+item.resource_uri+"\","+item.id+")'><span>Add to Schedule</span></a>";
            //else return "<a class='button attend disabled"+(centre ? " centre" : "")+"'><span>Add to Schedule</span></a>";
            else return "";
        }
    },
    displayEvent: function(id) {
        var data = app.parse(window.localStorage.getItem("event-data"));
        var item = app.findInArrayById(data,id);
        var start = new Date(item.start);
        var end = new Date(item.end);
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        var html = "";
        html += "<img src='"+item.image_url+"' onerror='app.onImageError(this,\"img/no-image-large.png\");' class='event-large' />";
        html += "<div class='padding'><p><span class='content-title'>"+item.name+"</span><span class='small-text'>"+app.getWeekday(start.getDay())+" "+start.getHours()+":"+(start.getMinutes()<10?'0':'') + start.getMinutes()+" - "+end.getHours()+":"+(end.getMinutes()<10?'0':'')+end.getMinutes()+"</span><span class='small-text'>"+item.venue.name+"</span><span class='small-text'>"+item.price+"</span>";
        if (item.tickets_available == true) html += "<span class='small-text'>Tickets available</span>";
        else if (item.tickets_available == false) html += "<span class='small-text'>Sold Out</span>";
        if (item.cancelled == true) html += "<span class='cancelled'>Cancelled</span>";
        html += "<br /></p><p>"+item.info+"</p>";
        var attendance = app.findInArrayByEvent(visitor.attendance, item.resource_uri);        
        html += app.renderFeedbackButton(item, attendance, true);
        if (item.cancelled == true) html += app.renderAttendingButton(item, visitor, true);
        if (item.tickets_url && item.tickets_available != false && !item.cancelled) html += "<a class='button centre' onclick='window.open(\""+item.tickets_url+"\",\"_blank\",\"location=yes\")'><span>Buy Tickets</span></a>";
        html += "</div><hr /><div class='padding'><p><span class='content-title'>Venue Information:</span><br /></p><table><tr><td class='left'><img class='circle' src='"+item.venue.thumbnail+"' width='55' height='55' onerror='app.onImageError(this,\"img/no-image-square.png\");' /></td><td><span class='content-title'>"+item.venue.name+"</span><p>"+item.venue.about+"</p></td></tr></table></div>";
        
        if (item.venue.accessibility != "") html += "<hr /><div class='padding'><table><tr><td class='left'><div class='icon accessibility'></div></td><td><span class='content-title'>Accessibility</span><p>"+item.venue.accessibility+"</p></td></tr></table></div>";
        if (item.venue.directions!='')html += "<hr /><div class='padding'><table><tr><td class='left'><div class='icon directions'></div></td><td><span class='content-title'>Directions</span><p>"+item.venue.directions+"</p>";
        html += "</td></tr></table></div>";
        html += "<div class='padding' style='padding-top:0px'><a class='button map centre' style='margin-top:0px' onclick='app.showMap(\""+item.venue.name+"\","+item.venue.lat+","+item.venue.long+")'><span>View on Map</span></a></div>";
        if (jQuery("#Event-"+id).length < 1) {
            af.ui.addContentDiv("Event-"+id,html,item.name);
        } else {
            af.ui.updateContentDiv("Event-"+id,html);   
        }
        af.ui.loadContent("Event-"+id,false,false,"slide");
        af.ui.scrollToTop("Event-"+id,"1ms"); 
    },
    showMap: function(venue_name,venue_lat,venue_long) {
        var html = "<div id='map'></div>";
        if (jQuery("#view-map").length < 1) {
            af.ui.addContentDiv("view-map",html,venue_name);
        } else {
            af.ui.updateContentDiv("view-map",""); 
            af.ui.updateContentDiv("view-map",html);   
        }
        af.ui.loadContent("view-map",false,false,"slide");  
        jQuery("#map").css("height",jQuery("#map").parent().height());
        // create a map in the "map" div, set the view to a given place and zoom
        var map = L.map('map').setView([venue_lat, venue_long], 13);
        
        // add an OpenStreetMap tile layer
        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
            detectRetina: true,
            tileSize: 256
        }).addTo(map);
        
        // add a marker in the given location, attach some popup content to it and open the popup
        L.marker([venue_lat, venue_long]).addTo(map)
            .bindPopup(venue_name)
            .openPopup();
        function onLocationFound(e) {
            var radius = e.accuracy / 2;
            L.circle(e.latlng, 10).addTo(map);
        }
        map.on('locationfound', onLocationFound);
        map.locate({setView: false});
    },
    attendEvent: function(ref, resource_uri, id) {
        jQuery(ref).addClass("disabled").children().text("Submitting...");
        app.forceRedraw(jQuery(ref));
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        if (app.findInArrayByEvent(visitor.attendance,resource_uri) == undefined) {
            qualia.api("attendance","POST",{visitor:window.localStorage.getItem("id"),event:resource_uri},
               function(attendance){
                    jQuery(ref).removeClass("disabled");
                    if (attendance.id) {
                        jQuery(ref).children().text("Unattend Event");
                        visitor.attendance.push(attendance);
                        window.localStorage.setItem("visitor",JSON.stringify(visitor));
                    } else {
                        jQuery(ref).text("Attend Event");
                    }
                    app.updateScheduleLabel();
               }
            );
        } else {
            qualia.api("attendance/"+app.findInArrayByEvent(visitor.attendance,resource_uri).id,"DELETE",{},
               function(event){
                    jQuery(ref).removeClass("disabled").children().text("Attend Event");
                    app.findAndRemove(visitor.attendance, "event", resource_uri);
                    window.localStorage.setItem("visitor",JSON.stringify(visitor));
                    if (jQuery("#schedule-me").hasClass("active")) app.displaySchedule();
                   app.updateScheduleLabel();
               }
            );
        }
    },
    updateScheduleLabel: function() {
        //var visitor = app.parse(window.localStorage.getItem("visitor"));
        //if (visitor.attendance.length < 1) af.ui.removeBadge("#schedule-me");
        //else af.ui.updateBadge("#schedule-me",visitor.attendance.length,'tr','white');
    },
    // Feedback
    initialisePreFeedback: function() {
        af.ui.scrollToTop("pre-feedback","1ms"); 
        jQuery("#pre-feedback-form div").children().prop("disabled",false).removeClass("disabled").removeAttr("disabled");
        jQuery("#pre-feedback input[type='text']").val("");  
        jQuery("#pre-feedback .range-container").val("4", true);
        if (!jQuery("#pre-feedback .range-container").hasClass("noUi-target")) jQuery("#pre-feedback .range-container").noUiSlider({
            range: [1,7],
            start: [4],
            handles: 1,
            step: 1,
            behaviour: 'extend-tap',
            slide: function() {
                var element = jQuery(this);
                var val = parseInt(element.val());
                element.css("background-color",LIKERT_COLOURS[val]).attr("data-content",val).prev("span.range-label").text(LIKERT_FEEDBACK[val]);
            },
            set: function() {
                var element = jQuery(this);
                var val = parseInt(element.val());
                element.css("background-color",LIKERT_COLOURS[val]).attr("data-content",val).prev("span.range-label").text(LIKERT_FEEDBACK[val]);   
            }
        });
    },
    initialisePostFeedback: function() {
        af.ui.scrollToTop("post-feedback","1ms"); 
        jQuery("#post-feedback-form div").children().prop("disabled",false).removeClass("disabled").removeAttr("disabled");
        jQuery("#post-feedback input[type='text']").val("");  
        jQuery("#post-feedback .range-container").val("4", true);
        if (!jQuery("#post-feedback .range-container").hasClass("noUi-target")) jQuery("#post-feedback .range-container").noUiSlider({
            range: [1,7],
            start: [4],
            handles: 1,
            step: 1,
            behaviour: 'extend-tap',
            slide: function() {
                var element = jQuery(this);
                var val = parseInt(element.val());
                element.css("background-color",LIKERT_COLOURS[val]).attr("data-content",val).prev("span.range-label").text(LIKERT_FEEDBACK[val]);
            },
            set: function() {
                var element = jQuery(this);
                var val = parseInt(element.val());
                element.css("background-color",LIKERT_COLOURS[val]).attr("data-content",val).prev("span.range-label").text(LIKERT_FEEDBACK[val]);  
            }
        });
    },
    initialiseGenericFeedback: function() {
        af.ui.scrollToTop("generic-feedback","1ms"); 
        jQuery("#generic-feedback-form div").children().prop("disabled",false).removeClass("disabled").removeAttr("disabled");
        jQuery("#generic-feedback input[type='text']").val("");  
        jQuery("#generic-feedback .range-container").val("4", true);
        if (!jQuery("#generic-feedback .range-container").hasClass("noUi-target")) jQuery("#generic-feedback .range-container").noUiSlider({
            range: [1,7],
            start: [4],
            handles: 1,
            step: 1,
            behaviour: 'extend-tap',
            slide: function() {
                var element = jQuery(this);
                var val = parseInt(element.val());
                element.css("background-color",LIKERT_COLOURS[val]).attr("data-content",val).prev("span.range-label").text(LIKERT_FEEDBACK[val]);
            },
            set: function() {
                var element = jQuery(this);
                var val = parseInt(element.val());
                element.css("background-color",LIKERT_COLOURS[val]).attr("data-content",val).prev("span.range-label").text(LIKERT_FEEDBACK[val]);  
            }
        });
    },
    hookPreFeedback: function(attendance_uri) {
        jQuery("#pre-feedback-form").data("attendance", attendance_uri);
    },
    submitPreFeedback: function() {
        jQuery("#pre-feedback-form div").children().prop("disabled",true).addClass("disabled").attr("disabled","disabled");
        var form = jQuery("#pre-feedback-form")[0];
        var data = {
            comment:form["comment"].value,
            anticipation:parseInt(jQuery("#pre-interest").val()),
            attendance:jQuery("#pre-feedback-form").data("attendance")
        }
        qualia.api("pre-event-response","POST",data,function(response){
            jQuery("#pre-feedback-form div").children().prop("disabled",false).removeClass("disabled").removeAttr("disabled");
            if(response.id) {
                var visitor = app.parse(window.localStorage.getItem("visitor"));
                jQuery.each(visitor.attendance, function(index, attendance) {
                    if (attendance.resource_uri == response.attendance) {
                        attendance.received_pre_response = true;
                        return;
                    }
                });
                window.localStorage.setItem("visitor",JSON.stringify(visitor));
                app.displaySchedule();
                app.displayNotifications();
                af.ui.goBack();
                app.showNotification(THANK_YOU_RESPONSE);
            }
            else {
                app.showNotification(PROBLEM_RESPONSE);
                jQuery("#pre-feedback-form div").children().prop("disabled",false).removeClass("disabled").removeAttr("disabled");
            }
        });
    },
    hookPostFeedback: function(attendance_uri) {
        jQuery("#post-feedback-form").data("attendance", attendance_uri);
    },
    submitPostFeedback: function(blank) {
        if (app.hasInternet()) {
            jQuery("#post-feedback-form div").children().prop("disabled",true).addClass("disabled").attr("disabled","disabled");
            if (blank) { // Did not attend
                var visitor = app.parse(window.localStorage.getItem("visitor"));
                jQuery.each(visitor.attendance, function(index, attendance) {
                        if (attendance.resource_uri == jQuery("#post-feedback-form").data("attendance")) {
                            attendance.did_not_attend = true;
                            qualia.api("attendance/"+attendance.id,"PATCH",{did_not_attend:true},function(response){
                                app.displaySchedule();
                                app.displayNotifications();
                                af.ui.goBack();
                                af.ui.goBack();
                                app.showNotification(THANK_YOU_RESPONSE);
                                jQuery("#post-feedback-form div").children().prop("disabled",false).removeClass("disabled").removeAttr("disabled");
                    });
                            window.localStorage.setItem("visitor",JSON.stringify(visitor));
                            return;
                        }
                    });
            } else {
                var form = jQuery("#post-feedback-form")[0];
                var data = {
                    attendance:jQuery("#post-feedback-form").data("attendance"),
                    expectations:parseInt(jQuery("#post-expectations").val()),
                    quality:parseInt(jQuery("#post-quality").val()),
                    enjoyable:parseInt(jQuery("#post-enjoyable").val()),
                    satisfaction:parseInt(jQuery("#post-satisfied").val()),
                    comment:form["comment"].value
                }
                qualia.api("post-event-response","POST",data,function(response){
                    if(response.id) {
                        var visitor = app.parse(window.localStorage.getItem("visitor"));
                        jQuery.each(visitor.attendance, function(index, attendance) {
                            if (attendance.resource_uri == response.attendance) {
                                attendance.received_post_response = true;
                                return;
                            }
                        });
                        window.localStorage.setItem("visitor",JSON.stringify(visitor));
                        app.displaySchedule();
                        app.displayNotifications();
                        af.ui.goBack();
                        af.ui.goBack();
                        app.showNotification(THANK_YOU_RESPONSE);
                        jQuery("#post-feedback-form div").children().prop("disabled",false).removeClass("disabled").removeAttr("disabled");
                    }
                    else {
                        app.showNotification(PROBLEM_RESPONSE);
                        jQuery("#post-feedback-form div").children().prop("disabled",false).removeClass("disabled").removeAttr("disabled");
                    }
                });
                
            }
        } else {
            app.showNotification(NO_INTERNET_FEEDBACK);
        }
    },
    hookGenericFeedback: function(resource_uri) {
        jQuery("#generic-feedback-form").data("event", resource_uri);
    },
    submitGenericFeedback: function() {
        if (app.hasInternet()) {
            jQuery("#generic-feedback-form div").children().prop("disabled",true).addClass("disabled").attr("disabled","disabled");
            var visitor = app.parse(window.localStorage.getItem("visitor"));
            var form = jQuery("#generic-feedback-form")[0];
            var data = {
                event:jQuery("#generic-feedback-form").data("event"),
                expectations:parseInt(jQuery("#generic-expectations").val()),
                quality:parseInt(jQuery("#generic-quality").val()),
                visitor:visitor.resource_uri,
                enjoyable:parseInt(jQuery("#generic-enjoyable").val()),
                satisfaction:parseInt(jQuery("#generic-satisfied").val()),
                comment:form["comment"].value
            }
            qualia.api("generic-event-response","POST",data,function(response){
                if(response.id) {
                    
                    var visitor = app.parse(window.localStorage.getItem("visitor"));
                    jQuery.each(visitor.attendance, function(index, attendance) {
                        if (attendance.resource_uri == response.attendance) {
                            attendance.received_response = true;
                            return;
                        }
                    });
                    window.localStorage.setItem("visitor",JSON.stringify(visitor));
                    
                    af.ui.goBack();
                    app.showNotification(THANK_YOU_RESPONSE);
                    jQuery("#generic-feedback-form div").children().prop("disabled",false).removeClass("disabled").removeAttr("disabled");
                }
                else {
                    app.showNotification(PROBLEM_RESPONSE);
                    jQuery("#generic-feedback-form div").children().prop("disabled",false).removeClass("disabled").removeAttr("disabled");
                }
            });
        }
        else {
            app.showNotification(NO_INTERNET_FEEDBACK);
        }
    },
    // Push Notifications
    initialisePushNotifications: function() {
        if ((isAndroid || isiOS) && PUSH_ENABLED) {
            var pushNotification = window.plugins.pushNotification;
            pushNotification.onDeviceReady();
            if (isAndroid) {
                pushNotification.registerDevice({ projectid: GOOGLE_PROJECT_ID, appid : PUSHWOOSH_APP_ID },
                    function(status) {
                        var pushToken = status;
                        console.warn('push token: ' + pushToken);
                        window.localStorage.setItem("deviceid",pushToken);
                        pushNotification.setMultiNotificationMode();
                        app.registerDevice();
                    },
                    function(status) {
                        console.warn(JSON.stringify(['failed to register ', status]));
                    }
                );
            }
            if (isiOS) {
                pushNotification.registerDevice({alert:true, badge:true, sound:true, pw_appid:PUSHWOOSH_APP_ID, appname:APP_NAME},
                    function(status) {
                        var deviceToken = status['deviceToken'];
                        console.log('registerDevice: ' + deviceToken);
                        window.localStorage.setItem("deviceid",deviceToken);
                        app.registerDevice();
                    },
                    function(status) {
                        console.warn('failed to register : ' + JSON.stringify(status));
                    }
                );
                //pushNotification.setApplicationIconBadgeNumber(0);
            }
            
            if (PUSH_LISTENER == false) document.addEventListener('push-notification', function(event) {
                PUSH_LISTENER = true;
                var notifications = app.parse(window.localStorage.getItem("notifications"));
                if (notifications == null) notifications = [];
                var title;
                var userData;
                if (isAndroid) {
                    title = event.notification.title; 
                    userData = app.parse(event.notification.userdata);
                }
                if (isiOS) {
                    title = event.notification.aps.alert;
                    userData = event.notification.u;
                    //pushNotification.setApplicationIconBadgeNumber(0);
                    //pushNotification.cancelAllLocalNotifications();
                }
                //notifications.push({title:title,timestamp:Date.now(),data:userData});
                //window.localStorage.setItem("notifications",JSON.stringify(notifications));
                app.loadNotifications();
                if (!running) { // Do push request if opening from outside of app
                    af.ui.loadContent("notifications", false, false,"slide");
                    if (userData != undefined) switch(userData.type) {
                        case "pre":
                            app.hookPreFeedback("/api/v1/attendance/"+userData.data.attendance+"/");
                            af.ui.loadContent("pre-feedback",false,false,"slide"); 
                            break;
                        case "post":
                            app.hookPostFeedback("/api/v1/attendance/"+userData.data.attendance+"/");
                            af.ui.loadContent("post-feedback",false,false,"slide"); 
                            break;
                        case "reminder":
                            app.displayEvent(userData.data.event);
                            break;
                        case "announce":
                            window.open(encodeURI(userData.data.page),"_blank","location=yes");
                            break;
                        case "page":
                            app.navigateTo(userData.data.page,"fade");
                            break;
                    }
                }
            });
        }
    },
    registerDevice: function() {
        var deviceid = window.localStorage.getItem("deviceid");
        if (deviceid != null) {
            qualia.api("device","GET",{device_id:deviceid},function(response) {
                jQuery(response.objects).each(function(index, device) {
                    if (device.visitor != window.localStorage.getItem("id")) {
                        qualia.api("device/"+device.id,"DELETE",{},function(response) {
                            qualia.api("device","POST",{visitor:window.localStorage.getItem("id"),device_string:deviceid},function(data){});
                        });
                    }
                });
            });
            qualia.api("device","POST",{visitor:window.localStorage.getItem("id"),device_string:deviceid},function(data){});
        }         
    },
    initialiseNotifications: function() {
        notificationScroller=jq("#menu_scroller_right").scroller({
            refresh:true,
            scrollBars:true,
            verticalScroll:true,
            horizontalScroll:false,
            vScrollCSS:"jqmScrollbar",
            hScrollCSS:"jqmScrollbar"
        });
        jq("#menu_scroller_right").css("min-height","101%");
        notificationScroller.addPullToRefresh();
        jq.bind(notificationScroller,"refresh-release",function(){
            jQuery("#menu_right .afscroll_refresh").html("Loading Notifications...").css("background-image","url(img/ajax-loader2.gif)").css("background-size","16px");
            app.loadNotifications();
            return false;
        });
        jq.bind(notificationScroller,"refresh-trigger",function(){
            jQuery("#menu_right .afscroll_refresh").html("Release to Refresh").css("background-image","url(img/icon-arrow-up-menu.svg)");
        });
    },
    loadNotifications: function() {
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        var notifications = app.parse(window.localStorage.getItem("notifications"));
        if (notifications == null) {
            notifications = {};
            window.localStorage.setItem("notifications",JSON.stringify(notifications));
        } else {
            if (app.hasInternet()) {
                qualia.api("notificationlist","GET",{limit:500,visitor:visitor.id}, function(data) {
                    window.localStorage.setItem("notifications",JSON.stringify(data.objects));
                    setTimeout(function(){app.displayNotifications();},1000);
                });
            } else {
                app.displayNotifications();
            }   
        }
    },
    displayNotifications: function() {
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        
        
        var notifications = app.parse(window.localStorage.getItem("notifications"));
        jQuery("#notifications-list").empty();
        var c = 0;
        jQuery.each(notifications, function(index, message) {
            var html = "<li>";
            switch(message.type) {
                case "post":
                case "pre":
                    jQuery(visitor.attendance).each(function(index, attendance) {
                        if (attendance.id == message.attendance) {
                            if (message.type == "post" && (attendance.received_post_response || attendance.did_not_attend)) html += "<a class='disabled'>";
                            else if (message.type == "pre" && (attendance.received_pre_response || attendance.did_not_attend)) html += "<a class='disabled'>";
                            else {
                                html += "<a onclick='app.actOnNotification("+message.id+",\""+message.type+"\","+message.attendance+")'>";
                                if (!message.cleared) c++;
                            }
                        }
                    });
                    break;
                case "reminder":
                    html += "<a onclick='app.actOnNotification("+message.id+",\"reminder\","+message.event+")'>";
                    if (!message.cleared) c++;
                    break;
                case "announce":
                    html += "<a onclick='app.actOnNotification("+message.id+",\"announce\",\""+message.page+"\")'>";
                    if (!message.cleared) c++;
                    break;
                case "page":
                    html += "<a onclick='app.actOnNotification("+message.id+",\"page\",\""+message.page+"\")'>";
                    if (!message.cleared) c++;
                    break;
                default:
                    break;
            }
                    
            if (!message.cleared) html += "<div class='unread'></div>";
            html += "<span class='content-title timeago' title="+message.now+"></span><p>"+message.content+"</p></a></li>";
            jQuery("#notifications-list").prepend(html);
        });
        jQuery(".timeago").timeago();
        if (c > 0) {
            af.ui.updateBadge("#notifications-button",c,'tr','black');
        } else {
            af.ui.removeBadge("#notifications-button");
        }
        if (notifications.length == 0) jQuery("#notifications-list").append("<li><span class='content-title'>No Notifications</span><p>Notification messages sent to you will appear here.</p></li>"); 
        notificationScroller.hideRefresh();
        setTimeout(function(){jQuery("#menu_right .afscroll_refresh").html("Pull to Refresh").css("background-image","url(img/icon-arrow-down-menu.svg)").css("background-size","13px 11px");},500);
        if (isiOS && PUSH_ENABLED && window.plugins) window.plugins.pushNotification.setApplicationIconBadgeNumber(c);
    },
    actOnNotification: function(id,type,data) {
        qualia.api("notificationlist/"+id,"PUT",{"cleared":true}, function(response) {
            app.loadNotifications();
        });
        af.ui.toggleRightMenu();
        switch(type) {
            case "pre":
                app.hookPreFeedback("/api/v1/attendance/"+data+"/");
                setTimeout(function(){af.ui.loadContent("pre-feedback",false,false,"slide");},500); // This is to stop the menu from animating while doing a page transition
                app.initialisePreFeedback();
                break;
            case "post":
                app.hookPostFeedback("/api/v1/attendance/"+data+"/");
                setTimeout(function(){af.ui.loadContent("post-feedback",false,false,"slide");},500); // This is to stop the menu from animating while doing a page transition
                app.initialisePostFeedback();
                break;
            case "reminder":
                app.displayEvent(data);
                break;
            case "announce":
                window.open(data,"_blank","location=yes");
                break;
            case "page":
                app.navigateTo(data,"fade");
                break;
        }
    },
    // Mood
    initialiseMood: function() {
        if (jQuery("#mood .knob-container > input").hasClass("dial")) {
            jQuery("#mood .dial").knob({
                'change'    :   function(value) {                           
                    jQuery("#mood .dial").trigger('configure', {"bgColor":LIKERT_COLOURS[value]});
                    jQuery("#mood-title").text(LIKERT_MOOD[value]).css("color",LIKERT_COLOURS[value]);
                    jQuery("#mood-value").text(value);
                },
                'release'   :   function(value) {
                    
                }
            }).bind("touchstart", function(e){
                e.stopPropagation();
                clearTimeout(touchTimer);  
            });
            if (window.localStorage.getItem("mood") !== null) {
                var mood = window.localStorage.getItem("mood");
                jQuery("#mood .dial").val(mood).trigger('change').trigger('configure', {"bgColor":LIKERT_COLOURS[mood]});
                jQuery("#mood-title, .current-mood").text(LIKERT_MOOD[mood]).css("color",LIKERT_COLOURS[mood]);
                jQuery("#mood-value").text(mood);
            }
        }
    },
    submitMoodButtonPressed: function() {
        if (jQuery("#afui_mask").css("display") == "none") {
            if (app.hasInternet()) {
                jQuery("#mood-title").text("Sending...").addClass("submit");
                jQuery("#mood-submit").prop("disabled",true).addClass("disabled");
                //af.ui.showMask("Submitting Mood...");
                //af.ui.blockUI(0.01);
                jQuery("#mood .dial").trigger('configure', {"readOnly":true}); // Disable Knob Interaction
                setTimeout(function() {
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(function(position) {
                            app.submitMood(position.coords.latitude, position.coords.longitude, jQuery("#mood .dial").val());
                        },function(error) {
                            console.log("Error getting location, submitting Mood without GPS data.");
                            app.submitMood(null, null, jQuery("#mood .dial").val());
                        },{timeout:10000});
                    } else {
                        console.log("Error getting location, submitting Mood without GPS data.");
                        app.submitMood(null, null, jQuery("#mood .dial").val());
                    }
                },500); // IT SENDS THE DATA TOO QUICK, ADD BUFFER!
            } else {
                app.showNotification(NO_INTERNET_MOOD);
            }
        }
    },
    submitMood: function(lat, long, value) {
        if (lat == null || long == null) {
            qualia.api("mood","POST",{visitor:window.localStorage.getItem("id"),score:value},function(event) {
                    jQuery("#mood-title").text("Done!");
                    setTimeout(function() {jQuery("#mood-title").text(LIKERT_MOOD[value]).removeClass("submit");},1500);
                jQuery("#mood .dial").trigger('configure', {"readOnly":false}); // Enable Knob Interaction
                window.localStorage.setItem("mood",value);
                jQuery(".current-mood").text(LIKERT_MOOD[value]).css("color",LIKERT_COLOURS[value]);
                //jQuery("#mood .dial").val(4).trigger('change').trigger('configure', {"bgColor":"#92278f"}); // Reset Knob
                //jQuery("#mood-title").text("Neutral").css("color","#92278f");
                //jQuery("#mood-value").text("4");
                af.ui.hideMask();
                af.ui.unblockUI();
                setTimeout(function(){af.ui.goBack();},2500);
                jQuery("#mood-submit").prop("disabled",false).removeClass("disabled");
            });
        } else {
            qualia.api("gps","POST",{visitor:window.localStorage.getItem("id"),lat:lat ,long:long },function(gps) {
                qualia.api("mood","POST",{visitor:window.localStorage.getItem("id"),score:value,gps:gps.resource_uri},function(event) {
                    jQuery("#mood-title").text("Done!");
                    setTimeout(function() {jQuery("#mood-title").text(LIKERT_MOOD[value]).removeClass("submit");},1500);
                    jQuery("#mood .dial").trigger('configure', {"readOnly":false}); // Enable Knob Interaction
                    window.localStorage.setItem("mood",value);
                    jQuery(".current-mood").text(LIKERT_MOOD[value]).css("color",LIKERT_COLOURS[value]);
                    //jQuery("#mood .dial").val(4).trigger('change').trigger('configure', {"bgColor":"#92278f"}); // Reset Knob
                    //jQuery("#mood-title").text("Neutral").css("color","#92278f");
                    //jQuery("#mood-value").text("4");
                    af.ui.hideMask();
                    af.ui.unblockUI();
                    setTimeout(function(){af.ui.goBack();},2500);
                    jQuery("#mood-submit").prop("disabled",false).removeClass("disabled");
                });
            }); 
        }
    },
    initialiseHotspots: function() {
        if (!app.hasInternet()) {
            app.showNotification(NO_INTERNET_HOTSPOTS);
            app.navigateTo("dashboard","fade");            
        } else {
            af.ui.updateContentDiv("hotspots",'<iframe src="http://www.qualia.org.uk/mobile/app/map/" width="100%" height="100%" frameBorder="0"></iframe>');
        }
    },
    initialiseSocial: function() {
        app.displaySocial();
    },
    displaySocial: function() {
        if (app.hasInternet()) {
            jQuery("#social").remove("ul");
            af.ui.showMask("Retrieving Posts...");
            af.ui.blockUI(0.01);
            // Use Qualia cache
            qualia.api("tweet","GET",{limit:20}, function(data) {
                var html = "";
                jQuery.each(data.objects, function(index, message) {
                    html += "<ul><li><a onclick='window.open(\"http://www.twitter.com/"+message.author.screen_name+"/status/"+message.tweetid+"\",\"_blank\",\"location=yes\")'><table><tr><td class='left'><img class='circle' width='55' height='55' src='"+message.author.profile_image_url+"' onerror='app.onImageError(this,\"img/avatar.png\");' /></td><td><span class='content-title'>@"+message.author.screen_name+"</span><span class='timestamp timeago' title='"+new Date(message.created).toISOString()+"'>Posted 3 hours ago</span><p>"+message.text+"</p></td></tr></table></a></li></ul>";
                    if (index < (data.objects.length-1)) html += "<hr />";
                });
                jQuery("#social-feed").after(html);
                jQuery(".timeago").timeago();
                af.ui.hideMask();
                af.ui.unblockUI();
            });
            // Use Twitter API
            /*jQuery.ajax({
                url: "http://www.elixel.co.uk/lab/twitter/hash_timeline.php?query="+HASHTAG.replace("#","")+"&count=20",
                timeout: 15000,
                dataType: "json",
                crossDomain: true,
                success: function (data, status) {
                    jQuery("#social-feed").empty();
                    var html = "";
                    jQuery.each(data.statuses, function(i,tweet) {
                        if (tweet.entities.urls[0] != undefined) html += "<li onclick='window.open(\""+tweet.entities.urls[0].expanded_url+"\",\"_blank\",\"location=yes\")'>";
                        else html += "<li>";
                        html += "<table><tr><td class='left'><img class='circle' width='55' height='55' src='"+tweet.user.profile_image_url+"' /></td><td><span class='content-title'>@"+tweet.user.screen_name+"</span><p>"+tweet.text+"</p></td></tr></table></li>"
                    });
                    jQuery("#social-feed").append(html);
                    af.ui.hideMask();
                    af.ui.unblockUI();                    
                },
                failure: function (data, status) {
                    window.setTimeout(displayTweets, 60000);
                }
            });*/
        } else {
            if (!jQuery("#social").has("ul").length) {
                jQuery("#social-feed").after("<ul><li class='no-connection'>No Connection</li></ul>");
            }
        }
    },
    postSocial: function() {
        if (app.hasInternet()) {
            if (!jQuery("#twittertoggle").is(":checked") && !jQuery("#facebooktoggle").is(":checked")) {
                app.showNotification(SOCIAL_CHOOSE_NETWORK);
            } else {
                var post = jQuery("#social #social-post").val() + " " + HASHTAG;
                if (jQuery("#twittertoggle").is(":checked")) app.postToTwitter(post);
                if (jQuery("#facebooktoggle").is(":checked")) app.postToFacebook(post);
                //var html = "<li><table><tr><td class='left'><img class='circle' width='55' height='55' src='data:image/gif;base64,R0lGODlhAQABAIAAAP7//wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==' /></td><td><span class='content-title'>@Username</span><p>"+message+"</p></td></tr></table></li>"
                //jQuery("#social-feed").prepend(html);   
            }
        } else {
            app.showNotification(NO_INTERNET_SOCIAL);
        }
    },
    postToTwitter: function(message) {
        window.plugins.twitter.composeTweet(
            function(response){
                console.log("RESPONSE: "+response);
                if (response == "OK") {
                    app.displaySocial();
                }
            },function(response){
                console.log("Twitter post fail");
            },message,{}
        );
    },
    initialiseFacebook: function() {
        try {
            FB.init({ appId: FACEBOOK_APP_ID, nativeInterface: CDV.FB, useCachedDialogs: false });
        } catch (e) {
            console.log(e);
        }
    },
    postToFacebook: function(message) {
        FB.getLoginStatus(function(response) {
            if (response.status == 'connected') {
                console.log("Connected");
                FB.api('/me/permissions', function(response){
                    if (response && response.data && response.data.length){
                        var permissions = response.data.shift();
                        if (permissions.publish_actions) {
                            var parameters = {
                                method:"feed",
                                message:message
                            };
                            console.log("Posting...");
                            FB.api("/me/feed","post", parameters, function(response){
                                if (response.id) {
                                    var visitor = app.parse(window.localStorage.getItem("visitor"));
                                    var data = {
                                        content:message,
                                        facebook_post_id:response.id,
                                        visitor:visitor.resource_uri
                                    }
                                    console.log(data);
                                    qualia.api("post", "POST", data, function(response){console.log(response);});
                                    app.showNotification(FACEBOOK_POST_SUCCESS);
                                } else {
                                    app.showNotification(FACEBOOK_POST_FAIL);
                                }
                            });
                        } else {
                            app.requestFacebookPermission("publish_actions, email");                   
                        }
                    }
                });
            } else {
                app.loginFacebook();
            }
        });
    },
    loginFacebook: function(callback) {
        FB.login(function(response) {
            console.log(response);
            if (response.status = "connected") {
                callback(response);
            } else {
                app.showNotification(FACEBOOK_LOGIN_FAIL);
            }
        },{scope:"email"});  
    },
    hasFacebookPostingPermissions: function() {
        FB.api('/me/permissions', function(response){
            if (response && response.data && response.data.length){
                var permissions = response.data.shift();
                if (permissions.publish_actions) {
                    return true;
                } else {
                    return false;                    
                }
            }
        });
    },
    requestFacebookPermission: function(permission) {
        FB.login(function(response) {},{ scope: permission });
    },
    // Helper Functions
    hasInternet: function() { // Returns true if internet access available
        if (navigator.connection && DEVICE_READY) {
            var networkState = navigator.connection.type;
            if (networkState == Connection.NONE || networkState == Connection.UNKNOWN) return false;
            else return true;
        } else {
            return true;
        }
    },    
    inArray: function(array, value) { // Checks if value is contained within array
        for (var i = 0; i < array.length; i++) {
            if (array[i] == value) return true;
        }
        return false;
    },
    findInArrayById: function(array, id) {
        return jQuery.grep(array, function(item, index) {
            return item.id == id;
        })[0];
    },
    findInArrayByEvent: function(array, event) {
        return jQuery.grep(array, function(item, index) {
            return item.event == event;
        })[0];
    },
    findInArrayByProperty: function(array, property, value) {
        return jQuery.grep(array, function(item, index) {
            return item[property] == value;
        })[0];
    },
    findInArrayByProperties: function(array, properties, value) {
        return jQuery.grep(array, function(item, index) {
            var found = false;
            jQuery.each(properties, function(index, property) {
                if (item[property.query] !== undefined ) {
                    if (item[property.query].toLowerCase().indexOf(value.toLowerCase()) != -1) found = true;
                } else {
                    if (item.venue[property.query.substring(property.query.indexOf(".")+1)].toLowerCase().indexOf(value.toLowerCase()) != -1) found = true; 
                }
            });
            if (found) return true;
        });
    },
    findAndRemove: function(array, property, value) {
        jQuery.each(array, function(index, result) {
            if (result != undefined)
                if(result[property] == value) {
                    array.splice(index, 1);
                    return;
                }    
        });
    },
    filterScheduleByDate: function(array, date) {
        var d = new Date(date).setHours(0,0,0,0);
        return jQuery.grep(array, function(item, index) {
            return new Date(item.start).setHours(0,0,0,0) == d;
        });
    },
    filterScheduleByValue: function(array, value) {
        return jQuery.grep(array, function(item, index) {
            return item.name.indexOf(value);
        }); 
    },
    getWeekday: function(weekday) {
        switch(weekday) {
            case 0: 
                return "Sunday";
            case 1: 
                return "Monday";
            case 2: 
                return "Tuesday";
            case 3: 
                return "Wednesday";
            case 4: 
                return "Thursday";
            case 5: 
                return "Friday";
            default:
                return "Saturday";
        }
    },
    getNthSuffix: function(date) {
        switch (date) {
             case 1:
             case 21:
             case 31:
                return 'st';
             case 2:
             case 22:
                return 'nd';
             case 3:
             case 23:
                return 'rd';
             default:
                return 'th';
        }
    },
    forceRedraw: function(element) {
        element.attr("opacity","0.99");
        element.get(0).offsetHeight;
        element.attr("opacity","");
    },
    touchHandler: function(event) { // Converts touch events into mouse events (Android slider fix)
        var touches = event.originalEvent.changedTouches, first = touches[0], type = "";
        switch(event.type) {
            case "touchstart": type = "mousedown"; break;
            case "touchmove":  type="mousemove"; break;        
            case "touchend":   type="mouseup"; break;
            default: return;
        }
        var simulatedEvent = document.createEvent("MouseEvent");
        simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0, null);
        first.target.dispatchEvent(simulatedEvent);
        event.preventDefault();
    },
    parse: function(data) { // JSON parse with Android 2.3.X support
        data = data ? JSON.parse(data) : [];
        return data;
    },
    onImageError: function(image,path) {
        image.src = path?path:"img/no-image-square.png";
        image.onerror = "";
        return true;
    },
    scrollToTop: function() {
        af.ui.scrollToTop(af.ui.activeDiv.id);   
    }
};

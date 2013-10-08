//
//  index.js
//
// Core functionality for Qualia applications.
// Written by Christian Cook of Elixel for the Qualia project.
//
// Qualia PhoneGap Application
// http://qualia.org.uk/

// Push Notifications (Uses PushWoosh: http://www.pushwoosh.com)
var PUSHWOOSH_APP_ID = "38C7F-39C51";
var GOOGLE_PROJECT_ID = "62883180042";

// Event Information ("YYYY-MM-DD")
var START_DATE = new Date("2013-10-04");
var END_DATE = new Date("2013-10-13");

// Facebook & Twitter
var hashtag = "#cheltlitfest"; // Appended to messages on the 'social' panel

// App Labels
var APP_NAME = "Qualia";
var COLOURS = {1:"#00aeef",2:"#4978bc",3:"#8e5ca5",4:"#92278f",5:"#942c61",6:"#c02646",7:"#ed1d24"};
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
var SOCIAL_CHOOSE_NETWORK = "Please choose atleast one network to share to.";
var FACEBOOK_POST_SUCCESS = "Posted to Facebook successfully.";
var FACEBOOK_POST_FAIL = "There was an error posting to Facebook.";
var FACEBOOK_LOGIN_FAIL = "There was an error logging in to Facebook.";
var QUALIA_LOGIN_FAIL = "There was an error logging into Qualia.";


/*

CHANGE ANYTHING BELOW THIS LINE AT YOUR OWN RISK.

*/

// Global Variables
var touchTimer;
var running = true;
var PUSH_LISTENER = false;
var ua = navigator.userAgent.toLowerCase();
var isAndroid = ua.indexOf("android") > -1;
var isiOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );

var app = {
    initialise: function() {
        af.ui.removeFooterMenu();    // Disable AF Footer
        af.ui.useOSThemes=false;     // Disable AF Themes
        this.bindEvents();          // Bind Event Listeners
        qualia.init("elixel","ab33073c631ff2df0497e7c2a63fc523a020415e");
    },
    bindEvents: function() {
        document.addEventListener('deviceready', app.onDeviceReady, false);
        document.addEventListener("resume", app.onResume, false);
        document.addEventListener("pause", app.onPause, false);
        af.ui.ready(app.onUIReady);
    },
    onDeviceReady: function() {
        console.log("Device Ready");
        if (window.localStorage.getItem("id") !== null) app.initialisePushNotifications();
        app.initialiseFacebook();
    },
    onUIReady: function() {  
        if (window.device) window.setTimeout(function(){navigator.splashscreen.hide();},250);
        if (window.localStorage.getItem("id") === null) {
            app.navigateTo("login","fade");
        } else {
            app.initialiseMenu();
            app.navigateTo("mood","fade");
            app.loadNotifications();
        }
        // Automatically update relative timestamps
        jQuery(".timeago").timeago();
    },
    onResume: function() {
        if (window.localStorage.getItem("id") !== null) {
            app.refreshData();
            app.initialisePushNotifications();
        } else {
            jQuery("#login-form").children().prop("disabled",false).removeClass("disabled");   
        }
        setTimeout(function(){running = true;},2000);
    },
    refreshData: function() {
        if (app.hasInternet()) {
            var refresh = window.localStorage.getItem("refresh");
            if (refresh == null) {
                refresh = Date.now();
                window.localStorage.setItem("refresh",refresh);
                qualia.api("event","GET",{limit:1000,festival:4},function(data) {
                    window.localStorage.setItem("event-data", JSON.stringify(data.objects));
                });
            } else {
                refresh = new Date(parseInt(refresh));
                var hourAgo = new Date();
                hourAgo.setHours(hourAgo.getHours()-1);
                if (refresh.getTime() < hourAgo.getTime()) {
                    refresh = Date.now();
                    window.localStorage.setItem("refresh",refresh);
                    qualia.api("event","GET",{limit:1000,festival:4},function(data) {
                        window.localStorage.setItem("event-data", JSON.stringify(data.objects));
                    });
                }
            }
        }
    },
    onPause: function() {
        running = false;  
    },
    // Radial Menu Functions
    initialiseMenu: function() {
        jQuery(document).bind("touchstart", function(event) {
            jQuery("#menu").addClass("down");
            if (!jQuery("#afui").hasClass("menu-on")) touchTimer = setTimeout(function(){app.showMenu();}, 500);
            var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];
            var elem = document.elementFromPoint(touch.pageX, touch.pageY);
            jQuery("#menu a").not(elem).removeClass("over");
            if (jQuery(elem).is("a")) {
                jQuery(elem).addClass("over");
                jQuery("#menu span").text(jQuery(elem).attr("title"));
            }
        });
        jQuery(document).bind("touchmove",function(event) {
            jQuery("#menu").addClass("down");
            if (!jQuery("#afui").hasClass("menu-on")) {
                clearTimeout(touchTimer);
                return;
            }
            var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];
            var elem = document.elementFromPoint(touch.pageX, touch.pageY);
            jQuery("#menu a").not(elem).removeClass("over");
            if (jQuery(elem).is("a")) {
                jQuery(elem).addClass("over");
                jQuery("#menu span").text(jQuery(elem).attr("title"));
            } else {
                jQuery("#menu span").text(" ");
            }
        });
        jQuery(document).bind("touchend",function(event) {
            jQuery("#menu").removeClass("down");
            if (jQuery("#afui").hasClass("menu-on")) {
                var touch = event.originalEvent.changedTouches[0];
                var elem = document.elementFromPoint(touch.pageX, touch.pageY);
                if (jQuery(elem).is("a[href]")) app.navigateTo(jQuery(elem).attr("href").substr(1),"fade");
                if (jQuery(elem).attr("id") != "menu") app.hideMenu();
                jQuery("#menu span").text("").css("background-color",""); 
            } else {
                clearTimeout(touchTimer);
            }
        });
        jQuery("#menu a").bind("click",function(event) {
            app.navigateTo(event.currentTarget.hash.substr(1),"fade");
            app.hideMenu();
        });
        jQuery("#header header").append("<a id='notifications-button' onclick='af.ui.loadContent(\"notifications\",false,false,\"slide\");'><a id='menu-button' onclick='app.showMenu()'></a>");
    },
    resizeMenu: function() {
        var elems = jQuery("#menu a.radial");
        var increase = Math.PI * 2 / elems.length;
        var x = 0, y = 0, angle = 11, elem;
        var r = 100;
        var itemWidth = 55;
        var itemHeight = 55;
        for (var i = 0; i < elems.length; i++) {
            elem = elems[i];
            x = r * Math.cos(angle) + (window.innerWidth/2)-(itemWidth/2);
            y = r * Math.sin(angle) + (window.innerHeight/2)-(itemHeight/2);
            elem.style.position = 'absolute';
            elem.style.left = x + 'px';
            elem.style.top = y + 'px';
            angle += increase;
        }   
    },
    showMenu: function(event) {
        if (!jQuery("#afui").hasClass("menu-on") && jQuery("#afui_mask").css("display") == "none") {
            this.resizeMenu();
            jQuery("#afui, #menu").removeClass("menu-off").addClass("menu-on");
            document.ontouchmove = function(event){event.preventDefault();}
        }
    },
    hideMenu: function() {
        if (jQuery("#afui").hasClass("menu-on")) {
            jQuery("#afui, #menu").removeClass("menu-on").addClass("menu-off");
            jQuery("#menu a").removeClass("over");
            document.ontouchmove = function(event){return true;}
        }
    },
    toggleMenu: function() {
        if (jQuery("#afui").hasClass("menu-on")) this.hideMenu();
        else this.showMenu();
    },
    navigateTo: function(div,transition) {
        jQuery("#schedule-list").empty();                                               // Clear schedule to save memory
        if (div != "login") jQuery("#header").css("background-color","#FFFFFF");        // Set Header Colour to white if not login
        af.ui.loadContent(div,true,false,transition);                                   // Load Page
        af.ui.clearHistory();                                                           // Clear Navigation History
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
                    window.localStorage.setItem("visitor", JSON.stringify(visitor));
                    af.ui.showMask("Loading Events..."); 
                    qualia.api("event","GET",{limit:1000,festival:4},function(data) {
                        window.localStorage.setItem("event-data", JSON.stringify(data.objects));
                        qualia.api("visitor/"+visitor.id,"PATCH",visitor,function(response){console.log("Visitor object updated");});
                        af.ui.hideMask();
                        app.navigateTo("profile","slide");
                        jQuery("#profile .skip").css("display", "block");  
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
                        af.ui.showMask("Loading Events...");  
                        window.localStorage.setItem("id", response.resource_uri);
                        window.localStorage.setItem("visitor", JSON.stringify(response));
                        qualia.api("event","GET",{limit:1000,festival:4},function(data) {
                            window.localStorage.setItem("event-data", JSON.stringify(data.objects));
                            jQuery("#login-form").children().prop("disabled",false).removeClass("disabled");
                            af.ui.hideMask();
                            app.navigateTo("profile","slide");
                            jQuery("#profile .skip").css("display", "block");  
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
    initialiseDashboard: function() {
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
            jQuery("#visualisations").html('<iframe src="http://www.qualia.org.uk/mobile/app/visuals/" width="100%" height="100%" frameBorder="0"></iframe>');
            jQuery('#visualisations iframe').load(function() {
              this.style.height = this.contentWindow.document.body.offsetHeight + 'px';
            });
        }
            
    },
    // Schedule
    initialiseEvents: function() {
        if (window.localStorage.getItem("event-data") === "undefined") {
            if (app.hasInternet()) {
                af.ui.showMask("Loading Events...");
                af.ui.blockUI(0.01);
                qualia.api("event","GET",{limit:1000,festival:4},function(data) {
                    window.localStorage.setItem("event-data", JSON.stringify(data.objects));
                    app.displayEvents();
                    af.ui.unblockUI();
                });
            } else {
                af.ui.unblockUI();
                app.showNotification(NO_INTERNET_GET_EVENTS);
            }
        } else {
            if (jQuery("#schedule-find").hasClass("active")) app.displayEvents();
            else app.displaySchedule();
        }
    },
    displayEvents: function(ref) {
        jQuery("#schedule-find").addClass("active");
        jQuery("#schedule-me").removeClass("active");
        jQuery("#schedule-day").show();
        jQuery("#search input").val("");
        jQuery("#search .close").css("display","none");
        
        var events = app.parse(window.localStorage.getItem("event-data"));
        if (events !== "undefined") {
            var date;
            if (jQuery(ref).data("date")) date = new Date(jQuery(ref).data("date")); // If date in reference.data
            else if (jQuery("#schedule-day span").data("date") != undefined ) date = new Date(jQuery("#schedule-day span").data("date")); // Else if date is previously loaded on screen
            else if (date == undefined) date = new Date(); // else if no date set, set date to today
            if (date < START_DATE) {
                date = START_DATE;
                jQuery("#schedule-day .left").data("date",START_DATE.getTime());
                jQuery("#schedule-day .right").data("date",START_DATE.getTime() + (24*60*60*1000)); 
            } else if (date > END_DATE) {
                date = END_DATE;
                jQuery("#schedule-day .left").data("date",END_DATE.getTime() - (24*60*60*1000));
                jQuery("#schedule-day .right").data("date",END_DATE); 
            } else {
                date = date;
                jQuery("#schedule-day .left").data("date",date.getTime() - (24*60*60*1000));
                jQuery("#schedule-day .right").data("date",date.getTime() + (24*60*60*1000));   
            }
            jQuery("#schedule-day span").text(app.getWeekday(date.getDay()) + " " + date.getDate() + app.getNthSuffix(date.getDate())).data("date",date);
            jQuery("#schedule-list").empty().removeClass("feedback");
            af.ui.showMask("Loading...");   
            var visitor = app.parse(window.localStorage.getItem("visitor"));
            app.updateScheduleLabel();
            jQuery(app.filterScheduleByDate(events,date)).each(function(index, element) {
                var start = new Date(element.start);
                var end = new Date(element.end);
                var item = "<li data-id="+index+"><table><tr><td class='left'><img class='circle' src='"+element.thumbnail+"' width='55' height='55' /></td><td><span class='content-title'>"+element.name+"</span><span class='small-text'>"+start.getHours()+":"+(start.getMinutes()<10?'0':'') + start.getMinutes()+" - "+end.getHours()+":"+(end.getMinutes()<10?'0':'')+end.getMinutes()+"</span><span class='small-text'>"+element.venue.name+"</span><span class='small-text'>"+element.price+"</span><span class='small-text'>Quick Find: "+element.quick_find+"</span>";
                if (element.tickets_available == true) item += "<span class='small-text'>Sold Out</span>";
                else if (element.tickets_available == false) item += "<span class='small-text'>Tickets available</span>";
                item += app.renderAttendingButton(element, visitor);
                item += "<a class='button view' onclick='app.displayEvent("+element.id+")'></a></td></tr></table></li>";
                jQuery("#schedule-list").append(item);
            });
            af.ui.hideMask();
        }
    },
    searchEvents: function() {
        jQuery("#schedule-find").addClass("active");
        jQuery("#schedule-me").removeClass("active");
        jQuery("#schedule-day").hide();
        jQuery("#schedule-list").empty().removeClass("feedback");
        jQuery("#search .close").css("display","block");
        var events = app.parse(window.localStorage.getItem("event-data"));
        if (events !== "undefined") {
            if (jQuery("#search input").val() != '') {
                var visitor = app.parse(window.localStorage.getItem("visitor"));
                var results = app.findInArrayByProperties(events, [{query:"name"},{query:"quick_find"},{query:"venue.name"}], jQuery("#search input").val());
                if (results.length > 100) {
                    app.showNotification(TOO_MANY_RESULTS);
                    return;   
                }
                jQuery(results).each(function(index, element) {
                    var start = new Date(element.start);
                    var end = new Date(element.end);
                    var item = "<li data-id="+index+"><table><tr><td class='left'><img class='circle' src='"+element.thumbnail+"' width='55' height='55' /></td><td><span class='content-title'>"+element.name+"</span><span class='small-text'>"+app.getWeekday(start.getDay())+" "+start.getHours()+":"+(start.getMinutes()<10?'0':'') + start.getMinutes()+" - "+end.getHours()+":"+(end.getMinutes()<10?'0':'')+end.getMinutes()+"</span><span class='small-text'>"+element.venue.name+"</span><span class='small-text'>"+element.price+"</span><span class='small-text'>Quick Find: "+element.quick_find+"</span>";
                    if (element.tickets_available == true) item += "<span class='small-text'>Sold Out</span>";
                    else if (element.tickets_available == false) item += "<span class='small-text'>Tickets available</span>";
                    item += app.renderAttendingButton(element, visitor);
                    item += "<a class='button view' onclick='app.displayEvent("+element.id+")'></a></td></tr></table></li>";
                    jQuery("#schedule-list").append(item);
                    //if (index > 10) return false;
                });
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
    displaySchedule: function() {
        jQuery("#schedule-find").removeClass("active");
        jQuery("#schedule-me").addClass("active");
        jQuery("#schedule-day").hide();
        jQuery("#search input").val("");
        jQuery("#schedule-list").empty().addClass("feedback");
        jQuery("#search .close").css("display","none");
        var events = app.parse(window.localStorage.getItem("event-data"));
        if (events !== "undefined") {
            app.updateScheduleLabel();
            var visitor = app.parse(window.localStorage.getItem("visitor"));
            if (visitor.attendance.length < 1) {
                console.log("No Events");
            } else {
                jQuery(visitor.attendance).each(function(index, attendance) {
                    var item = app.findInArrayByProperty(events, "resource_uri", attendance.event);
                    var start = new Date(item.start);
                    var end = new Date(item.end);
                    var html = "<li data-id="+index+"><table><tr><td class='left'><img class='circle' src='"+item.thumbnail+"' width='55' height='55' /></td><td><span class='content-title'>"+item.name+"</span><span class='small-text'>"+app.getWeekday(start.getDay())+" "+start.getHours()+":"+(start.getMinutes()<10?'0':'') + start.getMinutes()+" - "+end.getHours()+":"+(end.getMinutes()<10?'0':'')+end.getMinutes()+"</span><span class='small-text'>"+item.venue.name+"</span><span class='small-text'>"+item.price+"</span><span class='small-text'>Quick Find: "+item.quick_find+"</span>";
                    if (item.tickets_available == true) html += "<span class='small-text'>Sold Out</span>";
                    else if (item.tickets_available == false) html += "<span class='small-text'>Tickets available</span>";
                    html += app.renderFeedbackButton(item, attendance);
                    html += app.renderAttendingButton(item, visitor);
                    html += "<a class='button view' onclick='app.displayEvent("+item.id+")'></a></td></tr></table></li>";
                    jQuery("#schedule-list").append(html);
                });
            }
        }
    },
    renderFeedbackButton: function(item, attendance, centre) {
        var start = new Date(item.start);
        if (new Date() < start.getTime()) {
            if (attendance.received_pre_response || !item.expecting_pre_response) return "<a class='button feedback disabled"+(centre ? " centre" : "")+"'><span>Leave pre-feedback</span></a>";
            else return "<a class='button feedback"+(centre ? " centre" : "")+"' href='#pre-feedback' onclick='app.hookPreFeedback(\""+attendance.resource_uri+"\")'><span>Leave pre-feedback</span></a>";  
        } else {
            if (attendance.received_post_response || attendance.did_not_attend) return "<a class='button feedback disabled"+(centre ? " centre" : "")+"'><span>Leave post-feedback</span></a>";
            else return "<a class='button feedback"+(centre ? " centre" : "")+"' href='#post-feedback' onclick='app.hookPostFeedback(\""+attendance.resource_uri+"\")'><span>Leave post-feedback</span></a>";   
        }
    },
    renderAttendingButton: function(item, visitor, centre) {
        var start = new Date(item.start);
        if (app.findInArrayByEvent(visitor.attendance, item.resource_uri) != undefined) {
            if (new Date() < start.getTime()) return "<a class='button attend"+(centre ? " centre" : "")+"' onclick='app.attendEvent(this,\""+item.resource_uri+"\","+item.id+")'><span>Unattend Event</span></a>";
            else return "<a class='button attend disabled"+(centre ? " centre" : "")+"'><span>Unattend Event</span></a>";
        } else {
            if (new Date() < start.getTime()) return "<a class='button attend"+(centre ? " centre" : "")+"' onclick='app.attendEvent(this,\""+item.resource_uri+"\","+item.id+")'><span>Attend Event</span></a>";
            else return "<a class='button attend disabled"+(centre ? " centre" : "")+"'><span>Attend Event</span></a>";
        }
    },
    displayEvent: function(id) {
        var data = app.parse(window.localStorage.getItem("event-data"));
        var item = app.findInArrayById(data,id);
        var start = new Date(item.start);
        var end = new Date(item.end);
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        
        var html = "";
        html += "<img src='"+item.image_url+"' width='100%' height='auto' />";
        html += "<div class='padding'><p><span class='content-title'>"+item.name+"</span><span class='small-text'>"+app.getWeekday(start.getDay())+" "+start.getHours()+":"+(start.getMinutes()<10?'0':'') + start.getMinutes()+" - "+end.getHours()+":"+(end.getMinutes()<10?'0':'')+end.getMinutes()+"</span><span class='small-text'>"+item.venue.name+"</span><span class='small-text'>"+item.price+"</span>";
        if (item.tickets_available == true) html += "<span class='small-text'>Sold Out</span>";
        else if (item.tickets_available == false) html += "<span class='small-text'>Tickets available</span>";
        html += "<br /></p><p>"+item.info+"</p>";

        var attendance = app.findInArrayByEvent(visitor.attendance, item.resource_uri);        
        if (attendance != undefined) html += app.renderFeedbackButton(item, attendance, true);
        
        html += app.renderAttendingButton(item, visitor, true);
        
        html += "<hr /><div class='padding'><p><span class='content-title'>Venue Information:</span><br /></p><table><tr><td class='left'><img class='circle' src='"+item.venue.thumbnail+"' width='55' height='55' /></td><td><span class='content-title'>"+item.venue.name+"</span><p>"+item.venue.about+"</p></td></tr></table></div>";
        
        if (item.venue.accessibility != "") html += "<hr /><div class='padding'><table><tr><td class='left'><div class='icon accessibility'></div></td><td><span class='content-title'>Accessibility</span><p>"+item.venue.accessibility+"</p></td></tr></table></div>";
        
        html += "<hr /><div class='padding'><table><tr><td class='left'><div class='icon directions'></div></td><td><span class='content-title'>Directions</span><p>"+(item.venue.directions!=''?item.venue.directions:"None available.")+"</p>";
        if (isiOS) html += "<p><a class='button map' href='maps://maps.apple.com/?q="+item.venue.postcode+"' target='_blank'><span>View on Map</span></a></p>";
        else if (isAndroid)  html += "<p><a class='button map' href='geo:0,0?q="+item.venue.postcode+"' target='_blank'><span>View on Map</span></a></p>";
        html += "</td></tr></table></div>";
        
        if (jQuery("#Event-"+id).length < 1) {
            af.ui.addContentDiv("Event-"+id,html,item.name);
        } else {
            af.ui.updateContentDiv("Event-"+id,html);   
        }
        af.ui.loadContent("Event-"+id,false,false,"slide");   
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
        var visitor = app.parse(window.localStorage.getItem("visitor"));
        if (visitor.attendance.length < 1) af.ui.removeBadge("#schedule-me");
        else af.ui.updateBadge("#schedule-me",visitor.attendance.length,'tr','white');
    },
    initialisePreFeedback: function() {
        jQuery("#pre-feedback input[type='range']").val(4);
        jQuery("#pre-feedback input[type='text']").val("");        
        jQuery("#pre-feedback input[type='range']").change(function() {
            var element = jQuery(this);
            element.css("background-color",COLOURS[element.val()]).attr("data-content",element.val()).parent().prev("span.range-label").text(LIKERT_FEEDBACK[element.val()]);
        });
        jQuery("#pre-feedback input[type='range']").trigger("change");
        if (isAndroid) jQuery("#pre-feedback input[type='range']").on("touchstart", app.touchHandler).on("touchmove", app.touchHandler).on("touchend", app.touchHandler);
    },
    initialisePostFeedback: function() {
        jQuery("#post-feedback input[type='range']").val(4);
        jQuery("#post-feedback input[type='text']").val("");  
        jQuery("#post-feedback input[type='range']").change(function() {
            var element = jQuery(this);
            element.css("background-color",COLOURS[element.val()]).attr("data-content",element.val()).parent().prev("span.range-label").text(LIKERT_FEEDBACK[element.val()]);
        });
        jQuery("#post-feedback input[type='range']").trigger("change");
        if (isAndroid) jQuery("#post-feedback input[type='range']").on("touchstart", app.touchHandler).on("touchmove", app.touchHandler).on("touchend", app.touchHandler);
    },
    hookPreFeedback: function(attendance_uri) {
        jQuery("#pre-feedback-form").data("attendance", attendance_uri);
    },
    submitPreFeedback: function() {
        jQuery("#pre-feedback-form input").prop("disabled",true).addClass("disabled");
        var form = jQuery("#pre-feedback-form")[0];
        var data = {
            comment:form["comment"].value,
            anticipation:form["anticipation"].value,
            attendance:jQuery("#pre-feedback-form").data("attendance")
        }
        qualia.api("pre-event-response","POST",data,function(response){
            jQuery("#pre-feedback-form input").prop("disabled",false).removeClass("disabled");
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
                af.ui.goBack();
                app.showNotification(THANK_YOU_RESPONSE);
            }
            else {
                app.showNotification(PROBLEM_RESPONSE);
                jQuery("#pre-feedback-form input").prop("disabled",false).removeClass("disabled");
            }
        });
    },
    hookPostFeedback: function(attendance_uri) {
        jQuery("#post-feedback-form").data("attendance", attendance_uri);
    },
    submitPostFeedback: function(blank) {
        if (app.hasInternet()) {
            jQuery("#post-feedback-form input").prop("disabled",true).addClass("disabled");
            if (blank) { // Did not attend
                var visitor = app.parse(window.localStorage.getItem("visitor"));
                jQuery.each(visitor.attendance, function(index, attendance) {
                        if (attendance.resource_uri == jQuery("#post-feedback-form").data("attendance")) {
                            attendance.did_not_attend = true;
                            qualia.api("attendance/"+attendance.id,"PATCH",{did_not_attend:true},function(response){
                                app.displaySchedule();
                                af.ui.goBack();
                                af.ui.goBack();
                                app.showNotification(THANK_YOU_RESPONSE);
                                jQuery("#post-feedback-form input").prop("disabled",false).removeClass("disabled");
                            });
                            window.localStorage.setItem("visitor",JSON.stringify(visitor));
                            return;
                        }
                    });
            } else {
                var form = jQuery("#post-feedback-form")[0];
                var data = {
                    comment:form["comment"].value,
                    satisfaction:form["satisfaction"].value,
                    attendance:jQuery("#post-feedback-form").data("attendance"),
                    enjoyable:form["enjoyable"].value,
                    quality:form["quality"].value,
                    expectations:form["expectations"].value
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
                        af.ui.goBack();
                        af.ui.goBack();
                        app.showNotification(THANK_YOU_RESPONSE);
                        jQuery("#post-feedback-form input").prop("disabled",false).removeClass("disabled");
                    }
                    else {
                        app.showNotification(PROBLEM_RESPONSE);
                        jQuery("#post-feedback-form input").prop("disabled",false).removeClass("disabled");
                    }
                });
            }
        } else {
            app.showNotification(NO_INTERNET_FEEDBACK);
        }
    },
    // Push Notifications
    initialisePushNotifications: function() {
        if ((isAndroid || isiOS)) {
            var pushNotification = window.plugins.pushNotification;
            pushNotification.onDeviceReady();
            if (isAndroid) {
                pushNotification.registerDevice({ projectid: GOOGLE_PROJECT_ID, appid : PUSHWOOSH_APP_ID },
                    function(status) {
                        var pushToken = status;
                        console.warn('push token: ' + pushToken);
                        qualia.api("device","POST",{visitor:window.localStorage.getItem("id"),device_string:pushToken},function(data){});
                        pushNotification.setMultiNotificationMode();
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
                        qualia.api("device","POST",{visitor:window.localStorage.getItem("id"),device_string:deviceToken},function(data){});
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
                notifications.push({title:title,timestamp:Date.now(),data:userData});
                window.localStorage.setItem("notifications",JSON.stringify(notifications));
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
    loadNotifications: function() {
        var notifications = app.parse(window.localStorage.getItem("notifications"));
        if (notifications == null) {
            notifications = [];
            window.localStorage.setItem("notifications",JSON.stringify(notifications));
        } else {
            jQuery("#notifications-list").empty();
            jQuery.each(notifications, function(index, message) {
                var html = "<li><span class='content-title timeago' title="+(message.data!==undefined?message.data.now:new Date(message.timestamp).toISOString())+"></span><p>"+message.title+"</p>";
                if (message.data != undefined) switch(message.data.type) {
                    case "post":
                        html += "<a class='button centre' onclick='app.actOnNotification(\"post\","+message.data.attendance+")'><span>Leave post-feedback</span></a>";
                        break;
                    case "pre":
                        html += "<a class='button centre' onclick='app.actOnNotification(\"pre\","+message.data.attendance+")'><span>Leave pre-feedback</span></a>";
                        break;
                    case "reminder":
                        html += "<a class='button centre' onclick='app.actOnNotification(\"reminder\","+message.data.event+")'><span>View Event</span></a>";
                        break;
                    case "announce":
                        html += "<a class='button centre' onclick='app.actOnNotification(\"announce\",\""+message.data.page+"\")'><span>View Page</span></a>";
                        break;
                    case "page":
                        html += "<a class='button centre' onclick='app.actOnNotification(\"page\",\""+message.data.page+"\")'><span>Goto Page</span></a>";
                        break;
                    default:
                        break;
                }
                html += "</li>";
                jQuery("#notifications-list").prepend(html); 
            });
            jQuery(".timeago").timeago();
        }
        if (notifications.length > 0) {
            af.ui.updateBadge("#notifications-button",notifications.length,'bl','black');
        } else {
            af.ui.removeBadge("#notifications-button");
            jQuery("#notifications-list").append("<li><span class='content-title'>No Notifications</span>Notification messages sent to you will appear here.</li>");
        }
        if (isiOS) window.plugins.pushNotification.setApplicationIconBadgeNumber(notifications.length);
    },
    actOnNotification: function(type,data) {
        switch(type) {
            case "pre":
                app.hookPreFeedback("/api/v1/attendance/"+data+"/");
                af.ui.loadContent("pre-feedback",false,false,"slide"); 
                break;
            case "post":
                app.hookPostFeedback("/api/v1/attendance/"+data+"/");
                af.ui.loadContent("post-feedback",false,false,"slide"); 
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
        jQuery("#mood .dial").knob({
            'change'    :   function(value) {                           
                jQuery("#mood .dial").trigger('configure', {"bgColor":COLOURS[value]});
                jQuery("#mood-title").text(LIKERT_MOOD[value]).css("color",COLOURS[value]);
                jQuery("#mood-value").text(value);
            },
            'release'   :   function(value) {
                if (jQuery("#afui_mask").css("display") == "none") {
                    if (app.hasInternet()) {
                        af.ui.showMask("Submitting Mood...");
                        af.ui.blockUI(0.01);
                        jQuery("#mood .dial").trigger('configure', {"readOnly":true}); // Disable Knob Interaction
                        navigator.geolocation.getCurrentPosition(function(position) {
                            app.submitMood(position.coords.latitude, position.coords.longitude, value);
                        },function(error) {
                            console.log("Error getting location, submitting Mood without GPS data.");
                            app.submitMood(null, null, value);
                        });      
                    } else {
                        app.showNotification(NO_INTERNET_MOOD);
                    }
                }
            }
        }).bind("touchstart", function(e){
            e.stopPropagation();
            clearTimeout(touchTimer);  
        });   
    },
    submitMood: function(lat, long, value) {
        if (lat == null || long == null) {
            qualia.api("mood","POST",{visitor:window.localStorage.getItem("id"),score:value},function(event) {
                if (event.id) app.showNotification(THANK_YOU_MOOD);
                jQuery("#mood .dial").trigger('configure', {"readOnly":false}); // Enable Knob Interaction
                jQuery("#mood .dial").val(4).trigger('change').trigger('configure', {"bgColor":"#92278f"}); // Reset Knob
                jQuery("#mood-title").text("Neutral").css("color","#92278f");
                jQuery("#mood-value").text("4");
                af.ui.hideMask();
                af.ui.unblockUI();
            });
        } else {
            qualia.api("gps","POST",{visitor:window.localStorage.getItem("id"),lat:lat ,long:long },function(gps) {
                qualia.api("mood","POST",{visitor:window.localStorage.getItem("id"),score:value,gps:gps.resource_uri},function(event) {
                    if (event.id) {
                        app.showNotification(THANK_YOU_MOOD); 
                    }
                    jQuery("#mood .dial").trigger('configure', {"readOnly":false}); // Enable Knob Interaction
                    jQuery("#mood .dial").val(4).trigger('change').trigger('configure', {"bgColor":"#92278f"}); // Reset Knob
                    jQuery("#mood-title").text("Neutral").css("color","#92278f");
                    jQuery("#mood-value").text("4");
                    af.ui.hideMask();
                    af.ui.unblockUI();
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
            af.ui.showMask("Retrieving Posts...");
            af.ui.blockUI(0.01);
            // Use Qualia cache
            qualia.api("tweet","GET",{limit:20}, function(data) {
                jQuery.each(data.objects, function(index, message) {
                    var html = "<li><table><tr><td class='left'><img class='circle' width='55' height='55' src='"+message.author.profile_image_url+"' /></td><td><span class='content-title'>@"+message.author.screen_name+"</span><p>"+message.text+"</p></td></tr></table></li>";
                    jQuery("#social-feed").append(html);
                });
                af.ui.hideMask();
                af.ui.unblockUI();
            });
            // Use Twitter API
            /*jQuery.ajax({
                url: "http://www.elixel.co.uk/lab/twitter/hash_timeline.php?query="+hashtag.replace("#","")+"&count=20",
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
        }
    },
    postSocial: function() {
        if (app.hasInternet()) {
            if (!jQuery("#twittertoggle").is(":checked") && !jQuery("#facebooktoggle").is(":checked")) {
                app.showNotification(SOCIAL_CHOOSE_NETWORK);
            } else {
                var post = jQuery("#social #social-post").val() + " " + hashtag;
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
            FB.init({ appId: "510092625750443", nativeInterface: CDV.FB, useCachedDialogs: false });
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
        if (navigator.connection) {
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
    }
};

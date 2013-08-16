var touchTimer;

var app = {
    // Application Constructor
    initialise: function() {
        $.ui.loadDefaultHash=false; // Disable AF Hash
        $.ui.removeFooterMenu();    // Disable AF Footer
        $.ui.useOSThemes=false;     // Disable AF Themes
        this.bindEvents();
        qualia.init("elixel","ab33073c631ff2df0497e7c2a63fc523a020415e");
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        af.ui.ready(this.onUIReady);
    },
    onDeviceReady: function() {
        
    },
    onUIReady: function() {
        if (window.localStorage.getItem("id") === null) {
            app.navigateTo("login");
        } else {
            app.initialiseMenu();
            app.navigateTo("mood");
        }        
    },
    initialiseMenu: function() {
        document.addEventListener('touchstart', function(event) {
            if (!$("#afui").hasClass("menu-on")) touchTimer = setTimeout(function(){app.showMenu();}, 500);
        });
        $(document).bind("touchmove",function(event) {
            var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];
            var elem = document.elementFromPoint(touch.pageX, touch.pageY);
            $("#menu a").not(elem).removeClass("over");
            if ($(elem).is("a")) {
                $(elem).addClass("over");
                $("#menu span").text($(elem).attr("title")).css("background-color",$(elem).css("background-color"));
            } else {
                $("#menu span").text("").css("background-color",""); 
            }            
        });
        document.addEventListener('touchend', function(event) {
            if ($("#afui").hasClass("menu-on")) {
                var touch = event.changedTouches[0];
                var elem = document.elementFromPoint(touch.pageX, touch.pageY);
                if ($(elem).is("a[href]")) app.navigateTo($(elem).attr("href"))
                app.hideMenu();
            } else {
                clearTimeout(touchTimer);
            }
        });
        $("#header").append("<a id='menu-button' onclick='app.toggleMenu()'></a>");
    },
    resizeMenu: function() {
        var elems = $("#menu a.radial");
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
    showMenu: function() {
        if (!$("#afui").hasClass("menu-on")) {
            this.resizeMenu();
            $("#afui, #menu").removeClass("menu-off").addClass("menu-on");
            document.ontouchmove = function(event){event.preventDefault();}
        }
    },
    hideMenu: function() {
        if ($("#afui").hasClass("menu-on")) {
            $("#afui, #menu").removeClass("menu-on").addClass("menu-off");
            $("#menu a").removeClass("over");
            document.ontouchmove = function(event){return true;}
        }
    },
    toggleMenu: function() {
        if ($("#afui").hasClass("menu-on")) this.hideMenu();
        else this.showMenu();
    },
    navigateTo: function(div) {
        af.ui.loadContent(div,true,false,"fade");
        af.ui.clearHistory();
    },
    login: function(e) {
        document.activeElement.blur();
        $("#login-form").children().attr("disabled","disabled");
        $("#login-form img").css("visibility","visible");
        qualia.login(e.value, function(response) {
            if (response == "error") {
                alert("There was an error.");
            } else {
                window.localStorage.setItem("id", e.id);
                af.ui.loadContent("mood",true,false,"slide");
                af.ui.clearHistory();
                app.initialiseMenu();
            }
            $("#login-form").children().removeAttr("disabled");
            $("#login-form img").css("visibility","hidden");
        });
    }
};

var app = {
    // Application Constructor
    initialise: function() {
        $.ui.removeFooterMenu();    // Disable AF Footer
        $.ui.useOSThemes=false;     // Disable AF Themes
        this.bindEvents();
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        $.ui.ready(onUIReady);
    },
    onDeviceReady: function() {
        
    },
    onUIReady: function() {
        
    }
};

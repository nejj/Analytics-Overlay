// sJTracker
// sJTracker.registerEvent      // DOM Event Handlers
// sJTracker.getDomQuery        // Get Element from the DOM
// sJTracker.track              // Track Arbitrary Data
// sJTracker.trackInput         // Track Input Fields
// sJTracker.trackLinks         // Track Link Clicks
// sJTracker.trackForms         // Track Form Submissions
// sJTracker.registerUserInfo   // Store information about the user
// sJTracker.userAlias          // Assign unique ID to identify future user interactions
// sJTracker.userIdentify       // Identify user with unique ID
// sJTracker.userNameTag        // Identify user with human readable name tags

var   sJTracker = {}
    , runSJTasks = function() {};

sJTracker.registerEvent = (function() {

    /**
    * @param {Object} element
    * @param {string} type
    * @param {function(...[*])} handler
    * @param {boolean=} oldSchool
    */
    var registerEvent = function(element, type, handler, oldSchool) {
        if (!element) return;

        if (element.addEventListener && !oldSchool) {
            element.addEventListener(type, handler, false);
        } else {
            var ontype = 'on' + type;
            var oldHandler = element[ontype]; // can be undefined
            element[ontype] = makeHandler(element, handler, oldHandler);
        }
    };

    /**
    * @param {Object} f
    */
    function isFunction(f) {
        try {
            return /^\s*\bfunction\b/.test(f);
        } catch (x) {
            return false;
        }
    }

    /**
    * @param {Object} element
    * @param {function(...[*])} newHandler
    * @param {function(...[*])} oldHandlers
    */
    function makeHandler(element, newHandler, oldHandlers) {
        var handler = function(event) {
            event = event || fixEvent(window.event);

            // this basically happens in firefox whenever another script
            // overwrites the onload callback and doesn't pass the event
            // object to previously defined callbacks.  All the browsers
            // that don't define window.event implement addEventListener
            // so the dom_loaded handler will still be fired as usual.
            if (!event) { return undefined; }

            var ret = true;
            var oldResult, newResult;

            if (isFunction(oldHandlers)) {
                oldResult = oldHandlers(event);
            }
            newResult = newHandler.call(element, event);

            if ((false === oldResult) || (false === newResult)) {
                ret = false;
            }

            return ret;
        };

        return handler;
    }

    /**
    * @param {Object} event
    */
    function fixEvent(event) {
        if (event) {
            event.preventDefault = fixEvent.preventDefault;
            event.stopPropagation = fixEvent.stopPropagation;
        }
        return event;
    }

    fixEvent.preventDefault = function() {
        this.returnValue = false;
    };

    fixEvent.stopPropagation = function() {
        this.cancelBubble = true;
    };

    return registerEvent;
})();

/**
* @param {String} element
*/
sJTracker.getDomQuery = (function() {
    /* document.getElementsBySelector(selector)
    - returns an array of element objects from the current document
    matching the CSS selector. Selectors can contain element names,
    class names and ids and can be nested. For example:

    elements = document.getElementsBySelector('div#main p a.external')

    Will return an array of all 'a' elements with 'external' in their
    class attribute that are contained inside 'p' elements that are
    contained inside the 'div' element which has id="main"

    New in version 0.4: Support for CSS2 and CSS3 attribute selectors:
    See http://www.w3.org/TR/css3-selectors/#attribute-selectors
    */

    function isString(obj) {
        return Object.prototype.toString.call(obj) == '[object String]';
    }

    function getAllChildren(e) {
        // Returns all children of element. Workaround required for IE5/Windows. Ugh.
        return e.all ? e.all : e.getElementsByTagName('*');
    }

    var badWhitespace = /[\t\r\n]/g;
    function hasClass(elem, selector) {
        var className = " " + selector + " ";
        return ((" " + elem.className + " ").replace(badWhitespace, " ").indexOf(className) >= 0);
    }

    function getElementsBySelector(selector) {
        // Attempt to fail gracefully in lesser browsers
        if (!document.getElementsByTagName) return [];

        // Split selector in to tokens
        var   tokens = selector.split(' ')
            , token
            , currentContext = new Array(document);

        for (var i = 0; i < tokens.length; i++) {
            token = tokens[i].replace(/^\s+/,'').replace(/\s+$/,'');
            if (token.indexOf('#') > -1) {
                // Token is an ID selector
                var   bits = token.split('#')
                    , tagName = bits[0]
                    , id = bits[1]
                    , element = document.getElementById(id);

                if (!element || (tagName && element.nodeName.toLowerCase() != tagName)) {
                    // element not found or tag with that ID not found, return false
                    return [];
                }

                // Set currentContext to contain just this element
                currentContext = new Array(element);
                continue; // Skip to next token
            }
            if (token.indexOf('.') > -1) {
                // Token contains a class selector
                var   bits = token.split('.')
                    , tagName = bits[0]
                    , className = bits[1];

                if (!tagName) tagName = '*';

                // Get elements matching tag, filter them for class selector
                var   found = []
                    , foundCount = 0

                for (var h = 0; h < currentContext.length; h++) {
                    var elements;

                    if (tagName == '*') {
                        elements = getAllChildren(currentContext[h]);
                    } else {
                        elements = currentContext[h].getElementsByTagName(tagName);
                    }
                    for (var j = 0; j < elements.length; j++) {
                        found[foundCount++] = elements[j];
                    }
                }
                currentContext = [];
                var currentContextIndex = 0;
                for (var k = 0; k < found.length; k++) {
                    if (found[k].className && isString(found[k].className) && hasClass(found[k], className)) {
                        currentContext[currentContextIndex++] = found[k];
                    }
                }
                continue; // Skip to next token
            }
            if (token.indexOf('[name=') > -1) {
              var tagName = token.replace(/[\[\]\'\"\=]/g,"").replace(/^name/,"");

              // Get elements matching name
              var   found = []
                  , foundCount = 0;

              for (var h = 0; h < currentContext.length; h++) {
                  var elements;

                  if (tagName == '*') {
                      elements = getAllChildren(currentContext[h]);
                  } else {
                      elements = currentContext[h].getElementsByName(tagName);
                  }
                  for (var j = 0; j < elements.length; j++) {
                      found[foundCount++] = elements[j];
                  }
              }
              currentContext = found;
              continue;
            }
            // if (token.indexOf('[name=') > -1) {
            //   var tagName = token.
            // }
            // Code to deal with attribute selectors
            if (token.match(/^(\w*)\[(\w+)([=~\|\^\$\*]?)=?"?([^\]"]*)"?\]$/)) {
                var   tagName = RegExp.$1
                    , attrName = RegExp.$2
                    , attrOperator = RegExp.$3
                    , attrValue = RegExp.$4;

                if (!tagName) tagName = '*';

                // Grab all of the tagName elements within current context
                var   found = []
                    , foundCount = 0;

                for (var h = 0; h < currentContext.length; h++) {
                    var elements;

                    if (tagName == '*') {
                        elements = getAllChildren(currentContext[h]);
                    } else {
                        elements = currentContext[h].getElementsByTagName(tagName);
                    }
                    for (var j = 0; j < elements.length; j++) {
                        found[foundCount++] = elements[j];
                    }
                }
                currentContext = new Array;
                var   currentContextIndex = 0
                    , checkFunction; // This function will be used to filter the elements

                switch (attrOperator) {
                    case '=': // Equality
                        checkFunction = function(e) { return (e.getAttribute(attrName) == attrValue); };
                        break;
                    case '~': // Match one of space seperated words
                        checkFunction = function(e) { return (e.getAttribute(attrName).match(new RegExp('\\b'+attrValue+'\\b'))); };
                        break;
                    case '|': // Match start with value followed by optional hyphen
                        checkFunction = function(e) { return (e.getAttribute(attrName).match(new RegExp('^'+attrValue+'-?'))); };
                        break;
                    case '^': // Match starts with value
                        checkFunction = function(e) { return (e.getAttribute(attrName).indexOf(attrValue) == 0); };
                        break;
                    case '$': // Match ends with value - fails with "Warning" in Opera 7
                        checkFunction = function(e) { return (e.getAttribute(attrName).lastIndexOf(attrValue) == e.getAttribute(attrName).length - attrValue.length); };
                        break;
                    case '*': // Match ends with value
                        checkFunction = function(e) { return (e.getAttribute(attrName).indexOf(attrValue) > -1); };
                        break;
                    default :
                        // Just test for existence of attribute
                        checkFunction = function(e) { return e.getAttribute(attrName); };
                }
                currentContext = [];
                currentContextIndex = 0;

                for (var k = 0; k < found.length; k++) {
                    if (checkFunction(found[k])) {
                        currentContext[currentContextIndex++] = found[k];
                    }
                }
                // alert('Attribute Selector: '+tagName+' '+attrName+' '+attrOperator+' '+attrValue);
                continue; // Skip to next token
            }
            // If we get here, token is JUST an element (not a class or ID selector)
            tagName = token;

            var   found = new Array;
                , foundCount = 0;

            for (var h = 0; h < currentContext.length; h++) {
                var elements = currentContext[h].getElementsByTagName(tagName);

                for (var j = 0; j < elements.length; j++) {
                    found[foundCount++] = elements[j];
                }
            }
            currentContext = found;
        }
        return currentContext;
    }

    return getElementsBySelector;
})();

/**
* @param {Timestamp} time
*/
sJTracker.getSeconds = function(time) {
    if (!time) return 0;
    return time / 1000;
};

/**
* @param {String} element
* @param {String} trackingNote
*/
sJTracker.trackInput = function($element,trackingNote,trackingObject) {
    $($element).on("change",function() {
        if (!this.attributes["data-track"]) {
            var tmpObject = !trackingObject ? {} : trackingObject;

            if (this.attributes.name.value.indexOf("password") === -1) {
                var   superObject = {}
                    , superProperty = this.name;

                superObject[superProperty] = this.value;
                sJTracker.register(superObject);
            }

            sJTracker.track(trackingNote,tmpObject);
            this.setAttribute("data-track", true);
        }
        // Don't store passwords
        if (this.attributes.name.value.indexOf("password") === -1) {
            var userInfo = {};

            userInfo[this.attributes.name.value] = this.value;
            sJTracker.registerUserInfo(userInfo);
        }
    });
};

/**
* @param {String} element
* @param {Object} data
* @param {function(...[*])} callback
*/
sJTracker.track = function(name,data,callback) {
    mixpanel.track(name,data,callback);

    if (data) sJTracker.registerUserInfo(data);
};

/**
* @param {String} element
* @param {String} trackingNote
* @param {Object} data
*/
sJTracker.trackLinks = function(element,trackingNote,data) {
    mixpanel.track_links(element,trackingNote,data);

    if (data) sJTracker.registerUserInfo(data);
};

/**
* @param {String} element
* @param {String} trackingNote
* @param {Object} data
*/
sJTracker.trackClicks = function(element,trackingNote,data) {
    $(element).on("click",function() {
        mixpanel.track(trackingNote,data);

        if (data) sJTracker.registerUserInfo(data);
    });
};



/**
* @param {String} element
* @param {String} trackingNote
* @param {Object} data
*/
sJTracker.trackForms = function(element,trackingNote,data) {
    if (data) {
        mixpanel.track_forms(element,trackingNote,data);
        sJTracker.registerUserInfo(data);
    } else {
        mixpanel.track_forms(element,trackingNote);
    }
};

/**
* @param {Object} data
*/
sJTracker.registerUserInfo = function(data,noParse) {
    var   newObject = {}
        , intValue;

    for(var key in data) {
        if (noParse || key === "addr_zip") {
            intValue = data[key];
        } else {
            intValue = parseInt(data[key]);
        }

        newObject["$" + key.replace("$","")] = isNaN(intValue) ? data[key] : intValue;
    }

    mixpanel.people.set(newObject);
};

/**
* @param {String} alias
*/
sJTracker.userAlias = function(alias) {
    mixpanel.alias(alias);
};

/**
* @param {String} alias
*/
sJTracker.userIdentify = function(alias) {
    mixpanel.identify(alias);
};

/**
* @param {String} nameTag
*/
sJTracker.userNameTag = function(nameTag) {
    mixpanel.name_tag(nameTag);
};

/**
* @param {Object} data
*/
sJTracker.register = function(data) {
    mixpanel.register(data);
};

/**
* @param {String} alias
*/
sJTracker.increment = function(data) {
    mixpanel.people.increment(data);
};

// Run Default Tracking Events
(function() {
    var browserInfo = function () {
        var   nAgt = navigator.userAgent
            , browserName  = navigator.appName
            , fullVersion  = ''+parseFloat(navigator.appVersion)
            , majorVersion = parseInt(navigator.appVersion,10)
            , nameOffset,verOffset,ix;

        // In Opera, the true version is after "Opera" or after "Version"
        if ((verOffset=nAgt.indexOf("Opera"))!=-1) {
         browserName = "Opera";
         fullVersion = nAgt.substring(verOffset+6);

         if ((verOffset=nAgt.indexOf("Version"))!=-1) fullVersion = nAgt.substring(verOffset+8);
        }
        // In MSIE, the true version is after "MSIE" in userAgent
        else if ((verOffset=nAgt.indexOf("MSIE"))!=-1) {
         browserName = "Microsoft Internet Explorer";
         fullVersion = nAgt.substring(verOffset+5);
        }
        // In Chrome, the true version is after "Chrome"
        else if ((verOffset=nAgt.indexOf("Chrome"))!=-1) {
         browserName = "Chrome";
         fullVersion = nAgt.substring(verOffset+7);
        }
        // In Safari, the true version is after "Safari" or after "Version"
        else if ((verOffset=nAgt.indexOf("Safari"))!=-1) {
         browserName = "Safari";
         fullVersion = nAgt.substring(verOffset+7);

         if ((verOffset=nAgt.indexOf("Version"))!=-1) fullVersion = nAgt.substring(verOffset+8);
        }
        // In Firefox, the true version is after "Firefox"
        else if ((verOffset=nAgt.indexOf("Firefox"))!=-1) {
         browserName = "Firefox";
         fullVersion = nAgt.substring(verOffset+8);
        }
        // In most other browsers, "name/version" is at the end of userAgent
        else if ( (nameOffset=nAgt.lastIndexOf(' ')+1) < (verOffset=nAgt.lastIndexOf('/')) ) {
         browserName = nAgt.substring(nameOffset,verOffset);
         fullVersion = nAgt.substring(verOffset+1);

         if (browserName.toLowerCase()==browserName.toUpperCase()) browserName = navigator.appName;
        }

        // trim the fullVersion string at semicolon/space if present
        if ((ix=fullVersion.indexOf(";"))!=-1) fullVersion=fullVersion.substring(0,ix);
        if ((ix=fullVersion.indexOf(" "))!=-1) fullVersion=fullVersion.substring(0,ix);

        majorVersion = parseInt(''+fullVersion,10);

        if (isNaN(majorVersion)) {
         fullVersion  = ''+parseFloat(navigator.appVersion);
         majorVersion = parseInt(navigator.appVersion,10);
        }

        majorVersion = majorVersion ? majorVersion.toString() : majorVersion;
        fullVersion = fullVersion ? fullVersion.toString() : fullVersion;

        return {
              major : majorVersion
            , minor : fullVersion
        };
    }();

    var osInfo = function () {
        var desktop = function () {
            //OS DETECTION...
            var   OSName = false
                , appV = navigator.appVersion
                , uA = navigator.userAgent;

            //The below few line of code will find the OS name
            if (appV.indexOf("Win") !=-1) OSName = "Windows";
            if (appV.indexOf("Mac") !=-1) OSName = "MacOS";
            if (appV.indexOf("X11") !=-1) OSName = "UNIX";
            if (appV.indexOf("Linux") !=-1) OSName = "Linux";

            var OSVer = false;

            if (uA.indexOf("Mac OS X 10.4") !=-1) OSVer = "Tiger";
            if (uA.indexOf("Mac OS X 10.5") !=-1) OSVer = "Leopard";
            if (uA.indexOf("Mac OS X 10.6") !=-1) OSVer = "Snow Leopard";
            if (appV.indexOf("NT 5.1") !=-1) OSVer = "XP";
            if (appV.indexOf("NT 6.0") !=-1) OSVer = "Vista";
            if (appV.indexOf("NT 6.1") !=-1) OSVer = "7";
            if (appV.indexOf("NT 6.2") !=-1) OSVer = "8";
            if (appV.indexOf("NT 6.3") !=-1) OSVer = "8.1";

            if (OSName && OSVer) {
                return {
                      major : OSName
                    , minor : OSVer
                };
            } else {
                return false;
            }
        }();

        var android = function () {
            var   ua = ua || navigator.userAgent,
                , match = ua.match(/Android\s([0-9\.]*)/);

            if (match && match[1]) {
                return {
                      major : parseInt(match[1],10)
                    , minor : parseFloat(match[1])
                };
            } else {
                return false;
            }
        }();

        var ios = function () {
          if (/iP(hone|od|ad)/.test(navigator.platform)) {
            // supports iOS 2.0 and later: <http://bit.ly/TJjs1V>
            var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);

            return {
                  major : (parseInt(v[1], 10)).toString()
                , minor : (parseInt(v[1], 10)).toString() + "." + (parseInt(v[2] || 0, 10)).toString()
            };
          } else {
            return false;
          }
        }();

        var output = {
              major : "Unknown"
            , minor : "Unkown"
        };

        if (desktop) {
            output = desktop;
            output.device = "Desktop";
        } else if (android) {
            output = android;
        } else if (ios) {
            output = ios;
        }

        return output;
    }();

    var $userIDMeta = document.getElementById("track-user-id");
    if ($userIDMeta && $userIDMeta.attributes.content.value && typeof preventMixPanelIdentify === "undefined") {
        sJTracker.userAlias($userIDMeta.attributes.content.value);
        sJTracker.userIdentify($userIDMeta.attributes.content.value);
    }

    var $userIPMeta = document.getElementById("track-user-ip");
    if ($userIPMeta && $userIPMeta.attributes.content.value) {
        sJTracker.register({
            "IP":$userIPMeta.attributes.content.value
        });
    }

    // IE7 and below don't support forEach
    if ( !Array.prototype.forEach ) {
        Array.prototype.forEach = function(fn, scope) {
            for(var i = 0, len = this.length; i < len; ++i) {
                fn.call(scope, this[i], i, this);
            }
        };
    }

    // IE8 and below don't support trim
    if (typeof String.prototype.trim !== 'function') {
        String.prototype.trim = function() {
            return this.replace(/^\s+|\s+$/g, '');
        };
    }

    var queryObject = (function() {
        var result = {}, keyValuePairs = location.search.slice(1).split('&');

        keyValuePairs.forEach(function(keyValuePair) {
            keyValuePair = keyValuePair.split('=');
            result[keyValuePair[0]] = keyValuePair[1] || '';
        });

        return result;
    })();

    var mixPanelReport = {
          "User Agent": navigator.userAgent
        , "Language" : navigator.language
        , "OS (Major Version)" : osInfo.major
        , "OS (Minor Version)" : osInfo.minor
        , "Browser (Major Version)" : browserInfo.major
        , "Browser (Minor Version)" : browserInfo.minor
        , "Screen Resolution": window.screen.availWidth + " x " + window.screen.availHeight
    };

    if (queryObject && queryObject.rid) mixPanelReport["Request ID"] = queryObject.rid;

    var $userSocialLoginProvider = document.getElementById("social-login-provider");

    if ($userSocialLoginProvider && $userSocialLoginProvider.attributes.content.value) {
        mixPanelReport.$social_login_provider = $userSocialLoginProvider.attributes.content.value;
    }

    sJTracker.register(mixPanelReport);
    mixPanelReport["Last Visit Date"] = (new Date()).getTime();
    sJTracker.registerUserInfo(mixPanelReport);
    sJTracker.increment("Total Visits");

    // Set default mixpanel properties if this is an existing user
    (function() {
        if (document.getElementById("user-info-dob")) {
            var   birthday = document.getElementById("user-info-dob").content.split("-")
                , userInfo = {
                      "$first_name" : document.getElementById("user-info-fname").content
                    , "$last_name" : document.getElementById("user-info-lname").content
                    , "$email" : document.getElementById("user-info-email").content
                    , "Name_First" : document.getElementById("user-info-fname").content
                    , "Name_Last" : document.getElementById("user-info-lname").content
                    , "Gender" : document.getElementById("user-info-gender").content
                    , "DOB Month" : birthday[0]
                    , "DOB Day" : birthday[1]
                    , "DOB Year" : birthday[2]
                    , "Ethnicity" : document.getElementById("user-info-ethnicity").content
                    , "Country" : document.getElementById("user-info-country").content
                  };

            sJTracker.userNameTag(document.getElementById("user-info-email").content);
            sJTracker.registerUserInfo(userInfo);
            sJTracker.register(userInfo);
        }
    })();

    runSJTasks = function () {
        var errors = "None";

        if ($(".error").length) {
            errors = $(".error").html();

            if (errors) errors = errors.replace(/  /g,"").replace(/<br>/g,"");
        }

        if (typeof mixPanelCurrentPage === "undefined") {
            var pageTitle = document.getElementsByTagName("title")[0];

            if (pageTitle) {
                pageTitle = document.getElementsByTagName("title")[0].innerHTML.trim().replace(" - Survey Junkie","");
            } else {
                pageTitle = "Not Available";
            }

            sJTracker.track("Landed on",{
                  "Page Name" : pageTitle
                , "Page URL" : location.pathname
                , "Page Errors" : errors
            });
        } else {
            if (typeof mixPanelCurrentPage === "object") {
                mixPanelCurrentPage["Page URL"] = location.pathname;
                mixPanelCurrentPage["Page Errors"] = errors;
                sJTracker.track("Landed on",mixPanelCurrentPage);
            } else {
                sJTracker.track("Landed on",{
                      "Page Name" : mixPanelCurrentPage
                    , "Page URL" : location.pathname
                    , "Page Errors" : errors
                });
            }
        }
    };
})();

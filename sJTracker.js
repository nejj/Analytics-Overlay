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
// sJTracker.register           // Add attributes to all proceding tracking events
// sJTracker.increment          // Increment numerical attribute

var   sJTracker = {}
    , runSJTasks = function() {};

sJTracker.registerEvent = (function() {

  /**
   * @param {Object} $element
   * @param {string} type
   * @param {function(...[*])} handler
   * @param {boolean=} oldSchool
   */
  var registerEvent = function($element, type, handler, oldSchool) {
    if (!$element) return;

    if ($element.addEventListener && !oldSchool) {
      $element.addEventListener(type, handler, false);
    } else {
      var ontype = 'on' + type;
      var oldHandler = $element[ontype]; // can be undefined
      $element[ontype] = makeHandler($element, handler, oldHandler);
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
   * @param {Object} $element
   * @param {function(...[*])} newHandler
   * @param {function(...[*])} oldHandlers
   */
  function makeHandler($element, newHandler, oldHandlers) {
    var handler = function(event) {
        event = event || fixEvent(window.event);

      // this basically happens in firefox whenever another script
      // overwrites the onload callback and doesn't pass the event
      // object to previously defined callbacks.  All the browsers
      // that don't define window.event implement addEventListener
      // so the dom_loaded handler will still be fired as usual.
      if (!event) return undefined;

      var   ret = true
          , oldResult, newResult;

      if (isFunction(oldHandlers)) oldResult = oldHandlers(event);

      newResult = newHandler.call($element, event);

      if ((false === oldResult) || (false === newResult)) ret = false;

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
 * @param {String} $element
 */
sJTracker.getDomQuery = (function() {
  /* document.getElementsBySelector(selector)
    - returns an array of element objects from the current document
    matching the CSS selector. Selectors can contain element names,
    class names and ids and can be nested. For example:

    $elements = document.getElementsBySelector('div#main p a.external')

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
        , token, currentContext = new Array(document);

    for (var i = 0; i < tokens.length; i++) {
      token = tokens[i].replace(/^\s+/, '').replace(/\s+$/, '');
      if (token.indexOf('#') > -1) {
        // Token is an ID selector
        var   bits = token.split('#')
            , tagName = bits[0]
            , id = bits[1]
            , $element = document.getElementById(id);

        if (!$element || (tagName && $element.nodeName.toLowerCase() != tagName)) {
          // element not found or tag with that ID not found, return false
          return [];
        }

        // Set currentContext to contain just this element
        currentContext = new Array($element);
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
          var $elements;

          if (tagName == '*') {
            $elements = getAllChildren(currentContext[h]);
          } else {
            $elements = currentContext[h].getElementsByTagName(tagName);
          }
          for (var j = 0; j < $elements.length; j++) {
            found[foundCount++] = $elements[j];
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
        var tagName = token.replace(/[\[\]\'\"\=]/g, "").replace(/^name/, "");

        // Get elements matching name
        var   found = []
            , foundCount = 0;

        for (var h = 0; h < currentContext.length; h++) {
          var $elements;

          if (tagName == '*') {
            $elements = getAllChildren(currentContext[h]);
          } else {
            $elements = currentContext[h].getElementsByName(tagName);
          }
          for (var j = 0; j < $elements.length; j++) {
            found[foundCount++] = $elements[j];
          }
        }
        currentContext = found;
        continue;
      }

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
          var $elements;

          if (tagName == '*') {
            $elements = getAllChildren(currentContext[h]);
          } else {
            $elements = currentContext[h].getElementsByTagName(tagName);
          }
          for (var j = 0; j < $elements.length; j++) {
            found[foundCount++] = $elements[j];
          }
        }
        currentContext = new Array;
        var   currentContextIndex = 0
            , checkFunction; // This function will be used to filter the elements

        switch (attrOperator) {
          case '=': // Equality
            checkFunction = function(e) {
              return (e.getAttribute(attrName) == attrValue);
            };
            break;
          case '~': // Match one of space seperated words
            checkFunction = function(e) {
              return (e.getAttribute(attrName).match(new RegExp('\\b' + attrValue + '\\b')));
            };
            break;
          case '|': // Match start with value followed by optional hyphen
            checkFunction = function(e) {
              return (e.getAttribute(attrName).match(new RegExp('^' + attrValue + '-?')));
            };
            break;
          case '^': // Match starts with value
            checkFunction = function(e) {
              return (e.getAttribute(attrName).indexOf(attrValue) == 0);
            };
            break;
          case '$': // Match ends with value - fails with "Warning" in Opera 7
            checkFunction = function(e) {
              return (e.getAttribute(attrName).lastIndexOf(attrValue) == e.getAttribute(attrName).length - attrValue.length);
            };
            break;
          case '*': // Match ends with value
            checkFunction = function(e) {
              return (e.getAttribute(attrName).indexOf(attrValue) > -1);
            };
            break;
          default:
            // Just test for existence of attribute
            checkFunction = function(e) {
              return e.getAttribute(attrName);
            };
        }
        currentContext = [];
        currentContextIndex = 0;

        for (var k = 0; k < found.length; k++) {
          if (checkFunction(found[k])) currentContext[currentContextIndex++] = found[k];
        }
        // alert('Attribute Selector: '+tagName+' '+attrName+' '+attrOperator+' '+attrValue);
        continue; // Skip to next token
      }
      // If we get here, token is JUST an element (not a class or ID selector)
      tagName = token;

      var   found = new Array
          , foundCount = 0;

      for (var h = 0; h < currentContext.length; h++) {
        var $elements = currentContext[h].getElementsByTagName(tagName);

        for (var j = 0; j < $elements.length; j++) {
          found[foundCount++] = $elements[j];
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
 * @param {String} $element
 * @param {String} trackingNote
 * @param {Object} trackingObject
 */
sJTracker.trackInput = function($element, trackingNote, trackingObject) {
  $($element).on("change", function() {
    if (!this.attributes["data-track"]) {
      var tmpObject = !trackingObject ? {} : trackingObject;

      if (this.attributes.name.value.indexOf("password") === -1) {
        var   superObject = {}
            , superProperty = this.name;

        superObject[superProperty] = this.value;
        sJTracker.register(superObject);
      }

      sJTracker.track(trackingNote, tmpObject);
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
 * @param {String} name
 * @param {Object} data
 * @param {function(...[*])} callback
 */
sJTracker.track = function(name, data, callback) {
  mixpanel.track(name, data, callback);

  if (data) sJTracker.registerUserInfo(data);
};

/**
 * @param {String} $element
 * @param {String} trackingNote
 * @param {Object} data
 */
sJTracker.trackLinks = function($element, trackingNote, data) {
  mixpanel.track_links($element, trackingNote, data);

  if (data) sJTracker.registerUserInfo(data);
};

/**
 * @param {String} $element
 * @param {String} trackingNote
 * @param {Object} data
 */
sJTracker.trackClicks = function($element, trackingNote, data) {
  $($element).on("click", function() {
    mixpanel.track(trackingNote, data);

    if (data) sJTracker.registerUserInfo(data);
  });
};



/**
 * @param {String} $element
 * @param {String} trackingNote
 * @param {Object} data
 */
sJTracker.trackForms = function($element, trackingNote, data) {
  if (data) {
    mixpanel.track_forms($element, trackingNote, data);
    sJTracker.registerUserInfo(data);
  } else {
    mixpanel.track_forms($element, trackingNote);
  }
};

/**
 * @param {Object} data
 * @param {boolean=} noParse
 */
sJTracker.registerUserInfo = function(data, noParse) {
  var   newObject = {}
      , intValue;

  for (var key in data) {
    if (noParse || key === "addr_zip") {
      intValue = data[key];
    } else {
      intValue = parseInt(data[key]);
    }

    newObject["$" + key.replace("$", "")] = isNaN(intValue) ? data[key] : intValue;
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

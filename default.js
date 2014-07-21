// Run Default Tracking Events
(function() {
  var browserInfo = function() {
    var   nAgt = navigator.userAgent
        , browserName = navigator.appName
        , fullVersion = '' + parseFloat(navigator.appVersion)
        , majorVersion = parseInt(navigator.appVersion, 10)
        , nameOffset, verOffset, ix;

    // In Opera, the true version is after "Opera" or after "Version"
    if ((verOffset = nAgt.indexOf("Opera")) != -1) {
      browserName = "Opera";
      fullVersion = nAgt.substring(verOffset + 6);

      if ((verOffset = nAgt.indexOf("Version")) != -1) fullVersion = nAgt.substring(verOffset + 8);
    }
    // In MSIE, the true version is after "MSIE" in userAgent
    else if ((verOffset = nAgt.indexOf("MSIE")) != -1) {
      browserName = "Microsoft Internet Explorer";
      fullVersion = nAgt.substring(verOffset + 5);
    }
    // In Chrome, the true version is after "Chrome"
    else if ((verOffset = nAgt.indexOf("Chrome")) != -1) {
      browserName = "Chrome";
      fullVersion = nAgt.substring(verOffset + 7);
    }
    // In Safari, the true version is after "Safari" or after "Version"
    else if ((verOffset = nAgt.indexOf("Safari")) != -1) {
      browserName = "Safari";
      fullVersion = nAgt.substring(verOffset + 7);

      if ((verOffset = nAgt.indexOf("Version")) != -1) fullVersion = nAgt.substring(verOffset + 8);
    }
    // In Firefox, the true version is after "Firefox"
    else if ((verOffset = nAgt.indexOf("Firefox")) != -1) {
      browserName = "Firefox";
      fullVersion = nAgt.substring(verOffset + 8);
    }
    // In most other browsers, "name/version" is at the end of userAgent
    else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) < (verOffset = nAgt.lastIndexOf('/'))) {
      browserName = nAgt.substring(nameOffset, verOffset);
      fullVersion = nAgt.substring(verOffset + 1);

      if (browserName.toLowerCase() == browserName.toUpperCase()) browserName = navigator.appName;
    }

    // trim the fullVersion string at semicolon/space if present
    if ((ix = fullVersion.indexOf(";")) != -1) fullVersion = fullVersion.substring(0, ix);
    if ((ix = fullVersion.indexOf(" ")) != -1) fullVersion = fullVersion.substring(0, ix);

    majorVersion = parseInt('' + fullVersion, 10);

    if (isNaN(majorVersion)) {
      fullVersion = '' + parseFloat(navigator.appVersion);
      majorVersion = parseInt(navigator.appVersion, 10);
    }

    majorVersion = majorVersion ? majorVersion.toString() : majorVersion;
    fullVersion = fullVersion ? fullVersion.toString() : fullVersion;

    return {
        major: majorVersion
      , minor: fullVersion
    };
  }();

  var osInfo = function() {
    var desktop = function() {
      //OS DETECTION...
      var   OSName = false
          , appV = navigator.appVersion
          , uA = navigator.userAgent;

      //The below few line of code will find the OS name
      if (appV.indexOf("Win") != -1) OSName = "Windows";
      if (appV.indexOf("Mac") != -1) OSName = "MacOS";
      if (appV.indexOf("X11") != -1) OSName = "UNIX";
      if (appV.indexOf("Linux") != -1) OSName = "Linux";

      var OSVer = false;

      if (uA.indexOf("Mac OS X 10.4") != -1) OSVer = "Tiger";
      if (uA.indexOf("Mac OS X 10.5") != -1) OSVer = "Leopard";
      if (uA.indexOf("Mac OS X 10.6") != -1) OSVer = "Snow Leopard";
      if (appV.indexOf("NT 5.1") != -1) OSVer = "XP";
      if (appV.indexOf("NT 6.0") != -1) OSVer = "Vista";
      if (appV.indexOf("NT 6.1") != -1) OSVer = "7";
      if (appV.indexOf("NT 6.2") != -1) OSVer = "8";
      if (appV.indexOf("NT 6.3") != -1) OSVer = "8.1";

      if (OSName && OSVer) {
        return {
            major: OSName
          , minor: OSVer
        };
      } else {
        return false;
      }
    }();

    var android = function() {
      var   ua = ua || navigator.userAgent
          , match = ua.match(/Android\s([0-9\.]*)/);

      if (match && match[1]) {
        return {
            major: parseInt(match[1], 10)
          , minor: parseFloat(match[1])
        };
      } else {
        return false;
      }
    }();

    var ios = function() {
      if (/iP(hone|od|ad)/.test(navigator.platform)) {
        // supports iOS 2.0 and later: <http://bit.ly/TJjs1V>
        var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);

        return {
            major: (parseInt(v[1], 10)).toString()
          , minor: (parseInt(v[1], 10)).toString() + "." + (parseInt(v[2] || 0, 10)).toString()
        };
      } else {
        return false;
      }
    }();

    var output = {
          major: "Unknown"
        , minor: "Unkown"
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
      "IP": $userIPMeta.attributes.content.value
    });
  }

  // IE7 and below don't support forEach
  if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(fn, scope) {
      for (var i = 0, len = this.length; i < len; ++i) {
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
    var   result = {}
        , keyValuePairs = location.search.slice(1).split('&');

    keyValuePairs.forEach(function(keyValuePair) {
      keyValuePair = keyValuePair.split('=');
      result[keyValuePair[0]] = keyValuePair[1] || '';
    });

    return result;
  })();

  var mixPanelReport = {
        "User Agent": navigator.userAgent
      , "Language": navigator.language
      , "OS (Major Version)": osInfo.major
      , "OS (Minor Version)": osInfo.minor
      , "Browser (Major Version)": browserInfo.major
      , "Browser (Minor Version)": browserInfo.minor
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
      var birthday = document.getElementById("user-info-dob").content.split("-"),
        userInfo = {
            "$first_name": document.getElementById("user-info-fname").content
          , "$last_name": document.getElementById("user-info-lname").content
          , "$email": document.getElementById("user-info-email").content
          , "Name_First": document.getElementById("user-info-fname").content
          , "Name_Last": document.getElementById("user-info-lname").content
          , "Gender": document.getElementById("user-info-gender").content
          , "DOB Month": birthday[0]
          , "DOB Day": birthday[1]
          , "DOB Year": birthday[2]
          , "Ethnicity": document.getElementById("user-info-ethnicity").content
          , "Country": document.getElementById("user-info-country").content
        };

      sJTracker.userNameTag(document.getElementById("user-info-email").content);
      sJTracker.registerUserInfo(userInfo);
      sJTracker.register(userInfo);
    }
  })();

  runSJTasks = function() {
    var errors = "None";

    if ($(".error").length) {
      errors = $(".error").html();

      if (errors) errors = errors.replace(/  /g, "").replace(/<br>/g, "");
    }

    if (typeof mixPanelCurrentPage === "undefined") {
      var pageTitle = document.getElementsByTagName("title")[0];

      if (pageTitle) {
        pageTitle = document.getElementsByTagName("title")[0].innerHTML.trim().replace(" - Survey Junkie", "");
      } else {
        pageTitle = "Not Available";
      }

      sJTracker.track("Landed on", {
          "Page Name": pageTitle
        , "Page URL": location.pathname
        , "Page Errors": errors
      });
    } else {
      if (typeof mixPanelCurrentPage === "object") {
        mixPanelCurrentPage["Page URL"] = location.pathname;
        mixPanelCurrentPage["Page Errors"] = errors;
        sJTracker.track("Landed on", mixPanelCurrentPage);
      } else {
        sJTracker.track("Landed on", {
            "Page Name": mixPanelCurrentPage
          , "Page URL": location.pathname
          , "Page Errors": errors
        });
      }
    }
  };
})();

(function() {
  'use strict';

  var userAgent = navigator.userAgent || '';
  var lowerUserAgent = userAgent.toLowerCase();
  var currentUrl = window.location.href;
  var currentProtocol = window.location.protocol;

  if (!/iphone|ipad|ipod|android|mobile/i.test(userAgent)) {
    return;
  }

  if (!/^https?:$/i.test(currentProtocol)) {
    return;
  }

  var isKakaoTalk = /kakaotalk/i.test(userAgent);
  var isLine = /line\//i.test(userAgent);
  var isNaverInApp = /naver\(inapp;|naver\(higgs;/i.test(userAgent);
  var isOtherInApp = /fb_iab\/fb4a|fban\/fbios|instagram|daumdevice\/mobile|daumapps|everytimeapp|snapchat|trill|kakaostory|band|twitter|aliapp|wadiz|zumapp|whale/i.test(userAgent);

  if (!isKakaoTalk && !isLine && !isNaverInApp && !isOtherInApp) {
    return;
  }

  function navigate(url) {
    window.location.href = url;
  }

  function appendLineExternalBrowserParam(url) {
    try {
      var parsedUrl = new URL(url);

      if (parsedUrl.searchParams.get('openExternalBrowser') === '1') {
        return null;
      }

      parsedUrl.searchParams.set('openExternalBrowser', '1');
      return parsedUrl.toString();
    } catch (error) {
      if (/[?&]openExternalBrowser=1(?:&|$)/.test(url)) {
        return null;
      }

      return url + (url.indexOf('?') === -1 ? '?' : '&') + 'openExternalBrowser=1';
    }
  }

  function buildAndroidIntentUrl(url) {
    var scheme = currentProtocol.replace(':', '') || 'https';
    var intentTarget = url
      .replace(/^https?:\/\//i, '')
      .replace(/#/g, '%23');

    return 'intent://' + intentTarget + '#Intent;scheme=' + scheme + ';package=com.android.chrome;end';
  }

  function toChromeSchemeUrl(url) {
    if (/^https:/i.test(url)) {
      return url.replace(/^https:/i, 'googlechromes:');
    }

    if (/^http:/i.test(url)) {
      return url.replace(/^http:/i, 'googlechrome:');
    }

    return null;
  }

  function toSafariSchemeUrl(url) {
    if (/^https:/i.test(url)) {
      return url.replace(/^https:/i, 'x-safari-https:');
    }

    return null;
  }

  if (isKakaoTalk) {
    navigate('kakaotalk://web/openExternal?url=' + encodeURIComponent(currentUrl));
    return;
  }

  if (isLine) {
    var lineExternalUrl = appendLineExternalBrowserParam(currentUrl);

    if (lineExternalUrl) {
      navigate(lineExternalUrl);
    }

    return;
  }

  if (/android/i.test(lowerUserAgent)) {
    navigate(buildAndroidIntentUrl(currentUrl));
    return;
  }

  if (/iphone|ipad|ipod/i.test(lowerUserAgent) && currentProtocol === 'https:') {
    var chromeSchemeUrl = toChromeSchemeUrl(currentUrl);
    var safariSchemeUrl = toSafariSchemeUrl(currentUrl);

    if (chromeSchemeUrl) {
      navigate(chromeSchemeUrl);
    }

    if (safariSchemeUrl) {
      window.setTimeout(function() {
        navigate(safariSchemeUrl);
      }, 100);
    }
  }
})();

/**
 * Captures /users/login/ JSON from the Glance web login page and posts it
 * back to React Native. Does not alter the request body or recaptcha fields.
 */
export const WEB_LOGIN_CAPTURE_HOOK = `
(() => {
  if (window.__glanceMobileHookInstalled) {
    return;
  }
  window.__glanceMobileHookInstalled = true;
  window.__glanceMobileLoginPayload = null;

  const isLoginUrl = (url) => {
    if (!url) {
      return false;
    }
    try {
      const parsed = new URL(String(url), window.location.href);
      return parsed.pathname.indexOf('/users/login') !== -1;
    } catch (_err) {
      return String(url).indexOf('/users/login') !== -1;
    }
  };

  const postToApp = (data) => {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'login', data: data }));
      }
    } catch (_err) {}
  };

  const captureLoginResponse = (url, bodyText) => {
    if (!isLoginUrl(url)) {
      return;
    }
    try {
      const data = JSON.parse(bodyText);
      if (data && data.access) {
        window.__glanceMobileLoginPayload = data;
        postToApp(data);
      }
    } catch (_err) {}
  };

  const originalFetch = window.fetch;
  window.fetch = async function glanceMobileFetch(input, init) {
    const response = await originalFetch.call(this, input, init);
    try {
      const url = typeof input === 'string' ? input : input && input.url ? input.url : '';
      if (isLoginUrl(url)) {
        const clone = response.clone();
        clone.text().then(function (text) { captureLoginResponse(url, text); }).catch(function () {});
      }
    } catch (_err) {}
    return response;
  };

  const xhrProto = XMLHttpRequest.prototype;
  const originalOpen = xhrProto.open;
  const originalSend = xhrProto.send;
  xhrProto.open = function glanceMobileXhrOpen(method, url) {
    this.__glanceMobileLoginUrl = url;
    return originalOpen.apply(this, arguments);
  };
  xhrProto.send = function glanceMobileXhrSend(body) {
    const loginRequest = isLoginUrl(this.__glanceMobileLoginUrl);
    if (loginRequest) {
      this.addEventListener('load', function onLoginLoad() {
        captureLoginResponse(this.__glanceMobileLoginUrl, this.responseText);
      }, { once: true });
    }
    return originalSend.call(this, body);
  };
})();
true;
`;

export const READ_CAPTURED_LOGIN_JS = `
(function () {
  try {
    var payload = window.__glanceMobileLoginPayload || null;
    if (payload && payload.access && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'login', data: payload }));
    }
  } catch (_err) {}
  true;
})();
true;
`;

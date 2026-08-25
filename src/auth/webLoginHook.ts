/**
 * Same fetch/XHR hook as glance-connector/src/webAuthLogin.js.
 * Tags login with client_type=connector (backend recaptcha bypass used by the desktop agent)
 * and posts the /users/login/ JSON back to React Native.
 */
export const WEB_LOGIN_CAPTURE_HOOK = `
(() => {
  if (window.__glanceMobileHookInstalled) {
    return;
  }
  window.__glanceMobileHookInstalled = true;
  window.__glanceConnectorLoginPayload = null;

  const CONNECTOR_CLIENT_VALUE = 'connector';

  const isLoginUrl = (url) => Boolean(url && String(url).includes('/users/login'));

  const postToApp = (data) => {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'login', data: data }));
      }
    } catch (_err) {}
  };

  const tagConnectorLoginBody = (body) => {
    if (typeof body !== 'string' || !body.trim()) {
      return body;
    }
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        parsed.client_type = CONNECTOR_CLIENT_VALUE;
        return JSON.stringify(parsed);
      }
    } catch (_err) {}
    return body;
  };

  const captureLoginResponse = (url, bodyText) => {
    if (!isLoginUrl(url)) {
      return;
    }
    try {
      const data = JSON.parse(bodyText);
      if (data && data.access) {
        window.__glanceConnectorLoginPayload = data;
        postToApp(data);
      }
    } catch (_err) {}
  };

  const originalFetch = window.fetch;
  window.fetch = async function glanceMobileFetch(input, init) {
    let nextInit = init;
    try {
      const url = typeof input === 'string' ? input : input && input.url ? input.url : '';
      if (isLoginUrl(url)) {
        let body = init && init.body;
        if (typeof body === 'string') {
          body = tagConnectorLoginBody(body);
          nextInit = Object.assign({}, init || {}, { body: body });
        }
      }
    } catch (_err) {}

    const response = await originalFetch.call(this, input, nextInit);
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
    this.__glanceConnectorUrl = url;
    return originalOpen.apply(this, arguments);
  };
  xhrProto.send = function glanceMobileXhrSend(body) {
    let nextBody = body;
    const loginRequest = isLoginUrl(this.__glanceConnectorUrl);
    try {
      if (loginRequest && typeof nextBody === 'string') {
        nextBody = tagConnectorLoginBody(nextBody);
      }
    } catch (_err) {}
    if (loginRequest) {
      this.addEventListener('load', function onLoginLoad() {
        captureLoginResponse(this.__glanceConnectorUrl, this.responseText);
      }, { once: true });
    }
    return originalSend.call(this, nextBody);
  };
})();
true;
`;

export const READ_CAPTURED_LOGIN_JS = `
(function () {
  try {
    var payload = window.__glanceConnectorLoginPayload || null;
    if (payload && payload.access && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'login', data: payload }));
    }
  } catch (_err) {}
  true;
})();
true;
`;

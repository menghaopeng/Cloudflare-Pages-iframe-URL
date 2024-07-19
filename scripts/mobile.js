// /scripts/mobile.js
"use strict";

import { getMsg, translate } from './i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const messages = await getMsg();
    translate(messages);

    // 检测桌面端 UA 并重定向到 index.html
    function isDesktopDevice() {
      return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
    }

    if (isDesktopDevice()) {
      window.location.href = 'index.html';
    }

    // 获取 IP 地址
    async function getClientIP() {
      const currentDomain = window.location.hostname;
      try {
        const response = await fetch(`https://${currentDomain}/api/IP`);
        const data = await response.json();
        return data.IP.IP; // 直接返回 IP 地址
      } catch (error) {
        console.error(translate('error_fetching_ip_address', { error: error.message }));
        return null;
      }
    }

    // 获取 Turnstile 状态
    fetch('/api/Turnstile', {
      headers: {
        'Accept': 'application/json;charset=UTF-8'
      }
    })
      .then(response => response.json())
      .then(env => {
        if (env.TURNSTILE_ENABLED === 'true') {
          const turnstileToken = localStorage.getItem('turnstileToken');
          const turnstileUUID = localStorage.getItem('turnstileUUID');
          if (turnstileToken && turnstileUUID) {
            getClientIP().then(ip => {
              verifyToken(turnstileToken, turnstileUUID, ip).then(isValid => {
                if (isValid) {
                  showIframe(turnstileToken, turnstileUUID, ip);
                } else {
                  window.location.href = 'turnstile.html';
                }
              });
            });
          } else {
            window.location.href = 'turnstile.html';
          }
        } else {
          showIframe();
        }
      })
      .catch(error => console.error(translate('error_fetching_turnstile_status', { error: error.message })));

    // 显示 iframe 内容
    function showIframe(token, uuid, ip) {
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json;charset=UTF-8'
        },
        body: JSON.stringify({ token, uuid, ip })
      };

      Promise.all([
        fetch('/api/iframe-urls', fetchOptions),
        fetch('/api/favicons', fetchOptions)
      ])
        .then(responses => Promise.all(responses.map(response => response.json())))
        .then(data => {
          const urls = data[0].urls;
          const favUrls = data[1].faviconUrls;

          const select = document.getElementById('siteSelection');
          const iframe = document.getElementById('dynamic-iframe');
          const favicon = document.getElementById('dynamic-favicon');
          const faviconMap = {};

          if (Array.isArray(favUrls)) {
            favUrls.forEach(favUrl => {
              if (typeof favUrl === 'object' && favUrl.hasOwnProperty('service') && favUrl.hasOwnProperty('base64') && favUrl.hasOwnProperty('contentType')) {
                faviconMap[favUrl.service] = { base64: favUrl.base64, contentType: favUrl.contentType };
              } else {
                console.error(translate('invalid_favurl', { favUrl: JSON.stringify(favUrl) }));
              }
            });
          } else {
            console.error(translate('invalid_favurls_format', { favUrls: JSON.stringify(favUrls) }));
          }

          if (Array.isArray(urls)) {
            urls.forEach(urlObj => {
              if (typeof urlObj === 'object' && urlObj.hasOwnProperty('url') && urlObj.hasOwnProperty('service')) {
                const iframeUrl = urlObj.url;
                const service = urlObj.service;
                const faviconData = faviconMap[service] || { base64: '/favicon.svg', contentType: 'image/svg+xml' };
                const option = document.createElement('option');
                option.value = iframeUrl;
                option.textContent = service;
                select.appendChild(option);
              } else {
                console.error(translate('invalid_urlobj', { urlObj: JSON.stringify(urlObj) }));
              }
            });
          } else {
            console.error(translate('invalid_urls_format', { urls: JSON.stringify(urls) }));
          }

          select.addEventListener('change', function () {
            const selectedUrl = select.value;
            const selectedOption = select.options[select.selectedIndex].textContent;
            if (selectedUrl) {
              iframe.src = selectedUrl;
              sessionStorage.setItem('selectedSite', selectedUrl);
              setTitle(selectedOption);
              setFavicon(selectedOption, faviconMap);
              select.classList.add('selected');
            }
          });

          const lastSelectedSite = sessionStorage.getItem('selectedSite');
          if (lastSelectedSite) {
            iframe.src = lastSelectedSite;
            select.value = lastSelectedSite;
            const lastSelectedOption = select.options[select.selectedIndex].textContent;
            setTitle(lastSelectedOption);
            setFavicon(lastSelectedOption, faviconMap);
          }

          const selectContainer = document.getElementById('selectContainer');
          selectContainer.addEventListener('touchstart', function (e) {
            const startY = e.touches[0].clientY;
            selectContainer.addEventListener('touchmove', function (e) {
              const moveY = e.touches[0].clientY;
              if (moveY - startY > 50) {
                selectContainer.style.top = '50%';
                selectContainer.style.left = '50%';
                selectContainer.style.transform = 'translate(-50%, -50%)';
                setTimeout(() => {
                  selectContainer.style.top = '20px';
                  selectContainer.style.left = '20px';
                  selectContainer.style.transform = 'translate(0)';
                }, 5000);
              }
            });
          });

          select.addEventListener('click', function () {
            select.classList.remove('selected');
            setTimeout(() => {
              select.classList.add('selected');
            }, 5000);
          });
        })
        .catch(error => console.error(translate('error_fetching_iframe_or_favicon_url', { error: error.message })));
    }

    // 设置页面标题
    function setTitle(title) {
      document.title = title || '主内容';
    }

    // 设置 favicon
    function setFavicon(selectedOption, faviconMap) {
      const favicon = document.getElementById('dynamic-favicon');
      const faviconData = faviconMap[selectedOption] || { base64: '/favicon.svg', contentType: 'image/svg+xml' };
      favicon.href = `data:${faviconData.contentType};base64,${faviconData.base64}`;
    }

    // 验证 Turnstile 令牌
    async function verifyToken(token, uuid, ip) {
      const response = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json;charset=UTF-8'
        },
        body: JSON.stringify({ token, uuid, ip })
      });

      const result = await response.json();
      if (result.LOG_LEVEL) {
        console.log(translate('current_log_level', { logLevel: result.LOG_LEVEL }));
      }
      return result.success;
    }
  } catch (error) {
    console.error('Failed to load i18n messages:', error);
  }
});
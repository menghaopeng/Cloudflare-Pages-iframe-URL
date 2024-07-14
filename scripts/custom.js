// scripts/custom.js

// 检测设备类型
function detectDeviceType() {
  const ua = navigator.userAgent;
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

// 根据设备类型和顺序加载资源
async function loadResources() {
  const deviceType = detectDeviceType();
  const response = await fetch('/custom');
  
  if (!response.ok) {
    console.error('Failed to fetch resources from /custom');
    return;
  }

  const jsonResponse = await response.json();

  // 根据设备类型获取相应的资源
  const resources = {
    mobile: {
      preload: jsonResponse.M_PRELOAD,
      postload: jsonResponse.M_POST_LOAD
    },
    desktop: {
      preload: jsonResponse.PRELOAD,
      postload: jsonResponse.POST_LOAD
    }
  };

  const deviceResources = resources[deviceType] || resources.desktop;

  // 预先加载 CSS 资源
  if (deviceResources.preload.css) {
    const preloadStyle = document.createElement('style');
    preloadStyle.textContent = deviceResources.preload.css;
    document.head.appendChild(preloadStyle);
  }

  // 预先加载 JS 资源
  if (deviceResources.preload.js) {
    const preloadScript = document.createElement('script');
    preloadScript.textContent = deviceResources.preload.js;
    document.head.appendChild(preloadScript);
  }

  // 预先加载其他资源
  if (deviceResources.preload.other) {
    console.log('Preload Other:', deviceResources.preload.other); // 调试输出
    const preloadOther = document.createElement('div');
    preloadOther.textContent = deviceResources.preload.other; // 使用 textContent
    document.head.appendChild(preloadOther);
  }

  // 页面加载完成后加载后加载的资源
  document.addEventListener('DOMContentLoaded', () => {
    // 后加载 CSS 资源
    if (deviceResources.postload.css) {
      const postloadStyle = document.createElement('style');
      postloadStyle.textContent = deviceResources.postload.css;
      document.body.appendChild(postloadStyle);
    }

    // 后加载 JS 资源
    if (deviceResources.postload.js) {
      const postloadScript = document.createElement('script');
      postloadScript.textContent = deviceResources.postload.js;
      document.body.appendChild(postloadScript);
    }

    // 后加载其他资源
    if (deviceResources.postload.other) {
      console.log('Postload Other:', deviceResources.postload.other); // 调试输出
      const postloadOther = document.createElement('div');
      postloadOther.textContent = deviceResources.postload.other; // 使用 textContent
      document.body.appendChild(postloadOther);
    }
  });
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', loadResources);
<script setup lang="ts">
/**
 *    <div v-if="debugInfo" class="p-4 mb-4 bg-blue-50 border border-blue-200 rounded-md">
        <p class="text-blue-600 text-xs font-mono whitespace-pre-wrap">
          {{ debugInfo }}
        </p>
      </div>
 */
import Base62x from '@pluve/base62'
import JsonEditor from 'my-json-editor'
import browser from 'webextension-polyfill'

const activeTab = ref('portal')
const currentUrl = ref<string | undefined>('')
const currentParamObj = reactive<Record<string, string>>({})
const currentOpenxHeader = ref('')
const currentOpenxHeaderObj = ref()

// Portal模式相关
interface PortalTab {
  id: string
  name: string
  iframeUrl: string
}

const portalTabs = ref<PortalTab[]>([])
const isLoadingPortal = ref(false)
const portalError = ref('')
const debugInfo = ref('')
const showToast = ref(false)
const toastMessage = ref('')

function getUrlParams(url: string) {
  const params = new URLSearchParams(url.split('?')[1])
  const result: Record<string, string> = {}

  for (const [key, value] of params.entries()) {
    result[key] = value
  }

  return result
}

browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
  const currentTab = tabs[0]
  currentUrl.value = currentTab.url

  const params = getUrlParams(currentUrl.value as string)
  Object.assign(currentParamObj, params)

  currentOpenxHeader.value = (params as any)._openx_header || ''

  currentOpenxHeaderObj.value = currentOpenxHeader.value
    ? JSON.parse(Base62x.decode(currentOpenxHeader.value))
    : undefined
})

function refreshLocalData() {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const currentTab = tabs[0]
    currentUrl.value = currentTab.url

    const params = getUrlParams(currentUrl.value as string)
    Object.assign(currentParamObj, params)

    currentOpenxHeader.value = (params as any)._openx_header || ''

    currentOpenxHeaderObj.value = currentOpenxHeader.value
      ? JSON.parse(Base62x.decode(currentOpenxHeader.value))
      : undefined

    toastMessage.value = '已刷新当前页面数据'
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)
  })
}

function changeURLArg(url: string, arg: string, arg_val: string) {
  const pattern = `${arg}=([^&]*)`
  const replaceText = `${arg}=${arg_val}`

  if (url.match(pattern)) {
    const tmp = `(${arg}=)([^&]*)`
    return url.replace(new RegExp(tmp, 'gi'), replaceText)
  }
  else {
    if (url.match('[\?]')) {
      return `${url}&${replaceText}`
    }
    else {
      return `${url}?${replaceText}`
    }
  }
}

function handleJsonChange() {
  currentOpenxHeader.value = Base62x.encode(
    JSON.stringify(currentOpenxHeaderObj.value),
  )
  currentUrl.value = changeURLArg(
    currentUrl.value as string,
    '_openx_header',
    currentOpenxHeader.value,
  )
}

function handleSkipNewTab() {
  browser.tabs.create({ url: currentUrl.value as string })
}

function handleReplaceUrl() {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs.length > 0) {
      const currentTab = tabs[0]
      browser.tabs.update(currentTab.id!, { url: currentUrl.value as string })
    }
  })
}

// Portal模式：解析HTML获取tabs
async function loadPortalTabs() {
  isLoadingPortal.value = true
  portalError.value = ''
  portalTabs.value = []

  try {
    const currentTabs = await browser.tabs.query({ active: true, currentWindow: true })
    const currentTab = currentTabs[0]

    if (!currentTab.url?.includes('portal')) {
      portalError.value = '当前页面URL不包含"portal"关键词'
      return
    }

    if (!currentTab.id) {
      portalError.value = '无法获取当前标签页ID'
      return
    }

    // 使用消息传递方式从content script获取HTML
    let html: string
    try {
      // 先尝试向content script发送消息
      const response: any = await browser.tabs.sendMessage(currentTab.id, {
        action: 'getHTML',
      })
      html = response.html
    }
    catch {
      // 如果消息发送失败，说明content script可能还没注入，尝试注入并执行
      try {
        const results = await browser.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: () => document.documentElement.outerHTML,
        })
        html = results[0]?.result as string
      }
      catch {
        throw new Error('无法获取页面内容，请确保扩展有足够的权限')
      }
    }

    if (!html) {
      portalError.value = '无法获取页面HTML'
      return
    }

    debugInfo.value = `HTML长度: ${html.length} 字符`

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // 查找右侧内容区的tab列表（第二个tablist，在.tabContent内）
    const tabContent = doc.querySelector('.tabContent')
    debugInfo.value += `\n找到.tabContent: ${!!tabContent}`

    if (!tabContent) {
      portalError.value = '未找到.tabContent元素，请确保页面已完全加载'
      return
    }

    const tabList = tabContent.querySelector('div[role="tablist"].el-tabs__nav')
    debugInfo.value += `\n找到tabList: ${!!tabList}`

    if (!tabList) {
      portalError.value = '未找到tab列表元素'
      return
    }

    // 解析每个tab
    const tabElements = tabList.querySelectorAll('.el-tabs__item')
    debugInfo.value += `\n找到${tabElements.length}个tab`

    const parsedTabs: PortalTab[] = []

    // 先获取所有iframe
    const allIframes = doc.querySelectorAll('iframe')
    debugInfo.value += `\n找到${allIframes.length}个iframe`

    tabElements.forEach((tabEl) => {
      const id = tabEl.getAttribute('id')?.replace('tab-', '') || ''

      // 跳过home tab
      if (id === 'home') {
        return
      }

      let name = tabEl.textContent?.trim() || '未命名'

      // 移除关闭按钮的文本（如果有）
      const closeIcon = tabEl.querySelector('.el-icon-close')
      if (closeIcon) {
        name = name.replace(closeIcon.textContent || '', '').trim()
      }

      // 查找对应的iframe - 尝试多种方式
      let iframe: HTMLIFrameElement | null = null

      // 方式1: 通过 id="${id}iframe"
      iframe = doc.querySelector(`iframe[id="${id}iframe"]`) as HTMLIFrameElement

      // 方式2: 如果方式1失败，查找包含该id的iframe
      if (!iframe) {
        allIframes.forEach((iframeEl) => {
          const iframeId = iframeEl.getAttribute('id') || ''
          if (iframeId.includes(id)) {
            iframe = iframeEl as HTMLIFrameElement
          }
        })
      }

      // 添加到列表（显示iframe地址或"无iframe"）
      parsedTabs.push({
        id,
        name,
        iframeUrl: iframe?.src || '(无iframe)',
      })
    })

    portalTabs.value = parsedTabs

    debugInfo.value += `\n成功解析${parsedTabs.length}个tab`

    if (parsedTabs.length === 0) {
      portalError.value = '未找到任何tab'
    }
  }
  catch (error: any) {
    portalError.value = `加载失败: ${error?.message || '未知错误'}`
  }
  finally {
    isLoadingPortal.value = false
  }
}

// 当切换到Portal模式时自动加载
watch(activeTab, (newTab) => {
  if (newTab === 'portal') {
    loadPortalTabs()
  }
})

// 组件挂载时自动加载Portal数据
onMounted(() => {
  if (activeTab.value === 'portal') {
    loadPortalTabs()
  }
})

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toastMessage.value = '复制成功！'
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)
  }).catch(() => {
    toastMessage.value = '复制失败'
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)
  })
}

function openInNewTab(url: string) {
  if (url && url !== '(无iframe)') {
    browser.tabs.create({ url })
    toastMessage.value = '已在新标签页打开'
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)
  }
  else {
    toastMessage.value = '无效的URL'
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
    }, 2000)
  }
}
</script>

<template>
  <main class="w-full text-center">
    <!-- Tab切换 -->
    <div class="flex border-b border-gray-300">
      <button
        class="px-6 py-3 font-medium transition-colors"
        :class="activeTab === 'portal' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'"
        @click="activeTab = 'portal'"
      >
        Portal模式
      </button>
      <button
        class="px-6 py-3 font-medium transition-colors"
        :class="activeTab === 'local' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'"
        @click="activeTab = 'local'"
      >
        Local模式
      </button>
    </div>

    <!-- Portal模式内容 -->
    <div v-show="activeTab === 'portal'" class="p-4">
      <div class="mb-4 flex justify-between items-center">
        <h2 class="text-lg font-semibold text-gray-800">
          Portal页面Tab列表
        </h2>
        <button
          class="btn"
          :disabled="isLoadingPortal"
          @click="loadPortalTabs"
        >
          {{ isLoadingPortal ? '加载中...' : '刷新' }}
        </button>
      </div>

      <div v-if="portalError" class="p-4 mb-4 bg-red-50 border border-red-200 rounded-md">
        <p class="text-red-600 text-sm font-medium">
          {{ portalError }}
        </p>
      </div>

      <div v-if="portalTabs.length > 0" class="space-y-4">
        <div
          v-for="(tab, index) in portalTabs"
          :key="tab.id"
          class="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
        >
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                #{{ index + 1 }}
              </span>
              <h3 class="text-base font-medium text-gray-900">
                {{ tab.name }}
              </h3>
            </div>
            <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              ID: {{ tab.id }}
            </span>
          </div>
          <div class="mt-2">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-sm font-medium text-gray-600">iframe地址:</span>
              <button
                class="text-xs text-blue-600 hover:text-blue-800"
                @click="copyToClipboard(tab.iframeUrl)"
              >
                复制
              </button>
              <button
                class="text-xs text-green-600 hover:text-green-800"
                @click="openInNewTab(tab.iframeUrl)"
              >
                跳转
              </button>
            </div>
            <div class="p-2 bg-gray-50 rounded text-xs text-left break-all font-mono text-gray-700">
              {{ tab.iframeUrl }}
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="!isLoadingPortal && !portalError" class="p-8 text-gray-500">
        点击"刷新"按钮加载Portal页面的Tab信息
      </div>
    </div>

    <!-- Local模式内容 -->
    <div v-show="activeTab === 'local'" class="p-4">
      <div class="mb-4 flex justify-between items-center">
        <h2 class="text-lg font-semibold text-gray-800">
          URL参数编辑
        </h2>
        <button
          class="btn"
          @click="refreshLocalData"
        >
          刷新
        </button>
      </div>

      <textarea
        v-model="currentUrl"
        class="w-full h-36 resize-none p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500"
      />
      <textarea
        v-model="currentOpenxHeader"
        class="w-full h-24 resize-none p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500"
      />
      <JsonEditor
        v-model="currentOpenxHeaderObj"
        style="height: 700px"
        @change="handleJsonChange"
      />
      <div class="flex justify-center gap-4">
        <button class="btn mt-2" @click="handleReplaceUrl">
          刷新当前url
        </button>
        <button class="btn mt-2" @click="handleSkipNewTab">
          用新url跳转新TAB
        </button>
      </div>
    </div>

    <!-- Toast提示 -->
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="showToast"
        class="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50"
      >
        {{ toastMessage }}
      </div>
    </transition>
  </main>
</template>

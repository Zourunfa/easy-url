<script setup lang="ts">
import { storageDemo } from '~/logic/storage'
import Base62x from '@pluve/base62'
import JsonEditor from 'vue3-ts-jsoneditor'

const currentUrl = ref<string | undefined>('')
const currentParamObj = reactive<Record<string, string>>({})
const currentOpenxHeader = ref('')
const currentOpenxHeaderObj = ref()

function getUrlParams(url: string) {
  const params = new URLSearchParams(url.split('?')[1])
  const result: Record<string, string> = {}

  for (const [key, value] of params.entries()) {
    result[key] = value
  }

  return result
}

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const currentTab = tabs[0]
  currentUrl.value = currentTab.url

  currentParamObj.value = getUrlParams(currentUrl.value as string)

  currentOpenxHeader.value = currentParamObj.value._openx_header || ''

  currentOpenxHeaderObj.value = currentOpenxHeader.value ? JSON.parse(Base62x.decode(currentOpenxHeader.value)) : undefined
})

const queryLanguages = ref(['javascript', 'lodash', 'jmespath'])

const changeURLArg = (url: string, arg: string, arg_val: string) => {
  var pattern = arg + '=([^&]*)'
  var replaceText = arg + '=' + arg_val

  if (url.match(pattern)) {
    var tmp = '(' + arg + '=)([^&]*)'
    return url.replace(new RegExp(tmp, 'gi'), replaceText)
  } else {
    alert(2)
    if (url.match('[\?]')) {
      return url + '&' + replaceText
    } else {
      return url + '?' + replaceText
    }
  }
}
const handleJsonChange = content => {
  currentOpenxHeader.value = Base62x.encode(JSON.stringify(currentOpenxHeaderObj.value))
  currentUrl.value = changeURLArg(currentUrl.value as string, '_openx_header', currentOpenxHeader.value)
}
const handleSkipNewTab = () => {
  chrome.tabs.create({ url: currentUrl.value })
}
const handleReplaceUrl = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs.length > 0) {
      const currentTab = tabs[0]
      chrome.tabs.update(currentTab.id, { url: currentUrl.value })
    }
  })
}
</script>
<template>
  <main class="w-full text-center">
    <div class="text-center w-90% p-4">
      <textarea v-model="currentUrl" class="w-full h-36 resize-none p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500"> </textarea>
      <textarea v-model="currentOpenxHeader" class="w-full h-24 resize-none p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500" />
      <json-editor height="400" mode="tree" :queryLanguagesIds="queryLanguages" @change="handleJsonChange" v-model:json="currentOpenxHeaderObj" />
      <div class="flex justify-center gap-4">
        <button class="btn mt-2" @click="handleReplaceUrl">刷新当前url</button>
        <button class="btn mt-2" @click="handleSkipNewTab">用新url跳转新TAB</button>
      </div>
    </div>
  </main>
</template>

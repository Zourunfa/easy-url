<script setup lang="ts">
import { storageDemo } from '~/logic/storage'
// import JsonEditor from 'vue-json-editor'
// import 'vue-json-editor/dist/jsoneditor.min.css'
import Base62x from '@pluve/base62'
// import VueJsonEditor from 'vue3-json-viewer
import JsonViewer from 'vue3-json-viewer'
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

  console.log(currentParamObj.value, '-----')
  // alert(currentParamObj.value._openx_header)
  currentOpenxHeader.value = currentParamObj.value._openx_header || ''

  currentOpenxHeaderObj.value = currentOpenxHeader.value ? JSON.parse(Base62x.decode(currentOpenxHeader.value)) : undefined
  console.log(currentOpenxHeaderObj.value, '-----')
  // alert(JSON.stringify(currentOpenxHeaderObj.value))
})

function openOptionsPage() {
  browser.runtime.openOptionsPage()
}
function onJsonChange(value) {
  console.log('value:', value)
}

function onModeChange(value) {
  console.log('value:', value)
}
const state = reactive({
  json: {},
})
</script>
<template>
  <main class="w-full text-center">
    <div class="text-center w-90% p-4">
      <textarea v-model="currentUrl" class="w-full h-24 resize-none p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500"> </textarea>
      <textarea v-model="currentOpenxHeader" class="w-full h-24 resize-none p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500" />
      <!-- <Vue3JsonEditor v-model="currentOpenxHeaderObj" :show-btns="true" :expandedOnStart="true" @json-change="onJsonChange" /> -->
      <JsonViewer :value="currentOpenxHeaderObj" copyable boxed sort theme="light" @onKeyClick="keyClick" />
    </div>
  </main>
</template>

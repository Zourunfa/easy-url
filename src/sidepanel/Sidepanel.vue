<script setup lang="ts">
import { storageDemo } from '~/logic/storage'

const currentUrl = ref<string | undefined>('')
const currentParamObj = ref()
function getUrlParams(url: string) {
  const params = new URLSearchParams(url.split('?')[1])
  const result: Record<string, string> = {}

  for (const [key, value] of params.entries()) {
    result[key] = value
  }

  return result
}
// _openx_header

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const currentTab = tabs[0]
  currentUrl.value = currentTab.url

  currentParamObj.value = getUrlParams(currentUrl.value as string)

  console.log(currentParamObj.value, '-----')
})

function openOptionsPage() {
  browser.runtime.openOptionsPage()
}
</script>
<template>
  <main class="w-full text-center">
    <div class="mt-2"><span class="opacity-50">Storage:</span> {{ storageDemo }}</div>

    <!-- <textarea class="mt-2" type="text" v-model="currentUrl" /> -->

    <button class="btn mt-2" @click="openOptionsPage">Open Options</button>
  </main>
</template>

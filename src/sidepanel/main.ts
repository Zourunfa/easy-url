import { createApp } from 'vue'
import { setupApp } from '~/logic/common-setup'
import '../styles'
import App from './Sidepanel.vue'
import { JsonEditorPlugin } from 'vue3-ts-jsoneditor'
const app = createApp(App)
setupApp(app)
app.use(JsonEditorPlugin, {
  componentName: '/componentName/', // Default: 'JsonEditor',
  options: {
    /**
     *
     * SET GLOBAL OPTIONS
     *
     * */
  },
})
app.mount('#app')

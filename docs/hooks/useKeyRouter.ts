import { ref, watchEffect } from 'vue'
import { useMagicKeys } from '@vueuse/core'
import { useData, useRouter } from 'vitepress'

export function useKeyRouter() {
    const keys = useMagicKeys()
    const keyU = keys['u']
    const u = useData()
    const router = useRouter()
    let oldPath = u.page.getter().relativePath.replace(/\.(md|html)$/, '')

    watchEffect(() => {
        if (keyU.value) {
            const newPath = '/user'
            console.log(`\`u\` have been pressed, redirecting to \`${newPath}\` ...`)

            if (newPath !== oldPath && !document.activeElement?.classList.contains('search-input')) {
                router.go(newPath)
                oldPath = newPath
            }
        }
    })
}

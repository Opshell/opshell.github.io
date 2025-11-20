import { useMagicKeys } from '@vueuse/core';
import { useData, useRouter } from 'vitepress';
import { watchEffect } from 'vue';

export function useKeyRouter() {
    const keys = useMagicKeys();
    const keyU = keys.u;
    const u = useData();
    const router = useRouter();
    let oldPath = u.page.value.relativePath.replace(/\.(?:md|html)$/, '');

    watchEffect(() => {
        if (keyU.value) {
            const newPath = '/user';
            console.log(`\`u\` have been pressed, redirecting to \`${newPath}\` ...`);

            if (newPath !== oldPath && !document.activeElement?.classList.contains('search-input')) {
                void router.go(newPath);
                oldPath = newPath;
            }
        }
    });
}

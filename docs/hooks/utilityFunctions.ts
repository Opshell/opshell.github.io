// Mock file utility for img.vue
export const file = {
    getAssetsImageUrl: (name: string) => {
        if (!name) return '';
        // Mock path resolution
        return `/assets/images/${name}`;
    }
};

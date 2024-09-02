---
title: Opshell's mumur about vitepress
author: 'Opshell'
createdAt: '2024/07/26'

categories: 'demo'
tags:
  - demo
  - vitepress

editLink: true
isPublished: true
---

<script setup lang="ts">
  import { useData } from 'vitepress';

</script>

## Vitepress Markdown Demo
This page demonstrates some of the built-in markdown extensions provided by VitePress.

## Syntax Highlighting

VitePress provides Syntax Highlighting powered by [Shiki](https://github.com/shikijs/shiki), with additional features like line-highlighting:

Hight Light Demo
::: code-group
````md [Input]
``` js{4}
export default {
  data () {
    return {
      msg: 'Hight Light Demo!'
    }
  }
}
```
````

``` js{4} [Output]
export default {
  data () {
    return {
      msg: 'Hight Light Demo!'
    }
  }
}
```
:::



## Add、Delete

VitePress provides Syntax Highlighting powered by [Shiki](https://github.com/shikijs/shiki), with additional features like line-highlighting:

Add、Delete Demo
````
``` js
export default {
  data () {
    return {
      msg: 'Hight Light Demo!' // [!!code --]
      msg: 'Add、Delete Demo!' // [!!code ++]
    }
  }
}
```
````

::: code-group
```` md [Input]
``` js
export default {
  data () {
    return {
      msg: 'Hight Light Demo!' // [!!code --]
      msg: 'Add、Delete Demo!' // [!!code ++]
    }
  }
}
```
````

``` js [Output]
export default {
  data () {
    return {
      msg: 'Hight Light Demo!' // [!code --]
      msg: 'Add、Delete Demo!' // [!code ++]
    }
  }
}
```
:::

## Custom Containers

**Input**

```md
::: info
This is an info box.
:::

::: tip
This is a tip.
:::

::: warning
This is a warning.
:::

::: danger
This is a dangerous warning.
:::

::: details
This is a details block.
:::
```

**Output**

::: info
This is an info box.
:::

::: tip
This is a tip.
:::

::: warning
This is a warning.
:::

::: danger
This is a dangerous warning.
:::

::: details
This is a details block.
:::

## More

Check out the documentation for the [full list of markdown extensions](https://vitepress.dev/guide/markdown).

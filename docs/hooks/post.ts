import path from 'node:path';
import fs from 'node:fs';
// import { globby } from 'globby';
import matter from 'gray-matter';
// import fs from 'fs-extra';

interface Post {
    frontMatter: {
        date: string
        title: string
        category: string
        tags: string[]
        description: string
    }
    regularPath: string
};

// export async function getPosts(pageSize: number) {
// console.log(paths);
// // 生成分页页面markdown
// // await generatePaginationPages(paths.length, pageSize)

// const posts = await Promise.all(
//     paths.map(async (item) => {
//         const content = await fs.readFile(item, 'utf-8');
//         const { data } = matter(content);

//         console.log(data);
//         // data.date = _convertDate(data.date);
//         return {
//             frontMatter: data,
//             regularPath: `/${item.replace('.md', '.html')}`
//         };
//     })
// );

// posts.sort(_compareDate as any);
// return posts;
// return '123';
// }

const isDirectory = (path: string) => fs.lstatSync(path).isDirectory();

function getMarkdown(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');

    const { data } = matter(content);

    return data;
}

export interface iPosts {
    tags: {
        [key: string]: number
    }
    category: string[]
}

export async function getPosts(files: string[], startPathName: string, res: iPosts | null = null): Promise<iPosts> {
    if (!res) {
        res = {
            tags: {} as {
                [key: string]: number
            },
            category: [] as string[]
        };
    }

    for (const file of files) {
        const dir = path.join(startPathName, file); // 組合路徑
        const isDir = isDirectory(dir); // 判斷是否是資料夾

        if (isDir) {
            // 如果是資料夾，遞迴進下一次
            const nextfiles = fs.readdirSync(dir);
            res = await getPosts(nextfiles, `${startPathName}/${file}`, res);
        } else {
            const fileName = path.basename(file);

            // 排除非md檔案
            const suffix = path.extname(file);
            if (suffix !== '.md') {
                continue;
            }

            const frontmatter = getMarkdown(`${startPathName}/${fileName}`);

            if (frontmatter.tags) {
                for (const tag of frontmatter.tags as string[]) {
                    if (res.tags[tag]) {
                        res.tags[tag]++;
                    } else {
                        res.tags[tag] = 1;
                    }
                }
            }

            if (frontmatter.category) {
                res.category.push(frontmatter.category as string);
            }
        }
    }

    return res;
}

export function initTags(post: Post[]) {
    const data: any = {};
    console.log(post);

    for (let index = 0; index < post.length; index++) {
        const element = post[index];
        const tags = element.frontMatter.tags;
        if (tags) {
            tags.forEach((item) => {
                if (data[item]) {
                    data[item].push(element);
                } else {
                    data[item] = [];
                    data[item].push(element);
                }
            });
        }
    }
    return data;
}

export function initCategory(post: Post[]) {
    const data: any = {};
    for (let index = 0; index < post.length; index++) {
        const element = post[index];
        const category = element.frontMatter.category;
        if (category) {
            if (data[category]) {
                data[category].push(element);
            } else {
                data[category] = [];
                data[category].push(element);
            }
        }
    }
    return data;
}

export function useYearSort(post: Post[]) {
    const data = [];
    let year = '0';
    let num = -1;
    for (let index = 0; index < post.length; index++) {
        const element = post[index];
        if (element.frontMatter.date) {
            const y = element.frontMatter.date.split('-')[0];
            if (y === year) {
                data[num].push(element);
            } else {
                num++;
                data[num] = [] as any;
                data[num].push(element);
                year = y;
            }
        }
    }
    return data;
}

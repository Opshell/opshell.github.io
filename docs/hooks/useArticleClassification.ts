import path from 'node:path';
import fs from 'node:fs';
import matter from 'gray-matter';

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

const isDirectory = (path: string) => fs.lstatSync(path).isDirectory();

function getMarkdown(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');

    const { data } = matter(content);

    return data;
}

interface iTags {
    [key: string]: {
        count: number
        group: {
            title: string
            category: string
            date: string
            url: string
        }[]
    }
}
export interface iClassification {
    tags: iTags
    category: string
}

export async function getArticleClassification(files: string[], startPathName: string, res: iClassification | null = null): Promise<iClassification> {
    if (!res) {
        res = {
            tags: {},
            category: ''
        };
    }

    for (const file of files) {
        const dir = path.join(startPathName, file); // 組合路徑
        const isDir = isDirectory(dir); // 判斷是否是資料夾

        if (isDir) {
            // 如果是資料夾，遞迴進下一次
            const nextfiles = fs.readdirSync(dir);
            res = await getArticleClassification(nextfiles, `${startPathName}/${file}`, res);
        } else {
            const fileName = path.basename(file);

            // 排除非md檔案
            const suffix = path.extname(file);
            if (suffix !== '.md') {
                continue;
            }

            const frontmatter = getMarkdown(`${startPathName}/${fileName}`);

            if (frontmatter.tags && frontmatter.isPublished) {
                const url = `${startPathName.split('\pages')[1]}/${fileName.replace('.md', '.html')}`;

                for (const tag of frontmatter.tags as string[]) {
                    res.tags[tag] = res.tags[tag] ?? { count: 0, group: [] };
                    res.tags[tag].count++;
                    res.tags[tag].group.push({
                        title: frontmatter.title as string,
                        category: frontmatter.categories as string | '',
                        date: frontmatter.createdAt as string | '',
                        url
                    });
                }
            }

            // if (frontmatter.category) {
            //     res.category.push(frontmatter.category as string);
            // }
        }
    }

    return res;
}

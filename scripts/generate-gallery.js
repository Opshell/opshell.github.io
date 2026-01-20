/* scripts/generate-gallery.js */
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import exifr from 'exifr';

// --- 設定區 ---
const RAW_DIR = path.resolve('photos/raw');
const THUMB_DIR = path.resolve('photos/thumbs');
const OUTPUT_JSON = path.resolve('photos/data.json');

const THUMB_WIDTH = 600;
const THUMB_QUALITY = 80;

// 將快門時間轉為分數
function formatExposureTime(time) {
    if (!time) return '';
    if (time >= 1) return `${time}s`;
    return `1/${Math.round(1 / time)}`;
}

async function generate() {
    console.log('📸 開始處理相簿...');

    // 1. 確保縮圖根目錄存在
    try { await fs.access(THUMB_DIR); } catch { await fs.mkdir(THUMB_DIR, { recursive: true }); }

    // 2. 讀取 RAW 目錄下的所有「資料夾」 (每個資料夾是一本相簿)
    const items = await fs.readdir(RAW_DIR, { withFileTypes: true });
    const albumDirs = items.filter(dirent => dirent.isDirectory());

    const galleryData = [];

    console.log(`📂 找到 ${albumDirs.length} 本相簿`);

    for (const dir of albumDirs) {
        const albumId = dir.name; // 資料夾名稱即 ID (例如 "2024_Japan")
        const albumPath = path.join(RAW_DIR, albumId);
        const albumThumbPath = path.join(THUMB_DIR, albumId);

        console.log(`\n=== 處理相簿: ${albumId} ===`);

        // 建立該相簿的縮圖目錄
        try { await fs.access(albumThumbPath); } catch { await fs.mkdir(albumThumbPath, { recursive: true }); }

        // 讀取相簿內的圖片
        const files = await fs.readdir(albumPath);
        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

        const photos = [];

        for (const file of imageFiles) {
            const inputPath = path.join(albumPath, file);
            const thumbName = file.replace(/\.[^.]+$/, '.webp');
            const outputPath = path.join(albumThumbPath, thumbName);

            process.stdout.write(`  Processing: ${file} ... `);

            try {
                // A. 生成縮圖
                const image = sharp(inputPath);
                const metadata = await image.metadata();

                // 檢查縮圖是否已存在 (增量編譯)
                let fileExists = false;
                try { await fs.access(outputPath); fileExists = true; } catch {}

                if (!fileExists) {
                    await image
                        .resize(THUMB_WIDTH)
                        .webp({ quality: THUMB_QUALITY })
                        .toFile(outputPath);
                    process.stdout.write('✅ Generated\n');
                } else {
                    process.stdout.write('⏭️ Skipped\n');
                }

                // B. 讀取 EXIF
                const exif = await exifr.parse(inputPath, [
                    'Make', 'Model', 'ISO', 'FNumber', 'ExposureTime', 'FocalLength', 'LensModel', 'DateTimeOriginal'
                ]);

                photos.push({
                    filename: file,
                    // R2 路徑結構: /thumbs/相簿名/圖片名
                    src: `${albumId}/${file}`,
                    thumb: `${albumId}/${thumbName}`,
                    width: metadata.width,
                    height: metadata.height,
                    aspectRatio: metadata.width / metadata.height,
                    date: exif?.DateTimeOriginal, // 用來排序
                    exif: {
                        camera: exif?.Model || '',
                        lens: exif?.LensModel || '',
                        iso: exif?.ISO ? `ISO ${exif.ISO}` : '',
                        aperture: exif?.FNumber ? `f/${exif.FNumber}` : '',
                        shutter: formatExposureTime(exif?.ExposureTime),
                        focalLength: exif?.FocalLength ? `${exif.FocalLength}mm` : ''
                    }
                });

            } catch (error) {
                console.error(`\n❌ Error: ${file}`, error);
            }
        }

        // 相簿處理完畢，整理相簿資訊
        if (photos.length > 0) {
            // 依拍攝時間排序
            photos.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

            galleryData.push({
                id: albumId,
                title: albumId.replace(/_/g, ' '), // 把底線換成空白當標題
                cover: photos[0].thumb, // 預設用第一張當封面
                count: photos.length,
                photos: photos
            });
        }
    }

    // 依相簿 ID (或可改成日期) 排序相簿
    galleryData.sort((a, b) => b.id.localeCompare(a.id));

    await fs.writeFile(OUTPUT_JSON, JSON.stringify(galleryData, null, 2));
    console.log(`\n🎉 全部完成！資料已寫入 ${OUTPUT_JSON}`);
}

generate();